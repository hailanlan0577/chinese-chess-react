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
  flipped?: boolean;
}

export function render(ctx: CanvasRenderingContext2D, dpr: number, dim: BoardDimensions, state: RenderState): void {
  const flipped = state.flipped ?? false;
  ctx.save();
  ctx.scale(dpr, dpr);

  drawBoardBackground(ctx, dim);
  drawGrid(ctx, dim);
  drawStarMarkers(ctx, dim, flipped);
  drawRiverText(ctx, dim);
  drawLastMoveHighlight(ctx, dim, state.lastMove, flipped);
  drawSelectedHighlight(ctx, dim, state.selectedPos, flipped);
  drawLegalMoves(ctx, dim, state.legalMoves, flipped);
  drawCheckHighlight(ctx, dim, state.board, state.isInCheck, state.currentTurn, flipped);
  drawPieces(ctx, dim, state.board, state.animating || null, flipped);

  if (state.animating) {
    drawSinglePiece(ctx, dim, state.animating.piece, state.animating.x, state.animating.y, true);
  }

  ctx.restore();
}

// ---- Premium Board Background ----
function drawBoardBackground(ctx: CanvasRenderingContext2D, dim: BoardDimensions): void {
  const { width: w, height: h, frameWidth: fw } = dim;
  const cornerR = Math.floor(fw * 0.6);

  // Outer frame - rich dark wood with rounded corners
  drawRoundRect(ctx, 0, 0, w, h, cornerR);
  const outerGrad = ctx.createLinearGradient(0, 0, w, h);
  outerGrad.addColorStop(0, '#9a6e48');
  outerGrad.addColorStop(0.15, '#7a4e2c');
  outerGrad.addColorStop(0.5, '#6a3e20');
  outerGrad.addColorStop(0.85, '#5a3018');
  outerGrad.addColorStop(1, '#4a2410');
  ctx.fillStyle = outerGrad;
  ctx.fill();

  // Frame wood grain
  ctx.save();
  ctx.clip();
  ctx.globalAlpha = 0.06;
  for (let i = 0; i < h; i += 2) {
    const offset = Math.sin(i * 0.08) * 4 + Math.sin(i * 0.22) * 2;
    ctx.fillStyle = i % 4 === 0 ? '#000' : '#fff';
    ctx.fillRect(offset, i, w, 1);
  }
  ctx.globalAlpha = 1;
  ctx.restore();

  // Frame 3D bevel - top/left highlight
  drawRoundRect(ctx, 0, 0, w, h, cornerR);
  ctx.strokeStyle = 'rgba(255,220,160,0.25)';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Inner bevel shadow
  const innerX = fw - 1;
  const innerY = fw - 1;
  const innerW = w - fw * 2 + 2;
  const innerH = h - fw * 2 + 2;
  const innerR = Math.floor(cornerR * 0.3);

  drawRoundRect(ctx, innerX, innerY, innerW, innerH, innerR);
  ctx.strokeStyle = 'rgba(0,0,0,0.35)';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Inner board surface
  drawRoundRect(ctx, fw, fw, w - fw * 2, h - fw * 2, innerR);

  // Board surface - warm wood gradient
  const boardGrad = ctx.createLinearGradient(fw, fw, fw, h - fw);
  boardGrad.addColorStop(0, '#f0d890');
  boardGrad.addColorStop(0.2, '#ecd080');
  boardGrad.addColorStop(0.5, '#e4c470');
  boardGrad.addColorStop(0.8, '#dab860');
  boardGrad.addColorStop(1, '#d0ac50');
  ctx.fillStyle = boardGrad;
  ctx.fill();

  // Wood grain texture on board
  ctx.save();
  drawRoundRect(ctx, fw, fw, w - fw * 2, h - fw * 2, innerR);
  ctx.clip();
  ctx.globalAlpha = 0.035;
  for (let i = 0; i < h - fw * 2; i += 2) {
    const offset = Math.sin(i * 0.12 + 1) * 3 + Math.sin(i * 0.3) * 1.5;
    ctx.fillStyle = i % 4 === 0 ? '#6a4020' : '#fff8e0';
    ctx.fillRect(fw + offset, fw + i, w - fw * 2, 1);
  }
  // Add some knot-like variations
  ctx.globalAlpha = 0.02;
  for (let i = 0; i < 5; i++) {
    const kx = fw + (w - fw * 2) * (0.15 + i * 0.18);
    const ky = fw + (h - fw * 2) * (0.2 + (i % 3) * 0.3);
    const kr = 15 + i * 5;
    const kGrad = ctx.createRadialGradient(kx, ky, 0, kx, ky, kr);
    kGrad.addColorStop(0, '#6a4020');
    kGrad.addColorStop(1, 'transparent');
    ctx.fillStyle = kGrad;
    ctx.fillRect(kx - kr, ky - kr, kr * 2, kr * 2);
  }
  ctx.globalAlpha = 1;
  ctx.restore();

  // Inner surface highlight (top edge)
  ctx.save();
  drawRoundRect(ctx, fw + 1, fw + 1, w - fw * 2 - 2, h - fw * 2 - 2, innerR);
  ctx.strokeStyle = 'rgba(255,255,255,0.2)';
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.restore();
}

function drawRoundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function drawGrid(ctx: CanvasRenderingContext2D, dim: BoardDimensions): void {
  const { padding, cellSize } = dim;
  ctx.strokeStyle = THEME.lineColor;
  ctx.lineWidth = THEME.lineWidth;

  // Outer border of the grid (thicker)
  ctx.save();
  ctx.lineWidth = THEME.lineWidth * 1.8;
  ctx.strokeRect(
    padding, padding,
    8 * cellSize, 9 * cellSize
  );
  ctx.restore();

  // Horizontal lines
  for (let row = 1; row <= 8; row++) {
    const y = padding + row * cellSize;
    ctx.beginPath();
    ctx.moveTo(padding, y);
    ctx.lineTo(padding + 8 * cellSize, y);
    ctx.stroke();
  }

  // Left and right border columns (already drawn by outer rect)
  // Internal vertical lines
  for (let col = 1; col <= 7; col++) {
    const x = padding + col * cellSize;
    // Top half
    ctx.beginPath();
    ctx.moveTo(x, padding);
    ctx.lineTo(x, padding + 4 * cellSize);
    ctx.stroke();
    // Bottom half
    ctx.beginPath();
    ctx.moveTo(x, padding + 5 * cellSize);
    ctx.lineTo(x, padding + 9 * cellSize);
    ctx.stroke();
  }

  // Palace diagonals
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

function drawStarMarkers(ctx: CanvasRenderingContext2D, dim: BoardDimensions, flipped: boolean): void {
  const stars: Position[] = [
    { row: 2, col: 1 }, { row: 2, col: 7 },
    { row: 3, col: 0 }, { row: 3, col: 2 }, { row: 3, col: 4 }, { row: 3, col: 6 }, { row: 3, col: 8 },
    { row: 6, col: 0 }, { row: 6, col: 2 }, { row: 6, col: 4 }, { row: 6, col: 6 }, { row: 6, col: 8 },
    { row: 7, col: 1 }, { row: 7, col: 7 },
  ];
  for (const pos of stars) drawStar(ctx, pos, dim, flipped);
}

function drawStar(ctx: CanvasRenderingContext2D, pos: Position, dim: BoardDimensions, flipped: boolean): void {
  const { x, y } = boardToPixel(pos, dim, flipped);
  const s = dim.starSize;
  const gap = Math.max(2, Math.floor(s * 0.75));
  ctx.strokeStyle = THEME.lineColor;
  ctx.lineWidth = 1;

  const visualCol = flipped ? 8 - pos.col : pos.col;
  const segs: [number, number, number, number][] = [];
  if (visualCol > 0) {
    segs.push([x - gap - s, y - gap, x - gap, y - gap], [x - gap, y - gap - s, x - gap, y - gap]);
    segs.push([x - gap - s, y + gap, x - gap, y + gap], [x - gap, y + gap + s, x - gap, y + gap]);
  }
  if (visualCol < 8) {
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

  ctx.save();
  ctx.fillStyle = THEME.riverColor;
  ctx.font = dim.riverFont;
  ctx.textBaseline = 'middle';

  // "楚河" on the left side
  ctx.textAlign = 'center';
  const leftX = padding + 2 * cellSize;
  ctx.fillText('楚  河', leftX, y);

  // "汉界" on the right side
  const rightX = padding + 6 * cellSize;
  ctx.fillText('汉  界', rightX, y);

  ctx.restore();
}

function drawLastMoveHighlight(ctx: CanvasRenderingContext2D, dim: BoardDimensions, lastMove: Move | null, flipped: boolean): void {
  if (!lastMove) return;
  const r = dim.pieceRadius + 2;
  for (const pos of [lastMove.from, lastMove.to]) {
    const { x, y } = boardToPixel(pos, dim, flipped);
    // Warm amber glow
    const grad = ctx.createRadialGradient(x, y, r * 0.4, x, y, r + 4);
    grad.addColorStop(0, THEME.lastMoveColor);
    grad.addColorStop(1, 'rgba(220, 180, 60, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(x, y, r + 4, 0, Math.PI * 2);
    ctx.fill();
    // Corner brackets instead of circle
    drawCornerBrackets(ctx, x, y, r, '#c0903a');
  }
}

function drawSelectedHighlight(ctx: CanvasRenderingContext2D, dim: BoardDimensions, selected: Position | null, flipped: boolean): void {
  if (!selected) return;
  const { x, y } = boardToPixel(selected, dim, flipped);
  const r = dim.pieceRadius + 3;
  // Warm gold selection
  drawCornerBrackets(ctx, x, y, r, '#d4a020');
}

function drawCornerBrackets(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, color: string): void {
  const len = r * 0.35;
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 2.5;
  ctx.lineCap = 'round';

  // Four corners
  const corners = [
    { x: cx - r, y: cy - r, dx: 1, dy: 1 },
    { x: cx + r, y: cy - r, dx: -1, dy: 1 },
    { x: cx - r, y: cy + r, dx: 1, dy: -1 },
    { x: cx + r, y: cy + r, dx: -1, dy: -1 },
  ];

  for (const c of corners) {
    ctx.beginPath();
    ctx.moveTo(c.x + c.dx * len, c.y);
    ctx.lineTo(c.x, c.y);
    ctx.lineTo(c.x, c.y + c.dy * len);
    ctx.stroke();
  }

  ctx.restore();
}

function drawLegalMoves(ctx: CanvasRenderingContext2D, dim: BoardDimensions, moves: Position[], flipped: boolean): void {
  for (const pos of moves) {
    const { x, y } = boardToPixel(pos, dim, flipped);
    const r = dim.legalMoveRadius;
    // Warm golden-green dot
    const grad = ctx.createRadialGradient(x - 1, y - 1, 0, x, y, r);
    grad.addColorStop(0, 'rgba(180, 200, 80, 0.85)');
    grad.addColorStop(0.6, 'rgba(160, 180, 60, 0.5)');
    grad.addColorStop(1, 'rgba(140, 160, 40, 0.15)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawCheckHighlight(ctx: CanvasRenderingContext2D, dim: BoardDimensions, board: Board, inCheck: boolean, turn: Side, flipped: boolean): void {
  if (!inCheck) return;
  const kingPos = findKing(board, turn);
  if (!kingPos) return;
  const { x, y } = boardToPixel(kingPos, dim, flipped);
  const r = dim.pieceRadius;
  // Pulsing red warning
  const grad = ctx.createRadialGradient(x, y, r * 0.3, x, y, r + 10);
  grad.addColorStop(0, 'rgba(200, 50, 30, 0.6)');
  grad.addColorStop(0.6, 'rgba(200, 50, 30, 0.25)');
  grad.addColorStop(1, 'rgba(200, 50, 30, 0)');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(x, y, r + 10, 0, Math.PI * 2);
  ctx.fill();
}

function drawPieces(ctx: CanvasRenderingContext2D, dim: BoardDimensions, board: Board, animating: AnimatingPiece | null, flipped: boolean): void {
  for (let row = 0; row < 10; row++) {
    for (let col = 0; col < 9; col++) {
      const piece = board[row][col];
      if (!piece) continue;
      if (animating && row === animating.toPos.row && col === animating.toPos.col) continue;
      const { x, y } = boardToPixel({ row, col }, dim, flipped);
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
  const bw = dim.pieceBorderWidth;

  // ---- Drop shadow ----
  ctx.save();
  const shadowOff = isFlying ? 5 : 2.5;
  const shadowBlur = isFlying ? 8 : 4;
  ctx.shadowColor = 'rgba(30, 15, 5, 0.4)';
  ctx.shadowBlur = shadowBlur;
  ctx.shadowOffsetX = shadowOff;
  ctx.shadowOffsetY = shadowOff;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = '#c0a070'; // temp fill to cast shadow
  ctx.fill();
  ctx.restore();

  // ---- Piece body - radial gradient for 3D dome ----
  const bgGrad = ctx.createRadialGradient(x - r * 0.28, y - r * 0.32, r * 0.08, x + r * 0.05, y + r * 0.05, r);
  bgGrad.addColorStop(0, isRed ? THEME.redPieceGradientCenter : THEME.blackPieceGradientCenter);
  bgGrad.addColorStop(0.7, isRed ? THEME.redPieceGradientEdge : THEME.blackPieceGradientEdge);
  bgGrad.addColorStop(1, isRed ? '#c8a878' : '#a8a098');
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = bgGrad;
  ctx.fill();

  // ---- Outer rim - dark border ----
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.strokeStyle = isRed ? THEME.redPieceBorder : THEME.blackPieceBorder;
  ctx.lineWidth = bw;
  ctx.stroke();

  // ---- 3D rim highlight (top-left arc) ----
  ctx.beginPath();
  ctx.arc(x - 0.5, y - 0.5, r - bw * 0.5, -Math.PI * 0.85, -Math.PI * 0.15);
  ctx.strokeStyle = 'rgba(255,255,255,0.35)';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // ---- 3D rim shadow (bottom-right arc) ----
  ctx.beginPath();
  ctx.arc(x + 0.5, y + 0.5, r - bw * 0.5, Math.PI * 0.15, Math.PI * 0.85);
  ctx.strokeStyle = 'rgba(0,0,0,0.15)';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // ---- Inner decorative ring ----
  const innerR = r - Math.max(4, r * 0.18);
  ctx.beginPath();
  ctx.arc(x, y, innerR, 0, Math.PI * 2);
  ctx.strokeStyle = isRed ? 'rgba(140, 30, 20, 0.5)' : 'rgba(40, 40, 60, 0.45)';
  ctx.lineWidth = Math.max(1, bw * 0.6);
  ctx.stroke();

  // ---- Glossy highlight (top-left) ----
  const gloss = ctx.createRadialGradient(
    x - r * 0.22, y - r * 0.25, 0,
    x - r * 0.1, y - r * 0.1, r * 0.55
  );
  gloss.addColorStop(0, 'rgba(255,255,255,0.4)');
  gloss.addColorStop(0.5, 'rgba(255,255,255,0.1)');
  gloss.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = gloss;
  ctx.beginPath();
  ctx.arc(x, y, r - bw, 0, Math.PI * 2);
  ctx.fill();

  // ---- Text shadow ----
  ctx.font = dim.pieceFont;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = 'rgba(0,0,0,0.18)';
  ctx.fillText(PIECE_NAMES[piece.side][piece.type], x + 0.8, y + 1.8);

  // ---- Chinese character ----
  ctx.fillStyle = isRed ? THEME.redPieceColor : THEME.blackPieceColor;
  ctx.fillText(PIECE_NAMES[piece.side][piece.type], x, y + 0.8);
}
