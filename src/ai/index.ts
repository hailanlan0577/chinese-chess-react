import { type Board, type Move, type Side } from '../engine/types';

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

  findBestMove(board: Board, side: Side, timeLimit?: number): Promise<Move | null> {
    return new Promise((resolve) => {
      const worker = this.getWorker();

      worker.onmessage = (e: MessageEvent) => {
        resolve(e.data.bestMove);
      };

      worker.onerror = () => {
        import('./search').then(({ findBestMove }) => {
          resolve(findBestMove(board, side, timeLimit));
        });
      };

      worker.postMessage({ board, side, timeLimit });
    });
  }

  terminate(): void {
    this.worker?.terminate();
    this.worker = null;
  }
}
