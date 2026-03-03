import { useState, useEffect } from 'react';
import type { TypedSocket } from '../network/socket';

interface LobbyProps {
  socket: TypedSocket;
  phase: 'lobby' | 'waiting' | 'matchmaking';
  roomId: string | null;
  errorMessage: string | null;
  onCreateRoom: (nickname: string) => void;
  onJoinRoom: (roomId: string, nickname: string) => void;
  onJoinQueue: (nickname: string) => void;
  onCancelQueue: () => void;
  onLeaveRoom: () => void;
  onBack: () => void;
}

export default function Lobby({
  socket,
  phase,
  roomId,
  errorMessage,
  onCreateRoom,
  onJoinRoom,
  onJoinQueue,
  onCancelQueue,
  onLeaveRoom,
  onBack,
}: LobbyProps) {
  const [nickname, setNickname] = useState(() =>
    localStorage.getItem('chess-nickname') || '棋友'
  );
  const [joinCode, setJoinCode] = useState('');
  const [copied, setCopied] = useState(false);

  // Save nickname to localStorage when it changes
  useEffect(() => {
    localStorage.setItem('chess-nickname', nickname);
  }, [nickname]);

  // Suppress unused variable warning for socket
  void socket;

  const handleCopyCode = async () => {
    if (!roomId) return;
    try {
      await navigator.clipboard.writeText(roomId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback: do nothing
    }
  };

  if (phase === 'waiting') {
    return (
      <div className="lobby">
        <h2>在线对战</h2>
        <p className="waiting-text">等待对手加入...</p>
        <div
          className="room-code-display"
          onClick={handleCopyCode}
          title="点击复制房间号"
        >
          {roomId}
        </div>
        {copied && <p style={{ color: '#4ade80', fontSize: 13, textAlign: 'center' }}>已复制</p>}
        <button className="lobby-btn secondary" onClick={onLeaveRoom}>取消</button>
      </div>
    );
  }

  if (phase === 'matchmaking') {
    return (
      <div className="lobby">
        <h2>在线对战</h2>
        <p className="waiting-text">匹配中...</p>
        <button className="lobby-btn secondary" onClick={onCancelQueue}>取消匹配</button>
      </div>
    );
  }

  // phase === 'lobby'
  return (
    <div className="lobby">
      <h2>在线对战</h2>

      <div className="lobby-section">
        <h3>昵称</h3>
        <input
          className="lobby-input"
          type="text"
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          placeholder="输入昵称"
          maxLength={12}
        />
      </div>

      <div className="lobby-section">
        <h3>创建房间</h3>
        <button
          className="lobby-btn"
          onClick={() => onCreateRoom(nickname || '棋友')}
        >
          创建房间
        </button>
      </div>

      <div className="lobby-section">
        <h3>加入房间</h3>
        <div className="join-row">
          <input
            className="lobby-input"
            type="text"
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value.toUpperCase().slice(0, 6))}
            placeholder="房间号"
            maxLength={6}
          />
          <button
            className="lobby-btn"
            onClick={() => onJoinRoom(joinCode, nickname || '棋友')}
            disabled={joinCode.length === 0}
          >
            加入房间
          </button>
        </div>
      </div>

      <div className="lobby-section">
        <h3>随机匹配</h3>
        <button
          className="lobby-btn"
          onClick={() => onJoinQueue(nickname || '棋友')}
        >
          随机匹配
        </button>
      </div>

      {errorMessage && (
        <div className="error-message">{errorMessage}</div>
      )}

      <button className="lobby-btn secondary" onClick={onBack}>返回</button>
    </div>
  );
}
