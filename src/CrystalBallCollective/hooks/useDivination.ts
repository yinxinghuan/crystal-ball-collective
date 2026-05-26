// Daily divination state machine.
//
// Owns:
//  - persistent save (one card per UTC day, cards[] reverse-chron)
//  - the active card-in-progress (between release and reveal)
//  - kicks off gen-image + chat in parallel after release
//  - exposes phase that drives the UI
//
// Daily lock: if savedData.cards[0].dateKey === todayKey(), the orb is
// disabled and the today card is shown directly (skipping idle).

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useGameSave } from '@shared/save/useGameSave';
import { useGenImage } from '@shared/runtime/useGenImage';
import type {
  FateCard,
  FateOutcome,
  FateSave,
  FateTier,
  Phase,
} from '../types';
import {
  buildImagePrompt,
  buildOraclePrompt,
  parseOracleResponse,
  fallbackOracle,
  pickSystem,
  pickShatterOutcome,
  makeCardId,
} from '../utils/cards';
import { todayKey } from '../utils/date';
import { locale as currentLocale } from '../i18n';

const GAME_ID = 'crystal-ball-collective';
const CHAT_URL = 'https://chat.aiwaves.tech/aigram/api/game-chat';

// Stateless one-shot oracle call. We deliberately don't use useChat because
// its accumulated history would carry the previous days' readings into the
// next prompt, biasing the oracle.
async function oracleOnce(prompt: string): Promise<string> {
  const res = await fetch(CHAT_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages: [{ role: 'user', content: prompt }] }),
  });
  if (!res.ok) throw new Error(`oracle chat failed: HTTP ${res.status}`);
  const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
  return json.choices?.[0]?.message?.content ?? '';
}

export interface UseDivination {
  phase: Phase;
  setPhase: (p: Phase) => void;
  /** Today's card if already drawn (or freshly drawn this session). */
  todayCard: FateCard | null;
  /** All cards ever drawn, newest first. */
  allCards: FateCard[];
  /** True until the save layer has resolved. */
  loaded: boolean;
  /** True if today's slot is already filled — orb should be disabled. */
  lockedToday: boolean;
  /** Streak of consecutive days ending today (or yesterday). */
  streak: number;
  /** Lightweight status text shown during 'generating' phase. */
  genStatus: string;
  /** Kick off the divination from a released hold. */
  divine: (tier: FateTier, holdMs: number, shattered: boolean) => Promise<void>;
}

const STATUS_KEYS = [
  'gen_status_1',
  'gen_status_2',
  'gen_status_3',
  'gen_status_4',
];

export function useDivination(): UseDivination {
  const save = useGameSave<FateSave>(GAME_ID);
  const { generate } = useGenImage();

  const [phase, setPhase] = useState<Phase>('idle');
  const [todayCard, setTodayCard] = useState<FateCard | null>(null);
  const [allCards, setAllCards] = useState<FateCard[]>([]);
  const [genStatusIdx, setGenStatusIdx] = useState(0);

  // Reflect saved data into local state once it lands.
  useEffect(() => {
    if (!save.loaded) return;
    const cards = save.savedData?.cards ?? [];
    setAllCards(cards);
    const today = todayKey();
    const todays = cards.find(c => c.dateKey === today);
    if (todays) {
      setTodayCard(todays);
      // Already drew today — show card phase by default.
      setPhase(p => (p === 'idle' ? 'card' : p));
    }
  }, [save.loaded, save.savedData]);

  // Rotate gen status text during the generating phase so it doesn't feel stuck.
  useEffect(() => {
    if (phase !== 'generating') return;
    setGenStatusIdx(0);
    const id = setInterval(() => {
      setGenStatusIdx(i => (i + 1) % STATUS_KEYS.length);
    }, 6000);
    return () => clearInterval(id);
  }, [phase]);

  const lockedToday = todayCard?.dateKey === todayKey();

  const streak = useMemo(() => computeStreak(allCards), [allCards]);

  const allCardsRef = useRef(allCards);
  useEffect(() => { allCardsRef.current = allCards; }, [allCards]);

  const divine = useCallback(
    async (tier: FateTier, holdMs: number, shattered: boolean) => {
      const outcome: FateOutcome = shattered ? pickShatterOutcome() : 'reading';
      const system = pickSystem();
      // Brink + safe release still counts as 'brink' tier reading.
      const cardTier: FateTier = tier;
      const dateKey = todayKey();

      if (shattered) {
        setPhase('shattering');
        // Brief shatter pause for visual; then enter generating.
        await new Promise(r => setTimeout(r, 1100));
      }
      setPhase('generating');

      const loc = currentLocale();
      const imagePrompt = buildImagePrompt(cardTier, system, outcome);
      const oraclePrompt = buildOraclePrompt(cardTier, system, outcome, loc);

      const imageP = generate({ prompt: imagePrompt }).catch(() => '');
      const chatP = oracleOnce(oraclePrompt).catch(() => '');
      const [imageUrl, oracleRaw] = await Promise.all([imageP, chatP]);

      const parsed = oracleRaw ? parseOracleResponse(oracleRaw) : fallbackOracle(cardTier, outcome, loc);
      // Ashes outcome: even if the image generated, force the empty look.
      const finalImage = outcome === 'ashes' ? '' : imageUrl;

      const card: FateCard = {
        id: makeCardId(),
        dateKey,
        tier: cardTier,
        outcome,
        system,
        title: parsed.title,
        reading: parsed.reading,
        imageUrl: finalImage || undefined,
        createdAt: Date.now(),
        holdMs,
      };

      // Persist: prepend today's card, replacing any prior entry for the
      // same dateKey (shouldn't happen — lock prevents — but defensive).
      const prior = allCardsRef.current.filter(c => c.dateKey !== dateKey);
      const nextCards = [card, ...prior];
      const nextSave: FateSave = {
        cards: nextCards,
        reactions: save.savedData?.reactions ?? {},
      };
      save.persist(nextSave);
      setAllCards(nextCards);
      setTodayCard(card);
      setPhase('card');
    },
    [generate, save],
  );

  const genStatus = STATUS_KEYS[genStatusIdx];

  return {
    phase,
    setPhase,
    todayCard,
    allCards,
    loaded: save.loaded,
    lockedToday,
    streak,
    genStatus,
    divine,
  };
}

function computeStreak(cards: FateCard[]): number {
  if (cards.length === 0) return 0;
  const today = todayKey();
  // Build a YYYY-MM-DD set, count walking back from today.
  const set = new Set(cards.map(c => c.dateKey));
  let n = 0;
  let cursor = new Date(today + 'T00:00:00Z');
  // If today not drawn, allow yesterday to anchor the streak.
  if (!set.has(today)) cursor.setUTCDate(cursor.getUTCDate() - 1);
  while (set.has(toKey(cursor))) {
    n++;
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }
  return n;
}

function toKey(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
