import { Side, PieceType, type Piece } from './types';

/** Chinese names for pieces */
export const PIECE_NAMES: Record<Side, Record<PieceType, string>> = {
  [Side.RED]: {
    [PieceType.KING]: '帅',
    [PieceType.ADVISOR]: '仕',
    [PieceType.ELEPHANT]: '相',
    [PieceType.HORSE]: '傌',
    [PieceType.ROOK]: '俥',
    [PieceType.CANNON]: '砲',
    [PieceType.PAWN]: '兵',
  },
  [Side.BLACK]: {
    [PieceType.KING]: '将',
    [PieceType.ADVISOR]: '士',
    [PieceType.ELEPHANT]: '象',
    [PieceType.HORSE]: '马',
    [PieceType.ROOK]: '车',
    [PieceType.CANNON]: '炮',
    [PieceType.PAWN]: '卒',
  },
};

/** Base piece values for evaluation */
export const PIECE_VALUES: Record<PieceType, number> = {
  [PieceType.KING]: 10000,
  [PieceType.ADVISOR]: 20,
  [PieceType.ELEPHANT]: 25,
  [PieceType.HORSE]: 40,
  [PieceType.ROOK]: 90,
  [PieceType.CANNON]: 45,
  [PieceType.PAWN]: 10,
};

const R = Side.RED;
const B = Side.BLACK;
const K = PieceType.KING;
const A = PieceType.ADVISOR;
const E = PieceType.ELEPHANT;
const H = PieceType.HORSE;
const Rk = PieceType.ROOK;
const C = PieceType.CANNON;
const P = PieceType.PAWN;

let _id = 0;
function p(side: Side, type: PieceType): Piece {
  return { id: _id++, type, side };
}

/**
 * Initial board layout: 10 rows x 9 cols
 * Row 0 = Black back rank (top), Row 9 = Red back rank (bottom)
 */
export const INITIAL_LAYOUT: (Piece | null)[][] = [
  // Row 0: Black back rank
  [p(B, Rk), p(B, H), p(B, E), p(B, A), p(B, K), p(B, A), p(B, E), p(B, H), p(B, Rk)],
  // Row 1: empty
  [null, null, null, null, null, null, null, null, null],
  // Row 2: Black cannons
  [null, p(B, C), null, null, null, null, null, p(B, C), null],
  // Row 3: Black pawns
  [p(B, P), null, p(B, P), null, p(B, P), null, p(B, P), null, p(B, P)],
  // Row 4: empty (river)
  [null, null, null, null, null, null, null, null, null],
  // Row 5: empty (river)
  [null, null, null, null, null, null, null, null, null],
  // Row 6: Red pawns
  [p(R, P), null, p(R, P), null, p(R, P), null, p(R, P), null, p(R, P)],
  // Row 7: Red cannons
  [null, p(R, C), null, null, null, null, null, p(R, C), null],
  // Row 8: empty
  [null, null, null, null, null, null, null, null, null],
  // Row 9: Red back rank
  [p(R, Rk), p(R, H), p(R, E), p(R, A), p(R, K), p(R, A), p(R, E), p(R, H), p(R, Rk)],
];

export const BOARD_ROWS = 10;
export const BOARD_COLS = 9;
