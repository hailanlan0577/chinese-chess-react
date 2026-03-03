import { useState, useEffect } from 'react';
import { GameStatus as Status } from './engine/types';
import { useGame, type Level } from './hooks/useGame';
import { connectSocket, disconnectSocket } from './network/socket';
import type { TypedSocket } from './network/socket';
import GameBoard from './components/GameBoard';
import GameControls from './components/GameControls';
import GameStatus from './components/GameStatus';
import CapturedPieces from './components/CapturedPieces';
import ModeSelector from './components/ModeSelector';
import OnlineGame from './components/OnlineGame';
import GameRecords from './components/GameRecords';
import './App.css';

const LEVEL_LABELS: Record<Level, string> = {
  easy: '简单',
  medium: '中等',
  hard: '困难',
  insane: '超级',
};

const LEVELS: Level[] = ['easy', 'medium', 'hard', 'insane'];

function LevelSelector({ label, value, onChange, disabled }: {
  label: string;
  value: Level;
  onChange: (l: Level) => void;
  disabled: boolean;
}) {
  return (
    <div className="level-row">
      <span className="level-label">{label}</span>
      <div className="level-buttons">
        {LEVELS.map((l) => (
          <button
            key={l}
            className={`diff-btn ${value === l ? 'diff-active' : ''}`}
            onClick={() => onChange(l)}
            disabled={disabled}
          >
            {LEVEL_LABELS[l]}
          </button>
        ))}
      </div>
    </div>
  );
}

type AppMode = 'menu' | 'offline' | 'online' | 'records';

function App() {
  const [mode, setMode] = useState<AppMode>('menu');
  const [socket, setSocket] = useState<TypedSocket | null>(null);

  const {
    gameState,
    renderState,
    isAIThinking,
    isAnimating,
    pendingAnimation,
    onAnimationDone,
    handleCellClick,
    handleNewGame,
    handleUndo,
    redLevel,
    setRedLevel,
    blackLevel,
    setBlackLevel,
    redAutoPlay,
    toggleRedAutoPlay,
  } = useGame();

  // Connect socket when entering online or records mode
  useEffect(() => {
    if (mode === 'online' || mode === 'records') {
      const s = connectSocket();
      setSocket(s);
      return () => {
        disconnectSocket();
        setSocket(null);
      };
    }
  }, [mode]);

  const isGameOver = gameState.status !== Status.PLAYING;

  // Main menu
  if (mode === 'menu') {
    return (
      <div className="app">
        <ModeSelector
          onSelectOffline={() => setMode('offline')}
          onSelectOnline={() => setMode('online')}
          onSelectRecords={() => setMode('records')}
        />
        <p className="footer">此游戏由海哥用 Claude Code 开发</p>
      </div>
    );
  }

  // Online mode
  if (mode === 'online' && socket) {
    return (
      <div className="app">
        <OnlineGame socket={socket} onBack={() => setMode('menu')} />
        <p className="footer">此游戏由海哥用 Claude Code 开发</p>
      </div>
    );
  }

  // Records mode
  if (mode === 'records' && socket) {
    return (
      <div className="app">
        <GameRecords socket={socket} onBack={() => setMode('menu')} />
        <p className="footer">此游戏由海哥用 Claude Code 开发</p>
      </div>
    );
  }

  // Offline mode (default)
  return (
    <div className="app">
      <h1 className="title">中国象棋</h1>
      <GameStatus
        status={gameState.status}
        currentTurn={gameState.currentTurn}
        isInCheck={gameState.isInCheck}
        isAIThinking={isAIThinking}
        redAutoPlay={redAutoPlay}
      />
      <div className="game-container">
        <GameBoard
          renderState={renderState}
          onCellClick={handleCellClick}
          disabled={isAIThinking || isGameOver || isAnimating || redAutoPlay}
          pendingAnimation={pendingAnimation}
          onAnimationDone={onAnimationDone}
        />
      </div>
      <div className="controls-row">
        <GameControls
          onNewGame={handleNewGame}
          onUndo={handleUndo}
          canUndo={gameState.moveHistory.length > 0}
          isAIThinking={isAIThinking}
          redAutoPlay={redAutoPlay}
          onToggleAutoPlay={toggleRedAutoPlay}
        />
      </div>
      <div className="level-selectors">
        <LevelSelector
          label="红方水平"
          value={redLevel}
          onChange={setRedLevel}
          disabled={isAIThinking}
        />
        <LevelSelector
          label="黑方水平"
          value={blackLevel}
          onChange={setBlackLevel}
          disabled={isAIThinking}
        />
      </div>
      <CapturedPieces moveHistory={gameState.moveHistory} />
      <button
        className="lobby-btn secondary"
        style={{ marginTop: 4 }}
        onClick={() => setMode('menu')}
      >
        返回主菜单
      </button>
      <p className="footer">此游戏由海哥用 Claude Code 开发</p>
    </div>
  );
}

export default App;
