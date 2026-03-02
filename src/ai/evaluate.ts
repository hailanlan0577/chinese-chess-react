import { Side, PieceType, type Board } from '../engine/types';
import { PIECE_VALUES } from '../engine/constants';
import { getAllPiecesOfSide, findKing } from '../engine/board';

/**
 * Position Score Tables (PST) for each piece type.
 * Values are from Black's perspective (row 0 = Black's back rank).
 * Red's values are mirrored vertically.
 * Higher values = better position.
 */

// King: prefer staying in center of palace
const KING_PST = [
  [0, 0, 0, 1, 5, 1, 0, 0, 0],
  [0, 0, 0, -5, -5, -5, 0, 0, 0],
  [0, 0, 0, -10, -10, -10, 0, 0, 0],
];

// Advisor: prefer center of palace
const ADVISOR_PST = [
  [0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 3, 0, 0, 0, 0],
  [0, 0, 0, 1, 0, 1, 0, 0, 0],
];

// Elephant: prefer defensive positions
const ELEPHANT_PST = [
  [0, 0, 1, 0, 0, 0, 1, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0],
  [1, 0, 0, 0, 3, 0, 0, 0, 1],
  [0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 1, 0, 0, 0, 1, 0, 0],
];

// Horse: prefer central, advanced positions
const HORSE_PST = [
  [-2, 0, 2, 0, 0, 0, 2, 0, -2],
  [0, 2, 4, 4, 0, 4, 4, 2, 0],
  [0, 2, 4, 4, 6, 4, 4, 2, 0],
  [0, 2, 4, 5, 5, 5, 4, 2, 0],
  [0, 2, 4, 4, 4, 4, 4, 2, 0],
  [0, 2, 4, 4, 4, 4, 4, 2, 0],
  [0, 2, 4, 5, 5, 5, 4, 2, 0],
  [0, 2, 4, 4, 6, 4, 4, 2, 0],
  [0, 2, 4, 4, 0, 4, 4, 2, 0],
  [-2, 0, 2, 0, 0, 0, 2, 0, -2],
];

// Rook: prefer open files and 7th rank
const ROOK_PST = [
  [0, 0, 0, 2, 4, 2, 0, 0, 0],
  [0, 0, 0, 2, 6, 2, 0, 0, 0],
  [0, 0, 0, 2, 4, 2, 0, 0, 0],
  [0, 0, 2, 4, 4, 4, 2, 0, 0],
  [2, 4, 4, 4, 6, 4, 4, 4, 2],
  [2, 4, 4, 4, 6, 4, 4, 4, 2],
  [0, 0, 2, 4, 4, 4, 2, 0, 0],
  [0, 0, 0, 2, 4, 2, 0, 0, 0],
  [0, 0, 0, 2, 6, 2, 0, 0, 0],
  [0, 0, 0, 2, 4, 2, 0, 0, 0],
];

// Cannon: prefer center and offensive positions
const CANNON_PST = [
  [0, 0, 2, 3, 4, 3, 2, 0, 0],
  [0, 2, 2, 2, 4, 2, 2, 2, 0],
  [0, 0, 0, 0, 2, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 2, 0, 0, 0, 0],
  [0, 2, 2, 2, 4, 2, 2, 2, 0],
  [0, 0, 2, 3, 4, 3, 2, 0, 0],
];

// Pawn: value increases after crossing river
const PAWN_PST = [
  [0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0],
  [2, 0, 2, 0, 4, 0, 2, 0, 2],
  [3, 0, 4, 0, 5, 0, 4, 0, 3],
  [4, 6, 6, 8, 10, 8, 6, 6, 4],
  [6, 8, 10, 12, 14, 12, 10, 8, 6],
  [8, 10, 12, 14, 16, 14, 12, 10, 8],
  [8, 10, 12, 14, 16, 14, 12, 10, 8],
  [0, 0, 0, 0, 0, 0, 0, 0, 0], // can't be here
];

function getPST(type: PieceType): number[][] | null {
  switch (type) {
    case PieceType.KING: return KING_PST;
    case PieceType.ADVISOR: return ADVISOR_PST;
    case PieceType.ELEPHANT: return ELEPHANT_PST;
    case PieceType.HORSE: return HORSE_PST;
    case PieceType.ROOK: return ROOK_PST;
    case PieceType.CANNON: return CANNON_PST;
    case PieceType.PAWN: return PAWN_PST;
    default: return null;
  }
}

function getPositionScore(type: PieceType, row: number, col: number, side: Side): number {
  const pst = getPST(type);
  if (!pst) return 0;

  // For Black, use row directly. For Red, mirror vertically.
  let r = side === Side.BLACK ? row : 9 - row;

  // Some PSTs are smaller than 10 rows (King, Advisor, Elephant only need their own territory)
  if (type === PieceType.KING || type === PieceType.ADVISOR) {
    if (r > 2) return 0; // these pieces shouldn't be outside palace area
  }
  if (type === PieceType.ELEPHANT) {
    if (r > 4) return 0; // shouldn't be across river
  }

  if (r < 0 || r >= pst.length) return 0;
  return pst[r][col] || 0;
}

/**
 * Evaluate the board from the given side's perspective.
 * Positive = good for the given side.
 */
export function evaluate(board: Board, side: Side): number {
  let score = 0;
  const ownPieces = getAllPiecesOfSide(board, side);
  const enemySide = side === Side.RED ? Side.BLACK : Side.RED;
  const enemyPieces = getAllPiecesOfSide(board, enemySide);

  // Material + Position
  for (const { piece, pos } of ownPieces) {
    score += PIECE_VALUES[piece.type];
    score += getPositionScore(piece.type, pos.row, pos.col, side);
  }
  for (const { piece, pos } of enemyPieces) {
    score -= PIECE_VALUES[piece.type];
    score -= getPositionScore(piece.type, pos.row, pos.col, enemySide);
  }

  // King safety: penalize if king is exposed
  const ownKing = findKing(board, side);
  const enemyKing = findKing(board, enemySide);
  if (ownKing) {
    // Bonus for having advisors and elephants near king
    for (const { piece } of ownPieces) {
      if (piece.type === PieceType.ADVISOR || piece.type === PieceType.ELEPHANT) {
        score += 3;
      }
    }
  }
  if (!enemyKing) score += 10000; // enemy king captured

  return score;
}
