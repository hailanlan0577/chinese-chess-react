import { Side, type Board, type Move, type Position } from './types';
import { findKing, applyMove, oppositeSide } from './board';
import { generateAllMoves, generatePieceMoves } from './moves';

/**
 * Check if the given side's king is under attack (in check).
 */
export function isInCheck(board: Board, side: Side): boolean {
  const kingPos = findKing(board, side);
  if (!kingPos) return false; // king captured (shouldn't happen in normal play)

  // Check if flying general applies (two kings facing each other)
  if (isFlyingGeneral(board)) {
    return true;
  }

  const enemy = oppositeSide(side);
  const enemyMoves = generateAllMoves(board, enemy);
  return enemyMoves.some(m => m.to.row === kingPos.row && m.to.col === kingPos.col);
}

/**
 * Flying general: two kings face each other on the same column with no pieces between.
 */
export function isFlyingGeneral(board: Board): boolean {
  const redKing = findKing(board, Side.RED);
  const blackKing = findKing(board, Side.BLACK);
  if (!redKing || !blackKing) return false;
  if (redKing.col !== blackKing.col) return false;

  // Check if any piece is between the two kings
  const minRow = Math.min(redKing.row, blackKing.row);
  const maxRow = Math.max(redKing.row, blackKing.row);
  for (let row = minRow + 1; row < maxRow; row++) {
    if (board[row][redKing.col]) return false;
  }
  return true;
}

/**
 * Check if a move is legal (doesn't leave own king in check, doesn't cause flying general).
 */
export function isMoveLegal(board: Board, move: Move): boolean {
  const newBoard = applyMove(board, move);
  return !isInCheck(newBoard, move.piece.side);
}

/**
 * Get all legal moves for a specific position.
 */
export function getLegalMovesForPos(board: Board, pos: Position): Move[] {
  const pseudoMoves = generatePieceMoves(board, pos);
  return pseudoMoves.filter(m => isMoveLegal(board, m));
}

/**
 * Get all legal moves for a side.
 */
export function getAllLegalMoves(board: Board, side: Side): Move[] {
  const pseudoMoves = generateAllMoves(board, side);
  return pseudoMoves.filter(m => isMoveLegal(board, m));
}

/**
 * Check if the given side is in checkmate (in check and no legal moves).
 */
export function isCheckmate(board: Board, side: Side): boolean {
  if (!isInCheck(board, side)) return false;
  return getAllLegalMoves(board, side).length === 0;
}

/**
 * Check if the given side is stalemated (not in check but no legal moves).
 */
export function isStalemate(board: Board, side: Side): boolean {
  if (isInCheck(board, side)) return false;
  return getAllLegalMoves(board, side).length === 0;
}
