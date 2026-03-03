import type { Server, Socket } from 'socket.io';
import type { ClientToServerEvents, ServerToClientEvents, PlayerInfo, RoomInfo } from '../../src/network/protocol.js';
import { GameStatus } from '../../src/engine/types.js';
import { roomManager } from './room-manager.js';
import { gameSessionManager } from './game-session.js';
import { matchmakingQueue } from './matchmaking.js';
import { saveRecord, listRecords, getRecord } from './records.js';
import { nanoid } from 'nanoid';

type IO = Server<ClientToServerEvents, ServerToClientEvents>;
type ClientSocket = Socket<ClientToServerEvents, ServerToClientEvents>;

function startGame(io: IO, roomId: string) {
  const room = roomManager.getRoom(roomId);
  if (!room) return;

  const players = Array.from(room.players.values());
  const redPlayer = players.find(p => p.color === 'red')!;
  const blackPlayer = players.find(p => p.color === 'black')!;

  gameSessionManager.createSession(roomId, redPlayer.id, blackPlayer.id);
  roomManager.setRoomStatus(roomId, 'playing');

  const roomInfo = roomManager.toRoomInfo(room);
  io.to(redPlayer.id).emit('game:start', { room: roomInfo, yourColor: 'red' });
  io.to(blackPlayer.id).emit('game:start', { room: roomInfo, yourColor: 'black' });
}

