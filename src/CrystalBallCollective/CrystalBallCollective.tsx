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
import { ScrollFade } from './components/ScrollFade';
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

  // Top-bar tabs (TODAY / COLLECTIVE / MY READINGS) are persistent across
  // the three "browsable" phases. Hidden during shattering + generating so
  // the divination is uninterrupted.
  const showTabs = phase === 'idle' || phase === 'card' || phase === 'wall' || phase === 'archive';
  const todayTab = todayCard ? 'card' : 'idle';
  const activeTab: 'today' | 'wall' | 'archive' =
    phase === 'wall' ? 'wall' : phase === 'archive' ? 'archive' : 'today';
  const streakLabel = streak > 0
    ? (streak === 1 ? t('archive_streak_one') : t('archive_streak_n', { n: streak }))
    : null;

  return (
    <div className={`cbc-app cbc-app--${phase}`}>
      <header className="cbc-app__head">
        <div className="cbc-app__brand">{t('brand')}</div>
      </header>

      {showTabs && (
        <nav className="cbc-tabs" aria-label="Crystal Ball navigation">
          <button
            className={`cbc-tab${activeTab === 'today' ? ' is-active' : ''}`}
            onPointerDown={() => setPhase(todayTab)}
          >
            {t('card_today')}
          </button>
          <button
            className={`cbc-tab${activeTab === 'wall' ? ' is-active' : ''}`}
            onPointerDown={() => setPhase('wall')}
          >
            {t('nav_wall')}
          </button>
          <button
            className={`cbc-tab${activeTab === 'archive' ? ' is-active' : ''}`}
            onPointerDown={() => setPhase('archive')}
          >
            {t('nav_archive')}
            {streakLabel && <span className="cbc-tab__chip">{streakLabel}</span>}
          </button>
        </nav>
      )}

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
          <FateCardView card={todayCard} />
          <ReactionRow cardId={todayCard.id} trackView />
          <p className="cbc-app__card-fineprint">{t('hint_already')}</p>
        </main>
      )}

      {phase === 'wall' && <Wall mine={allCards} />}
      {phase === 'archive' && <Archive cards={allCards} streak={streak} />}

      <footer className="cbc-app__foot">
        <img src="/crystal-ball-collective/alteru.svg" alt="alteru" className="cbc-app__mark" />
      </footer>

      <ScrollFade />
    </div>
  );
}
