import { type Move, Side, PieceType } from '../engine/types';

let audioCtx: AudioContext | null = null;

function getCtx(): AudioContext {
  if (!audioCtx) {
    audioCtx = new AudioContext();
  }
  return audioCtx;
}

function playTone(frequency: number, duration: number, type: OscillatorType = 'sine', volume = 0.15) {
  try {
    const ctx = getCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.value = frequency;
    gain.gain.setValueAtTime(volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + duration);
  } catch {
    // Audio not available
  }
}

/** Soft click for selecting a piece */
export function playSelect() {
  playTone(800, 0.08, 'sine', 0.1);
}

/** Piece placed on board */
export function playMove() {
  try {
    const ctx = getCtx();
    const bufferSize = ctx.sampleRate * 0.1;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    // Short noise burst simulating a wooden tap
    for (let i = 0; i < bufferSize; i++) {
      const t = i / ctx.sampleRate;
      data[i] = (Math.random() * 2 - 1) * Math.exp(-t * 60) * 0.4;
    }
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    // Bandpass filter to make it sound wooden
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 1200;
    filter.Q.value = 1.5;
    source.connect(filter);
    filter.connect(ctx.destination);
    source.start();
  } catch {
    // fallback
    playTone(400, 0.1, 'triangle', 0.12);
  }
}

/** Capture an enemy piece - heavier impact */
export function playCapture() {
  try {
    const ctx = getCtx();
    const bufferSize = ctx.sampleRate * 0.18;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      const t = i / ctx.sampleRate;
      data[i] = (Math.random() * 2 - 1) * Math.exp(-t * 30) * 0.6;
    }
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 600;
    filter.Q.value = 1;
    source.connect(filter);
    filter.connect(ctx.destination);
    source.start();
  } catch {
    playTone(300, 0.15, 'triangle', 0.2);
  }
}

/** Check warning */
export function playCheck() {
  playTone(880, 0.12, 'square', 0.1);
  setTimeout(() => playTone(1100, 0.15, 'square', 0.1), 130);
}

/** Game over gong */
export function playGameOver() {
  playTone(220, 0.6, 'sine', 0.15);
  playTone(330, 0.6, 'sine', 0.1);
  playTone(440, 0.6, 'sine', 0.08);
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
