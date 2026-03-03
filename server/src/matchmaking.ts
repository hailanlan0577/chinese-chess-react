interface QueueEntry {
  socketId: string;
  nickname: string;
  joinedAt: number;
}

class MatchmakingQueue {
  private queue: QueueEntry[] = [];

  add(socketId: string, nickname: string): void {
    if (this.queue.some(e => e.socketId === socketId)) return;
    this.queue.push({ socketId, nickname, joinedAt: Date.now() });
  }

  tryMatch(): [QueueEntry, QueueEntry] | null {
    if (this.queue.length < 2) return null;
    const [p1, p2] = this.queue.splice(0, 2);
    // Random red/black assignment
    return Math.random() < 0.5 ? [p1, p2] : [p2, p1];
  }

  remove(socketId: string): void {
    this.queue = this.queue.filter(e => e.socketId !== socketId);
  }

  size(): number { return this.queue.length; }
}

export const matchmakingQueue = new MatchmakingQueue();
