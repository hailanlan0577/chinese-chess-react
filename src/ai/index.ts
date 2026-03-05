import { type Board, type Move, type Side } from '../engine/types';
import type { TypedSocket } from '../network/socket';

const REMOTE_TIMEOUT = 10000; // 10秒超时

export class AIPlayer {
  private worker: Worker | null = null;

  private getWorker(): Worker {
    if (!this.worker) {
      this.worker = new Worker(
        new URL('./worker.ts', import.meta.url),
        { type: 'module' }
      );
    }
    return this.worker;
  }

  /** 本地 JS AI（Web Worker） */
  findBestMove(board: Board, side: Side, timeLimit?: number, moveHistory?: Move[]): Promise<Move | null> {
    return new Promise((resolve) => {
      const worker = this.getWorker();

      worker.onmessage = (e: MessageEvent) => {
        resolve(e.data.bestMove);
      };

      worker.onerror = () => {
        import('./search').then(({ findBestMove }) => {
          resolve(findBestMove(board, side, timeLimit, moveHistory));
        });
      };

      worker.postMessage({ board, side, timeLimit, moveHistory });
    });
  }

  /** 远程 Pikafish AI，超时降级到本地 */
  findBestMoveRemote(
    board: Board,
    side: Side,
    level: string,
    socket: TypedSocket,
    timeLimit?: number,
    moveHistory?: Move[],
  ): Promise<Move | null> {
    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        console.warn('Remote AI timeout, falling back to local');
        this.findBestMove(board, side, timeLimit, moveHistory).then(resolve);
      }, REMOTE_TIMEOUT);

      socket.emit('ai:request', { board, side, level }, (res) => {
        clearTimeout(timer);
        if (res.ok) {
          resolve(res.bestMove);
        } else {
          console.warn('Remote AI error:', res.error, '- falling back to local');
          this.findBestMove(board, side, timeLimit, moveHistory).then(resolve);
        }
      });
    });
  }

  terminate(): void {
    this.worker?.terminate();
    this.worker = null;
  }
}
