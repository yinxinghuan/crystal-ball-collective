// Crystal Ball Collective — orchestrator.
//
// Phases:
//   idle        — orb pulses, hold to divine. Hint text rotates by hold state.
//   shattering  — brief overlay (post-brink release/auto-shatter) before gen.
//   generating  — orb dims, mystic status rotates while gen-image + chat run.
//   card        — today's reading shown. Buttons: collective wall, my archive.
//   wall        — recent 6 readings across users.
//   archive     — full personal history.
//
// Daily lock: useDivination drops straight to 'card' when today's slot is
// already filled on load.

import { useCallback, useEffect, useState } from 'react';
import { CrystalBall } from './components/CrystalBall';
import { FateCardView } from './components/FateCardView';
import { ReactionRow } from './components/ReactionRow';
import { Wall } from './components/Wall';
import { Archive } from './components/Archive';
import { useHold } from './hooks/useHold';
import { useDivination } from './hooks/useDivination';
import { WHISPER_MS, TIER_LABEL } from './utils/tiers';
import { t } from './i18n';
import './CrystalBallCollective.less';

export default function CrystalBallCollective() {
  const {
    phase, setPhase,
    todayCard, allCards,
    loaded, lockedToday,
    streak, genStatus,
    divine,
  } = useDivination();

  const [shatterFlash, setShatterFlash] = useState(false);
  const [tooBrief, setTooBrief] = useState(false);

  const hold = useHold({
    disabled: lockedToday || phase === 'generating' || phase === 'shattering',
  });

  const onRelease = useCallback((forced = false) => {
    if (!hold.state.isHolding && !forced) return;
    const ms = hold.state.holdMs;
    const tier = hold.state.tier.tier;
    const shattered = hold.state.shattered || forced;
    hold.stop();

    if (!shattered && (!tier || ms < WHISPER_MS)) {
      setTooBrief(true);
      hold.reset();
      return;
    }
    if (shattered) {
      setShatterFlash(true);
      void divine('brink', ms, true);
      window.setTimeout(() => setShatterFlash(false), 1400);
    } else {
      void divine(tier!, ms, false);
    }
  }, [divine, hold]);

  // Auto-release when hold auto-shatters.
  useEffect(() => {
    if (hold.state.shattered && hold.state.isHolding) onRelease(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hold.state.shattered]);

  const onPress = useCallback(() => {
    if (lockedToday) return;
    setTooBrief(false);
    hold.start();
  }, [hold, lockedToday]);

  const onCancel = useCallback(() => {
    if (hold.state.isHolding) onRelease(false);
  }, [hold.state.isHolding, onRelease]);

  let hint = t('hint_idle');
  if (lockedToday && phase === 'card') hint = t('hint_already');
  else if (hold.state.isHolding) {
    if (hold.state.tier.brinkWarning) hint = t('hint_brink');
    else if (hold.state.tier.tier) hint = t('hint_release');
  } else if (tooBrief) hint = t('hint_too_brief');

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
            hold={hold.state}
            disabled={lockedToday}
            dimmed={phase === 'generating' || phase === 'shattering'}
            showShatter={shatterFlash}
            onPointerDown={onPress}
            onPointerUp={() => onRelease(false)}
            onPointerCancel={onCancel}
          />
          <div className="cbc-stage__under">
            {phase === 'generating' ? (
              <span className="cbc-stage__gen">{t(genStatus)}…</span>
            ) : (
              <>
                <span className="cbc-stage__tier">
                  {hold.state.tier.tier
                    ? TIER_LABEL[hold.state.tier.tier]
                    : t('tier_none')}
                </span>
                <span className="cbc-stage__hint">{hint}</span>
              </>
            )}
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
