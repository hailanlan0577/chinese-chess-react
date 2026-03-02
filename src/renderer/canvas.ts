import { Side, type Board, type Position, type Move } from '../engine/types';
import { PIECE_NAMES } from '../engine/constants';
import { findKing } from '../engine/board';
import { THEME, type BoardDimensions } from './theme';
import { boardToPixel } from './interaction';

export interface AnimatingPiece {
  piece: import('../engine/types').Piece;
  x: number;
  y: number;
  fromPos: Position;
  toPos: Position;
}

export interface RenderState {
  board: Board;
  selectedPos: Position | null;
  legalMoves: Position[];
  lastMove: Move | null;
  isInCheck: boolean;
  currentTurn: Side;
  animating?: AnimatingPiece | null;
}

export function render(ctx: CanvasRenderingContext2D, dpr: number, dim: BoardDimensions, state: RenderState): void {
  ctx.save();
  ctx.scale(dpr, dpr);

  drawBoardBackground(ctx, dim);
  drawGrid(ctx, dim);
  drawStarMarkers(ctx, dim);
  drawRiverText(ctx, dim);
  drawLastMoveHighlight(ctx, dim, state.lastMove);
  drawSelectedHighlight(ctx, dim, state.selectedPos);
  drawLegalMoves(ctx, dim, state.legalMoves);
  drawCheckHighlight(ctx, dim, state.board, state.isInCheck, state.currentTurn);
  drawPieces(ctx, dim, state.board, state.animating || null);

  if (state.animating) {
    drawSinglePiece(ctx, dim, state.animating.piece, state.animating.x, state.animating.y, true);
  }

  ctx.restore();
}

// ---- 3D Board Background ----
function drawBoardBackground(ctx: CanvasRenderingContext2D, dim: BoardDimensions): void {
  const { width: w, height: h, frameWidth: fw } = dim;

  // Outer frame - dark wood
  const outerGrad = ctx.createLinearGradient(0, 0, 0, h);
  outerGrad.addColorStop(0, '#8b5e3c');
  outerGrad.addColorStop(0.3, '#6b3a1f');
  outerGrad.addColorStop(0.7, '#5a2d15');
  outerGrad.addColorStop(1, '#4a2010');
  ctx.fillStyle = outerGrad;
  ctx.fillRect(0, 0, w, h);

  // Frame bevel - top/left highlight
  ctx.fillStyle = 'rgba(255,255,255,0.15)';
  ctx.fillRect(0, 0, w, 2);
  ctx.fillRect(0, 0, 2, h);

  // Frame bevel - bottom/right shadow
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.fillRect(0, h - 2, w, 2);
  ctx.fillRect(w - 2, 0, 2, h);

  // Inner board surface with wood grain gradient
  const innerX = fw;
  const innerY = fw;
  const innerW = w - fw * 2;
  const innerH = h - fw * 2;

  // Inner bevel (carved in)
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.fillRect(innerX - 1, innerY - 1, innerW + 2, 2);
  ctx.fillRect(innerX - 1, innerY - 1, 2, innerH + 2);
  ctx.fillStyle = 'rgba(255,255,255,0.1)';
  ctx.fillRect(innerX, innerY + innerH - 1, innerW, 2);
  ctx.fillRect(innerX + innerW - 1, innerY, 2, innerH);

  // Board surface gradient (simulating light from top-left)
  const boardGrad = ctx.createLinearGradient(innerX, innerY, innerX + innerW, innerY + innerH);
  boardGrad.addColorStop(0, '#ecd08f');
  boardGrad.addColorStop(0.25, '#e8c373');
  boardGrad.addColorStop(0.5, '#ddb560');
  boardGrad.addColorStop(0.75, '#d4a84e');
  boardGrad.addColorStop(1, '#c99b3f');
  ctx.fillStyle = boardGrad;
  ctx.fillRect(innerX, innerY, innerW, innerH);

  // Subtle wood grain texture
  ctx.globalAlpha = 0.04;
  for (let i = 0; i < innerH; i += 3) {
    const offset = Math.sin(i * 0.15) * 2;
    ctx.fillStyle = i % 6 === 0 ? '#000' : '#fff';
    ctx.fillRect(innerX + offset, innerY + i, innerW, 1);
  }
  ctx.globalAlpha = 1;
}

