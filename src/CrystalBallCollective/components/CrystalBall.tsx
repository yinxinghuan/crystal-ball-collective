// Crystal ball — single canvas, owns its own RAF loop, all hot-path state
// lives in refs. React state never updates per frame; tier crossings fire
// callbacks at most 4 times per divination.
//
// Visuals are a port of Crack Tap's `drawObject` + `buildCrackNetwork`
// (utils/render.ts), plus instant press feedback (compression + inner
// bloom + ring ripple), tier-crossing snap (scale pulse + flash), and
// charge-driven jitter that builds toward shatter.

import { useCallback, useEffect, useRef } from 'react';
import {
  buildCrackNetwork,
  makeFacetTexture,
  drawObject,
  depthFromHold,
  tierFromDepth,
  type CrackArm,
  type FacetTexture,
} from '../utils/render';
import {
  BRINK_MS,
  BRINK_MAX_MS,
  WHISPER_MS,
  TIER_LABEL,
} from '../utils/tiers';
import {
  unlockAudio,
  tierChime,
  tierHaptic,
  startRumble,
  setRumbleLevel,
  stopRumble,
} from '../utils/audio';
import type { FateTier } from '../types';
import { t } from '../i18n';

const CANVAS_W = 340;
const CANVAS_H = 380;
const ORB_R = 120;                        // base orb radius (px)
const ORB_CX = CANVAS_W / 2;
const ORB_CY = 178;                       // slightly above centre to leave room for shadow

const SPAWN_MS = 320;                     // ease-in on mount
const PRESS_BLOOM_DECAY = 0.92;           // per frame multiplier
const FLASH_DECAY = 0.86;
const RIPPLE_LIFE_MS = 320;

interface Ripple {
  startedAt: number;
  x: number; y: number;
}

interface Props {
  disabled?: boolean;
  /** Set true while result/wall is on-screen to dim + drop interaction. */
  dimmed?: boolean;
  /** Called when user releases legitimately (after >= WHISPER_MS, before BRINK_MAX). */
  onRelease: (info: { tier: FateTier; holdMs: number; shattered: boolean }) => void;
  /** Auto-shatter (held past BRINK_MAX_MS). Same payload shape as onRelease + shattered=true. */
  onAutoShatter: (info: { tier: FateTier; holdMs: number; shattered: true }) => void;
  /** Released before reaching WHISPER threshold. */
  onTooBrief: () => void;
  /** Called once per tier the player crosses, fire-once semantics. */
  onTierCross?: (tier: FateTier) => void;
  /** First pointer interaction in the session — for audio unlock + analytics. */
  onFirstPress?: () => void;
  /** Currently-disabled state message text (already-divined-today). */
  lockedMessage?: string;
}

