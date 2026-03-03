import { useState, useCallback, useRef, useEffect } from 'react';
import type { Move, GameState, Position } from '../engine/types';
import { createInitialGameState, makeMove } from '../engine/game';
import type { GameRecordDetail } from '../network/protocol';
import type { RenderState } from '../renderer/canvas';
import GameBoard from './GameBoard';

interface GameReplayProps {
  record: GameRecordDetail;
  onBack: () => void;
}

export default function GameReplay({ record, onBack }: GameReplayProps) {
  // Pre-compute all game states from the moves
  const statesRef = useRef<GameState[]>([]);
  const movesRef = useRef<Move[]>([]);

  if (statesRef.current.length === 0) {
    const states: GameState[] = [createInitialGameState()];
    const fullMoves: Move[] = [];
    let current = states[0];

    for (const mp of record.moves) {
      const piece = current.board[mp.from.row][mp.from.col];
      if (!piece) break;
      const captured = current.board[mp.to.row][mp.to.col];
      const fullMove: Move = { from: mp.from, to: mp.to, piece, captured };
      const next = makeMove(current, fullMove);
      if (!next) break;
      fullMoves.push(fullMove);
      states.push(next);
      current = next;
    }
    statesRef.current = states;
    movesRef.current = fullMoves;
  }

  const [moveIndex, setMoveIndex] = useState(0); // 0 = initial, length = final
  const [autoPlaying, setAutoPlaying] = useState(false);
  const autoPlayRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const totalMoves = movesRef.current.length;
  const currentState = statesRef.current[moveIndex];
  const lastMove = moveIndex > 0 ? movesRef.current[moveIndex - 1] : null;

  const goFirst = useCallback(() => { setMoveIndex(0); setAutoPlaying(false); }, []);
  const goPrev = useCallback(() => { setMoveIndex(i => Math.max(0, i - 1)); }, []);
  const goNext = useCallback(() => { setMoveIndex(i => Math.min(totalMoves, i + 1)); }, [totalMoves]);
  const goLast = useCallback(() => { setMoveIndex(totalMoves); setAutoPlaying(false); }, [totalMoves]);

  const toggleAutoPlay = useCallback(() => {
    setAutoPlaying(prev => !prev);
  }, []);

  useEffect(() => {
    if (autoPlaying) {
      autoPlayRef.current = setInterval(() => {
        setMoveIndex(i => {
          if (i >= totalMoves) {
            setAutoPlaying(false);
            return i;
          }
          return i + 1;
        });
      }, 1500);
    }
    return () => {
      if (autoPlayRef.current) {
        clearInterval(autoPlayRef.current);
        autoPlayRef.current = null;
      }
    };
  }, [autoPlaying, totalMoves]);

  const resultText = record.result === 'red_win' ? '红方胜' : record.result === 'black_win' ? '黑方胜' : '和棋';

  const renderState: RenderState = {
    board: currentState.board,
    selectedPos: null,
    legalMoves: [],
    lastMove,
    isInCheck: currentState.isInCheck,
    currentTurn: currentState.currentTurn,
  };

  // No-op handlers for read-only board
  const noopClick = useCallback((_pos: Position) => {}, []);
  const noopAnim = useCallback(() => {}, []);

  return (
    <div className="game-replay">
      <h2>对局回放</h2>
      <div className="replay-info">
        <span className="record-red">{record.redPlayer}</span>
        <span className="record-vs">VS</span>
        <span className="record-black">{record.blackPlayer}</span>
        <span className="replay-result">{resultText}</span>
      </div>
      <div className="game-container">
        <GameBoard
          renderState={renderState}
          onCellClick={noopClick}
          disabled={true}
          pendingAnimation={null}
          onAnimationDone={noopAnim}
        />
      </div>
      <div className="replay-progress">
        第 {moveIndex} / {totalMoves} 步
      </div>
      <div className="replay-controls">
        <button className="replay-btn" onClick={goFirst} disabled={moveIndex === 0}>⏮</button>
        <button className="replay-btn" onClick={goPrev} disabled={moveIndex === 0}>◀</button>
        <button className="replay-btn" onClick={toggleAutoPlay}>
          {autoPlaying ? '⏸' : '▶'}
        </button>
        <button className="replay-btn" onClick={goNext} disabled={moveIndex >= totalMoves}>▶</button>
        <button className="replay-btn" onClick={goLast} disabled={moveIndex >= totalMoves}>⏭</button>
      </div>
      <button className="lobby-btn secondary" onClick={onBack}>返回列表</button>
    </div>
  );
}
