export enum Side {
  RED = 'red',
  BLACK = 'black',
}

export enum PieceType {
  KING = 'king',       // 将/帅
  ADVISOR = 'advisor', // 士/仕
  ELEPHANT = 'elephant', // 象/相
  HORSE = 'horse',     // 马/傌
  ROOK = 'rook',       // 车/俥
  CANNON = 'cannon',   // 炮/砲
  PAWN = 'pawn',       // 兵/卒
}

export interface Piece {
  id: number;
  type: PieceType;
  side: Side;
}

export interface Position {
  row: number; // 0-9, row 0 = top (black side), row 9 = bottom (red side)
  col: number; // 0-8
}

export interface Move {
  from: Position;
  to: Position;
  piece: Piece;
  captured: Piece | null;
}

/** 10 rows x 9 cols */
export type Board = (Piece | null)[][];

export enum GameStatus {
  PLAYING = 'playing',
  RED_WIN = 'red_win',
  BLACK_WIN = 'black_win',
  DRAW = 'draw',
}

export interface GameState {
  board: Board;
  currentTurn: Side;
  moveHistory: Move[];
  status: GameStatus;
  isInCheck: boolean;
}
