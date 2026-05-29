// Collective wall — recent divination cards from the 6 most-recent
// users, merged optimistically with the player's own cards so a
// just-drawn reading shows immediately (cloud write is debounced
// ~1s + RTT — without the merge the new card is invisible until
// cloud catches up).

import { useMemo, useState } from 'react';
import { useWall, isSelfEntry } from '../hooks/useWall';
import { FateCardView } from './FateCardView';
import { ReactionRow } from './ReactionRow';
import { openAigramProfile } from '@shared/runtime/bridge';
import { t } from '../i18n';
import { prettyDate, todayKey } from '../utils/date';
import { TIER_LABEL } from '../utils/tiers';
import type { FateCard, WallEntry } from '../types';

interface Props {
  /** Player's own card archive — merged in so a just-drawn card
   *  is visible before cloud sync lands. */
  mine?: FateCard[];
}

export function Wall({ mine = [] }: Props) {
  const { entries: cloudEntries, loaded } = useWall();
  const [open, setOpen] = useState<WallEntry | null>(null);

  // Optimistic merge — own cards first, dedupe by card.id, sort
  // newest-first across both.
  const entries: WallEntry[] = useMemo(() => {
    const cloudIds = new Set(cloudEntries.map(e => e.card.id));
    const selfEntries: WallEntry[] = mine
      .filter(c => !cloudIds.has(c.id))
      .map(c => ({
        userId: 'self',
        userName: t('wall_self'),
        card: c,
      }));
    return [...selfEntries, ...cloudEntries].sort(
      (a, b) => (b.card.createdAt ?? 0) - (a.card.createdAt ?? 0),
    );
  }, [cloudEntries, mine]);

  return (
    <div className="cbc-wall">
      <header className="cbc-wall__head">
        <h2 className="cbc-wall__title">{t('wall_heading')}</h2>
        <p className="cbc-wall__sub">{t('wall_sub')}</p>
      </header>

      {loaded && entries.length === 0 && (
        <p className="cbc-wall__empty">{t('wall_empty')}</p>
      )}

      <ul className="cbc-wall__list">
        {entries.map(e => {
          const self = isSelfEntry(e);
          const today = e.card.dateKey === todayKey();
          return (
            <li key={e.userId} className="cbc-wall__row">
              <button
                className="cbc-wall__row-main"
                onPointerDown={() => setOpen(e)}
                aria-label={`Open reading`}
              >
                <span className="cbc-wall__avatar">
                  {e.userAvatarUrl
                    ? <img src={e.userAvatarUrl} alt="" draggable={false} />
                    : <span className="cbc-wall__initial">{(e.userName || '?')[0]?.toUpperCase()}</span>}
                </span>
                <span className="cbc-wall__meta">
                  <span className="cbc-wall__name">
                    {self ? t('wall_self') : (e.userName || t('wall_anon'))}
                    {today && <span className="cbc-wall__today"> · {t('wall_today')}</span>}
                  </span>
                  <span className="cbc-wall__omen">{e.card.title}</span>
                  <span className="cbc-wall__tier">
                    {TIER_LABEL[e.card.tier]} · {prettyDate(e.card.dateKey)}
                  </span>
                </span>
                <span className="cbc-wall__thumb">
                  {e.card.imageUrl
                    ? <img src={e.card.imageUrl} alt="" draggable={false} />
                    : <span className={`cbc-wall__thumb-empty cbc-wall__thumb-empty--${e.card.outcome}`} />}
                </span>
              </button>
              <div className="cbc-wall__below">
                <ReactionRow cardId={e.card.id} compact />
                {!self && (
                  <button
                    className="cbc-wall__profile"
                    onPointerDown={() => openAigramProfile(e.userId)}
                    aria-label={`Open ${e.userName || 'user'}'s profile`}
                  >→</button>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      {open && (
        <div className="cbc-overlay" onPointerDown={() => setOpen(null)}>
          <div
            className="cbc-overlay__inner"
            onPointerDown={e => e.stopPropagation()}
          >
            <button
              className="cbc-link cbc-link--close"
              onPointerDown={() => setOpen(null)}
            >{t('nav_close')}</button>
            <FateCardView card={open.card} />
            <ReactionRow cardId={open.card.id} trackView />
          </div>
        </div>
      )}
    </div>
  );
}
