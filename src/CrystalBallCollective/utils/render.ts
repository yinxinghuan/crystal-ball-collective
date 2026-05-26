// Crystal-ball renderer — ported from Crack Tap (index.html, L1429-1716,
// L802-854). Faithfully reproduces:
//   - 4-stop lit body radial + AO terminator + facet texture + spec + tight
//     glint + rim arc + squashed elliptical contact shadow
//   - Crack network built ONCE at pointerdown (origin = press point), 7-10
//     main arms, sharp kinks, recursive mid-parent forks, tapered ribbon
//     polygons, dark groove fill + thin lit edge on the light-facing side
//
// Coordinates are local: the renderer is handed the orb centre `(cx, cy)`
// and the radius `R`. The crack origin `(ox, oy)` is in the same local
// space, *relative to the orb centre* (Crack Tap's convention — every
// crack `pts[].x/y` is already in orb-local space, multiplied by `k` when
// drawn, where k accounts for the spawn-to-full radius growth).

import type { FateTier } from '../types';

// ─── Theme (mirrors Crack Tap's `crystal` theme) ─────────────────────────

export interface OrbTheme {
  objA: string; objB: string; rim: string; hi: string; lo: string;
  groove: string; edge: string; core: string;
  spec: string; specR: number; glow: number;
}

export const THEME: OrbTheme = {
  objA:  '#9a78ff',
  objB:  '#2c1d57',
  rim:   '#d8c6ff',
  hi:    '#3a2a72',
  lo:    '#170f30',
  groove:'#140a30',
  edge:  '#f3ecff',
  core:  '#c7a4ff',
  spec:  'rgba(255,255,255,0.95)',
  specR: 0.32,
  glow:  9,
};

// Brink theme — red-shifted; used when in_brink for the body gradient.
export const THEME_BRINK: OrbTheme = {
  objA:  '#d86060',
  objB:  '#5a1a1a',
  rim:   '#ffc8c8',
  hi:    '#722a2a',
  lo:    '#2a0808',
  groove:'#2c0a0a',
  edge:  '#ffe8e0',
  core:  '#ff8c70',
  spec:  'rgba(255,235,225,0.95)',
  specR: 0.32,
  glow:  16,
};

// ─── Facet texture — pre-baked random lines + sparkle dots ────────────────

export interface FacetTexture {
  lines: Array<{ a: number; off: number; bright: boolean }>;
  spark: Array<{ x: number; y: number; r: number }>;
}

export function makeFacetTexture(): FacetTexture {
  const lines: FacetTexture['lines'] = [];
  for (let i = 0; i < 18; i++) {
    lines.push({
      a: Math.random() * Math.PI * 2,
      off: (Math.random() - 0.5) * 1.4,
      bright: Math.random() < 0.35,
    });
  }
  const spark: FacetTexture['spark'] = [];
  for (let i = 0; i < 14; i++) {
    spark.push({
      x: (Math.random() - 0.5) * 1.6,
      y: (Math.random() - 0.5) * 1.6,
      r: 0.006 + Math.random() * 0.014,
    });
  }
  return { lines, spark };
}

// ─── Crack network ────────────────────────────────────────────────────────

export interface CrackPt { x: number; y: number; }
export interface CrackFork { pts: CrackPt[]; fr: number; }
export interface CrackArm {
  pts: CrackPt[];
  fork: CrackFork[];
  revealAt: number;
  span: number;
}

/**
 * Build the full crack network in one shot.
 *
 * @param R   orb radius in pixels
 * @param ox  origin x (orb-local, defaults to small jittered offset)
 * @param oy  origin y (orb-local)
 */
