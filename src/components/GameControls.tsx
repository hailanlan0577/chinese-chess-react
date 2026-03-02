interface GameControlsProps {
  onNewGame: () => void;
  onUndo: () => void;
  canUndo: boolean;
  isAIThinking: boolean;
}

export default function GameControls({ onNewGame, onUndo, canUndo, isAIThinking }: GameControlsProps) {
  return (
    <div className="game-controls">
      <button onClick={onNewGame} disabled={isAIThinking}>
        新游戏
      </button>
      <button onClick={onUndo} disabled={!canUndo || isAIThinking}>
        悔棋
      </button>
    </div>
  );
}
