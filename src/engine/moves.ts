import { Side, PieceType, type Board, type Piece, type Position, type Move } from './types';
import { isInBounds, getPiece } from './board';

/**
 * Generate all pseudo-legal moves for a piece (does NOT check for self-check).
 */
export function generatePieceMoves(board: Board, pos: Position): Move[] {
  const piece = board[pos.row][pos.col];
  if (!piece) return [];

  switch (piece.type) {
    case PieceType.KING: return generateKingMoves(board, pos, piece);
    case PieceType.ADVISOR: return generateAdvisorMoves(board, pos, piece);
    case PieceType.ELEPHANT: return generateElephantMoves(board, pos, piece);
    case PieceType.HORSE: return generateHorseMoves(board, pos, piece);
    case PieceType.ROOK: return generateRookMoves(board, pos, piece);
    case PieceType.CANNON: return generateCannonMoves(board, pos, piece);
    case PieceType.PAWN: return generatePawnMoves(board, pos, piece);
  }
}

function makeMove(piece: Piece, from: Position, to: Position, board: Board): Move {
  return {
    from,
    to,
    piece,
    captured: board[to.row][to.col],
  };
}

function canMoveTo(board: Board, row: number, col: number, side: Side): boolean {
  if (!isInBounds(row, col)) return false;
  const target = board[row][col];
  return !target || target.side !== side;
}

// ---- King (将/帅) ----
// Stays within the palace (3x3 grid)
function generateKingMoves(board: Board, pos: Position, piece: Piece): Move[] {
  const moves: Move[] = [];
  const { row, col } = pos;
  const directions = [[-1, 0], [1, 0], [0, -1], [0, 1]];

  for (const [dr, dc] of directions) {
    const nr = row + dr;
    const nc = col + dc;
    if (isInPalace(nr, nc, piece.side) && canMoveTo(board, nr, nc, piece.side)) {
      moves.push(makeMove(piece, pos, { row: nr, col: nc }, board));
    }
  }
  return moves;
}

function isInPalace(row: number, col: number, side: Side): boolean {
  if (col < 3 || col > 5) return false;
  if (side === Side.RED) return row >= 7 && row <= 9;
  return row >= 0 && row <= 2;
}

// ---- Advisor (士/仕) ----
// Diagonal within palace
function generateAdvisorMoves(board: Board, pos: Position, piece: Piece): Move[] {
  const moves: Move[] = [];
  const { row, col } = pos;
  const directions = [[-1, -1], [-1, 1], [1, -1], [1, 1]];

  for (const [dr, dc] of directions) {
    const nr = row + dr;
    const nc = col + dc;
    if (isInPalace(nr, nc, piece.side) && canMoveTo(board, nr, nc, piece.side)) {
      moves.push(makeMove(piece, pos, { row: nr, col: nc }, board));
    }
  }
  return moves;
}

// ---- Elephant (象/相) ----
// Diagonal 2 steps ("田" shape), can't cross river, blocked by eye piece
function generateElephantMoves(board: Board, pos: Position, piece: Piece): Move[] {
  const moves: Move[] = [];
  const { row, col } = pos;
  const steps: [number, number, number, number][] = [
    [-2, -2, -1, -1], // eye at (-1,-1), target at (-2,-2)
    [-2, 2, -1, 1],
    [2, -2, 1, -1],
    [2, 2, 1, 1],
  ];

  for (const [dr, dc, er, ec] of steps) {
    const nr = row + dr;
    const nc = col + dc;
    const eyeR = row + er;
    const eyeC = col + ec;

    if (!isInBounds(nr, nc)) continue;
    if (!isOnOwnSide(nr, piece.side)) continue; // can't cross river
    if (board[eyeR][eyeC]) continue; // blocked eye
    if (canMoveTo(board, nr, nc, piece.side)) {
      moves.push(makeMove(piece, pos, { row: nr, col: nc }, board));
    }
  }
  return moves;
}

function isOnOwnSide(row: number, side: Side): boolean {
  if (side === Side.RED) return row >= 5;
  return row <= 4;
}