export function CrystalBall({
  disabled,
  dimmed,
  onRelease,
  onAutoShatter,
  onTooBrief,
  onTierCross,
  onFirstPress,
  lockedMessage,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const hostRef = useRef<HTMLDivElement>(null);
  const hintRef = useRef<HTMLSpanElement>(null);
  const tierLabelRef = useRef<HTMLSpanElement>(null);

  // Hot-path refs — never trigger React renders.
  const mountedAtRef = useRef<number>(performance.now());
  const holdStartRef = useRef<number>(0);
  const holdMsRef = useRef<number>(0);
  const isHoldingRef = useRef<boolean>(false);
  const lastTierRef = useRef<FateTier | null>(null);
  const cracksRef = useRef<CrackArm[]>([]);
  const textureRef = useRef<FacetTexture>(makeFacetTexture());
  const pressPosRef = useRef<{ x: number; y: number } | null>(null);
  const pressBloomRef = useRef<{ x: number; y: number; alpha: number; r: number } | null>(null);
  const ripplesRef = useRef<Ripple[]>([]);
  const flashRef = useRef<number>(0);
  const tierPulseRef = useRef<number>(0);    // 0..1 instant pulse on tier cross, decays
  const firstPressedRef = useRef<boolean>(false);
  const shatterFiredRef = useRef<boolean>(false);

  // Reset everything when locked state toggles.
  useEffect(() => {
    if (disabled) {
      isHoldingRef.current = false;
      holdMsRef.current = 0;
      lastTierRef.current = null;
      pressBloomRef.current = null;
      ripplesRef.current = [];
      flashRef.current = 0;
      stopRumble();
    }
  }, [disabled]);

  // Draw loop — runs forever, cheap when idle.
  useEffect(() => {
    let raf = 0;
    let lastT = performance.now();

    const tick = () => {
      const now = performance.now();
      const dt = now - lastT;
      lastT = now;

      // advance hold tracker
      if (isHoldingRef.current) {
        holdMsRef.current = now - holdStartRef.current;

        // tier crossing
        const depth = depthFromHold(holdMsRef.current);
        const tier = tierFromDepth(depth);
        if (tier && tier !== lastTierRef.current) {
          lastTierRef.current = tier;
          tierPulseRef.current = 1;
          flashRef.current = 0.18;
          onTierCross?.(tier);
          tierChime(tier);
          tierHaptic(tier);
          updateLabelsImmediate();
          setRumbleLevel(depth);
        } else if (tier) {
          setRumbleLevel(depth);
        }

        // auto-shatter
        if (holdMsRef.current >= BRINK_MAX_MS && !shatterFiredRef.current) {
          shatterFiredRef.current = true;
          const t0 = lastTierRef.current ?? 'brink';
          stopRumble();
          isHoldingRef.current = false;
          onAutoShatter({ tier: t0 === 'brink' ? 'brink' : 'brink', holdMs: holdMsRef.current, shattered: true });
        }
      }

      // press bloom decay
      if (pressBloomRef.current) {
        pressBloomRef.current.alpha *= PRESS_BLOOM_DECAY;
        pressBloomRef.current.r += 1.8;
        if (pressBloomRef.current.alpha < 0.01) pressBloomRef.current = null;
      }

      // tier pulse decay
      if (tierPulseRef.current > 0) {
        tierPulseRef.current = Math.max(0, tierPulseRef.current - dt / 220);
      }
      // flash decay
      if (flashRef.current > 0) {
        flashRef.current *= FLASH_DECAY;
        if (flashRef.current < 0.005) flashRef.current = 0;
      }

      drawFrame();
      updateLabels();

      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── Drawing ───────────────────────────────────────────────────────────

  const drawFrame = useCallback(() => {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext('2d');
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    if (c.width !== CANVAS_W * dpr) {
      c.width = CANVAS_W * dpr;
      c.height = CANVAS_H * dpr;
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);

    const now = performance.now();
    const spawnAge = Math.min(1, (now - mountedAtRef.current) / SPAWN_MS);
    const spawnEase = 1 - Math.pow(1 - spawnAge, 3);

    const holdMs = isHoldingRef.current ? holdMsRef.current : 0;
    const depth = isHoldingRef.current ? depthFromHold(holdMs) : 0;
    const brink = holdMs >= BRINK_MS;

    // breathing scale while idle, slight grow under hold, tier pulse on top
    const idleBreath = isHoldingRef.current
      ? 0
      : Math.sin(now / 1800) * 0.006;
    const holdGrow = depth * 0.05;
    const pulse = tierPulseRef.current * 0.025;
    const compress = isHoldingRef.current ? -0.012 : 0;
    const scale = 1 + idleBreath + holdGrow + pulse + compress;
    const R = ORB_R * scale * (0.45 + 0.55 * spawnEase);
    const R0 = ORB_R;

    // charge-driven jitter
    const stressed = isHoldingRef.current && depth > 0.02;
    const jit = stressed ? (0.35 + depth) : 0;
    const jx = (Math.random() - 0.5) * jit * 6;
    const jy = (Math.random() - 0.5) * jit * 6;

    drawObject(ctx, {
      cx: ORB_CX, cy: ORB_CY,
      R, R0,
      depth,
      brink,
      cracks: cracksRef.current,
      texture: textureRef.current,
      baseScale: 1,
      jitter: { x: jx, y: jy },
      pressBloom: pressBloomRef.current,
      flashAlpha: flashRef.current,
    });

    // halo + brink ring on top, outside the clipped sphere
    const haloR = R * (1.04 + (brink ? 0.06 : 0));
    if (brink) {
      // pulsing red brink ring
      const p = 0.5 + Math.sin(now / 70) * 0.5;
      ctx.beginPath();
      ctx.arc(ORB_CX + jx, ORB_CY + jy, haloR + 8, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(255, 90, 70, ${0.32 + p * 0.28})`;
      ctx.lineWidth = 2 + p * 1.5;
      ctx.shadowColor = 'rgba(255, 90, 70, 0.65)';
      ctx.shadowBlur = 18;
      ctx.stroke();
      ctx.shadowBlur = 0;
    }

    // ripple from press point
    if (ripplesRef.current.length > 0) {
      const keep: Ripple[] = [];
      for (const rp of ripplesRef.current) {
        const age = (now - rp.startedAt) / RIPPLE_LIFE_MS;
        if (age >= 1) continue;
        keep.push(rp);
        const t = age;
        const rad = R0 * (0.18 + t * 0.65);
        const alpha = (1 - t) * 0.55;
        ctx.beginPath();
        ctx.arc(ORB_CX + rp.x, ORB_CY + rp.y, rad, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(216, 198, 255, ${alpha})`;
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
      ripplesRef.current = keep;
    }
  }, []);

  const updateLabels = useCallback(() => {
    // light update — only adjusts when isHoldingRef changes the implied state.
    if (disabled) return;
    const holdMs = holdMsRef.current;
    if (isHoldingRef.current) {
      const depth = depthFromHold(holdMs);
      const tier = tierFromDepth(depth);
      if (tier !== lastTierRef.current && hintRef.current && tierLabelRef.current) {
        // already handled in updateLabelsImmediate when tier crosses
      }
    }
  }, [disabled]);

  const updateLabelsImmediate = useCallback(() => {
    if (!hintRef.current || !tierLabelRef.current) return;
    if (disabled) {
      hintRef.current.textContent = lockedMessage ?? t('hint_already');
      tierLabelRef.current.textContent = '';
      return;
    }
    if (isHoldingRef.current) {
      const tier = lastTierRef.current;
      if (tier === 'brink') {
        hintRef.current.textContent = t('hint_brink');
        tierLabelRef.current.textContent = TIER_LABEL.brink;
      } else if (tier) {
        hintRef.current.textContent = t('hint_release');
        tierLabelRef.current.textContent = TIER_LABEL[tier];
      } else {
        hintRef.current.textContent = t('hint_holding');
        tierLabelRef.current.textContent = '';
      }
    } else {
      hintRef.current.textContent = t('hint_idle');
      tierLabelRef.current.textContent = '';
    }
  }, [disabled, lockedMessage]);

  // Run once on mount to set initial labels.
  useEffect(() => {
    updateLabelsImmediate();
  }, [updateLabelsImmediate]);

  // ─── Pointer handlers ──────────────────────────────────────────────────

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    if (disabled || dimmed) return;
    e.preventDefault();
    // capture press position relative to orb center
    const host = hostRef.current;
    if (!host) return;
    const rect = host.getBoundingClientRect();
    const px = e.clientX - rect.left - ORB_CX;
    const py = e.clientY - rect.top - ORB_CY;
    // clamp inside orb (so cracks stay in)
    const d = Math.hypot(px, py);
    const cap = ORB_R * 0.65;
    const sx = d > cap ? (px / d) * cap : px;
    const sy = d > cap ? (py / d) * cap : py;
    pressPosRef.current = { x: sx, y: sy };

    if (!firstPressedRef.current) {
      firstPressedRef.current = true;
      unlockAudio();
      onFirstPress?.();
    }

    // build a fresh crack network from this exact press point
    cracksRef.current = buildCrackNetwork(ORB_R, sx, sy);
    textureRef.current = makeFacetTexture();
    holdStartRef.current = performance.now();
    holdMsRef.current = 0;
    lastTierRef.current = null;
    shatterFiredRef.current = false;
    isHoldingRef.current = true;

    // press feedback bloom + ripple
    pressBloomRef.current = { x: sx, y: sy, alpha: 0.55, r: ORB_R * 0.35 };
    ripplesRef.current = [{ startedAt: performance.now(), x: sx, y: sy }];

    startRumble();
    setRumbleLevel(0);
    try { (e.target as Element).setPointerCapture?.(e.pointerId); } catch { /* ignore */ }
    updateLabelsImmediate();
  }, [disabled, dimmed, onFirstPress, updateLabelsImmediate]);

  const releaseInternal = useCallback(() => {
    if (!isHoldingRef.current) return;
    const ms = holdMsRef.current;
    const tier = lastTierRef.current;
    isHoldingRef.current = false;
    stopRumble();
    updateLabelsImmediate();

    if (ms < WHISPER_MS || !tier) {
      onTooBrief();
      return;
    }
    onRelease({ tier, holdMs: ms, shattered: false });
  }, [onRelease, onTooBrief, updateLabelsImmediate]);

  const onPointerUp = useCallback((e: React.PointerEvent) => {
    if (disabled) return;
    try { (e.target as Element).releasePointerCapture?.(e.pointerId); } catch { /* ignore */ }
    releaseInternal();
  }, [disabled, releaseInternal]);

  const onPointerCancel = useCallback(() => {
    if (disabled) return;
    releaseInternal();
  }, [disabled, releaseInternal]);

  const cls = [
    'cbc-orb',
    disabled && 'cbc-orb--disabled',
    dimmed && 'cbc-orb--dim',
  ].filter(Boolean).join(' ');

  return (
    <div
      ref={hostRef}
      className={cls}
      style={{ width: CANVAS_W, height: CANVAS_H, position: 'relative' }}
    >
      <canvas
        ref={canvasRef}
        width={CANVAS_W}
        height={CANVAS_H}
        style={{
          width: CANVAS_W,
          height: CANVAS_H,
          display: 'block',
          touchAction: 'none',
          WebkitTapHighlightColor: 'transparent',
          userSelect: 'none',
          cursor: disabled ? 'default' : 'pointer',
        }}
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
        onPointerLeave={onPointerCancel}
        role="button"
        aria-label="Crystal ball — press and hold to divine"
      />
      <div className="cbc-orb__caption">
        <span ref={tierLabelRef} className="cbc-orb__tier" />
        <span ref={hintRef} className="cbc-orb__hint" />
      </div>
    </div>
  );
}
