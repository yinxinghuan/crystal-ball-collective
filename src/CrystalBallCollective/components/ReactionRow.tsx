// Reactions for a single fate card. Increment-only per-user (Album Cover
// Generator pattern): each (card, kind) pair can be tapped at most once
// per user, then the row reflects platform aggregate counts.

import { useEffect, useMemo, useState } from 'react';
import { useGameEvent } from '@shared/runtime/useGameEvent';
import {
  callAigramAPI,
  isInAigram,
  type AigramResponse,
} from '@shared/runtime/bridge';
import { getGameUuid } from '@shared/runtime/game-id';
import { REACTION_KINDS, type ReactionKind } from '../types';

const LS_PREFIX = 'cbc-react-';

const GLYPH: Record<ReactionKind, string> = {
  heart: '♥',
  flame: '⌬',  // stylized — avoid emoji per project rule
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

function eventName(cardId: string, kind: ReactionKind): string {
  return `react:${cardId}:${kind}`;
}

function lsKey(cardId: string): string {
  return `${LS_PREFIX}${cardId}`;
}

function loadMine(cardId: string): Set<ReactionKind> {
  try {
    const raw = localStorage.getItem(lsKey(cardId));
    if (!raw) return new Set();
    const arr = JSON.parse(raw) as ReactionKind[];
    return new Set(arr);
  } catch {
    return new Set();
  }
}

function saveMine(cardId: string, set: Set<ReactionKind>): void {
  try {
    localStorage.setItem(lsKey(cardId), JSON.stringify(Array.from(set)));
  } catch { /* ignore */ }
}

// Off-platform deterministic baseline so the wall doesn't look dead in demos.
function djb2(s: string): number {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h) ^ s.charCodeAt(i);
  return Math.abs(h);
}
function fallback(cardId: string, kind: ReactionKind): number {
  const h = djb2(`${cardId}:${kind}`);
  const base = (h % 30);
  return kind === 'heart' ? base + 2 : Math.floor(base * 0.6);
}

interface Props {
  cardId: string;
  /** Compact layout used in wall list rows. */
  compact?: boolean;
}

export function ReactionRow({ cardId, compact }: Props) {
  const { trigger, canEmit } = useGameEvent();
  const [mine, setMine] = useState<Set<ReactionKind>>(() => loadMine(cardId));
  const [counts, setCounts] = useState<Record<ReactionKind, number>>(() => ({
    heart: fallback(cardId, 'heart'),
    flame: fallback(cardId, 'flame'),
    eye: fallback(cardId, 'eye'),
    moon: fallback(cardId, 'moon'),
  }));

  const sessionId = getGameUuid();

  // Pull live counts on mount when we're on-platform.
  useEffect(() => {
    if (!isInAigram || !sessionId) return;
    let cancelled = false;
    (async () => {
      const fetched = await Promise.all(
        REACTION_KINDS.map(async (k): Promise<[ReactionKind, number]> => {
          try {
            const res = await callAigramAPI<AigramResponse<PlayStats>>(
              `/note/aigram/ai/game/get/play/stats?session_id=${encodeURIComponent(sessionId)}&event=${encodeURIComponent(eventName(cardId, k))}`,
              'GET',
            );
            return [k, res?.data?.total_click_count ?? 0];
          } catch {
            return [k, 0];
          }
        }),
      );
      if (cancelled) return;
      setCounts(prev => {
        const next = { ...prev };
        for (const [k, n] of fetched) next[k] = Math.max(prev[k], n);
        return next;
      });
    })();
    return () => { cancelled = true; };
  }, [cardId, sessionId]);

  const onTap = (k: ReactionKind) => {
    if (mine.has(k)) return; // increment-only — no untap
    const nextMine = new Set(mine);
    nextMine.add(k);
    setMine(nextMine);
    saveMine(cardId, nextMine);
    setCounts(c => ({ ...c, [k]: c[k] + 1 }));
    if (canEmit) {
      trigger(eventName(cardId, k));
      trigger(`react:${cardId}`); // aggregate event (consumed by future widgets)
    }
  };

  const totalMine = useMemo(() => mine.size, [mine]);

  return (
    <div className={`cbc-react ${compact ? 'cbc-react--compact' : ''}`}>
      {REACTION_KINDS.map(k => {
        const tapped = mine.has(k);
        const n = counts[k];
        return (
          <button
            key={k}
            className={`cbc-react__btn cbc-react__btn--${k}${tapped ? ' is-tapped' : ''}`}
            onPointerDown={() => onTap(k)}
            aria-label={`${LABEL[k]} reaction (${n})`}
            disabled={tapped}
          >
            <span className="cbc-react__glyph" aria-hidden>{GLYPH[k]}</span>
            <span className="cbc-react__n">{n}</span>
          </button>
        );
      })}
      {totalMine > 0 && !compact && (
        <span className="cbc-react__note" aria-hidden>
          ✓ logged
        </span>
      )}
    </div>
  );
}
