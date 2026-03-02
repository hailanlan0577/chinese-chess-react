import { Side, type Move } from '../engine/types';
import { PIECE_NAMES } from '../engine/constants';

interface CapturedPiecesProps {
  moveHistory: Move[];
}

export default function CapturedPieces({ moveHistory }: CapturedPiecesProps) {
  const capturedByRed = moveHistory
    .filter(m => m.captured && m.piece.side === Side.RED)
    .map(m => m.captured!);
  const capturedByBlack = moveHistory
    .filter(m => m.captured && m.piece.side === Side.BLACK)
    .map(m => m.captured!);

  return (
    <div className="captured-pieces">
      <div className="captured-group">
        <span className="captured-label">红方吃子：</span>
        <span className="captured-list red-captured">
          {capturedByRed.map((p, i) => (
            <span key={i} className="captured-piece">
              {PIECE_NAMES[p.side][p.type]}
            </span>
          ))}
          {capturedByRed.length === 0 && <span className="no-captures">无</span>}
        </span>
      </div>
      <div className="captured-group">
        <span className="captured-label">黑方吃子：</span>
        <span className="captured-list black-captured">
          {capturedByBlack.map((p, i) => (
            <span key={i} className="captured-piece">
              {PIECE_NAMES[p.side][p.type]}
            </span>
          ))}
          {capturedByBlack.length === 0 && <span className="no-captures">无</span>}
        </span>
      </div>
    </div>
  );
}
