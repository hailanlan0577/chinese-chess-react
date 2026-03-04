import { type Board, type Side, type Move } from '../engine/types';
import { cloneBoard } from '../engine/board';
import { findBestMove } from './search';

self.onmessage = (e: MessageEvent) => {
  const { board, side, timeLimit, moveHistory } = e.data as {
    board: Board;
    side: Side;
    timeLimit?: number;
    moveHistory?: Move[];
  };

  const boardCopy = cloneBoard(board);
  const bestMove = findBestMove(boardCopy, side, timeLimit, moveHistory);

  self.postMessage({ bestMove });
};
