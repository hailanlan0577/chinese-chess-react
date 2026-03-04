import { Side, type Board, type Move } from '../engine/types';
import { applyMoveInPlace, undoMoveInPlace, oppositeSide, boardToKey } from '../engine/board';
import { getAllLegalMoves } from '../engine/validation';
import { PIECE_VALUES } from '../engine/constants';
import { evaluate } from './evaluate';

const INF = 999999;

/** Time limit for search in ms (default, can be overridden) */
let TIME_LIMIT = 3000;

let searchStartTime = 0;
let timeUp = false;

function isTimeUp(): boolean {
  if (timeUp) return true;
  if (performance.now() - searchStartTime > TIME_LIMIT) {
    timeUp = true;
    return true;
  }
  return false;
}

/**
 * MVV-LVA move ordering. Captures first, sorted by victim value desc then attacker value asc.
 */
function sortMoves(moves: Move[]): void {
  moves.sort((a, b) => {
    const aScore = a.captured ? PIECE_VALUES[a.captured.type] * 10 - PIECE_VALUES[a.piece.type] : -1000;
    const bScore = b.captured ? PIECE_VALUES[b.captured.type] * 10 - PIECE_VALUES[b.piece.type] : -1000;
    return bScore - aScore;
  });
}

/**
 * Quiescence search: only search captures to avoid horizon effect.
 */
function quiescence(board: Board, side: Side, alpha: number, beta: number): number {
  const standPat = evaluate(board, side);
  if (standPat >= beta) return beta;
  if (standPat > alpha) alpha = standPat;

  if (isTimeUp()) return alpha;

  const moves = getAllLegalMoves(board, side);
  // Only consider captures
  const captures = moves.filter(m => m.captured !== null);
  sortMoves(captures);

  for (const move of captures) {
    applyMoveInPlace(board, move);
    const score = -quiescence(board, oppositeSide(side), -beta, -alpha);
    undoMoveInPlace(board, move);

    if (score >= beta) return beta;
    if (score > alpha) alpha = score;
  }

  return alpha;
}

/**
 * Negamax with Alpha-Beta pruning + quiescence search.
 */
function negamax(
  board: Board,
  side: Side,
  depth: number,
  maxDepth: number,
  alpha: number,
  beta: number,
): number {
  if (isTimeUp()) return evaluate(board, side);

  if (depth === 0) {
    return quiescence(board, side, alpha, beta);
  }

  const moves = getAllLegalMoves(board, side);

  if (moves.length === 0) {
    return -INF + (maxDepth - depth);
  }

  sortMoves(moves);

  let bestScore = -INF;

  for (const move of moves) {
    applyMoveInPlace(board, move);
    const score = -negamax(board, oppositeSide(side), depth - 1, maxDepth, -beta, -alpha);
    undoMoveInPlace(board, move);

    if (isTimeUp()) return bestScore === -INF ? evaluate(board, side) : bestScore;

    if (score > bestScore) bestScore = score;
    if (score > alpha) alpha = score;
    if (alpha >= beta) break;
  }

  return bestScore;
}

/** Repetition penalty: mild enough that AI still repeats when no better option exists */
const REPETITION_PENALTY = 15;

/**
 * Build a set of position keys from game history for repetition penalty.
 */
function buildPositionCounts(board: Board, moveHistory: Move[]): Map<string, number> {
  const counts = new Map<string, number>();
  const boardCopy = board.map(row => row.map(cell => cell ? { ...cell } : null));
  const keys: string[] = [];
  keys.push(boardToKey(boardCopy));

  for (let i = moveHistory.length - 1; i >= 0; i--) {
    undoMoveInPlace(boardCopy, moveHistory[i]);
    keys.push(boardToKey(boardCopy));
  }

  for (const key of keys) {
    counts.set(key, (counts.get(key) || 0) + 1);
  }

  return counts;
}

/**
 * Iterative deepening search with time limit.
 * Searches deeper until time runs out (~3 seconds).
 */
export function findBestMove(board: Board, side: Side, timeLimit?: number, moveHistory?: Move[]): Move | null {
  if (timeLimit) TIME_LIMIT = timeLimit;
  const moves = getAllLegalMoves(board, side);
  if (moves.length === 0) return null;
  if (moves.length === 1) return moves[0]; // only one legal move

  searchStartTime = performance.now();
  timeUp = false;

  // Build position counts from history for repetition penalty
  const positionCounts = moveHistory && moveHistory.length > 0
    ? buildPositionCounts(board, moveHistory)
    : null;

  sortMoves(moves);

  let bestMove: Move = moves[0];
  const MAX_ITER_DEPTH = 12;

  // Iterative deepening: search depth 1, 2, 3, ... until time runs out
  for (let depth = 1; depth <= MAX_ITER_DEPTH; depth++) {
    let currentBest: Move | null = null;
    let currentBestScore = -INF;

    for (const move of moves) {
      applyMoveInPlace(board, move);
      let score = -negamax(board, oppositeSide(side), depth - 1, depth, -INF, -currentBestScore);

      // Apply mild penalty for positions seen before (don't block, just discourage)
      if (positionCounts && !timeUp) {
        const key = boardToKey(board);
        const count = positionCounts.get(key) || 0;
        if (count > 0) {
          score -= REPETITION_PENALTY * count;
        }
      }

      undoMoveInPlace(board, move);

      if (timeUp) break;

      if (score > currentBestScore) {
        currentBestScore = score;
        currentBest = move;
      }
    }

    // Only use this depth's result if we completed it (not interrupted)
    if (!timeUp && currentBest) {
      bestMove = currentBest;

      // If we found a checkmate, stop searching
      if (currentBestScore > INF - 100) break;
    }

    if (timeUp) break;
  }

  return bestMove;
}
