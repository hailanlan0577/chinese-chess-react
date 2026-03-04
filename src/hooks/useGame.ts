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
import { playSelect, playMove, playCapture, playCheck, playGameOver, speakMove } from '../renderer/sound';
import { saveRecord } from './useLocalRecords';
import type { MovePayload } from '../network/protocol';
import type { LocalGameRecord } from './useLocalRecords';

export type Level = 'easy' | 'medium' | 'hard' | 'insane';

const LEVEL_TIME: Record<Level, number> = {
  easy: 1000,
  medium: 2000,
  hard: 3000,
  insane: 8000,
};

const LEVEL_LABELS: Record<Level, string> = {
  easy: '简单',
  medium: '中等',
  hard: '困难',
  insane: '超级',
};

export function useGame() {
  const [gameState, setGameState] = useState<GameState>(createInitialGameState);
  const [selectedPos, setSelectedPos] = useState<Position | null>(null);
  const [legalMoves, setLegalMoves] = useState<Move[]>([]);
  const [isAIThinking, setIsAIThinking] = useState(false);
  const [pendingAnimation, setPendingAnimation] = useState<Move | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);

  const [redLevel, setRedLevel] = useState<Level>('medium');
  const [blackLevel, setBlackLevel] = useState<Level>('medium');
  const [redAutoPlay, setRedAutoPlay] = useState(false);

  const aiRef = useRef<AIPlayer | null>(null);
  const pendingStateRef = useRef<{ state: GameState; move: Move } | null>(null);

  // Refs for use in stable callbacks (avoid stale closures)
  const redAutoPlayRef = useRef(redAutoPlay);
  const redLevelRef = useRef(redLevel);
  const blackLevelRef = useRef(blackLevel);
  const gameStateRef = useRef(gameState);

  redAutoPlayRef.current = redAutoPlay;
  redLevelRef.current = redLevel;
  blackLevelRef.current = blackLevel;
  gameStateRef.current = gameState;

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
    speakMove(move);
  }, []);

  const triggerAI = useCallback(async (state: GameState) => {
    if (state.status !== GameStatus.PLAYING) return;
    if (!aiRef.current) return;

    const side = state.currentTurn;
    // Only trigger AI for black, or for red when auto-play is on
    if (side === Side.RED && !redAutoPlayRef.current) return;

    const level = side === Side.RED ? redLevelRef.current : blackLevelRef.current;
    const timeLimit = LEVEL_TIME[level];

    setIsAIThinking(true);
    try {
      const aiMove = await aiRef.current.findBestMove(state.board, side, timeLimit, state.moveHistory);
      if (aiMove) {
        const nextState = makeMove(state, aiMove);
        if (nextState) {
          pendingStateRef.current = { state: nextState, move: aiMove };
          (pendingStateRef as any)._onDone = (ns: GameState) => {
            // Keep isAIThinking true if the next side also needs AI
            const willContinue = ns.status === GameStatus.PLAYING &&
              (ns.currentTurn === Side.BLACK || redAutoPlayRef.current);
            if (!willContinue) {
              setIsAIThinking(false);
            }
            if (ns.status === GameStatus.PLAYING) {
              setTimeout(() => triggerAI(ns), 50);
            }
          };
          setPendingAnimation(aiMove);
          setIsAnimating(true);
          return;
        }
      }
    } catch {
      // AI error
    }
    setIsAIThinking(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
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

  const handleCellClick = useCallback((pos: Position) => {
    if (isAnimating || isAIThinking || redAutoPlayRef.current) return;

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
    aiRef.current?.terminate();
    aiRef.current = new AIPlayer();

    const newState = createInitialGameState();
    setGameState(newState);
    setSelectedPos(null);
    setLegalMoves([]);
    setIsAIThinking(false);
    setPendingAnimation(null);
    setIsAnimating(false);
    pendingStateRef.current = null;
    (pendingStateRef as any)._onDone = undefined;

    if (redAutoPlayRef.current) {
      setTimeout(() => triggerAI(newState), 100);
    }
  }, [triggerAI]);

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

  const toggleRedAutoPlay = useCallback(() => {
    setRedAutoPlay(prev => !prev);
  }, []);

  // When redAutoPlay is enabled, trigger AI if it's red's turn
  useEffect(() => {
    if (redAutoPlay && !isAIThinking && !isAnimating) {
      const gs = gameStateRef.current;
      if (gs.currentTurn === Side.RED && gs.status === GameStatus.PLAYING) {
        triggerAI(gs);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [redAutoPlay]);

  // Save local record when game ends
  const prevStatusRef = useRef(gameState.status);
  useEffect(() => {
    const prev = prevStatusRef.current;
    prevStatusRef.current = gameState.status;

    if (prev !== GameStatus.PLAYING) return;
    const st = gameState.status;
    if (st === GameStatus.PLAYING) return;

    const moves: MovePayload[] = gameState.moveHistory.map(m => ({
      from: m.from,
      to: m.to,
    }));

    const redName = redAutoPlayRef.current
      ? `AI-${LEVEL_LABELS[redLevelRef.current]}`
      : '玩家';
    const blackName = `AI-${LEVEL_LABELS[blackLevelRef.current]}`;

    const result = st === GameStatus.RED_WIN ? 'red_win' as const
      : st === GameStatus.BLACK_WIN ? 'black_win' as const
      : 'draw' as const;

    const record: LocalGameRecord = {
      id: `local_${Date.now()}`,
      redPlayer: redName,
      blackPlayer: blackName,
      result,
      reason: st === GameStatus.DRAW ? '和棋' : '将杀',
      moveCount: moves.length,
      date: new Date().toLocaleDateString('zh-CN'),
      moves,
    };

    saveRecord(record);
  }, [gameState.status, gameState.moveHistory]);

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
    redLevel,
    setRedLevel,
    blackLevel,
    setBlackLevel,
    redAutoPlay,
    toggleRedAutoPlay,
  };
}
