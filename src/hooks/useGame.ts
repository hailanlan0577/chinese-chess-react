import { useState, useCallback, useRef, useEffect } from 'react';
import {
  Side,
  GameStatus,
  type Position,
  type Move,
  type GameState,
} from '../engine/types';
import { createInitialGameState, makeMove, undoMove, getLegalMovesFor } from '../engine/game';
import type { RenderState } from '../renderer/canvas';
import { AIPlayer } from '../ai';
import { playSelect, playMove, playCapture, playCheck, playGameOver } from '../renderer/sound';

export type Difficulty = 'easy' | 'medium' | 'hard' | 'insane';

const DIFFICULTY_TIME: Record<Difficulty, number> = {
  easy: 1000,
  medium: 2000,
  hard: 3000,
  insane: 8000,
};

export function useGame() {
  const [gameState, setGameState] = useState<GameState>(createInitialGameState);
  const [selectedPos, setSelectedPos] = useState<Position | null>(null);
  const [legalMoves, setLegalMoves] = useState<Move[]>([]);
  const [isAIThinking, setIsAIThinking] = useState(false);
  const [pendingAnimation, setPendingAnimation] = useState<Move | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const aiRef = useRef<AIPlayer | null>(null);
  const pendingStateRef = useRef<{ state: GameState; move: Move } | null>(null);

  useEffect(() => {
    aiRef.current = new AIPlayer();
    return () => {
      aiRef.current?.terminate();
    };
  }, []);

  const lastMove = gameState.moveHistory.length > 0
    ? gameState.moveHistory[gameState.moveHistory.length - 1]
    : null;

  const playSoundForMove = useCallback((move: Move, newState: GameState) => {
    if (newState.status !== GameStatus.PLAYING) {
      playGameOver();
    } else if (newState.isInCheck) {
      if (move.captured) playCapture();
      playCheck();
    } else if (move.captured) {
      playCapture();
    } else {
      playMove();
    }
  }, []);

  const applyMoveWithAnimation = useCallback((state: GameState, move: Move, onDone: (nextState: GameState) => void) => {
    const nextState = makeMove(state, move);
    if (!nextState) return;

    // Store the result to apply after animation
    pendingStateRef.current = { state: nextState, move };
    // Start animation on the OLD board (piece flies from -> to)
    setPendingAnimation(move);
    setIsAnimating(true);

    // The callback will be called from onAnimationDone
    pendingStateRef.current = { state: nextState, move };
    (pendingStateRef as any)._onDone = onDone;
  }, []);

  const onAnimationDone = useCallback(() => {
    const pending = pendingStateRef.current;
    if (!pending) return;

    const { state: nextState, move } = pending;
    const onDone = (pendingStateRef as any)._onDone as ((s: GameState) => void) | undefined;

    playSoundForMove(move, nextState);
    setGameState(nextState);
    setPendingAnimation(null);
    setIsAnimating(false);
    pendingStateRef.current = null;
    (pendingStateRef as any)._onDone = undefined;

    if (onDone) onDone(nextState);
  }, [playSoundForMove]);

  const triggerAI = useCallback(async (state: GameState) => {
    if (state.status !== GameStatus.PLAYING) return;
    if (state.currentTurn !== Side.BLACK) return;
    if (!aiRef.current) return;

    setIsAIThinking(true);
    try {
      const timeLimit = DIFFICULTY_TIME[difficulty];
      const aiMove = await aiRef.current.findBestMove(state.board, Side.BLACK, timeLimit);
      if (aiMove) {
        // Animate AI move
        const nextState = makeMove(state, aiMove);
        if (nextState) {
          pendingStateRef.current = { state: nextState, move: aiMove };
          (pendingStateRef as any)._onDone = () => {
            setIsAIThinking(false);
          };
          setPendingAnimation(aiMove);
          setIsAnimating(true);
          return; // AI thinking ends after animation
        }
      }
    } catch {
      // AI error
    }
    setIsAIThinking(false);
  }, [difficulty]);

  const handleCellClick = useCallback((pos: Position) => {
    if (isAnimating || isAIThinking) return;

    setGameState(prev => {
      if (prev.status !== GameStatus.PLAYING) return prev;
      if (prev.currentTurn !== Side.RED) return prev;

      const clickedPiece = prev.board[pos.row][pos.col];

      if (selectedPos) {
        const move = legalMoves.find(m => m.to.row === pos.row && m.to.col === pos.col);
        if (move) {
          // Apply with animation
          const nextState = makeMove(prev, move);
          if (nextState) {
            setSelectedPos(null);
            setLegalMoves([]);

            pendingStateRef.current = { state: nextState, move };
            (pendingStateRef as any)._onDone = (ns: GameState) => {
              setTimeout(() => triggerAI(ns), 50);
            };
            setPendingAnimation(move);
            setIsAnimating(true);

            // Don't update gameState yet - wait for animation
            return prev;
          }
        }
      }

      if (clickedPiece && clickedPiece.side === Side.RED) {
        playSelect();
        const moves = getLegalMovesFor(prev, pos);
        setSelectedPos(pos);
        setLegalMoves(moves);
        return prev;
      }

      setSelectedPos(null);
      setLegalMoves([]);
      return prev;
    });
  }, [selectedPos, legalMoves, isAIThinking, isAnimating, triggerAI]);

  const handleNewGame = useCallback(() => {
    setGameState(createInitialGameState());
    setSelectedPos(null);
    setLegalMoves([]);
    setIsAIThinking(false);
    setPendingAnimation(null);
    setIsAnimating(false);
  }, []);

  const handleUndo = useCallback(() => {
    if (isAIThinking || isAnimating) return;
    setGameState(prev => {
      let state = undoMove(prev);
      if (state && state.currentTurn === Side.BLACK) {
        state = undoMove(state) || state;
      }
      if (state) {
        setSelectedPos(null);
        setLegalMoves([]);
        return state;
      }
      return prev;
    });
  }, [isAIThinking, isAnimating]);

  const renderState: RenderState = {
    board: gameState.board,
    selectedPos,
    legalMoves: legalMoves.map(m => m.to),
    lastMove,
    isInCheck: gameState.isInCheck,
    currentTurn: gameState.currentTurn,
  };

  return {
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
  };
}
