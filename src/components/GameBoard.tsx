import { useRef, useEffect, useCallback, useState } from 'react';
import { render, type RenderState, type AnimatingPiece } from '../renderer/canvas';
import { pixelToBoard, boardToPixel } from '../renderer/interaction';
import { computeDimensions, type BoardDimensions } from '../renderer/theme';
import type { Position, Move } from '../engine/types';

const ANIM_DURATION = 180; // ms

interface GameBoardProps {
  renderState: RenderState;
  onCellClick: (pos: Position) => void;
  disabled?: boolean;
  pendingAnimation: Move | null;
  onAnimationDone: () => void;
  flipped?: boolean;
}

export default function GameBoard({ renderState, onCellClick, disabled, pendingAnimation, onAnimationDone, flipped = false }: GameBoardProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dprRef = useRef(window.devicePixelRatio || 1);
  const dimRef = useRef<BoardDimensions>(computeDimensions(360));
  const [containerWidth, setContainerWidth] = useState(0);
  const animRef = useRef<{ id: number } | null>(null);
  const animatingRef = useRef<AnimatingPiece | null>(null);

  // Observe container width changes
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width);
      }
    });
    observer.observe(container);
    setContainerWidth(container.clientWidth);

    return () => observer.disconnect();
  }, []);

  // Draw a single frame
  const drawFrame = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || containerWidth === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const state: RenderState = { ...renderState, animating: animatingRef.current, flipped };
    render(ctx, dprRef.current, dimRef.current, state);
  }, [renderState, containerWidth, flipped]);

  // Run animation when pendingAnimation changes
  useEffect(() => {
    if (!pendingAnimation || containerWidth === 0) return;

    const move = pendingAnimation;
    const dim = dimRef.current;
    const fromPx = boardToPixel(move.from, dim, flipped);
    const toPx = boardToPixel(move.to, dim, flipped);
    const piece = move.piece;
    const startTime = performance.now();

    function tick(now: number) {
      const elapsed = now - startTime;
      const t = Math.min(elapsed / ANIM_DURATION, 1);
      // Ease out cubic
      const ease = 1 - Math.pow(1 - t, 3);

      animatingRef.current = {
        piece,
        x: fromPx.x + (toPx.x - fromPx.x) * ease,
        y: fromPx.y + (toPx.y - fromPx.y) * ease,
        fromPos: move.from,
        toPos: move.to,
      };

      drawFrame();

      if (t < 1) {
        animRef.current = { id: requestAnimationFrame(tick) };
      } else {
        animatingRef.current = null;
        animRef.current = null;
        onAnimationDone();
      }
    }

    animRef.current = { id: requestAnimationFrame(tick) };

    return () => {
      if (animRef.current) {
        cancelAnimationFrame(animRef.current.id);
        animRef.current = null;
        animatingRef.current = null;
      }
    };
  }, [pendingAnimation, containerWidth, drawFrame, onAnimationDone, flipped]);

  // Resize canvas & redraw when state or size changes (but not during animation)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || containerWidth === 0) return;

    const dpr = window.devicePixelRatio || 1;
    dprRef.current = dpr;
    const dim = computeDimensions(containerWidth);
    dimRef.current = dim;

    canvas.width = dim.width * dpr;
    canvas.height = dim.height * dpr;
    canvas.style.width = `${dim.width}px`;
    canvas.style.height = `${dim.height}px`;

    if (!animRef.current) {
      drawFrame();
    }
  }, [renderState, containerWidth, drawFrame]);

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (disabled || animRef.current) return;
      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      const x = (e.clientX - rect.left) * scaleX;
      const y = (e.clientY - rect.top) * scaleY;
      const pos = pixelToBoard(x, y, dprRef.current, dimRef.current, flipped);
      if (pos) onCellClick(pos);
    },
    [onCellClick, disabled, flipped]
  );

  return (
    <div ref={containerRef} style={{ width: '100%', maxWidth: 560 }}>
      <canvas
        ref={canvasRef}
        onClick={handleClick}
        style={{ cursor: disabled ? 'not-allowed' : 'pointer', display: 'block' }}
      />
    </div>
  );
}
