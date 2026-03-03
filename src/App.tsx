import { GameStatus as Status } from './engine/types';
import { useGame, type Level } from './hooks/useGame';
import GameBoard from './components/GameBoard';
import GameControls from './components/GameControls';
import GameStatus from './components/GameStatus';
import CapturedPieces from './components/CapturedPieces';
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

function App() {
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

  const isGameOver = gameState.status !== Status.PLAYING;

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
      <p className="footer">此游戏由海哥用 Claude Code 半小时开发</p>
    </div>
  );
}

export default App;
