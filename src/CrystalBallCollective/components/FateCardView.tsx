// FateCardView — renders a single divination card.
// Two variants: 'detail' (full-bleed, used on result + archive open)
//               'tile' (compact, used on the wall + archive list)
//
// Visual:
//   - Cosmic dark frame, soft-gold double rule, Cormorant serif
//   - System glyph stamp upper-left (♆ tarot, ⌘ rune, etc — simple unicode)
//   - Title in serif italic, reading in serif regular
//   - Tier ribbon along the bottom edge
//   - Glory: gold leaf shimmer overlay
//   - Ashes: dust-particle scatter, no image

import type { FateCard, OracleSystem, FateOutcome } from '../types';
import { t } from '../i18n';
import { prettyFullDate } from '../utils/date';
import { TIER_LABEL } from '../utils/tiers';

interface Props {
  card: FateCard;
  variant?: 'detail' | 'tile';
}

const SYSTEM_GLYPH: Record<OracleSystem, string> = {
  tarot: '✦',
  oracle_bone: '骨',
  rune: 'ᚱ',
  i_ching: '☷',
};

function systemLabel(sys: OracleSystem): string {
  switch (sys) {
    case 'tarot': return t('card_system_tarot');
    case 'oracle_bone': return t('card_system_oracle_bone');
    case 'rune': return t('card_system_rune');
    case 'i_ching': return t('card_system_i_ching');
  }
}

function sealLabel(o: FateOutcome): string {
  if (o === 'glory') return t('card_seal_glory');
  if (o === 'ashes') return t('card_seal_ashes');
  return t('card_seal_reading');
}

export function FateCardView({ card, variant = 'detail' }: Props) {
  const cls = [
    'cbc-card',
    `cbc-card--${variant}`,
    `cbc-card--${card.outcome}`,
    `cbc-card--tier-${card.tier}`,
    `cbc-card--system-${card.system}`,
  ].join(' ');

  return (
    <article className={cls}>
      <div className="cbc-card__rule cbc-card__rule--top" aria-hidden />
      <header className="cbc-card__head">
        <span className="cbc-card__glyph" aria-hidden>{SYSTEM_GLYPH[card.system]}</span>
        <span className="cbc-card__system">{systemLabel(card.system)}</span>
        <span className="cbc-card__date">{prettyFullDate(card.dateKey)}</span>
      </header>

      <div className="cbc-card__art">
        {card.imageUrl ? (
          <img src={card.imageUrl} alt="" draggable={false} />
        ) : (
          <div className="cbc-card__art-empty" aria-hidden>
            {card.outcome === 'ashes' ? <AshesMotif /> : <PlaceholderMotif />}
          </div>
        )}
        {card.outcome === 'glory' && <div className="cbc-card__glory" aria-hidden />}
      </div>

      <h2 className="cbc-card__title">{card.title}</h2>
      <p className="cbc-card__reading">{card.reading}</p>

      <footer className="cbc-card__foot">
        <span className="cbc-card__seal">{sealLabel(card.outcome)}</span>
        <span className="cbc-card__tier">{TIER_LABEL[card.tier]}</span>
      </footer>
      <div className="cbc-card__rule cbc-card__rule--bot" aria-hidden />
    </article>
  );
}

function AshesMotif() {
  return (
    <svg viewBox="0 0 100 100" className="cbc-card__motif cbc-card__motif--ashes">
      {Array.from({ length: 24 }).map((_, i) => {
        const x = 10 + Math.random() * 80;
        const y = 30 + Math.random() * 60;
        const r = 0.4 + Math.random() * 1.4;
        return <circle key={i} cx={x} cy={y} r={r} fill="rgba(245,239,226,0.6)" />;
      })}
      <path d="M40 60 Q50 50 60 65 L58 70 L42 72 Z" fill="rgba(48,40,32,0.85)" stroke="rgba(216,192,138,0.45)" strokeWidth="0.4" />
    </svg>
  );
}

function PlaceholderMotif() {
  return (
    <svg viewBox="0 0 100 100" className="cbc-card__motif">
      <circle cx="50" cy="50" r="32" fill="none" stroke="rgba(216,192,138,0.42)" strokeWidth="0.6" />
      <circle cx="50" cy="50" r="22" fill="none" stroke="rgba(216,192,138,0.28)" strokeWidth="0.4" />
      <circle cx="50" cy="50" r="12" fill="none" stroke="rgba(216,192,138,0.18)" strokeWidth="0.4" />
      <line x1="50" y1="18" x2="50" y2="82" stroke="rgba(216,192,138,0.2)" strokeWidth="0.3" />
      <line x1="18" y1="50" x2="82" y2="50" stroke="rgba(216,192,138,0.2)" strokeWidth="0.3" />
    </svg>
  );
}
