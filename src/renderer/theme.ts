export const THEME = {
  // Board
  boardBg: '#d4a04a',
  boardBgLight: '#e8c373',
  boardBgDark: '#b8862d',
  boardFrame: '#6b3a1f',
  boardFrameLight: '#8b5e3c',
  boardFrameHighlight: '#a67c52',
  lineColor: '#5a3418',
  lineWidth: 1.3,
  riverText: '楚 河          汉 界',
  riverColor: '#7a4a28',

  // Piece 3D
  redPieceGradientCenter: '#fff8ee',
  redPieceGradientEdge: '#e0c090',
  redPieceColor: '#b02020',
  redPieceBorder: '#7a1818',
  redPieceShadow: 'rgba(120, 20, 20, 0.35)',

  blackPieceGradientCenter: '#f8f4ee',
  blackPieceGradientEdge: '#c0b8a8',
  blackPieceColor: '#1a1a30',
  blackPieceBorder: '#2a2a3a',
  blackPieceShadow: 'rgba(20, 20, 40, 0.35)',

  // Highlights
  selectedColor: 'rgba(200, 160, 50, 0.5)',
  legalMoveColor: 'rgba(160, 200, 60, 0.6)',
  lastMoveColor: 'rgba(220, 180, 60, 0.35)',
  checkColor: 'rgba(200, 60, 40, 0.5)',
};

export interface BoardDimensions {
  cellSize: number;
  padding: number;
  frameWidth: number;
  pieceRadius: number;
  pieceBorderWidth: number;
  pieceFont: string;
  riverFont: string;
  legalMoveRadius: number;
  starSize: number;
  width: number;
  height: number;
}

export function computeDimensions(containerWidth: number): BoardDimensions {
  const maxWidth = Math.min(containerWidth, 560);
  const cellSize = Math.floor(maxWidth / 9.8);
  const padding = Math.floor(cellSize * 0.55);
  const frameWidth = Math.floor(cellSize * 0.38);
  const pieceRadius = Math.floor(cellSize * 0.44);
  const fontSize = Math.max(15, Math.floor(cellSize * 0.42));
  const riverFontSize = Math.max(14, Math.floor(cellSize * 0.36));

  const innerW = padding * 2 + cellSize * 8;
  const innerH = padding * 2 + cellSize * 9;

  return {
    cellSize,
    padding: padding + frameWidth,
    frameWidth,
    pieceRadius,
    pieceBorderWidth: Math.max(1.8, cellSize * 0.04),
    pieceFont: `bold ${fontSize}px serif`,
    riverFont: `italic ${riverFontSize}px "LXGW WenKai", "KaiTi", "STKaiti", serif`,
    legalMoveRadius: Math.max(5, Math.floor(cellSize * 0.12)),
    starSize: Math.max(3, Math.floor(cellSize * 0.07)),
    width: innerW + frameWidth * 2,
    height: innerH + frameWidth * 2,
  };
}
