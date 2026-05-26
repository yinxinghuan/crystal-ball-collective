import type { FateTier } from '../types';

// Tier thresholds, in ms of continuous hold.
// Hold under WHISPER_MS = no divination (tap was too brief).
// Past BRINK_MAX_MS = orb auto-shatters.
export const WHISPER_MS = 800;
export const VISION_MS = 2200;
export const REVELATION_MS = 4400;
export const BRINK_MS = 7000;
export const BRINK_MAX_MS = 9500;  // auto-shatter beyond this

export interface TierState {
  /** Current tier (null if hold too brief to count). */
  tier: FateTier | null;
  /** 0..1 progress within the current tier toward the next. */
  progress: number;
  /** True once past BRINK_MS — visually warn the player. */
  brinkWarning: boolean;
  /** True once past BRINK_MAX_MS — orb shatters automatically. */
  autoShatter: boolean;
}

export function tierFromHold(ms: number): TierState {
  if (ms < WHISPER_MS) {
    return { tier: null, progress: ms / WHISPER_MS, brinkWarning: false, autoShatter: false };
  }
  if (ms < VISION_MS) {
    return {
      tier: 'whisper',
      progress: (ms - WHISPER_MS) / (VISION_MS - WHISPER_MS),
      brinkWarning: false,
      autoShatter: false,
    };
  }
  if (ms < REVELATION_MS) {
    return {
      tier: 'vision',
      progress: (ms - VISION_MS) / (REVELATION_MS - VISION_MS),
      brinkWarning: false,
      autoShatter: false,
    };
  }
  if (ms < BRINK_MS) {
    return {
      tier: 'revelation',
      progress: (ms - REVELATION_MS) / (BRINK_MS - REVELATION_MS),
      brinkWarning: false,
      autoShatter: false,
    };
  }
  if (ms < BRINK_MAX_MS) {
    return {
      tier: 'brink',
      progress: (ms - BRINK_MS) / (BRINK_MAX_MS - BRINK_MS),
      brinkWarning: true,
      autoShatter: false,
    };
  }
  return { tier: 'brink', progress: 1, brinkWarning: true, autoShatter: true };
}

export const TIER_LABEL: Record<FateTier, string> = {
  whisper: 'Whisper',
  vision: 'Vision',
  revelation: 'Revelation',
  brink: 'Brink',
};
