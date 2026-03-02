import { type Board, type Side } from '../engine/types';
import { cloneBoard } from '../engine/board';
import { findBestMove } from './search';

self.onmessage = (e: MessageEvent) => {
  const { board, side, timeLimit } = e.data as {
    board: Board;
    side: Side;
    timeLimit?: number;
  };

  const boardCopy = cloneBoard(board);
  const bestMove = findBestMove(boardCopy, side, timeLimit);

  self.postMessage({ bestMove });
};
