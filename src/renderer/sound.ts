import { type Move, Side, PieceType } from '../engine/types';

/* ─── AudioContext 管理 ─── */

const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
let audioCtx: AudioContext | null = null;
let audioUnlocked = false;

/**
 * 在第一次用户交互时解锁音频。
 * iOS Safari / 部分 Chrome 需要在用户手势中播放一个静音 buffer 才能真正激活 AudioContext。
 */
function unlockAudio() {
  if (audioUnlocked) return;
  if (!AudioCtx) return;

  if (!audioCtx) {
    audioCtx = new AudioCtx();
  }

  // 强制 resume（返回 Promise，但不需要 await，只要在手势中调用即可）
  const p = audioCtx.resume();
  if (p && p.then) p.then(() => { audioUnlocked = true; });

  // 播放一个 1-sample 的静音 buffer，彻底解锁 iOS
  try {
    const buf = audioCtx.createBuffer(1, 1, audioCtx.sampleRate);
    const src = audioCtx.createBufferSource();
    src.buffer = buf;
    src.connect(audioCtx.destination);
    src.start(0);
  } catch { /* ignore */ }

  audioUnlocked = true;
}

// 注册全局监听器，确保第一次点击 / 触摸就解锁
if (typeof document !== 'undefined') {
  const events = ['click', 'touchstart', 'touchend', 'mousedown', 'keydown'];
  const handler = () => {
    unlockAudio();
    events.forEach(e => document.removeEventListener(e, handler, true));
  };
  events.forEach(e => document.addEventListener(e, handler, { capture: true, passive: true }));
}

function getCtx(): AudioContext | null {
  if (!AudioCtx) return null;
  if (!audioCtx) {
    audioCtx = new AudioCtx();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

/* ─── 基础音效 ─── */

function playTone(frequency: number, duration: number, type: OscillatorType = 'sine', volume = 0.3) {
  const ctx = getCtx();
  if (!ctx) return;
  try {
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(frequency, now);
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + duration + 0.01);
  } catch {
    // Audio not available
  }
}

function playNoise(duration: number, filterFreq: number, filterQ: number, volume: number) {
  const ctx = getCtx();
  if (!ctx) return;
  try {
    const bufferSize = Math.floor(ctx.sampleRate * duration);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      const t = i / ctx.sampleRate;
      data[i] = (Math.random() * 2 - 1) * Math.exp(-t / (duration * 0.3)) * volume;
    }
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = filterFreq;
    filter.Q.value = filterQ;
    source.connect(filter);
    filter.connect(ctx.destination);
    source.start();
  } catch {
    // ignore
  }
}

/* ─── 导出的音效函数 ─── */

/** 选子：清脆短促点击 */
export function playSelect() {
  playTone(800, 0.1, 'triangle', 0.35);
}

/** UI 按钮点击 */
export function playButtonClick() {
  playTone(1000, 0.08, 'sine', 0.3);
}

/** 落子：木质撞击 */
export function playMove() {
  playTone(200, 0.15, 'sine', 0.5);
  playNoise(0.1, 1200, 1.5, 0.5);
}

/** 吃子：更强的撞击 + 碰撞 */
export function playCapture() {
  playTone(220, 0.18, 'sine', 0.55);
  playTone(500, 0.1, 'square', 0.3);
  playNoise(0.15, 600, 1, 0.6);
}

/** 将军警告 */
export function playCheck() {
  playTone(880, 0.15, 'square', 0.25);
  setTimeout(() => playTone(1100, 0.18, 'square', 0.25), 150);
}

/** 游戏结束 */
export function playGameOver() {
  playTone(220, 0.8, 'sine', 0.3);
  playTone(330, 0.8, 'sine', 0.2);
  playTone(440, 0.8, 'sine', 0.15);
}

/* ─── 走法语音播报 ─── */

const RED_COL_NAMES = '九八七六五四三二一';
const BLACK_COL_NAMES = '１２３４５６７８９';
const RED_NUMBERS = '一二三四五六七八九';
const BLACK_NUMBERS = '１２３４５６７８９';

const PIECE_NAMES_RED: Record<PieceType, string> = {
  [PieceType.KING]: '帅',
  [PieceType.ADVISOR]: '仕',
  [PieceType.ELEPHANT]: '相',
  [PieceType.HORSE]: '马',
  [PieceType.ROOK]: '车',
  [PieceType.CANNON]: '炮',
  [PieceType.PAWN]: '兵',
};

const PIECE_NAMES_BLACK: Record<PieceType, string> = {
  [PieceType.KING]: '将',
  [PieceType.ADVISOR]: '士',
  [PieceType.ELEPHANT]: '象',
  [PieceType.HORSE]: '马',
  [PieceType.ROOK]: '车',
  [PieceType.CANNON]: '炮',
  [PieceType.PAWN]: '卒',
};

function isStraightLine(type: PieceType): boolean {
  return type === PieceType.ROOK || type === PieceType.CANNON
    || type === PieceType.PAWN || type === PieceType.KING;
}

/** 使用 Web Speech API 播报中国象棋记谱法，如"炮五进八" */
export function speakMove(move: Move) {
  const isRed = move.piece.side === Side.RED;
  const colNames = isRed ? RED_COL_NAMES : BLACK_COL_NAMES;
  const numbers = isRed ? RED_NUMBERS : BLACK_NUMBERS;
  const pieceNames = isRed ? PIECE_NAMES_RED : PIECE_NAMES_BLACK;

  const pieceName = pieceNames[move.piece.type];
  const fromCol = colNames[move.from.col];
  const rowDiff = move.to.row - move.from.row;

  let direction: string;
  let target: string;

  if (rowDiff === 0) {
    // 平移
    direction = '平';
    target = colNames[move.to.col];
  } else {
    // 红方 row 变小=进；黑方 row 变大=进
    const isForward = isRed ? rowDiff < 0 : rowDiff > 0;
    direction = isForward ? '进' : '退';

    if (isStraightLine(move.piece.type)) {
      // 直线子用步数
      target = numbers[Math.abs(rowDiff) - 1];
    } else {
      // 斜线子（马、士、象）用目标列号
      target = colNames[move.to.col];
    }
  }

  const notation = `${pieceName}${fromCol}${direction}${target}`;

  try {
    speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(notation);
    utterance.lang = 'zh-CN';
    utterance.rate = 1.1;
    utterance.volume = 0.8;
    const voices = speechSynthesis.getVoices();
    const zhVoice = voices.find(v => v.lang.startsWith('zh'));
    if (zhVoice) utterance.voice = zhVoice;
    speechSynthesis.speak(utterance);
  } catch {
    // Speech synthesis not available
  }
}
