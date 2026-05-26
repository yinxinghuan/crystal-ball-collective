// Personal archive — every fate card the user has ever pulled, newest
// first, with streak + total counts. Tap a card to open its detail.

import { useState } from 'react';
import { FateCardView } from './FateCardView';
import { t } from '../i18n';
import { prettyDate } from '../utils/date';
import { TIER_LABEL } from '../utils/tiers';
import type { FateCard } from '../types';

interface Props {
  cards: FateCard[];
  streak: number;
  onBack: () => void;
}

export function Archive({ cards, streak, onBack }: Props) {
  const [open, setOpen] = useState<FateCard | null>(null);

  return (
    <div className="cbc-archive">
      <header className="cbc-archive__head">
        <button className="cbc-link cbc-link--back" onPointerDown={onBack}>
          ← {t('nav_back')}
        </button>
        <h2 className="cbc-archive__title">{t('archive_heading')}</h2>
        <p className="cbc-archive__sub">{t('archive_sub')}</p>
        <div className="cbc-archive__stats">
          <span>
            {streak === 1 ? t('archive_streak_one') : t('archive_streak_n', { n: streak })}
          </span>
          <span aria-hidden>·</span>
          <span>
            {cards.length === 1 ? t('archive_total_one') : t('archive_total_n', { n: cards.length })}
          </span>
        </div>
      </header>

      {cards.length === 0 ? (
        <p className="cbc-archive__empty">{t('archive_empty')}</p>
      ) : (
        <ul className="cbc-archive__grid">
          {cards.map(c => (
            <li key={c.id} className="cbc-archive__cell">
              <button
                className={`cbc-archive__btn cbc-archive__btn--${c.outcome}`}
                onPointerDown={() => setOpen(c)}
              >
                <span className="cbc-archive__thumb">
                  {c.imageUrl
                    ? <img src={c.imageUrl} alt="" draggable={false} />
                    : <span className={`cbc-archive__thumb-empty cbc-archive__thumb-empty--${c.outcome}`} />}
                </span>
                <span className="cbc-archive__cell-meta">
                  <span className="cbc-archive__cell-title">{c.title}</span>
                  <span className="cbc-archive__cell-tier">
                    {TIER_LABEL[c.tier]} · {prettyDate(c.dateKey)}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {open && (
        <div className="cbc-overlay" onPointerDown={() => setOpen(null)}>
          <div className="cbc-overlay__inner" onPointerDown={e => e.stopPropagation()}>
            <button
              className="cbc-link cbc-link--close"
              onPointerDown={() => setOpen(null)}
            >{t('nav_close')}</button>
            <FateCardView card={open} />
          </div>
        </div>
      )}
    </div>
  );
}
