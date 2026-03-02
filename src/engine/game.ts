import { Side, GameStatus, type Board, type Move, type Position, type GameState } from './types';
import { createInitialBoard, applyMove, oppositeSide } from './board';
import { isInCheck, isCheckmate, isStalemate, getLegalMovesForPos } from './validation';

export function createInitialGameState(): GameState {
  const board = createInitialBoard();
  return {
    board,
    currentTurn: Side.RED,
    moveHistory: [],
    status: GameStatus.PLAYING,
    isInCheck: false,
  };
}

/**
 * Make a move and return the new game state (immutable).
 * Returns null if the move is illegal.
 */
export function makeMove(state: GameState, move: Move): GameState | null {
  if (state.status !== GameStatus.PLAYING) return null;
  if (move.piece.side !== state.currentTurn) return null;

  // Verify move is legal
  const legalMoves = getLegalMovesForPos(state.board, move.from);
  const isLegal = legalMoves.some(
    m => m.to.row === move.to.row && m.to.col === move.to.col
  );
  if (!isLegal) return null;

  const newBoard = applyMove(state.board, move);
  const nextTurn = oppositeSide(state.currentTurn);
  const inCheck = isInCheck(newBoard, nextTurn);

  let status = GameStatus.PLAYING;
  if (isCheckmate(newBoard, nextTurn)) {
    status = state.currentTurn === Side.RED ? GameStatus.RED_WIN : GameStatus.BLACK_WIN;
  } else if (isStalemate(newBoard, nextTurn)) {
    // In Chinese chess, stalemate is a loss for the stalemated side
    status = nextTurn === Side.RED ? GameStatus.BLACK_WIN : GameStatus.RED_WIN;
  }

  return {
    board: newBoard,
    currentTurn: nextTurn,
    moveHistory: [...state.moveHistory, move],
    status,
    isInCheck: inCheck,
  };
}

/**
 * Undo the last move and return the new game state.
 * Returns null if there's no move to undo.
 */
export function undoMove(state: GameState): GameState | null {
  if (state.moveHistory.length === 0) return null;

  const newHistory = state.moveHistory.slice(0, -1);
  // Replay all moves from initial state
  let current = createInitialGameState();
  for (const m of newHistory) {
    const next = makeMove(current, m);
    if (!next) return null; // shouldn't happen
    current = next;
  }
  return current;
}

/**
 * Get legal moves for a piece at the given position.
 */
export function getLegalMovesFor(state: GameState, pos: Position): Move[] {
  const piece = state.board[pos.row][pos.col];
  if (!piece || piece.side !== state.currentTurn) return [];
  return getLegalMovesForPos(state.board, pos);
}
