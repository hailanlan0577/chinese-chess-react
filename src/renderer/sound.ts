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
