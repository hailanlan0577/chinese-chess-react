import type { BoardDimensions } from './theme';
import type { Position } from '../engine/types';

/**
 * Convert canvas pixel coordinates to board position.
 * Returns null if click is outside the board.
 */
export function pixelToBoard(x: number, y: number, dpr: number, dim: BoardDimensions): Position | null {
  const px = x / dpr;
  const py = y / dpr;

  const col = Math.round((px - dim.padding) / dim.cellSize);
  const row = Math.round((py - dim.padding) / dim.cellSize);

  if (row < 0 || row > 9 || col < 0 || col > 8) return null;

  const boardX = dim.padding + col * dim.cellSize;
  const boardY = dim.padding + row * dim.cellSize;
  const dist = Math.sqrt((px - boardX) ** 2 + (py - boardY) ** 2);

  if (dist > dim.pieceRadius + 5) return null;

  return { row, col };
}

/**
 * Convert board position to canvas pixel coordinates.
 */
export function boardToPixel(pos: Position, dim: BoardDimensions): { x: number; y: number } {
  return {
    x: dim.padding + pos.col * dim.cellSize,
    y: dim.padding + pos.row * dim.cellSize,
  };
}
