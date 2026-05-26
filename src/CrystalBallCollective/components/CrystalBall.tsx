// Crystal ball — interactive press-and-hold orb with a spider-crack
// fracture network rendered on canvas. Cracks deepen as the user holds.
//
// Visuals:
//  - CSS sphere: radial gradients (highlight + rim + cosmic depth)
//  - Canvas overlay: 8 main crack arms + branches, opacity ramps with hold
//  - Tier crossings flash a soft glow + pulse
//  - Brink: red-shift + tremor; auto-shatter past BRINK_MAX_MS
//
// Hold state is owned by useHold(); this component just renders + dispatches.

import { useCallback, useEffect, useRef } from 'react';
import type { HoldState } from '../hooks/useHold';
import { BRINK_MAX_MS } from '../utils/tiers';

interface Props {
  hold: HoldState;
  /** Disable interaction (e.g. divination already locked for today). */
  disabled?: boolean;
  /** True when generation/result is showing — fade orb out + dim. */
  dimmed?: boolean;
  /** Show shatter visual one-shot. Parent drives this. */
  showShatter?: boolean;
  onPointerDown: () => void;
  onPointerUp: () => void;
  onPointerCancel: () => void;
}

interface Crack {
  /** Angle from center (radians). */
  angle: number;
  /** Length 0..1 — fraction of orb radius the crack reaches. */
  length: number;
  /** Sub-branches off this main crack. */
  branches: Array<{ at: number; angle: number; length: number }>;
}

const ORB_PX = 260;          // total CSS size of the orb
const RADIUS = ORB_PX / 2;
const MAIN_ARMS = 9;

function buildCracks(seed: number): Crack[] {
  // Deterministic per-mount so cracks don't reshuffle every frame.
  let s = seed || 1;
  const rand = () => {
    s = (s * 1664525 + 1013904223) % 2 ** 31;
    return s / 2 ** 31;
  };
  const cracks: Crack[] = [];
  for (let i = 0; i < MAIN_ARMS; i++) {
    const baseAngle = (i / MAIN_ARMS) * Math.PI * 2;
    const jitter = (rand() - 0.5) * 0.25;
    const branches: Crack['branches'] = [];
    const branchCount = 2 + Math.floor(rand() * 3);
    for (let b = 0; b < branchCount; b++) {
      branches.push({
        at: 0.25 + rand() * 0.55,                // along the arm
        angle: (rand() - 0.5) * 1.1,             // ± relative to arm
        length: 0.18 + rand() * 0.32,            // fraction of arm length
      });
    }
    cracks.push({
      angle: baseAngle + jitter,
      length: 0.78 + rand() * 0.18,
      branches,
    });
  }
  return cracks;
}

export function CrystalBall({
  hold,
  disabled,
  dimmed,
  showShatter,
  onPointerDown,
  onPointerUp,
  onPointerCancel,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cracksRef = useRef<Crack[]>(buildCracks(Math.floor(Date.now() % 1e6)));

  // Re-seed the crack pattern each new hold so the divination feels fresh.
  useEffect(() => {
    if (hold.isHolding && hold.holdMs < 50) {
      cracksRef.current = buildCracks(Math.floor(Date.now() % 1e6));
    }
  }, [hold.isHolding, hold.holdMs]);

  const draw = useCallback(() => {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const w = ORB_PX, h = ORB_PX;
    if (c.width !== w * dpr) {
      c.width = w * dpr;
      c.height = h * dpr;
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    // Overall "fracture progress" 0..1 from hold ms.
    const p = Math.min(1, hold.holdMs / BRINK_MAX_MS);
    if (p <= 0) return;

    const cx = w / 2, cy = h / 2;

    // Main arm visibility ramps in as cracks deepen.
    ctx.lineCap = 'round';
    ctx.strokeStyle = `rgba(245, 239, 226, ${0.35 + 0.55 * p})`;
    ctx.shadowColor = hold.tier.brinkWarning ? 'rgba(216, 96, 96, 0.55)' : 'rgba(216, 192, 138, 0.5)';
    ctx.shadowBlur = 4 + 8 * p;

    for (const crack of cracksRef.current) {
      const reach = RADIUS * crack.length * p;
      ctx.lineWidth = 0.6 + 1.4 * p;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      // Slight wobble — segment cracks rather than a clean line
      const segs = 6;
      for (let i = 1; i <= segs; i++) {
        const t = i / segs;
        const wobble = (Math.sin(i * 4.7 + crack.angle * 13) * 2.0) * (1 - Math.abs(0.5 - t) * 2);
        const a = crack.angle + (wobble * 0.06) / Math.max(0.25, t);
        const r = reach * t;
        const x = cx + Math.cos(a) * r;
        const y = cy + Math.sin(a) * r;
        ctx.lineTo(x, y);
      }
      ctx.stroke();

      // Branches — only appear past 30% progress
      if (p > 0.3) {
        const branchAlpha = Math.min(1, (p - 0.3) / 0.5);
        ctx.lineWidth = 0.4 + 0.7 * p;
        ctx.strokeStyle = `rgba(245, 239, 226, ${(0.25 + 0.5 * p) * branchAlpha})`;
        for (const b of crack.branches) {
          const startR = reach * b.at;
          const sx = cx + Math.cos(crack.angle) * startR;
          const sy = cy + Math.sin(crack.angle) * startR;
          const ex = sx + Math.cos(crack.angle + b.angle) * RADIUS * b.length * p;
          const ey = sy + Math.sin(crack.angle + b.angle) * RADIUS * b.length * p;
          ctx.beginPath();
          ctx.moveTo(sx, sy);
          ctx.lineTo(ex, ey);
          ctx.stroke();
        }
        ctx.strokeStyle = `rgba(245, 239, 226, ${0.35 + 0.55 * p})`;
      }
    }
    ctx.shadowBlur = 0;
  }, [hold.holdMs, hold.tier.brinkWarning]);

  // Redraw on every hold change. Cheap enough at 60fps.
  useEffect(() => { draw(); }, [draw]);

  const wrapperClass = [
    'cbc-orb',
    hold.isHolding && 'cbc-orb--holding',
    hold.tier.brinkWarning && 'cbc-orb--brink',
    dimmed && 'cbc-orb--dim',
    showShatter && 'cbc-orb--shattered',
    disabled && 'cbc-orb--disabled',
  ].filter(Boolean).join(' ');

  return (
    <div
      className={wrapperClass}
      style={{ width: ORB_PX, height: ORB_PX }}
      onPointerDown={e => { e.preventDefault(); onPointerDown(); }}
      onPointerUp={onPointerUp}
      onPointerLeave={onPointerCancel}
      onPointerCancel={onPointerCancel}
      role="button"
      aria-label="Crystal ball — press and hold to divine"
    >
      <div className="cbc-orb__glass" aria-hidden />
      <canvas
        ref={canvasRef}
        className="cbc-orb__cracks"
        style={{ width: ORB_PX, height: ORB_PX }}
        aria-hidden
      />
      <div className="cbc-orb__sheen" aria-hidden />
      {showShatter && (
        <div className="cbc-orb__shards" aria-hidden>
          {Array.from({ length: 12 }).map((_, i) => (
            <span key={i} style={{ ['--i' as never]: i }} />
          ))}
        </div>
      )}
    </div>
  );
}
