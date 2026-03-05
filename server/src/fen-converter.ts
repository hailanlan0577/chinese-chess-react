import { Side, PieceType, type Board, type Piece, type Move, type Position } from '../../src/engine/types.js';

/**
 * 棋子 → FEN 字符映射
 * 红方大写，黑方小写（Pikafish UCI 标准）
 */
const PIECE_TO_FEN: Record<string, string> = {
  [`${Side.RED}_${PieceType.KING}`]: 'K',
  [`${Side.RED}_${PieceType.ADVISOR}`]: 'A',
  [`${Side.RED}_${PieceType.ELEPHANT}`]: 'B', // Bishop in UCI
  [`${Side.RED}_${PieceType.HORSE}`]: 'N',    // Knight in UCI
  [`${Side.RED}_${PieceType.ROOK}`]: 'R',
  [`${Side.RED}_${PieceType.CANNON}`]: 'C',
  [`${Side.RED}_${PieceType.PAWN}`]: 'P',
  [`${Side.BLACK}_${PieceType.KING}`]: 'k',
  [`${Side.BLACK}_${PieceType.ADVISOR}`]: 'a',
  [`${Side.BLACK}_${PieceType.ELEPHANT}`]: 'b',
  [`${Side.BLACK}_${PieceType.HORSE}`]: 'n',
  [`${Side.BLACK}_${PieceType.ROOK}`]: 'r',
  [`${Side.BLACK}_${PieceType.CANNON}`]: 'c',
  [`${Side.BLACK}_${PieceType.PAWN}`]: 'p',
};

/**
 * Board 二维数组 → FEN 字符串
 *
 * 棋盘坐标系：
 *   项目 row 0 = 棋盘顶部（黑方底线）= FEN 第一个 rank
 *   项目 col 0 = 棋盘最左列 = FEN file 'a'
 */
export function boardToFen(board: Board, side: Side): string {
  const ranks: string[] = [];

  for (let row = 0; row < 10; row++) {
    let rank = '';
    let emptyCount = 0;

    for (let col = 0; col < 9; col++) {
      const piece = board[row][col];
      if (piece) {
        if (emptyCount > 0) {
          rank += emptyCount;
          emptyCount = 0;
        }
        rank += PIECE_TO_FEN[`${piece.side}_${piece.type}`] || '?';
      } else {
        emptyCount++;
      }
    }

    if (emptyCount > 0) rank += emptyCount;
    ranks.push(rank);
  }

  const sideChar = side === Side.RED ? 'w' : 'b';
  // FEN: position + side + no-castling + no-enpassant + halfmove + fullmove
  return `${ranks.join('/')} ${sideChar} - - 0 1`;
}

/**
 * UCI 走法字符串 → 项目 Move 对象
 *
 * UCI 格式: "h2e2" 表示从 h2 到 e2
 *   file: a-i → col 0-8
 *   rank: 0-9 → row 9-0 （UCI rank 0 = 棋盘底部 row 9）
 */
export function uciMoveToMove(uciMove: string, board: Board): Move | null {
  if (uciMove.length < 4) return null;

  const fromCol = uciMove.charCodeAt(0) - 'a'.charCodeAt(0);
  const fromRow = 9 - parseInt(uciMove[1]);
  const toCol = uciMove.charCodeAt(2) - 'a'.charCodeAt(0);
  const toRow = 9 - parseInt(uciMove[3]);

  // 边界检查
  if (fromRow < 0 || fromRow > 9 || fromCol < 0 || fromCol > 8) return null;
  if (toRow < 0 || toRow > 9 || toCol < 0 || toCol > 8) return null;

  const piece = board[fromRow][fromCol];
  if (!piece) return null;

  const captured = board[toRow][toCol];

  return {
    from: { row: fromRow, col: fromCol },
    to: { row: toRow, col: toCol },
    piece,
    captured,
  };
}
