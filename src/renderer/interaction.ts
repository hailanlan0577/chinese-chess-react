import type { BoardDimensions } from './theme';
import type { Position } from '../engine/types';

/**
 * Convert canvas pixel coordinates to board position.
 * Returns null if click is outside the board.
 * When flipped is true, the board is viewed from the black side (rotated 180°).
 */
export function pixelToBoard(x: number, y: number, dpr: number, dim: BoardDimensions, flipped = false): Position | null {
  const px = x / dpr;
  const py = y / dpr;

  let col = Math.round((px - dim.padding) / dim.cellSize);
  let row = Math.round((py - dim.padding) / dim.cellSize);

  if (row < 0 || row > 9 || col < 0 || col > 8) return null;

  const boardX = dim.padding + col * dim.cellSize;
  const boardY = dim.padding + row * dim.cellSize;
  const dist = Math.sqrt((px - boardX) ** 2 + (py - boardY) ** 2);

  if (dist > dim.pieceRadius + 5) return null;

  if (flipped) {
    row = 9 - row;
    col = 8 - col;
  }

  return { row, col };
}

/**
 * Convert board position to canvas pixel coordinates.
 * When flipped is true, the board is viewed from the black side (rotated 180°).
 */
export function boardToPixel(pos: Position, dim: BoardDimensions, flipped = false): { x: number; y: number } {
  const row = flipped ? 9 - pos.row : pos.row;
  const col = flipped ? 8 - pos.col : pos.col;
  return {
    x: dim.padding + col * dim.cellSize,
    y: dim.padding + row * dim.cellSize,
  };
}
