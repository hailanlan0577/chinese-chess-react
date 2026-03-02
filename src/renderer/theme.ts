export const THEME = {
  // Board
  boardBg: '#d4a04a',
  boardBgLight: '#e8c373',
  boardBgDark: '#b8862d',
  boardFrame: '#6b3a1f',
  boardFrameLight: '#8b5e3c',
  boardFrameHighlight: '#a67c52',
  lineColor: '#4a2810',
  lineWidth: 1.2,
  riverText: '楚 河          汉 界',
  riverColor: '#4a2810',

  // Piece 3D
  redPieceGradientCenter: '#fff5e6',
  redPieceGradientEdge: '#e8c9a0',
  redPieceColor: '#b22222',
  redPieceBorder: '#8b1a1a',
  redPieceShadow: 'rgba(139, 26, 26, 0.3)',

  blackPieceGradientCenter: '#f5f0e8',
  blackPieceGradientEdge: '#c8bfb0',
  blackPieceColor: '#1a1a2e',
  blackPieceBorder: '#0d0d1a',
  blackPieceShadow: 'rgba(13, 13, 26, 0.3)',

  // Highlights
  selectedColor: 'rgba(52, 152, 219, 0.45)',
  legalMoveColor: 'rgba(46, 204, 113, 0.55)',
  lastMoveColor: 'rgba(241, 196, 15, 0.3)',
  checkColor: 'rgba(231, 76, 60, 0.5)',
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
  // Total width = frameWidth*2 + padding*2 + cellSize*8
  // frame = cellSize*0.2, padding = cellSize*0.45
  // cellSize*(0.4 + 0.9 + 8) = cellSize * 9.3 <= maxWidth
  const cellSize = Math.floor(maxWidth / 9.5);
  const padding = Math.floor(cellSize * 0.5);
  const frameWidth = Math.floor(cellSize * 0.22);
  const pieceRadius = Math.floor(cellSize * 0.42);
  const fontSize = Math.max(14, Math.floor(cellSize * 0.38));
  const riverFontSize = Math.max(12, Math.floor(cellSize * 0.34));

  const innerW = padding * 2 + cellSize * 8;
  const innerH = padding * 2 + cellSize * 9;

  return {
    cellSize,
    padding: padding + frameWidth, // offset grid by frame
    frameWidth,
    pieceRadius,
    pieceBorderWidth: Math.max(1.5, cellSize * 0.035),
    pieceFont: `bold ${fontSize}px "KaiTi", "STKaiti", "SimSun", serif`,
    riverFont: `${riverFontSize}px serif`,
    legalMoveRadius: Math.max(5, Math.floor(cellSize * 0.13)),
    starSize: Math.max(3, Math.floor(cellSize * 0.065)),
    width: innerW + frameWidth * 2,
    height: innerH + frameWidth * 2,
  };
}
