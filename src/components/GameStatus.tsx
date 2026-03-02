import { Side, GameStatus as Status } from '../engine/types';

interface GameStatusProps {
  status: Status;
  currentTurn: Side;
  isInCheck: boolean;
  isAIThinking: boolean;
}

export default function GameStatus({ status, currentTurn, isInCheck, isAIThinking }: GameStatusProps) {
  let message: string;
  let className = 'game-status';

  if (status === Status.RED_WIN) {
    message = '红方胜！';
    className += ' status-win';
  } else if (status === Status.BLACK_WIN) {
    message = '黑方胜！';
    className += ' status-lose';
  } else if (status === Status.DRAW) {
    message = '和棋';
    className += ' status-draw';
  } else if (isAIThinking) {
    message = '电脑思考中...';
    className += ' status-thinking';
  } else if (isInCheck) {
    message = currentTurn === Side.RED ? '红方被将军！' : '黑方被将军！';
    className += ' status-check';
  } else {
    message = currentTurn === Side.RED ? '红方走棋' : '黑方走棋';
  }

  return <div className={className}>{message}</div>;
}
