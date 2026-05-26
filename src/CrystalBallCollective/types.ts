// Fate-card data model — what a single daily divination produces.

/** How deep the fracture network was pushed before release. */
export type FateTier = 'whisper' | 'vision' | 'revelation' | 'brink';

/**
 * 'reading' — normal tier (whisper/vision/revelation/brink released safely)
 * 'glory'   — past brink shatter, lucky half: a rare gold-seal card
 * 'ashes'   — past brink shatter, unlucky half: a fragment, archived as memento
 */
export type FateOutcome = 'reading' | 'glory' | 'ashes';

/** Which divination tradition framed the reading. Chosen per-card. */
export type OracleSystem = 'tarot' | 'oracle_bone' | 'rune' | 'i_ching';

export interface FateCard {
  id: string;
  /** YYYY-MM-DD (UTC). The daily-lock anchor. */
  dateKey: string;
  tier: FateTier;
  outcome: FateOutcome;
  system: OracleSystem;
  /** 2-4 word omen title, e.g. "The Hollow Wing". */
  title: string;
  /** 1-3 sentence oracle text. */
  reading: string;
  /** gen-image URL (CSS-only fallback for ashes / off-platform demos). */
  imageUrl?: string;
  createdAt: number;
  /** How long the user held the orb before release, ms. */
  holdMs: number;
}

export type ReactionKind = 'heart' | 'flame' | 'eye' | 'moon';
export const REACTION_KINDS: ReactionKind[] = ['heart', 'flame', 'eye', 'moon'];

export interface FateSave {
  /** Cards in reverse-chronological order (newest first). */
  cards: FateCard[];
  /** Per-card list of reactions the current user has tapped. */
  reactions?: Record<string, ReactionKind[]>;
}

export interface WallEntry {
  userId: string;
  userName?: string;
  userAvatarUrl?: string;
  card: FateCard;
}

export type Phase =
  | 'idle'         // crystal ball pulses; not yet held today
  | 'shattering'   // brief shatter animation (post-brink release)
  | 'generating'   // gen-image + chat in flight
  | 'card'         // result revealed
  | 'wall'         // collective wall of recent fate cards
  | 'archive';     // personal history
