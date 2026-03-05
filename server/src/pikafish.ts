import { spawn, type ChildProcess } from 'child_process';
import path from 'path';

const PIKAFISH_PATH = process.env.PIKAFISH_PATH || '/usr/local/bin/pikafish';
const NNUE_PATH = process.env.PIKAFISH_NNUE || '';
const POOL_SIZE = parseInt(process.env.PIKAFISH_POOL_SIZE || '2', 10);

/** 难度配置 */
interface DifficultyConfig {
  moveTime: number;  // ms
  skillLevel: number; // 0-20
}

export const DIFFICULTY: Record<string, DifficultyConfig> = {
  easy:   { moveTime: 500,  skillLevel: 1 },
  medium: { moveTime: 1500, skillLevel: 10 },
  hard:   { moveTime: 3000, skillLevel: 20 },
  insane: { moveTime: 8000, skillLevel: 20 },
};

interface PikafishInstance {
  process: ChildProcess;
  busy: boolean;
  ready: boolean;
}

class PikafishPool {
  private pool: PikafishInstance[] = [];
  private queue: Array<{
    resolve: (move: string | null) => void;
    fen: string;
    level: string;
  }> = [];
  private initialized = false;

  async init(): Promise<void> {
    if (this.initialized) return;

    for (let i = 0; i < POOL_SIZE; i++) {
      try {
        const instance = await this.createInstance();
        this.pool.push(instance);
      } catch (err) {
        console.error(`Pikafish instance ${i} failed to start:`, err);
      }
    }

    if (this.pool.length === 0) {
      console.warn('No Pikafish instances available. AI will not work.');
    } else {
      console.log(`Pikafish pool ready: ${this.pool.length} instances`);
    }
    this.initialized = true;
  }

  private createInstance(): Promise<PikafishInstance> {
    return new Promise((resolve, reject) => {
      const proc = spawn(PIKAFISH_PATH, [], {
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      const instance: PikafishInstance = {
        process: proc,
        busy: false,
        ready: false,
      };

      let output = '';

      const onData = (data: Buffer) => {
        output += data.toString();
        if (output.includes('uciok')) {
          proc.stdout!.removeListener('data', onData);
          instance.ready = true;

          // 设置 NNUE 文件路径（如果有）
          if (NNUE_PATH) {
            proc.stdin!.write(`setoption name EvalFile value ${NNUE_PATH}\n`);
          }

          // 设置线程数
          proc.stdin!.write('setoption name Threads value 1\n');
          proc.stdin!.write('setoption name Hash value 64\n');
          proc.stdin!.write('isready\n');

          let readyOutput = '';
          const onReady = (d: Buffer) => {
            readyOutput += d.toString();
            if (readyOutput.includes('readyok')) {
              proc.stdout!.removeListener('data', onReady);
              resolve(instance);
            }
          };
          proc.stdout!.on('data', onReady);
        }
      };

      proc.stdout!.on('data', onData);

      proc.on('error', (err) => {
        reject(err);
      });

      proc.on('exit', (code) => {
        instance.ready = false;
        instance.busy = false;
        // 尝试重启
        const idx = this.pool.indexOf(instance);
        if (idx !== -1) {
          this.pool.splice(idx, 1);
          console.log(`Pikafish instance exited (code ${code}), restarting...`);
          this.createInstance()
            .then(newInstance => {
              this.pool.push(newInstance);
              this.processQueue();
            })
            .catch(err => console.error('Restart failed:', err));
        }
      });

      // 发送 UCI 初始化命令
      proc.stdin!.write('uci\n');

      // 5秒超时
      setTimeout(() => {
        if (!instance.ready) {
          proc.kill();
          reject(new Error('Pikafish startup timeout'));
        }
      }, 5000);
    });
  }

  /**
   * 请求 Pikafish 计算最佳走法
   * @returns UCI 走法字符串（如 "h2e2"）或 null
   */
  async getBestMove(fen: string, level: string = 'medium'): Promise<string | null> {
    if (!this.initialized) await this.init();

    return new Promise((resolve) => {
      const free = this.pool.find(inst => !inst.busy && inst.ready);
      if (free) {
        this.runSearch(free, fen, level, resolve);
      } else {
        this.queue.push({ resolve, fen, level });
      }
    });
  }

  private runSearch(
    instance: PikafishInstance,
    fen: string,
    level: string,
    resolve: (move: string | null) => void,
  ) {
    instance.busy = true;
    const config = DIFFICULTY[level] || DIFFICULTY.medium;
    const proc = instance.process;

    // 设置难度
    proc.stdin!.write(`setoption name Skill Level value ${config.skillLevel}\n`);
    proc.stdin!.write(`position fen ${fen}\n`);
    proc.stdin!.write(`go movetime ${config.moveTime}\n`);

    let output = '';
    const timeout = setTimeout(() => {
      proc.stdin!.write('stop\n');
    }, config.moveTime + 2000); // 额外2秒等待

    const onData = (data: Buffer) => {
      output += data.toString();
      const lines = output.split('\n');
      for (const line of lines) {
        const match = line.match(/^bestmove\s+(\S+)/);
        if (match) {
          clearTimeout(timeout);
          proc.stdout!.removeListener('data', onData);
          instance.busy = false;
          const bestMove = match[1] === '(none)' ? null : match[1];
          resolve(bestMove);
          this.processQueue();
          return;
        }
      }
    };

    proc.stdout!.on('data', onData);

    // 最终超时保护
    setTimeout(() => {
      if (instance.busy) {
        proc.stdout!.removeListener('data', onData);
        clearTimeout(timeout);
        instance.busy = false;
        resolve(null);
        this.processQueue();
      }
    }, config.moveTime + 5000);
  }

  private processQueue() {
    if (this.queue.length === 0) return;
    const free = this.pool.find(inst => !inst.busy && inst.ready);
    if (!free) return;
    const task = this.queue.shift()!;
    this.runSearch(free, task.fen, task.level, task.resolve);
  }

  shutdown() {
    for (const inst of this.pool) {
      inst.process.stdin!.write('quit\n');
      inst.process.kill();
    }
    this.pool = [];
  }
}

export const pikafishPool = new PikafishPool();
