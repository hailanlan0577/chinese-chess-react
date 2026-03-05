import { Side, GameStatus as Status } from '../engine/types';

interface GameStatusProps {
  status: Status;
  currentTurn: Side;
  isInCheck: boolean;
  isAIThinking: boolean;
  redAutoPlay: boolean;
  aiEngine: 'pikafish' | 'local';
}

export default function GameStatus({
  status, currentTurn, isInCheck, isAIThinking, redAutoPlay, aiEngine,
}: GameStatusProps) {
  let message: string;
  let className = 'game-status';

  const engineLabel = aiEngine === 'pikafish' ? 'Pikafish' : '本地AI';
  const thinkingText = aiEngine === 'pikafish' ? 'Pikafish 思考中...' : '本地AI思考中...';

  if (status === Status.RED_WIN) {
    message = '红方胜！';
    className += ' status-win';
  } else if (status === Status.BLACK_WIN) {
    message = '黑方胜！';
    className += ' status-lose';
  } else if (status === Status.DRAW) {
    message = '和棋';
    className += ' status-draw';
  } else if (redAutoPlay) {
    message = `电脑对弈中...(${engineLabel})`;
    className += ' status-thinking';
  } else if (isAIThinking) {
    message = thinkingText;
    className += ' status-thinking';
  } else if (isInCheck) {
    message = currentTurn === Side.RED ? '红方被将军！' : '黑方被将军！';
    className += ' status-check';
  } else {
    message = currentTurn === Side.RED ? '红方走棋' : '黑方走棋';
  }

  const showEngine = status === Status.PLAYING && !isAIThinking && !redAutoPlay;

  return (
    <div className={className}>
      {message}
      {showEngine && (
        <div style={{ fontSize: '0.7em', opacity: 0.6, marginTop: 2 }}>
          引擎: {engineLabel}
        </div>
      )}
    </div>
  );
}