// ---- Horse (马/傌) ----
// L-shape ("日" shape), blocked by leg piece
function generateHorseMoves(board: Board, pos: Position, piece: Piece): Move[] {
  const moves: Move[] = [];
  const { row, col } = pos;
  // [targetDr, targetDc, legDr, legDc]
  const steps: [number, number, number, number][] = [
    [-2, -1, -1, 0],
    [-2, 1, -1, 0],
    [2, -1, 1, 0],
    [2, 1, 1, 0],
    [-1, -2, 0, -1],
    [-1, 2, 0, 1],
    [1, -2, 0, -1],
    [1, 2, 0, 1],
  ];

  for (const [dr, dc, lr, lc] of steps) {
    const nr = row + dr;
    const nc = col + dc;
    const legR = row + lr;
    const legC = col + lc;

    if (!isInBounds(nr, nc)) continue;
    if (board[legR][legC]) continue; // blocked leg
    if (canMoveTo(board, nr, nc, piece.side)) {
      moves.push(makeMove(piece, pos, { row: nr, col: nc }, board));
    }
  }
  return moves;
}

// ---- Rook (车/俥) ----
// Straight lines in 4 directions
function generateRookMoves(board: Board, pos: Position, piece: Piece): Move[] {
  const moves: Move[] = [];
  const directions = [[-1, 0], [1, 0], [0, -1], [0, 1]];

  for (const [dr, dc] of directions) {
    let r = pos.row + dr;
    let c = pos.col + dc;
    while (isInBounds(r, c)) {
      const target = board[r][c];
      if (!target) {
        moves.push(makeMove(piece, pos, { row: r, col: c }, board));
      } else {
        if (target.side !== piece.side) {
          moves.push(makeMove(piece, pos, { row: r, col: c }, board));
        }
        break;
      }
      r += dr;
      c += dc;
    }
  }
  return moves;
}

// ---- Cannon (炮/砲) ----
// Moves like rook, but captures by jumping over exactly one piece
function generateCannonMoves(board: Board, pos: Position, piece: Piece): Move[] {
  const moves: Move[] = [];
  const directions = [[-1, 0], [1, 0], [0, -1], [0, 1]];

  for (const [dr, dc] of directions) {
    let r = pos.row + dr;
    let c = pos.col + dc;
    // Phase 1: move without capture (like rook but can't capture)
    while (isInBounds(r, c)) {
      const target = board[r][c];
      if (!target) {
        moves.push(makeMove(piece, pos, { row: r, col: c }, board));
      } else {
        // Found the "cannon platform", now look for capture target
        r += dr;
        c += dc;
        while (isInBounds(r, c)) {
          const target2 = board[r][c];
          if (target2) {
            if (target2.side !== piece.side) {
              moves.push(makeMove(piece, pos, { row: r, col: c }, board));
            }
            break;
          }
          r += dr;
          c += dc;
        }
        break;
      }
      r += dr;
      c += dc;
    }
  }
  return moves;
}

// ---- Pawn (兵/卒) ----
// Before crossing river: only forward. After: forward, left, right
function generatePawnMoves(board: Board, pos: Position, piece: Piece): Move[] {
  const moves: Move[] = [];
  const { row, col } = pos;
  const forward = piece.side === Side.RED ? -1 : 1;
  const hasCrossedRiver = piece.side === Side.RED ? row <= 4 : row >= 5;

  // Forward
  const nr = row + forward;
  if (isInBounds(nr, col) && canMoveTo(board, nr, col, piece.side)) {
    moves.push(makeMove(piece, pos, { row: nr, col }, board));
  }

  // Sideways (only after crossing river)
  if (hasCrossedRiver) {
    for (const dc of [-1, 1]) {
      const nc = col + dc;
      if (isInBounds(row, nc) && canMoveTo(board, row, nc, piece.side)) {
        moves.push(makeMove(piece, pos, { row, col: nc }, board));
      }
    }
  }

  return moves;
}

/**
 * Generate all pseudo-legal moves for a side.
 */
export function generateAllMoves(board: Board, side: Side): Move[] {
  const moves: Move[] = [];
  for (let row = 0; row < 10; row++) {
    for (let col = 0; col < 9; col++) {
      const piece = board[row][col];
      if (piece && piece.side === side) {
        moves.push(...generatePieceMoves(board, { row, col }));
      }
    }
  }
  return moves;
}