export function buildCrackNetwork(R: number, ox?: number, oy?: number): CrackArm[] {
  if (ox === undefined || oy === undefined) {
    const a0 = Math.random() * Math.PI * 2;
    const d = R * (0.05 + Math.random() * 0.18);
    ox = Math.cos(a0) * d;
    oy = Math.sin(a0) * d;
  }
  // Clamp origin inside 0.7R so cracks have room to fan out
  const od = Math.hypot(ox, oy);
  const odMax = R * 0.65;
  if (od > odMax) {
    const k = odMax / od;
    ox *= k; oy *= k;
  }

  const branches = 7 + ((Math.random() * 4) | 0);  // 7..10
  const out: CrackArm[] = [];
  for (let b = 0; b < branches; b++) {
    const a0 = (b / branches) * Math.PI * 2 + (Math.random() - 0.5) * 0.7;
    const segs = 4 + ((Math.random() * 4) | 0);     // 4..7
    const arm: CrackArm = {
      pts: [{ x: ox, y: oy }], fork: [], revealAt: 0, span: 0,
    };
    let px = ox, py = oy, a = a0;
    for (let s = 0; s < segs; s++) {
      const step = R * (0.13 + Math.random() * 0.13);
      a += (Math.random() - 0.5) * 0.34;
      if (Math.random() < 0.22) a += (Math.random() - 0.5) * 1.6;  // sharp kink
      px += Math.cos(a) * step;
      py += Math.sin(a) * step;
      // keep inside sphere
      const d = Math.hypot(px, py);
      if (d > R * 0.97) { const k = (R * 0.97) / d; px *= k; py *= k; }
      arm.pts.push({ x: px, y: py });
      // mid-parent fork
      if (s > 0 && Math.random() < 0.4) {
        let fx = px, fy = py;
        let fa = a + (Math.random() < 0.5 ? 1 : -1) * (0.6 + Math.random() * 0.9);
        const fpts: CrackPt[] = [{ x: px, y: py }];
        const fsegs = 2 + ((Math.random() * 3) | 0);
        for (let k2 = 0; k2 < fsegs; k2++) {
          const fstep = R * (0.09 + Math.random() * 0.1);
          fa += (Math.random() - 0.5) * 0.4;
          fx += Math.cos(fa) * fstep;
          fy += Math.sin(fa) * fstep;
          const fd = Math.hypot(fx, fy);
          if (fd > R * 0.97) { const kk = (R * 0.97) / fd; fx *= kk; fy *= kk; }
          fpts.push({ x: fx, y: fy });
        }
        arm.fork.push({ pts: fpts, fr: 0.35 + Math.random() * 0.5 });
      }
    }
    out.push(arm);
  }
  // Stagger reveal: 2 cracks almost-instant; rest fan out to ~0.9.
  out.sort(() => Math.random() - 0.5);
  out.forEach((cr, i) => {
    cr.revealAt = i < 2 ? 0.015 : (i / out.length) * 0.88;
    cr.span = 0.1 + Math.random() * 0.14;
  });
  return out;
}

// ─── Tapered ribbon polygon along a poly-line ──────────────────────────────

function crackPoly(P: CrackPt[], wStart: number): { L: CrackPt[]; R: CrackPt[] } | null {
  const n = P.length;
  if (n < 2) return null;
  const L: CrackPt[] = [], R: CrackPt[] = [];
  for (let i = 0; i < n; i++) {
    let tx: number, ty: number;
    if (i === 0)          { tx = P[1].x - P[0].x;        ty = P[1].y - P[0].y; }
    else if (i === n - 1) { tx = P[n - 1].x - P[n - 2].x; ty = P[n - 1].y - P[n - 2].y; }
    else                  { tx = P[i + 1].x - P[i - 1].x; ty = P[i + 1].y - P[i - 1].y; }
    const len = Math.hypot(tx, ty) || 1;
    const nx = -ty / len, ny = tx / len;
    const f = i / (n - 1);
    const w = wStart * Math.pow(1 - f, 0.62) * 0.5 + 0.15;
    L.push({ x: P[i].x + nx * w, y: P[i].y + ny * w });
    R.push({ x: P[i].x - nx * w, y: P[i].y - ny * w });
  }
  return { L, R };
}

function trimPts(pts: CrackPt[], grow: number, k: number): CrackPt[] {
  const total = pts.length - 1;
  const shown = total * grow;
  const out: CrackPt[] = [{ x: pts[0].x * k, y: pts[0].y * k }];
  for (let i = 1; i < pts.length; i++) {
    if (i - 1 >= shown) {
      const f = shown - (i - 1);
      if (f <= 0) break;
      const px = pts[i - 1].x + (pts[i].x - pts[i - 1].x) * f;
      const py = pts[i - 1].y + (pts[i].y - pts[i - 1].y) * f;
      out.push({ x: px * k, y: py * k });
      break;
    }
    out.push({ x: pts[i].x * k, y: pts[i].y * k });
  }
  return out;
}

export function drawCrack(
  ctx: CanvasRenderingContext2D,
  pts: CrackPt[],
  grow: number,
  k: number,
  scale: number,
  dmgGlow: number,
  theme: OrbTheme,
  baseScale: number,
): void {
  const P = trimPts(pts, grow, k);
  if (P.length < 2) return;
  const wStart = 3.2 * scale * baseScale * (0.7 + dmgGlow * 0.6);
  const rb = crackPoly(P, wStart);
  if (!rb) return;
  ctx.beginPath();
  ctx.moveTo(rb.L[0].x, rb.L[0].y);
  for (let i = 1; i < rb.L.length; i++) ctx.lineTo(rb.L[i].x, rb.L[i].y);
  for (let i = rb.R.length - 1; i >= 0; i--) ctx.lineTo(rb.R[i].x, rb.R[i].y);
  ctx.closePath();
  ctx.fillStyle = theme.groove;
  ctx.fill();
  // lit lip on the light-facing edge only
  ctx.beginPath();
  ctx.moveTo(rb.L[0].x, rb.L[0].y);
  for (let i = 1; i < rb.L.length; i++) ctx.lineTo(rb.L[i].x, rb.L[i].y);
  ctx.strokeStyle = theme.edge;
  ctx.globalAlpha = 0.45;
  ctx.lineWidth = Math.max(0.6, 0.7 * baseScale);
  ctx.stroke();
  ctx.globalAlpha = 1;
}

