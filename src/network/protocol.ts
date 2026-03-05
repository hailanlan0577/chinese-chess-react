import type { Position, Board, Side, Move } from '../engine/types';

// Lightweight move payload (no Piece object, server rebuilds from board)
export interface MovePayload {
  from: Position;
  to: Position;
}

export type PlayerColor = 'red' | 'black';

export interface PlayerInfo {
  id: string;
  nickname: string;
  color: PlayerColor;
}

export interface RoomInfo {
  roomId: string;
  players: PlayerInfo[];
  status: 'waiting' | 'playing' | 'finished';
}

export interface ChatMessage {
  sender: string;
  content: string;
  timestamp: number;
}

export interface GameRecordSummary {
  id: string;
  redPlayer: string;
  blackPlayer: string;
  result: 'red_win' | 'black_win' | 'draw';
  reason: string;
  moveCount: number;
  date: string;
}

export interface GameRecordDetail extends GameRecordSummary {
  moves: MovePayload[];
}

// ---- Client -> Server ----
export interface ClientToServerEvents {
  'room:create': (data: { nickname: string }, cb: (res: { ok: true; roomId: string } | { ok: false; error: string }) => void) => void;
  'room:join': (data: { roomId: string; nickname: string }, cb: (res: { ok: true; room: RoomInfo } | { ok: false; error: string }) => void) => void;
  'room:leave': () => void;
  'match:queue': (data: { nickname: string }, cb: (res: { ok: true }) => void) => void;
  'match:cancel': () => void;
  'game:move': (data: { move: MovePayload }, cb: (res: { ok: true } | { ok: false; error: string }) => void) => void;
  'game:resign': () => void;
  'game:draw-offer': () => void;
  'game:draw-respond': (data: { accept: boolean }) => void;
  'chat:message': (data: { content: string }) => void;
  'records:list': (cb: (res: { records: GameRecordSummary[] }) => void) => void;
  'records:detail': (data: { id: string }, cb: (res: GameRecordDetail | null) => void) => void;
  'reconnect:attempt': (data: { roomId: string; playerId: string }) => void;
  'ai:request': (data: { board: Board; side: Side; level: string }, cb: (res: { ok: true; bestMove: Move } | { ok: false; error: string }) => void) => void;
}

// ---- Server -> Client ----
export interface ServerToClientEvents {
  'room:player-joined': (data: { player: PlayerInfo; room: RoomInfo }) => void;
  'room:player-left': (data: { playerId: string }) => void;
  'match:found': (data: { roomId: string; room: RoomInfo }) => void;
  'game:start': (data: { room: RoomInfo; yourColor: PlayerColor; moves?: MovePayload[] }) => void;
  'game:move': (data: { move: MovePayload }) => void;
  'game:over': (data: { result: 'red_win' | 'black_win' | 'draw'; reason: string }) => void;
  'game:draw-offered': () => void;
  'game:draw-declined': () => void;
  'game:opponent-disconnected': (data: { timeout: number }) => void;
  'game:opponent-reconnected': () => void;
  'chat:message': (data: ChatMessage) => void;
  'error': (data: { message: string }) => void;
}
