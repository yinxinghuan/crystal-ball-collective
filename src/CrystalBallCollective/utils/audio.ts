// Audio cues — pentatonic singing-bowl chimes per tier crossing, a low
// rumble during hold that swells with depth, and a shatter "pop" on brink.
// No looping BGM — strictly per-event cues (project audio rule).

let ctxRef: AudioContext | null = null;
let rumbleNode: OscillatorNode | null = null;
let rumbleGain: GainNode | null = null;

function ctxOk(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!ctxRef) {
    const AC = (window as any).AudioContext || (window as any).webkitAudioContext;
    if (!AC) return null;
    ctxRef = new AC();
  }
  return ctxRef;
}

/** Call inside a user gesture (first pointerdown) to unlock iOS. */
export function unlockAudio(): void {
  const ctx = ctxOk();
  if (!ctx) return;
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
}

// ─── Chime per tier crossing ──────────────────────────────────────────────

const TIER_PITCH = {
  whisper:    523.25,  // C5
  vision:     659.25,  // E5
  revelation: 783.99,  // G5
  brink:      987.77,  // B5
} as const;

export function tierChime(tier: 'whisper' | 'vision' | 'revelation' | 'brink'): void {
  const ctx = ctxOk();
  if (!ctx) return;
  const t0 = ctx.currentTime;
  const f = TIER_PITCH[tier];

  // Sine fundamental + soft octave for bell-like overtone
  const fund = ctx.createOscillator();
  fund.type = 'sine';
  fund.frequency.value = f;
  const octv = ctx.createOscillator();
  octv.type = 'sine';
  octv.frequency.value = f * 2;

  const g = ctx.createGain();
  g.gain.setValueAtTime(0, t0);
  g.gain.linearRampToValueAtTime(0.25, t0 + 0.015);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + 1.4);

  const og = ctx.createGain();
  og.gain.setValueAtTime(0, t0);
  og.gain.linearRampToValueAtTime(0.08, t0 + 0.02);
  og.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.9);

  fund.connect(g).connect(ctx.destination);
  octv.connect(og).connect(ctx.destination);
  fund.start(t0); fund.stop(t0 + 1.5);
  octv.start(t0); octv.stop(t0 + 1.0);
}

// ─── Rumble during hold (swells with depth, fades on release) ─────────────

export function startRumble(): void {
  const ctx = ctxOk();
  if (!ctx) return;
  if (rumbleNode) return;
  rumbleNode = ctx.createOscillator();
  rumbleNode.type = 'triangle';
  rumbleNode.frequency.value = 46;  // deep
  rumbleGain = ctx.createGain();
  rumbleGain.gain.value = 0;
  rumbleNode.connect(rumbleGain).connect(ctx.destination);
  rumbleNode.start();
}

export function setRumbleLevel(depth: number): void {
  if (!rumbleGain || !ctxRef) return;
  const target = Math.min(0.18, Math.max(0, depth) * 0.22);
  rumbleGain.gain.setTargetAtTime(target, ctxRef.currentTime, 0.06);
}

export function stopRumble(): void {
  if (!ctxRef || !rumbleGain || !rumbleNode) return;
  const t = ctxRef.currentTime;
  rumbleGain.gain.setTargetAtTime(0, t, 0.04);
  const node = rumbleNode;
  const gn = rumbleGain;
  setTimeout(() => {
    try { node.stop(); node.disconnect(); gn.disconnect(); } catch { /* ignore */ }
  }, 250);
  rumbleNode = null;
  rumbleGain = null;
}

// ─── Shatter (white-noise burst + low thud) ───────────────────────────────

export function shatterSfx(outcome: 'glory' | 'ashes'): void {
  const ctx = ctxOk();
  if (!ctx) return;
  const t0 = ctx.currentTime;

  // noise burst — quick glass-like break
  const dur = 0.45;
  const buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * dur), ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) {
    const t = i / data.length;
    data[i] = (Math.random() * 2 - 1) * Math.pow(1 - t, 2.2);
  }
  const noise = ctx.createBufferSource();
  noise.buffer = buf;

  const bp = ctx.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.value = outcome === 'glory' ? 3200 : 1800;
  bp.Q.value = 1.5;
  const ng = ctx.createGain();
  ng.gain.setValueAtTime(0.45, t0);
  ng.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
  noise.connect(bp).connect(ng).connect(ctx.destination);
  noise.start(t0);
  noise.stop(t0 + dur);

  // a deep thud + a high resolving tone (glory only)
  const thud = ctx.createOscillator();
  thud.type = 'sine';
  thud.frequency.setValueAtTime(110, t0);
  thud.frequency.exponentialRampToValueAtTime(45, t0 + 0.5);
  const tg = ctx.createGain();
  tg.gain.setValueAtTime(0.4, t0);
  tg.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.5);
  thud.connect(tg).connect(ctx.destination);
  thud.start(t0); thud.stop(t0 + 0.5);

  if (outcome === 'glory') {
    const bell = ctx.createOscillator();
    bell.type = 'sine';
    bell.frequency.value = 1318.51;  // E6
    const bg = ctx.createGain();
    bg.gain.setValueAtTime(0, t0 + 0.25);
    bg.gain.linearRampToValueAtTime(0.22, t0 + 0.28);
    bg.gain.exponentialRampToValueAtTime(0.0001, t0 + 2.2);
    bell.connect(bg).connect(ctx.destination);
    bell.start(t0 + 0.25); bell.stop(t0 + 2.3);
  }
}

// ─── Haptic — pair with chime ─────────────────────────────────────────────

export function tierHaptic(tier: 'whisper' | 'vision' | 'revelation' | 'brink'): void {
  if (typeof navigator === 'undefined' || !('vibrate' in navigator)) return;
  try {
    const ms = tier === 'whisper' ? 6 : tier === 'vision' ? 10 : tier === 'revelation' ? 16 : 24;
    (navigator as any).vibrate(ms);
  } catch { /* ignore */ }
}

export function shatterHaptic(): void {
  if (typeof navigator === 'undefined' || !('vibrate' in navigator)) return;
  try { (navigator as any).vibrate([28, 20, 12]); } catch { /* ignore */ }
}