// ─── Texture overlay (facets for the crystal theme) ───────────────────────

export function drawTexture(
  ctx: CanvasRenderingContext2D,
  tex: FacetTexture,
  R: number,
  baseScale: number,
): void {
  ctx.lineWidth = 1 * baseScale;
  for (const l of tex.lines) {
    const dx = Math.cos(l.a), dy = Math.sin(l.a);
    const px = -dy * l.off * R, py = dx * l.off * R;
    ctx.beginPath();
    ctx.moveTo(px - dx * R * 1.2, py - dy * R * 1.2);
    ctx.lineTo(px + dx * R * 1.2, py + dy * R * 1.2);
    ctx.strokeStyle = l.bright ? 'rgba(255,255,255,0.16)' : 'rgba(0,0,0,0.22)';
    ctx.stroke();
  }
  for (const s of tex.spark) {
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.beginPath(); ctx.arc(s.x * R, s.y * R, s.r * R, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;
  }
}

// ─── Main sphere (lit body + AO + texture + glow + cracks + spec + rim) ──

interface DrawObjectOpts {
  cx: number; cy: number;
  R: number;                       // current radius (may grow during spawn ease)
  R0: number;                      // full radius (used for `k` = R/R0)
  depth: number;                   // 0..1 hold depth
  brink: boolean;                  // brink palette toggle
  cracks: CrackArm[];
  texture: FacetTexture;
  baseScale: number;               // global pixel scale (devicePixelRatio-aware multiplier)
  jitter: { x: number; y: number };
  pressBloom?: { x: number; y: number; alpha: number; r: number } | null;
  flashAlpha?: number;             // 0..1 — global overlay flash after tier crossing
}

export function drawObject(ctx: CanvasRenderingContext2D, opts: DrawObjectOpts): void {
  const { cx, cy, R, R0, depth, brink, cracks, texture, baseScale, jitter, pressBloom, flashAlpha } = opts;
  const theme = brink ? THEME_BRINK : THEME;
  const c = Math.min(1, depth);

  // ─── contact shadow on the ground (world space, no jitter) ───
  ctx.save();
  ctx.globalAlpha = 0.5;
  const sh = ctx.createRadialGradient(cx, cy + R * 1.04, 0, cx, cy + R * 1.04, R * 0.95);
  sh.addColorStop(0, 'rgba(0,0,0,0.55)');
  sh.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = sh;
  ctx.translate(cx, cy + R * 1.04);
  ctx.scale(1, 0.26);
  ctx.beginPath(); ctx.arc(0, 0, R * 0.95, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // ─── orb body (includes jitter) ───
  ctx.save();
  ctx.translate(cx + jitter.x, cy + jitter.y);
  const k = R / R0;

  // body: lit sphere (light from upper-left)
  const lx = -R * 0.42, ly = -R * 0.46;
  const body = ctx.createRadialGradient(lx, ly, R * 0.05, 0, 0, R * 1.08);
  body.addColorStop(0, theme.hi);
  body.addColorStop(0.42, theme.objA);
  body.addColorStop(0.82, theme.objB);
  body.addColorStop(1, theme.lo);
  ctx.beginPath(); ctx.arc(0, 0, R, 0, Math.PI * 2);
  ctx.fillStyle = body;
  ctx.shadowColor = theme.objA;
  ctx.shadowBlur = (6 + c * 26) * baseScale;
  ctx.fill();
  ctx.shadowBlur = 0;

  // clip to body for everything surface-bound
  ctx.save();
  ctx.beginPath(); ctx.arc(0, 0, R, 0, Math.PI * 2); ctx.clip();

  // ambient occlusion (dark terminator opposite the light)
  const ao = ctx.createRadialGradient(R * 0.34, R * 0.4, R * 0.2, R * 0.2, R * 0.28, R * 1.25);
  ao.addColorStop(0, 'rgba(0,0,0,0)');
  ao.addColorStop(1, theme.lo);
  ctx.globalAlpha = 0.7;
  ctx.fillStyle = ao;
  ctx.beginPath(); ctx.arc(0, 0, R, 0, Math.PI * 2); ctx.fill();
  ctx.globalAlpha = 1;

  drawTexture(ctx, texture, R, baseScale);

  // inner glow — deepens with the omen
  if (c > 0.02) {
    const cg = ctx.createRadialGradient(0, 0, 0, 0, 0, R);
    cg.addColorStop(0, theme.core);
    cg.addColorStop(Math.min(0.9, 0.12 + c * 0.72), 'rgba(0,0,0,0)');
    cg.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.globalAlpha = 0.4 + c * 0.55;
    ctx.beginPath(); ctx.arc(0, 0, R, 0, Math.PI * 2);
    ctx.fillStyle = cg; ctx.fill();
    ctx.globalAlpha = 1;
  }

  // press bloom — soft inner light at the press point right after pointerdown
  if (pressBloom && pressBloom.alpha > 0.005) {
    const pg = ctx.createRadialGradient(
      pressBloom.x, pressBloom.y, 0,
      pressBloom.x, pressBloom.y, pressBloom.r,
    );
    pg.addColorStop(0, 'rgba(255,255,255,1)');
    pg.addColorStop(0.5, 'rgba(216,198,255,0.7)');
    pg.addColorStop(1, 'rgba(216,198,255,0)');
    ctx.globalAlpha = pressBloom.alpha;
    ctx.beginPath(); ctx.arc(0, 0, R, 0, Math.PI * 2);
    ctx.fillStyle = pg; ctx.fill();
    ctx.globalAlpha = 1;
  }

  // cracks
  for (const cr of cracks) {
    const g = (c - cr.revealAt) / cr.span;
    if (g <= 0) continue;
    const grow = g >= 1 ? 1 : g;
    drawCrack(ctx, cr.pts, grow, k, 1, c, theme, baseScale);
    for (const f of cr.fork) {
      const fg = (grow - f.fr) / (1 - f.fr);
      if (fg > 0) drawCrack(ctx, f.pts, fg >= 1 ? 1 : fg, k, 0.62, c, theme, baseScale);
    }
  }

  // tier-crossing flash overlay (whole sphere)
  if (flashAlpha && flashAlpha > 0.01) {
    ctx.globalAlpha = flashAlpha;
    ctx.fillStyle = 'rgba(245,239,226,1)';
    ctx.beginPath(); ctx.arc(0, 0, R, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;
  }

  ctx.restore(); // unclip

  // specular highlight (sits on top, glassy)
  const sx = -R * 0.36, sy = -R * 0.42, sr = R * theme.specR;
  const spec = ctx.createRadialGradient(sx, sy, 0, sx, sy, sr);
  spec.addColorStop(0, theme.spec);
  spec.addColorStop(0.28, 'rgba(255,255,255,0.18)');
  spec.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.beginPath(); ctx.arc(sx, sy, sr, 0, Math.PI * 2);
  ctx.fillStyle = spec; ctx.fill();
  // tight glint
  ctx.beginPath();
  ctx.arc(sx - sr * 0.12, sy - sr * 0.12, sr * 0.16, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255,255,255,0.95)';
  ctx.fill();

  // rim light on the lit side only
  ctx.beginPath();
  ctx.arc(0, 0, R - baseScale, Math.PI * 1.05, Math.PI * 1.95);
  ctx.strokeStyle = theme.rim;
  ctx.globalAlpha = 0.55;
  ctx.lineWidth = 2 * baseScale;
  ctx.stroke();
  ctx.globalAlpha = 1;

  ctx.restore();
}

// ─── Tier ↔ depth helpers ──────────────────────────────────────────────────
//
// Map raw hold-ms onto a normalized 0..1 "depth" that matches Crack Tap's
// gauge metaphor. The crack network's revealAt thresholds live in 0..1 too.
// Anchors line up with the existing tier thresholds in utils/tiers.ts.

import { WHISPER_MS, VISION_MS, REVELATION_MS, BRINK_MS, BRINK_MAX_MS } from './tiers';

export function depthFromHold(ms: number): number {
  if (ms <= 0) return 0;
  if (ms >= BRINK_MAX_MS) return 1;
  // Anchors: WHISPER→0.12, VISION→0.32, REVELATION→0.6, BRINK→0.86, MAX→1.0
  const anchors: Array<[number, number]> = [
    [0, 0],
    [WHISPER_MS, 0.12],
    [VISION_MS, 0.32],
    [REVELATION_MS, 0.6],
    [BRINK_MS, 0.86],
    [BRINK_MAX_MS, 1.0],
  ];
  for (let i = 1; i < anchors.length; i++) {
    if (ms <= anchors[i][0]) {
      const [t0, d0] = anchors[i - 1];
      const [t1, d1] = anchors[i];
      const f = (ms - t0) / (t1 - t0);
      return d0 + (d1 - d0) * f;
    }
  }
  return 1;
}

export function tierFromDepth(d: number): FateTier | null {
  if (d < 0.06) return null;
  if (d < 0.32) return 'whisper';
  if (d < 0.6) return 'vision';
  if (d < 0.86) return 'revelation';
  return 'brink';
}
