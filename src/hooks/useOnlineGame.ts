import { useState, useCallback, useRef, useEffect } from 'react';
import { Side, GameStatus, type Position, type Move, type GameState } from '../engine/types';
import { createInitialGameState, makeMove, getLegalMovesFor } from '../engine/game';
import type { RenderState } from '../renderer/canvas';
import type { TypedSocket } from '../network/socket';
import type { PlayerColor, RoomInfo, ChatMessage, MovePayload } from '../network/protocol';
import { playSelect, playMove, playCapture, playCheck, playGameOver, speakMove } from '../renderer/sound';

export type OnlinePhase = 'lobby' | 'waiting' | 'matchmaking' | 'playing' | 'finished';

export function useOnlineGame(socket: TypedSocket) {
  // ---- Core game state ----
  const [gameState, setGameState] = useState<GameState>(createInitialGameState);
  const [selectedPos, setSelectedPos] = useState<Position | null>(null);
  const [legalMoves, setLegalMoves] = useState<Move[]>([]);
  const [pendingAnimation, setPendingAnimation] = useState<Move | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);

  // ---- Online state ----
  const [phase, setPhase] = useState<OnlinePhase>('lobby');
  const [myColor, setMyColor] = useState<PlayerColor | null>(null);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [roomInfo, setRoomInfo] = useState<RoomInfo | null>(null);
  const [opponentName, setOpponentName] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [drawOffered, setDrawOffered] = useState(false);
  const [opponentDisconnected, setOpponentDisconnected] = useState(false);
  const [disconnectTimeout, setDisconnectTimeout] = useState(0);
  const [waitingForServer, setWaitingForServer] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // ---- Refs ----
  const pendingStateRef = useRef<{ state: GameState; move: Move } | null>(null);
  const gameStateRef = useRef(gameState);
  gameStateRef.current = gameState;

  const myColorRef = useRef(myColor);
  myColorRef.current = myColor;

  const disconnectTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ---- Computed ----
  const isMyTurn = myColor === 'red'
    ? gameState.currentTurn === Side.RED
    : gameState.currentTurn === Side.BLACK;
  const flipped = myColor === 'black';

  // ---- Sound helper (same as useGame) ----
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

  // ---- Animation done callback ----
  const onAnimationDone = useCallback(() => {
    const pending = pendingStateRef.current;
    if (!pending) return;

    const { state: nextState, move } = pending;
    playSoundForMove(move, nextState);
    setGameState(nextState);
    setPendingAnimation(null);
    setIsAnimating(false);
    pendingStateRef.current = null;
  }, [playSoundForMove]);

  // ---- Clear disconnect countdown ----
  const clearDisconnectTimer = useCallback(() => {
    if (disconnectTimerRef.current) {
      clearInterval(disconnectTimerRef.current);
      disconnectTimerRef.current = null;
    }
  }, []);

  // ---- Socket event listeners ----
  useEffect(() => {
    if (!socket) return;

    const onGameStart = (data: { room: RoomInfo; yourColor: PlayerColor }) => {
      setPhase('playing');
      setMyColor(data.yourColor);
      setRoomInfo(data.room);
      setRoomId(data.room.roomId);
      // Find opponent name
      const me = data.room.players.find(p => p.color === data.yourColor);
      const opponent = data.room.players.find(p => p.color !== data.yourColor);
      setOpponentName(opponent?.nickname ?? null);
      // Reset game state
      setGameState(createInitialGameState());
      setSelectedPos(null);
      setLegalMoves([]);
      setPendingAnimation(null);
      setIsAnimating(false);
      pendingStateRef.current = null;
      setWaitingForServer(false);
      setDrawOffered(false);
      setOpponentDisconnected(false);
      setChatMessages([]);
      setErrorMessage(null);
      clearDisconnectTimer();
      // Suppress unused variable warning
      void me;
    };

    const onGameMove = (data: { move: MovePayload }) => {
      // Opponent's move - build full Move from board
      const currentState = gameStateRef.current;
      const { from, to } = data.move;
      const piece = currentState.board[from.row][from.col];
      if (!piece) return; // shouldn't happen

      const captured = currentState.board[to.row][to.col];
      const fullMove: Move = { from, to, piece, captured };

      const nextState = makeMove(currentState, fullMove);
      if (!nextState) return; // shouldn't happen

      // Animate then apply
      pendingStateRef.current = { state: nextState, move: fullMove };
      setPendingAnimation(fullMove);
      setIsAnimating(true);
    };

    const onGameOver = (data: { result: 'red_win' | 'black_win' | 'draw'; reason: string }) => {
      setPhase('finished');
      playGameOver();
      clearDisconnectTimer();
    };

    const onDrawOffered = () => {
      setDrawOffered(true);
    };

    const onDrawDeclined = () => {
      setDrawOffered(false);
    };

    const onOpponentDisconnected = (data: { timeout: number }) => {
      setOpponentDisconnected(true);
      setDisconnectTimeout(data.timeout);
      clearDisconnectTimer();
      disconnectTimerRef.current = setInterval(() => {
        setDisconnectTimeout(prev => {
          if (prev <= 1) {
            clearDisconnectTimer();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    };

    const onOpponentReconnected = () => {
      setOpponentDisconnected(false);
      clearDisconnectTimer();
      setDisconnectTimeout(0);
    };

    const onChatMessage = (data: ChatMessage) => {
      setChatMessages(prev => [...prev, data]);
    };

    const onRoomPlayerJoined = (data: { player: import('../network/protocol').PlayerInfo; room: RoomInfo }) => {
      setRoomInfo(data.room);
    };

    const onRoomPlayerLeft = (data: { playerId: string }) => {
      setRoomInfo(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          players: prev.players.filter(p => p.id !== data.playerId),
        };
      });
      // If we were waiting, go back to lobby
      setPhase(prev => prev === 'waiting' ? 'lobby' : prev);
    };

    const onMatchFound = (data: { roomId: string; room: RoomInfo }) => {
      setRoomId(data.roomId);
      setRoomInfo(data.room);
      // Phase stays, game:start will follow
    };

    const onError = (data: { message: string }) => {
      setErrorMessage(data.message);
    };

    socket.on('game:start', onGameStart);
    socket.on('game:move', onGameMove);
    socket.on('game:over', onGameOver);
    socket.on('game:draw-offered', onDrawOffered);
    socket.on('game:draw-declined', onDrawDeclined);
    socket.on('game:opponent-disconnected', onOpponentDisconnected);
    socket.on('game:opponent-reconnected', onOpponentReconnected);
    socket.on('chat:message', onChatMessage);
    socket.on('room:player-joined', onRoomPlayerJoined);
    socket.on('room:player-left', onRoomPlayerLeft);
    socket.on('match:found', onMatchFound);
    socket.on('error', onError);

    return () => {
      socket.off('game:start', onGameStart);
      socket.off('game:move', onGameMove);
      socket.off('game:over', onGameOver);
      socket.off('game:draw-offered', onDrawOffered);
      socket.off('game:draw-declined', onDrawDeclined);
      socket.off('game:opponent-disconnected', onOpponentDisconnected);
      socket.off('game:opponent-reconnected', onOpponentReconnected);
      socket.off('chat:message', onChatMessage);
      socket.off('room:player-joined', onRoomPlayerJoined);
      socket.off('room:player-left', onRoomPlayerLeft);
      socket.off('match:found', onMatchFound);
      socket.off('error', onError);
      clearDisconnectTimer();
    };
  }, [socket, clearDisconnectTimer]);

  // ---- handleCellClick ----
  const handleCellClick = useCallback((pos: Position) => {
    if (isAnimating || !isMyTurn || phase !== 'playing' || waitingForServer) return;

    const currentState = gameStateRef.current;
    const mySide = myColorRef.current === 'red' ? Side.RED : Side.BLACK;
    const clickedPiece = currentState.board[pos.row][pos.col];

    if (selectedPos) {
      // Check if this is a move target
      const move = legalMoves.find(m => m.to.row === pos.row && m.to.col === pos.col);
      if (move) {
        // Optimistic move: animate + apply locally
        const nextState = makeMove(currentState, move);
        if (nextState) {
          setSelectedPos(null);
          setLegalMoves([]);

          pendingStateRef.current = { state: nextState, move };
          setPendingAnimation(move);
          setIsAnimating(true);

          // Emit to server
          const payload: MovePayload = { from: move.from, to: move.to };
          setWaitingForServer(true);
          socket.emit('game:move', { move: payload }, (res) => {
            setWaitingForServer(false);
            if (!res.ok) {
              // Server rejected - this shouldn't normally happen
              // Revert to the state before the move
              setGameState(currentState);
              setErrorMessage(res.error);
            }
          });
          return;
        }
      }
    }

    // Clicking own piece → select
    if (clickedPiece && clickedPiece.side === mySide) {
      playSelect();
      const moves = getLegalMovesFor(currentState, pos);
      setSelectedPos(pos);
      setLegalMoves(moves);
      return;
    }

    // Click elsewhere → deselect
    setSelectedPos(null);
    setLegalMoves([]);
  }, [selectedPos, legalMoves, isAnimating, isMyTurn, phase, waitingForServer, socket]);

  // ---- Lobby actions ----
  const createRoom = useCallback((nickname: string) => {
    socket.emit('room:create', { nickname }, (res) => {
      if (res.ok) {
        setRoomId(res.roomId);
        setPhase('waiting');
        setErrorMessage(null);
      } else {
        setErrorMessage(res.error);
      }
    });
  }, [socket]);

  const joinRoom = useCallback((targetRoomId: string, nickname: string) => {
    socket.emit('room:join', { roomId: targetRoomId, nickname }, (res) => {
      if (res.ok) {
        setRoomId(res.room.roomId);
        setRoomInfo(res.room);
        setPhase('waiting');
        setErrorMessage(null);
      } else {
        setErrorMessage(res.error);
      }
    });
  }, [socket]);

  const joinQueue = useCallback((nickname: string) => {
    socket.emit('match:queue', { nickname }, (_res) => {
      setPhase('matchmaking');
      setErrorMessage(null);
    });
  }, [socket]);

  const cancelQueue = useCallback(() => {
    socket.emit('match:cancel');
    setPhase('lobby');
  }, [socket]);

  const leaveRoom = useCallback(() => {
    socket.emit('room:leave');
    setPhase('lobby');
    setRoomId(null);
    setRoomInfo(null);
  }, [socket]);

  // ---- Game actions ----
  const resign = useCallback(() => {
    socket.emit('game:resign');
  }, [socket]);

  const offerDraw = useCallback(() => {
    socket.emit('game:draw-offer');
  }, [socket]);

  const respondDraw = useCallback((accept: boolean) => {
    socket.emit('game:draw-respond', { accept });
    setDrawOffered(false);
  }, [socket]);

  const sendChat = useCallback((content: string) => {
    socket.emit('chat:message', { content });
  }, [socket]);

  const backToLobby = useCallback(() => {
    setPhase('lobby');
    setMyColor(null);
    setRoomId(null);
    setRoomInfo(null);
    setOpponentName(null);
    setChatMessages([]);
    setDrawOffered(false);
    setOpponentDisconnected(false);
    setDisconnectTimeout(0);
    setWaitingForServer(false);
    setErrorMessage(null);
    setGameState(createInitialGameState());
    setSelectedPos(null);
    setLegalMoves([]);
    setPendingAnimation(null);
    setIsAnimating(false);
    pendingStateRef.current = null;
    clearDisconnectTimer();
  }, [clearDisconnectTimer]);

  // ---- Render state ----
  const lastMove = gameState.moveHistory.length > 0
    ? gameState.moveHistory[gameState.moveHistory.length - 1]
    : null;

  const renderState: RenderState = {
    board: gameState.board,
    selectedPos,
    legalMoves: legalMoves.map(m => m.to),
    lastMove,
    isInCheck: gameState.isInCheck,
    currentTurn: gameState.currentTurn,
    flipped,
  };

  return {
    // State
    gameState,
    renderState,
    phase,
    myColor,
    roomId,
    roomInfo,
    opponentName,
    chatMessages,
    drawOffered,
    opponentDisconnected,
    disconnectTimeout,
    isAnimating,
    pendingAnimation,
    waitingForServer,
    errorMessage,
    flipped,
    isMyTurn,
    // Lobby actions
    createRoom,
    joinRoom,
    joinQueue,
    cancelQueue,
    leaveRoom,
    // Game actions
    handleCellClick,
    resign,
    offerDraw,
    respondDraw,
    sendChat,
    backToLobby,
    // Animation
    onAnimationDone,
  };
}
