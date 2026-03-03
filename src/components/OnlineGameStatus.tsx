interface OnlineGameStatusProps {
  isMyTurn: boolean;
  myColor: 'red' | 'black' | null;
  opponentName: string | null;
  phase: string;
  isInCheck: boolean;
  gameResult?: { result: 'red_win' | 'black_win' | 'draw'; reason: string } | null;
  opponentDisconnected: boolean;
  disconnectTimeout: number;
}

export default function OnlineGameStatus({
  isMyTurn,
  myColor,
  opponentName,
  phase,
  isInCheck,
  gameResult,
  opponentDisconnected,
  disconnectTimeout,
}: OnlineGameStatusProps) {
  let message: string;
  let className = 'online-status';

  if (phase === 'finished' && gameResult) {
    const { result, reason } = gameResult;
    if (result === 'draw') {
      message = `和棋 - ${reason}`;
      className += ' result-draw';
    } else {
      const winnerIsMe =
        (result === 'red_win' && myColor === 'red') ||
        (result === 'black_win' && myColor === 'black');
      if (winnerIsMe) {
        message = `你赢了！ - ${reason}`;
        className += ' result-win';
      } else {
        message = `你输了 - ${reason}`;
        className += ' result-lose';
      }
    }
  } else if (opponentDisconnected) {
    message = `对手已断线 (${disconnectTimeout}s)`;
    className += ' opponent-turn';
  } else if (isMyTurn) {
    message = '你的回合';
    if (isInCheck) message += ' - 将军！';
    className += ' my-turn';
  } else {
    message = opponentName ? `${opponentName} 思考中...` : '对手思考中...';
    if (isInCheck) message += ' - 将军！';
    className += ' opponent-turn';
  }

  return <div className={className}>{message}</div>;
}
