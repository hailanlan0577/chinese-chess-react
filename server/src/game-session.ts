import { createInitialGameState, makeMove } from '../../src/engine/game.js';
import { Side, GameStatus } from '../../src/engine/types.js';
import type { GameState, Move } from '../../src/engine/types.js';
import type { MovePayload } from '../../src/network/protocol.js';

interface GameSession {
  roomId: string;
  state: GameState;
  redPlayerId: string;
  blackPlayerId: string;
  startedAt: number;
  disconnectedPlayer: string | null;
  disconnectTimer: ReturnType<typeof setTimeout> | null;
}

class GameSessionManager {
  private sessions = new Map<string, GameSession>();

  createSession(roomId: string, redPlayerId: string, blackPlayerId: string): GameSession {
    const session: GameSession = {
      roomId,
      state: createInitialGameState(),
      redPlayerId,
      blackPlayerId,
      startedAt: Date.now(),
      disconnectedPlayer: null,
      disconnectTimer: null,
    };
    this.sessions.set(roomId, session);
    return session;
  }

  processMove(roomId: string, playerId: string, payload: MovePayload):
    { ok: true; move: Move; newState: GameState } | { ok: false; error: string } {

    const session = this.sessions.get(roomId);
    if (!session) return { ok: false, error: '游戏不存在' };

    const expectedSide = session.state.currentTurn;
    const expectedPlayerId = expectedSide === Side.RED ? session.redPlayerId : session.blackPlayerId;
    if (playerId !== expectedPlayerId) return { ok: false, error: '不是你的回合' };

    const piece = session.state.board[payload.from.row]?.[payload.from.col];
    if (!piece) return { ok: false, error: '该位置没有棋子' };
    if (piece.side !== expectedSide) return { ok: false, error: '不能移动对方的棋子' };

    const captured = session.state.board[payload.to.row]?.[payload.to.col] ?? null;
    const move: Move = { from: payload.from, to: payload.to, piece, captured };

    const newState = makeMove(session.state, move);
    if (!newState) return { ok: false, error: '非法走法' };

    session.state = newState;
    return { ok: true, move, newState };
  }

  getSession(roomId: string): GameSession | null { return this.sessions.get(roomId) ?? null; }
  removeSession(roomId: string): void { this.sessions.delete(roomId); }
}

export const gameSessionManager = new GameSessionManager();
export type { GameSession };