function drawGrid(ctx: CanvasRenderingContext2D, dim: BoardDimensions): void {
  const { padding, cellSize } = dim;
  ctx.strokeStyle = THEME.lineColor;
  ctx.lineWidth = THEME.lineWidth;

  for (let row = 0; row <= 9; row++) {
    const y = padding + row * cellSize;
    ctx.beginPath();
    ctx.moveTo(padding, y);
    ctx.lineTo(padding + 8 * cellSize, y);
    ctx.stroke();
  }

  ctx.beginPath();
  ctx.moveTo(padding, padding);
  ctx.lineTo(padding, padding + 9 * cellSize);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(padding + 8 * cellSize, padding);
  ctx.lineTo(padding + 8 * cellSize, padding + 9 * cellSize);
  ctx.stroke();

  for (let col = 1; col <= 7; col++) {
    const x = padding + col * cellSize;
    ctx.beginPath();
    ctx.moveTo(x, padding);
    ctx.lineTo(x, padding + 4 * cellSize);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, padding + 5 * cellSize);
    ctx.lineTo(x, padding + 9 * cellSize);
    ctx.stroke();
  }

  drawPalaceDiagonals(ctx, padding + 3 * cellSize, padding, cellSize);
  drawPalaceDiagonals(ctx, padding + 3 * cellSize, padding + 7 * cellSize, cellSize);
}

function drawPalaceDiagonals(ctx: CanvasRenderingContext2D, x: number, y: number, size: number): void {
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + 2 * size, y + 2 * size);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x + 2 * size, y);
  ctx.lineTo(x, y + 2 * size);
  ctx.stroke();
}

function drawStarMarkers(ctx: CanvasRenderingContext2D, dim: BoardDimensions): void {
  const stars: Position[] = [
    { row: 2, col: 1 }, { row: 2, col: 7 },
    { row: 3, col: 0 }, { row: 3, col: 2 }, { row: 3, col: 4 }, { row: 3, col: 6 }, { row: 3, col: 8 },
    { row: 6, col: 0 }, { row: 6, col: 2 }, { row: 6, col: 4 }, { row: 6, col: 6 }, { row: 6, col: 8 },
    { row: 7, col: 1 }, { row: 7, col: 7 },
  ];
  for (const pos of stars) drawStar(ctx, pos, dim);
}

function drawStar(ctx: CanvasRenderingContext2D, pos: Position, dim: BoardDimensions): void {
  const { x, y } = boardToPixel(pos, dim);
  const s = dim.starSize;
  const gap = Math.max(2, Math.floor(s * 0.75));
  ctx.strokeStyle = THEME.lineColor;
  ctx.lineWidth = 1;

  const segs: [number, number, number, number][] = [];
  if (pos.col > 0) {
    segs.push([x - gap - s, y - gap, x - gap, y - gap], [x - gap, y - gap - s, x - gap, y - gap]);
    segs.push([x - gap - s, y + gap, x - gap, y + gap], [x - gap, y + gap + s, x - gap, y + gap]);
  }
  if (pos.col < 8) {
    segs.push([x + gap + s, y - gap, x + gap, y - gap], [x + gap, y - gap - s, x + gap, y - gap]);
    segs.push([x + gap + s, y + gap, x + gap, y + gap], [x + gap, y + gap + s, x + gap, y + gap]);
  }
  for (const [x1, y1, x2, y2] of segs) {
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
  }
}

function drawRiverText(ctx: CanvasRenderingContext2D, dim: BoardDimensions): void {
  const { padding, cellSize } = dim;
  const y = padding + 4.5 * cellSize;
  const x = padding + 4 * cellSize;
  ctx.fillStyle = THEME.riverColor;
  ctx.font = dim.riverFont;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(THEME.riverText, x, y);
}

