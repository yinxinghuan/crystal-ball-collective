// Crystal Ball Collective — orchestrator.
//
// Phases:
//   idle        — orb pulses, hold to divine
//   shattering  — brief shatter pause (post-brink release)
//   generating  — gen-image + chat in flight, mystic status rotates
//   card        — today's reading shown
//   wall        — recent 6 readings across users
//   archive     — full personal history
//
// CrystalBall owns the press-and-hold interaction + RAF loop entirely.
// Tier crossings + haptic + audio are handled inside the orb. The orchestrator
// only responds to {onRelease, onAutoShatter, onTooBrief} events and drives
// phase transitions + generation.

import { useCallback, useState } from 'react';
import { CrystalBall } from './components/CrystalBall';
import { FateCardView } from './components/FateCardView';
import { ReactionRow } from './components/ReactionRow';
import { Wall } from './components/Wall';
import { Archive } from './components/Archive';
import { useDivination } from './hooks/useDivination';
import { shatterSfx, shatterHaptic } from './utils/audio';
import { t } from './i18n';
import type { FateTier } from './types';
import './CrystalBallCollective.less';

export default function CrystalBallCollective() {
  const {
    phase, setPhase,
    todayCard, allCards,
    loaded, lockedToday,
    streak, genStatus,
    divine,
  } = useDivination();

  const [tooBriefFlash, setTooBriefFlash] = useState(false);

  const onRelease = useCallback((info: { tier: FateTier; holdMs: number; shattered: boolean }) => {
    void divine(info.tier, info.holdMs, info.shattered);
  }, [divine]);

  const onAutoShatter = useCallback((info: { tier: FateTier; holdMs: number; shattered: true }) => {
    // Roll the outcome NOW so we can color the shatter SFX correctly.
    const outcome = Math.random() < 0.5 ? 'glory' : 'ashes';
    shatterSfx(outcome);
    shatterHaptic();
    // Pass outcome forward via a side channel — divine() will roll its own;
    // for the SFX we just want to play the right cue. (Audio is fire-and-forget.)
    void divine(info.tier, info.holdMs, true);
  }, [divine]);

  const onTooBrief = useCallback(() => {
    setTooBriefFlash(true);
    window.setTimeout(() => setTooBriefFlash(false), 1600);
  }, []);

  const onTierCross = useCallback((_tier: FateTier) => {
    // Reserved for analytics / future visual orchestration. Audio + haptic
    // already fire inside the orb component.
  }, []);

  if (!loaded) {
    return (
      <div className="cbc-app cbc-app--loading">
        <div className="cbc-loader" aria-hidden />
      </div>
    );
  }

  return (
    <div className={`cbc-app cbc-app--${phase}`}>
      <header className="cbc-app__head">
        <div className="cbc-app__brand">{t('brand')}</div>
        {allCards.length > 0 && (
          <button
            className="cbc-app__archive-link"
            onPointerDown={() => setPhase('archive')}
            aria-label={t('nav_archive')}
          >
            ☷ {streak > 0
              ? (streak === 1
                  ? t('archive_streak_one')
                  : t('archive_streak_n', { n: streak }))
              : t('nav_archive')}
          </button>
        )}
      </header>

      {(phase === 'idle' || phase === 'shattering' || phase === 'generating') && (
        <main className="cbc-app__stage">
          <div className="cbc-stage__halo" aria-hidden />
          <CrystalBall
            disabled={lockedToday}
            dimmed={phase === 'generating' || phase === 'shattering'}
            lockedMessage={lockedToday ? t('hint_already') : undefined}
            onRelease={onRelease}
            onAutoShatter={onAutoShatter}
            onTooBrief={onTooBrief}
            onTierCross={onTierCross}
          />
          <div className="cbc-stage__under">
            {phase === 'generating' ? (
              <span className="cbc-stage__gen">{t(genStatus)}…</span>
            ) : tooBriefFlash ? (
              <span className="cbc-stage__warn">{t('hint_too_brief')}</span>
            ) : null}
          </div>
        </main>
      )}

      {phase === 'card' && todayCard && (
        <main className="cbc-app__card">
          <div className="cbc-app__card-label">{t('card_today')}</div>
          <FateCardView card={todayCard} />
          <ReactionRow cardId={todayCard.id} />
          <div className="cbc-app__card-nav">
            <button className="cbc-link" onPointerDown={() => setPhase('wall')}>
              {t('nav_wall')} →
            </button>
            <button className="cbc-link" onPointerDown={() => setPhase('archive')}>
              {t('nav_archive')} →
            </button>
          </div>
          <p className="cbc-app__card-fineprint">{t('hint_already')}</p>
        </main>
      )}

      {phase === 'wall' && (
        <Wall onBack={() => setPhase(todayCard ? 'card' : 'idle')} />
      )}
      {phase === 'archive' && (
        <Archive
          cards={allCards}
          streak={streak}
          onBack={() => setPhase(todayCard ? 'card' : 'idle')}
        />
      )}

      <footer className="cbc-app__foot">
        <img src="/crystal-ball-collective/alteru.svg" alt="alteru" className="cbc-app__mark" />
      </footer>
    </div>
  );
}
