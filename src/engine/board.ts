import { INITIAL_LAYOUT, BOARD_ROWS, BOARD_COLS } from './constants';
import { Side, PieceType, type Board, type Piece, type Position, type Move } from './types';

export function createInitialBoard(): Board {
  return INITIAL_LAYOUT.map(row =>
    row.map(cell => (cell ? { ...cell } : null))
  );
}

export function cloneBoard(board: Board): Board {
  return board.map(row =>
    row.map(cell => (cell ? { ...cell } : null))
  );
}

export function getPiece(board: Board, pos: Position): Piece | null {
  return board[pos.row][pos.col];
}

export function applyMove(board: Board, move: Move): Board {
  const newBoard = cloneBoard(board);
  newBoard[move.to.row][move.to.col] = newBoard[move.from.row][move.from.col];
  newBoard[move.from.row][move.from.col] = null;
  return newBoard;
}

/** Apply move in-place (for AI search performance) */
export function applyMoveInPlace(board: Board, move: Move): void {
  board[move.to.row][move.to.col] = board[move.from.row][move.from.col];
  board[move.from.row][move.from.col] = null;
}

/** Undo move in-place */
export function undoMoveInPlace(board: Board, move: Move): void {
  board[move.from.row][move.from.col] = move.piece;
  board[move.to.row][move.to.col] = move.captured;
}

export function findKing(board: Board, side: Side): Position | null {
  for (let row = 0; row < BOARD_ROWS; row++) {
    for (let col = 0; col < BOARD_COLS; col++) {
      const piece = board[row][col];
      if (piece && piece.type === PieceType.KING && piece.side === side) {
        return { row, col };
      }
    }
  }
  return null;
}

export function getAllPiecesOfSide(board: Board, side: Side): { piece: Piece; pos: Position }[] {
  const result: { piece: Piece; pos: Position }[] = [];
  for (let row = 0; row < BOARD_ROWS; row++) {
    for (let col = 0; col < BOARD_COLS; col++) {
      const piece = board[row][col];
      if (piece && piece.side === side) {
        result.push({ piece, pos: { row, col } });
      }
    }
  }
  return result;
}

export function isInBounds(row: number, col: number): boolean {
  return row >= 0 && row < BOARD_ROWS && col >= 0 && col < BOARD_COLS;
}

export function oppositeSide(side: Side): Side {
  return side === Side.RED ? Side.BLACK : Side.RED;
}
