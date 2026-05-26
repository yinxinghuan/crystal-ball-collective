import { useCallback, useEffect, useRef, useState } from 'react';
import { tierFromHold, BRINK_MAX_MS, type TierState } from '../utils/tiers';

export interface HoldState {
  isHolding: boolean;
  holdMs: number;
  tier: TierState;
  /** True for the brief window between auto-shatter trigger and stop(). */
  shattered: boolean;
}

export interface UseHold {
  state: HoldState;
  start: () => void;
  stop: () => void;
  reset: () => void;
}

interface UseHoldOpts {
  /** Called when the orb crosses BRINK_MAX_MS — game logic should treat this as a forced shatter. */
  onAutoShatter?: () => void;
  /** Disable interaction (e.g. after today's divination is locked). */
  disabled?: boolean;
}

const ZERO_TIER: TierState = { tier: null, progress: 0, brinkWarning: false, autoShatter: false };

export function useHold({ onAutoShatter, disabled }: UseHoldOpts = {}): UseHold {
  const [state, setState] = useState<HoldState>({
    isHolding: false,
    holdMs: 0,
    tier: ZERO_TIER,
    shattered: false,
  });

  const startedAtRef = useRef<number>(0);
  const rafRef = useRef<number | null>(null);
  const shatterFiredRef = useRef(false);
  const onAutoShatterRef = useRef(onAutoShatter);
  useEffect(() => { onAutoShatterRef.current = onAutoShatter; }, [onAutoShatter]);

  const tick = useCallback(() => {
    const ms = performance.now() - startedAtRef.current;
    const tier = tierFromHold(ms);
    setState(s => ({ ...s, holdMs: ms, tier }));

    if (tier.autoShatter && !shatterFiredRef.current) {
      shatterFiredRef.current = true;
      setState(s => ({ ...s, shattered: true }));
      onAutoShatterRef.current?.();
      // Stop ticking — caller is expected to call stop() shortly.
      return;
    }
    rafRef.current = requestAnimationFrame(tick);
  }, []);

  const start = useCallback(() => {
    if (disabled) return;
    if (rafRef.current != null) return;
    shatterFiredRef.current = false;
    startedAtRef.current = performance.now();
    setState({ isHolding: true, holdMs: 0, tier: ZERO_TIER, shattered: false });
    rafRef.current = requestAnimationFrame(tick);
  }, [disabled, tick]);

  const stop = useCallback(() => {
    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    setState(s => ({ ...s, isHolding: false }));
  }, []);

  const reset = useCallback(() => {
    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    shatterFiredRef.current = false;
    setState({ isHolding: false, holdMs: 0, tier: ZERO_TIER, shattered: false });
  }, []);

  // Cleanup on unmount.
  useEffect(() => () => {
    if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
  }, []);

  return { state, start, stop, reset };
}

export const HOLD_MAX_MS = BRINK_MAX_MS;
