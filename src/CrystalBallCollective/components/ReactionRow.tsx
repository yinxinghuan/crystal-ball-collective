// Reactions + view count for a single fate card. All counts are REAL
// platform data — no fake/seeded numbers.
//
// Wiring:
//   - Each (card, kind) reaction is its own platform event: `react:<id>:<kind>`
//   - View count is its own event: `view:<id>` — fired exactly once per
//     (this device, this card) on mount of the detail view
//   - Local one-reaction-per-kind enforcement via localStorage flag (so users
//     can't double-tap the same kind from the same device)
//
// Off-platform (standalone browser, no Aigram bridge): all counts are 0
// because there's no real backend. No fake fallback.

import { useEffect, useState } from 'react';
import { useGameEvent } from '@shared/runtime/useGameEvent';
import {
  callAigramAPI,
  isInAigram,
  type AigramResponse,
} from '@shared/runtime/bridge';
import { getGameUuid } from '@shared/runtime/game-id';
import { REACTION_KINDS, type ReactionKind } from '../types';

const LS_REACT_PREFIX = 'cbc-react-';
const LS_VIEW_PREFIX  = 'cbc-view-';

const GLYPH: Record<ReactionKind, string> = {
  heart: '♥',
  flame: '⌬',   // stylized — avoid emoji per project rule
  eye: '◉',
  moon: '☾',
};

const LABEL: Record<ReactionKind, string> = {
  heart: 'heart',
  flame: 'flame',
  eye: 'eye',
  moon: 'moon',
};

interface PlayStats {
  total_click_count: number;
  total_user_count: number;
  day_click_count: number;
  day_user_count: number;
  continuous_days: number;
}

function reactEventName(cardId: string, kind: ReactionKind): string {
  return `react:${cardId}:${kind}`;
}
function viewEventName(cardId: string): string {
  return `view:${cardId}`;
}

function lsReactKey(cardId: string): string { return `${LS_REACT_PREFIX}${cardId}`; }
function lsViewKey(cardId: string): string  { return `${LS_VIEW_PREFIX}${cardId}`; }

function loadMine(cardId: string): Set<ReactionKind> {
  try {
    const raw = localStorage.getItem(lsReactKey(cardId));
    if (!raw) return new Set();
    return new Set(JSON.parse(raw) as ReactionKind[]);
  } catch { return new Set(); }
}
function saveMine(cardId: string, set: Set<ReactionKind>): void {
  try {
    localStorage.setItem(lsReactKey(cardId), JSON.stringify(Array.from(set)));
  } catch { /* ignore */ }
}
function alreadyViewed(cardId: string): boolean {
  try { return !!localStorage.getItem(lsViewKey(cardId)); } catch { return false; }
}
function markViewed(cardId: string): void {
  try { localStorage.setItem(lsViewKey(cardId), '1'); } catch { /* ignore */ }
}

async function fetchEventTotal(sessionId: string, event: string): Promise<number> {
  try {
    const res = await callAigramAPI<AigramResponse<PlayStats>>(
      `/note/aigram/ai/game/get/play/stats?session_id=${encodeURIComponent(sessionId)}&event=${encodeURIComponent(event)}`,
      'GET',
    );
    return res?.data?.total_click_count ?? 0;
  } catch { return 0; }
}

interface Props {
  cardId: string;
  /** Compact layout used in wall list rows. Hides the view count chip. */
  compact?: boolean;
  /** Mark this card as viewed on mount (fire-once-per-device). Used by
   *  detail overlay; not by the wall list to avoid logging every scroll. */
  trackView?: boolean;
}

export function ReactionRow({ cardId, compact, trackView }: Props) {
  const { trigger, canEmit } = useGameEvent();
  const [mine, setMine] = useState<Set<ReactionKind>>(() => loadMine(cardId));
  const [counts, setCounts] = useState<Record<ReactionKind, number>>({
    heart: 0, flame: 0, eye: 0, moon: 0,
  });
  const [views, setViews] = useState<number>(0);

  const sessionId = getGameUuid();
  const onPlatform = isInAigram && !!sessionId;

  // ── Mount: fire view event (once per device) + fetch real counts ─────────
  useEffect(() => {
    if (trackView && canEmit && !alreadyViewed(cardId)) {
      markViewed(cardId);
      trigger(viewEventName(cardId));
    }
    if (!onPlatform || !sessionId) return;
    let cancelled = false;
    (async () => {
      // Reactions per kind + aggregate view count in parallel
      const reactPairs = await Promise.all(
        REACTION_KINDS.map(async (k): Promise<[ReactionKind, number]> => {
          const n = await fetchEventTotal(sessionId, reactEventName(cardId, k));
          return [k, n];
        }),
      );
      const v = await fetchEventTotal(sessionId, viewEventName(cardId));
      if (cancelled) return;
      const next: Record<ReactionKind, number> = { heart: 0, flame: 0, eye: 0, moon: 0 };
      for (const [k, n] of reactPairs) next[k] = n;
      setCounts(next);
      setViews(v);
    })();
    return () => { cancelled = true; };
  }, [cardId, sessionId, onPlatform, trackView, canEmit, trigger]);

  const onTap = (k: ReactionKind) => {
    if (mine.has(k)) return; // increment-only — no untap
    const nextMine = new Set(mine);
    nextMine.add(k);
    setMine(nextMine);
    saveMine(cardId, nextMine);
    setCounts(c => ({ ...c, [k]: c[k] + 1 }));
    if (canEmit) {
      trigger(reactEventName(cardId, k));
      trigger(`react:${cardId}`); // aggregate event
    }
  };

  return (
    <div className={`cbc-react ${compact ? 'cbc-react--compact' : ''}`}>
      {REACTION_KINDS.map(k => {
        const tapped = mine.has(k);
        const n = counts[k];
        return (
          <button
            key={k}
            className={`cbc-react__btn cbc-react__btn--${k}${tapped ? ' is-tapped' : ''}`}
            // onClick — reactions sit inside the scrollable wall row; a
            // pointerdown would fire while the user is mid-swipe. See
            // scroll-vs-click skill.
            onClick={() => onTap(k)}
            aria-label={`${LABEL[k]} reaction (${n})`}
            disabled={tapped}
          >
            <span className="cbc-react__glyph" aria-hidden>{GLYPH[k]}</span>
            <span className="cbc-react__n">{n}</span>
          </button>
        );
      })}
      {!compact && (
        <span className="cbc-react__views" aria-label={`viewed ${views} times`}>
          <span className="cbc-react__views-glyph" aria-hidden>◐</span>
          <span className="cbc-react__views-n">{views}</span>
        </span>
      )}
    </div>
  );
}