function drawLastMoveHighlight(ctx: CanvasRenderingContext2D, dim: BoardDimensions, lastMove: Move | null): void {
  if (!lastMove) return;
  for (const pos of [lastMove.from, lastMove.to]) {
    const { x, y } = boardToPixel(pos, dim);
    ctx.fillStyle = THEME.lastMoveColor;
    ctx.beginPath();
    ctx.arc(x, y, dim.pieceRadius + 3, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawSelectedHighlight(ctx: CanvasRenderingContext2D, dim: BoardDimensions, selected: Position | null): void {
  if (!selected) return;
  const { x, y } = boardToPixel(selected, dim);
  ctx.fillStyle = THEME.selectedColor;
  ctx.beginPath();
  ctx.arc(x, y, dim.pieceRadius + 4, 0, Math.PI * 2);
  ctx.fill();
}

function drawLegalMoves(ctx: CanvasRenderingContext2D, dim: BoardDimensions, moves: Position[]): void {
  for (const pos of moves) {
    const { x, y } = boardToPixel(pos, dim);
    // 3D dot with gradient
    const grad = ctx.createRadialGradient(x - 1, y - 1, 0, x, y, dim.legalMoveRadius);
    grad.addColorStop(0, 'rgba(46, 204, 113, 0.8)');
    grad.addColorStop(1, 'rgba(46, 204, 113, 0.3)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(x, y, dim.legalMoveRadius, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawCheckHighlight(ctx: CanvasRenderingContext2D, dim: BoardDimensions, board: Board, inCheck: boolean, turn: Side): void {
  if (!inCheck) return;
  const kingPos = findKing(board, turn);
  if (!kingPos) return;
  const { x, y } = boardToPixel(kingPos, dim);
  const grad = ctx.createRadialGradient(x, y, dim.pieceRadius * 0.5, x, y, dim.pieceRadius + 8);
  grad.addColorStop(0, 'rgba(231, 76, 60, 0.6)');
  grad.addColorStop(1, 'rgba(231, 76, 60, 0)');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(x, y, dim.pieceRadius + 8, 0, Math.PI * 2);
  ctx.fill();
}

function drawPieces(ctx: CanvasRenderingContext2D, dim: BoardDimensions, board: Board, animating: AnimatingPiece | null): void {
  for (let row = 0; row < 10; row++) {
    for (let col = 0; col < 9; col++) {
      const piece = board[row][col];
      if (!piece) continue;
      if (animating && row === animating.toPos.row && col === animating.toPos.col) continue;
      const { x, y } = boardToPixel({ row, col }, dim);
      drawSinglePiece(ctx, dim, piece, x, y, false);
    }
  }
}

function drawSinglePiece(
  ctx: CanvasRenderingContext2D,
  dim: BoardDimensions,
  piece: import('../engine/types').Piece,
  x: number,
  y: number,
  isFlying: boolean,
): void {
  const isRed = piece.side === Side.RED;
  const r = dim.pieceRadius;
  const shadowOffset = isFlying ? 4 : 2;

  // Drop shadow
  ctx.save();
  ctx.beginPath();
  ctx.arc(x + shadowOffset, y + shadowOffset + 1, r, 0, Math.PI * 2);
  ctx.fillStyle = isFlying ? 'rgba(0,0,0,0.35)' : 'rgba(0,0,0,0.2)';
  ctx.fill();
  ctx.restore();

  // Piece body - radial gradient for 3D dome effect
  const bgGrad = ctx.createRadialGradient(x - r * 0.3, y - r * 0.35, r * 0.1, x, y, r);
  bgGrad.addColorStop(0, isRed ? THEME.redPieceGradientCenter : THEME.blackPieceGradientCenter);
  bgGrad.addColorStop(1, isRed ? THEME.redPieceGradientEdge : THEME.blackPieceGradientEdge);
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = bgGrad;
  ctx.fill();

  // Outer rim - dark border
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.strokeStyle = isRed ? THEME.redPieceBorder : THEME.blackPieceBorder;
  ctx.lineWidth = dim.pieceBorderWidth;
  ctx.stroke();

  // 3D rim highlight (top-left arc)
  ctx.beginPath();
  ctx.arc(x, y, r - 1, -Math.PI * 0.8, -Math.PI * 0.2);
  ctx.strokeStyle = 'rgba(255,255,255,0.3)';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Inner decorative circle
  ctx.beginPath();
  ctx.arc(x, y, r - 4, 0, Math.PI * 2);
  ctx.strokeStyle = isRed ? THEME.redPieceBorder : THEME.blackPieceBorder;
  ctx.lineWidth = 1;
  ctx.stroke();

  // Glossy highlight spot (top-left)
  const gloss = ctx.createRadialGradient(x - r * 0.25, y - r * 0.28, 0, x - r * 0.25, y - r * 0.28, r * 0.5);
  gloss.addColorStop(0, 'rgba(255,255,255,0.35)');
  gloss.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = gloss;
  ctx.beginPath();
  ctx.arc(x, y, r - 2, 0, Math.PI * 2);
  ctx.fill();

  // Text shadow
  ctx.fillStyle = 'rgba(0,0,0,0.15)';
  ctx.font = dim.pieceFont;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(PIECE_NAMES[piece.side][piece.type], x + 1, y + 2);

  // Chinese character
  ctx.fillStyle = isRed ? THEME.redPieceColor : THEME.blackPieceColor;
  ctx.fillText(PIECE_NAMES[piece.side][piece.type], x, y + 1);
}