export function handleConnection(io: IO, socket: ClientSocket) {
  console.log(`Connected: ${socket.id}`);

  // ---- Room ----
  socket.on('room:create', ({ nickname }, cb) => {
    const roomId = roomManager.createRoom(socket.id, nickname);
    socket.join(roomId);
    cb({ ok: true, roomId });
  });

  socket.on('room:join', ({ roomId, nickname }, cb) => {
    const room = roomManager.joinRoom(roomId, socket.id, nickname);
    if (!room) { cb({ ok: false, error: '房间不存在或已满' }); return; }
    socket.join(roomId);
    const roomInfo = roomManager.toRoomInfo(room);
    cb({ ok: true, room: roomInfo });
    socket.to(roomId).emit('room:player-joined', {
      player: { id: socket.id, nickname, color: 'black' },
      room: roomInfo,
    });
    if (room.players.size === 2) startGame(io, roomId);
  });

  socket.on('room:leave', () => {
    const roomId = roomManager.leaveRoom(socket.id);
    if (roomId) {
      socket.leave(roomId);
      socket.to(roomId).emit('room:player-left', { playerId: socket.id });
    }
  });

  // ---- Matchmaking ----
  socket.on('match:queue', ({ nickname }, cb) => {
    matchmakingQueue.add(socket.id, nickname);
    cb({ ok: true });
    const match = matchmakingQueue.tryMatch();
    if (match) {
      const [red, black] = match;
      const roomId = roomManager.createRoom(red.socketId, red.nickname);
      roomManager.joinRoom(roomId, black.socketId, black.nickname);
      const redSocket = io.sockets.sockets.get(red.socketId);
      const blackSocket = io.sockets.sockets.get(black.socketId);
      redSocket?.join(roomId);
      blackSocket?.join(roomId);
      startGame(io, roomId);
    }
  });

  socket.on('match:cancel', () => {
    matchmakingQueue.remove(socket.id);
  });

  // ---- Game Move ----
  socket.on('game:move', ({ move }, cb) => {
    const roomId = roomManager.getRoomByPlayer(socket.id);
    if (!roomId) { cb({ ok: false, error: '不在游戏中' }); return; }
    const result = gameSessionManager.processMove(roomId, socket.id, move);
    if (!result.ok) { cb({ ok: false, error: result.error }); return; }
    cb({ ok: true });
    io.to(roomId).emit('game:move', { move });
    // Check game over
    if (result.newState.status !== 'playing') {
      const resultStr = result.newState.status as 'red_win' | 'black_win' | 'draw';
      io.to(roomId).emit('game:over', { result: resultStr, reason: 'checkmate' });
      // Save record
      const session = gameSessionManager.getSession(roomId);
      if (session) {
        const room = roomManager.getRoom(roomId);
        const players = room ? Array.from(room.players.values()) : [];
        const redName = players.find(p => p.color === 'red')?.nickname ?? '红方';
        const blackName = players.find(p => p.color === 'black')?.nickname ?? '黑方';
        saveRecord({
          id: nanoid(10),
          redPlayer: redName,
          blackPlayer: blackName,
          result: resultStr,
          reason: 'checkmate',
          moveCount: result.newState.moveHistory.length,
          date: new Date().toISOString(),
          moves: result.newState.moveHistory.map(m => ({ from: m.from, to: m.to })),
        });
      }
      roomManager.setRoomStatus(roomId, 'finished');
      gameSessionManager.removeSession(roomId);
    }
  });

  // ---- Resign ----
  socket.on('game:resign', () => {
    const roomId = roomManager.getRoomByPlayer(socket.id);
    if (!roomId) return;
    const session = gameSessionManager.getSession(roomId);
    if (!session) return;
    const loserIsRed = socket.id === session.redPlayerId;
    const result = loserIsRed ? 'black_win' : 'red_win';
    io.to(roomId).emit('game:over', { result, reason: 'resign' });
    // Save record
    const room = roomManager.getRoom(roomId);
    const players = room ? Array.from(room.players.values()) : [];
    saveRecord({
      id: nanoid(10),
      redPlayer: players.find(p => p.color === 'red')?.nickname ?? '红方',
      blackPlayer: players.find(p => p.color === 'black')?.nickname ?? '黑方',
      result,
      reason: 'resign',
      moveCount: session.state.moveHistory.length,
      date: new Date().toISOString(),
      moves: session.state.moveHistory.map(m => ({ from: m.from, to: m.to })),
    });
    roomManager.setRoomStatus(roomId, 'finished');
    gameSessionManager.removeSession(roomId);
  });

  // ---- Draw ----
  socket.on('game:draw-offer', () => {
    const roomId = roomManager.getRoomByPlayer(socket.id);
    if (roomId) socket.to(roomId).emit('game:draw-offered');
  });

  socket.on('game:draw-respond', ({ accept }) => {
    const roomId = roomManager.getRoomByPlayer(socket.id);
    if (!roomId) return;
    if (accept) {
      io.to(roomId).emit('game:over', { result: 'draw', reason: 'draw_agreed' });
      const session = gameSessionManager.getSession(roomId);
      if (session) {
        const room = roomManager.getRoom(roomId);
        const players = room ? Array.from(room.players.values()) : [];
        saveRecord({
          id: nanoid(10),
          redPlayer: players.find(p => p.color === 'red')?.nickname ?? '红方',
          blackPlayer: players.find(p => p.color === 'black')?.nickname ?? '黑方',
          result: 'draw',
          reason: 'draw_agreed',
          moveCount: session.state.moveHistory.length,
          date: new Date().toISOString(),
          moves: session.state.moveHistory.map(m => ({ from: m.from, to: m.to })),
        });
      }
      roomManager.setRoomStatus(roomId, 'finished');
      gameSessionManager.removeSession(roomId);
    } else {
      socket.to(roomId).emit('game:draw-declined');
    }
  });

  // ---- Chat ----
  socket.on('chat:message', ({ content }) => {
    const roomId = roomManager.getRoomByPlayer(socket.id);
    if (!roomId) return;
    const room = roomManager.getRoom(roomId);
    const player = room?.players.get(socket.id);
    if (!player) return;
    io.to(roomId).emit('chat:message', {
      sender: player.nickname,
      content: content.slice(0, 200),
      timestamp: Date.now(),
    });
  });

  // ---- Records ----
  socket.on('records:list', (cb) => {
    cb({ records: listRecords() });
  });

  socket.on('records:detail', ({ id }, cb) => {
    cb(getRecord(id));
  });

  // ---- Reconnect ----
  socket.on('reconnect:attempt', ({ roomId, playerId }) => {
    const session = gameSessionManager.getSession(roomId);
    if (!session || session.disconnectedPlayer !== playerId) return;
    if (session.disconnectTimer) {
      clearTimeout(session.disconnectTimer);
      session.disconnectTimer = null;
    }
    session.disconnectedPlayer = null;
    roomManager.updatePlayerSocket(roomId, playerId, socket.id);
    if (session.redPlayerId === playerId) session.redPlayerId = socket.id;
    if (session.blackPlayerId === playerId) session.blackPlayerId = socket.id;
    socket.join(roomId);
    const room = roomManager.getRoom(roomId);
    if (room) {
      const yourColor = socket.id === session.redPlayerId ? 'red' : 'black';
      socket.emit('game:start', { room: roomManager.toRoomInfo(room), yourColor });
      socket.to(roomId).emit('game:opponent-reconnected');
    }
  });

  // ---- Disconnect ----
  socket.on('disconnect', () => {
    console.log(`Disconnected: ${socket.id}`);
    matchmakingQueue.remove(socket.id);
    const roomId = roomManager.getRoomByPlayer(socket.id);
    if (!roomId) return;
    const session = gameSessionManager.getSession(roomId);
    if (session && session.state.status === 'playing') {
      session.disconnectedPlayer = socket.id;
      socket.to(roomId).emit('game:opponent-disconnected', { timeout: 30 });
      session.disconnectTimer = setTimeout(() => {
        const loserIsRed = socket.id === session.redPlayerId;
        const result = loserIsRed ? 'black_win' : 'red_win';
        io.to(roomId).emit('game:over', { result, reason: 'disconnect' });
        roomManager.setRoomStatus(roomId, 'finished');
        gameSessionManager.removeSession(roomId);
      }, 30000);
    } else {
      roomManager.leaveRoom(socket.id);
      socket.to(roomId).emit('room:player-left', { playerId: socket.id });
    }
  });
}
