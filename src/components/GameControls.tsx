interface GameControlsProps {
  onNewGame: () => void;
  onUndo: () => void;
  canUndo: boolean;
  isAIThinking: boolean;
  redAutoPlay: boolean;
  onToggleAutoPlay: () => void;
}

export default function GameControls({
  onNewGame, onUndo, canUndo, isAIThinking,
  redAutoPlay, onToggleAutoPlay,
}: GameControlsProps) {
  return (
    <div className="game-controls">
      <button onClick={onNewGame} disabled={isAIThinking && !redAutoPlay}>
        新游戏
      </button>
      <button onClick={onUndo} disabled={!canUndo || isAIThinking}>
        悔棋
      </button>
      <button
        className={`auto-play-btn ${redAutoPlay ? 'auto-play-active' : ''}`}
        onClick={onToggleAutoPlay}
      >
        {redAutoPlay ? '取消托管' : '电脑托管'}
      </button>
    </div>
  );
}
