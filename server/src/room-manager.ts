import { nanoid } from 'nanoid';
import type { PlayerInfo, RoomInfo, PlayerColor } from '../../src/network/protocol.js';

interface Room {
  id: string;
  players: Map<string, PlayerInfo>;  // socketId -> PlayerInfo
  status: 'waiting' | 'playing' | 'finished';
  createdAt: number;
}

class RoomManager {
  private rooms = new Map<string, Room>();
  private playerToRoom = new Map<string, string>();  // socketId -> roomId

  createRoom(socketId: string, nickname: string): string {
    const roomId = nanoid(6).toUpperCase();
    const player: PlayerInfo = { id: socketId, nickname, color: 'red' };
    const room: Room = {
      id: roomId,
      players: new Map([[socketId, player]]),
      status: 'waiting',
      createdAt: Date.now(),
    };
    this.rooms.set(roomId, room);
    this.playerToRoom.set(socketId, roomId);
    return roomId;
  }

  joinRoom(roomId: string, socketId: string, nickname: string): Room | null {
    const room = this.rooms.get(roomId);
    if (!room || room.status !== 'waiting' || room.players.size >= 2) return null;
    const player: PlayerInfo = { id: socketId, nickname, color: 'black' };
    room.players.set(socketId, player);
    this.playerToRoom.set(socketId, roomId);
    return room;
  }

  leaveRoom(socketId: string): string | null {
    const roomId = this.playerToRoom.get(socketId);
    if (!roomId) return null;
    const room = this.rooms.get(roomId);
    if (room) {
      room.players.delete(socketId);
      if (room.players.size === 0) this.rooms.delete(roomId);
    }
    this.playerToRoom.delete(socketId);
    return roomId;
  }

  getRoom(roomId: string): Room | null { return this.rooms.get(roomId) ?? null; }
  getRoomByPlayer(socketId: string): string | null { return this.playerToRoom.get(socketId) ?? null; }

  updatePlayerSocket(roomId: string, oldSocketId: string, newSocketId: string): void {
    const room = this.rooms.get(roomId);
    if (!room) return;
    const player = room.players.get(oldSocketId);
    if (player) {
      room.players.delete(oldSocketId);
      player.id = newSocketId;
      room.players.set(newSocketId, player);
    }
    this.playerToRoom.delete(oldSocketId);
    this.playerToRoom.set(newSocketId, roomId);
  }

  setRoomStatus(roomId: string, status: Room['status']): void {
    const room = this.rooms.get(roomId);
    if (room) room.status = status;
  }

  removeRoom(roomId: string): void {
    const room = this.rooms.get(roomId);
    if (room) {
      for (const socketId of room.players.keys()) {
        this.playerToRoom.delete(socketId);
      }
      this.rooms.delete(roomId);
    }
  }

  toRoomInfo(room: Room): RoomInfo {
    return {
      roomId: room.id,
      players: Array.from(room.players.values()),
      status: room.status,
    };
  }

  // Auto-cleanup stale rooms (>30 min old waiting rooms)
  cleanup(): void {
    const now = Date.now();
    for (const [id, room] of this.rooms) {
      if (room.status === 'waiting' && now - room.createdAt > 30 * 60 * 1000) {
        this.removeRoom(id);
      }
    }
  }
}

export const roomManager = new RoomManager();

// Cleanup every 60s
setInterval(() => roomManager.cleanup(), 60000);
