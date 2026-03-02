import { GameStatus as Status } from './engine/types';
import { useGame, type Difficulty } from './hooks/useGame';
import GameBoard from './components/GameBoard';
import GameControls from './components/GameControls';
import GameStatus from './components/GameStatus';
import CapturedPieces from './components/CapturedPieces';
import './App.css';

const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  easy: '简单',
  medium: '中等',
  hard: '困难',
  insane: '超级',
};

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
    difficulty,
    setDifficulty,
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
      />
      <div className="game-container">
        <GameBoard
          renderState={renderState}
          onCellClick={handleCellClick}
          disabled={isAIThinking || isGameOver || isAnimating}
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
        />
        <div className="difficulty-selector">
          {(['easy', 'medium', 'hard', 'insane'] as Difficulty[]).map((d) => (
            <button
              key={d}
              className={`diff-btn ${difficulty === d ? 'diff-active' : ''}`}
              onClick={() => setDifficulty(d)}
              disabled={isAIThinking}
            >
              {DIFFICULTY_LABELS[d]}
            </button>
          ))}
        </div>
      </div>
      <CapturedPieces moveHistory={gameState.moveHistory} />
      <p className="footer">此游戏由海哥用 Claude Code 半小时开发</p>
    </div>
  );
}

export default App;
