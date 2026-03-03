import { useOnlineGame } from '../hooks/useOnlineGame';
import type { TypedSocket } from '../network/socket';
import GameBoard from './GameBoard';
import OnlineGameStatus from './OnlineGameStatus';
import ChatPanel from './ChatPanel';
import CapturedPieces from './CapturedPieces';
import Lobby from './Lobby';

interface OnlineGameProps {
  socket: TypedSocket;
  onBack: () => void;
}

export default function OnlineGame({ socket, onBack }: OnlineGameProps) {
  const online = useOnlineGame(socket);

  // Lobby / waiting / matchmaking phases
  if (online.phase === 'lobby' || online.phase === 'waiting' || online.phase === 'matchmaking') {
    return (
      <Lobby
        socket={socket}
        phase={online.phase}
        roomId={online.roomId}
        errorMessage={online.errorMessage}
        onCreateRoom={online.createRoom}
        onJoinRoom={online.joinRoom}
        onJoinQueue={online.joinQueue}
        onCancelQueue={online.cancelQueue}
        onLeaveRoom={online.leaveRoom}
        onBack={onBack}
      />
    );
  }

  // Playing or finished phases
  const handleResign = () => {
    if (window.confirm('确定要认输吗？')) {
      online.resign();
    }
  };

  const handleBackToLobby = () => {
    online.backToLobby();
  };

  return (
    <>
      <h1 className="title">在线对战</h1>

      <OnlineGameStatus
        isMyTurn={online.isMyTurn}
        myColor={online.myColor}
        opponentName={online.opponentName}
        phase={online.phase}
        isInCheck={online.gameState.isInCheck}
        gameResult={online.gameResult}
        opponentDisconnected={online.opponentDisconnected}
        disconnectTimeout={online.disconnectTimeout}
      />

      <div className="game-container">
        <GameBoard
          renderState={online.renderState}
          onCellClick={online.handleCellClick}
          disabled={!online.isMyTurn || online.isAnimating || online.waitingForServer || online.phase === 'finished'}
          pendingAnimation={online.pendingAnimation}
          onAnimationDone={online.onAnimationDone}
          flipped={online.flipped}
        />
      </div>

      {/* Action buttons */}
      {online.phase === 'playing' && (
        <div className="online-game-actions">
          <button className="lobby-btn danger" onClick={handleResign}>
            认输
          </button>
          <button className="lobby-btn secondary" onClick={online.offerDraw}>
            求和
          </button>
        </div>
      )}

      {/* Draw offer received */}
      {online.drawOffered && online.phase === 'playing' && (
        <div className="draw-dialog">
          <span>对手提出和棋</span>
          <button className="lobby-btn" onClick={() => online.respondDraw(true)}>
            接受
          </button>
          <button className="lobby-btn secondary" onClick={() => online.respondDraw(false)}>
            拒绝
          </button>
        </div>
      )}

      {/* Disconnect warning */}
      {online.opponentDisconnected && online.phase === 'playing' && (
        <div className="disconnect-warning">
          对手已断线，等待重连中 ({online.disconnectTimeout}s)
        </div>
      )}

      {/* Error message */}
      {online.errorMessage && (
        <div className="error-message">{online.errorMessage}</div>
      )}

      {/* Chat */}
      <ChatPanel messages={online.chatMessages} onSend={online.sendChat} />

      {/* Captured pieces */}
      <CapturedPieces moveHistory={online.gameState.moveHistory} />

      {/* Game over overlay */}
      {online.phase === 'finished' && online.gameResult && (
        <div className="game-over-overlay">
          <div className={`game-over-result ${getResultClass(online.gameResult.result, online.myColor)}`}>
            {getResultText(online.gameResult.result, online.myColor)}
          </div>
          <div style={{ color: '#8896a6', fontSize: 14 }}>
            {online.gameResult.reason}
          </div>
          <button className="lobby-btn" onClick={handleBackToLobby}>
            返回大厅
          </button>
        </div>
      )}
    </>
  );
}

function getResultText(
  result: 'red_win' | 'black_win' | 'draw',
  myColor: 'red' | 'black' | null
): string {
  if (result === 'draw') return '和棋';
  const iWin =
    (result === 'red_win' && myColor === 'red') ||
    (result === 'black_win' && myColor === 'black');
  return iWin ? '你赢了！' : '你输了';
}

function getResultClass(
  result: 'red_win' | 'black_win' | 'draw',
  myColor: 'red' | 'black' | null
): string {
  if (result === 'draw') return 'result-draw';
  const iWin =
    (result === 'red_win' && myColor === 'red') ||
    (result === 'black_win' && myColor === 'black');
  return iWin ? 'result-win' : 'result-lose';
}
