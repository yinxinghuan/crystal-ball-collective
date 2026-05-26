// Card prompt + fallback content. Used both for real gen-image/chat
// requests and for the off-platform deterministic preview.

import type { FateCard, FateTier, FateOutcome, OracleSystem } from '../types';

export const ORACLE_SYSTEMS: OracleSystem[] = [
  'tarot',
  'oracle_bone',
  'rune',
  'i_ching',
];

// ───────────────────── gen-image prompt ─────────────────────

const TIER_FLAVOR: Record<FateTier, string> = {
  whisper:
    'soft glow, half-formed, dim halo, gentle hush, parchment edges, mostly negative space',
  vision:
    'crisp central motif, watercolor wash, pale gold leaf accents, dim crystalline mist',
  revelation:
    'full mandala composition, gold leaf, deep indigo background, ornate baroque frame, swirling stars',
  brink:
    'volatile composition, fractured glass, lightning across the frame, ominous, off-kilter geometry',
};

const SYSTEM_FLAVOR: Record<OracleSystem, string> = {
  tarot:
    'tarot-card composition with title banner, single figure or single symbol centered, art nouveau line work, hand-painted',
  oracle_bone:
    'ancient ox scapula with cracked oracle bone script, sepia, hairline cracks radiating from a central glyph',
  rune:
    'a single Elder Futhark rune deeply carved into worn stone, moss in the grooves, low golden light',
  i_ching:
    'six stacked broken-or-solid lines (a hexagram) above a single calligraphic ideogram, rice paper texture',
};

const OUTCOME_FLAVOR: Record<FateOutcome, string> = {
  reading: '',
  glory:
    'a holy aura, blazing radiance, every edge trimmed in molten gold, a single shaft of light',
  ashes:
    'a single charred fragment on black velvet, dust motes, the rest of the frame empty and dark',
};

export function buildImagePrompt(
  tier: FateTier,
  system: OracleSystem,
  outcome: FateOutcome,
): string {
  const lines = [
    'A single symbolic divination illustration, no text, no logos, no watermark.',
    `Style: ${SYSTEM_FLAVOR[system]}.`,
    `Mood: ${TIER_FLAVOR[tier]}.`,
  ];
  if (outcome !== 'reading') lines.push(`Special: ${OUTCOME_FLAVOR[outcome]}.`);
  lines.push(
    'Square 1:1 framing. Centered subject. Dark cosmic background (#07060c).',
    'Palette: warm ivory, soft gold, deep indigo, faint amber.',
    'Mystic, mysterious, museum-grade, fine brush, no people unless required by the system.',
  );
  return lines.join(' ');
}

// ───────────────────── chat prompt + parser ─────────────────────

export function buildOraclePrompt(
  tier: FateTier,
  system: OracleSystem,
  outcome: FateOutcome,
): string {
  return `You are a terse, hushed oracle issuing one divination card.
Reading details:
- divination system: ${system.replace('_', ' ')}
- tier: ${tier}${outcome === 'glory' ? ' (broke past the brink — golden vision)' : outcome === 'ashes' ? ' (broke past the brink — shattered, only ashes remain)' : ''}
- voice: cryptic, image-rich, sparse. think Cormac McCarthy meets the I Ching. No clichés like "the moon", "the path", "embrace your light".

Return STRICT JSON, no prose around it:
{
  "title": "2-4 word omen title in Title Case",
  "reading": "1-3 sentences. ≤ 240 chars total. Vivid concrete imagery. No second-person pep talk."
}`;
}

interface OracleResponse { title: string; reading: string; }

export function parseOracleResponse(raw: string): OracleResponse {
  // Try direct JSON parse first; fall back to extracting the first {...} block.
  const tryParse = (s: string): OracleResponse | null => {
    try {
      const obj = JSON.parse(s);
      if (obj && typeof obj.title === 'string' && typeof obj.reading === 'string') {
        return { title: obj.title.trim(), reading: obj.reading.trim() };
      }
    } catch { /* fall through */ }
    return null;
  };
  const direct = tryParse(raw);
  if (direct) return direct;
  const m = raw.match(/\{[\s\S]*\}/);
  if (m) {
    const block = tryParse(m[0]);
    if (block) return block;
  }
  // Last-ditch: synthesize from the raw text so the card isn't blank.
  return {
    title: 'The Unspoken',
    reading: raw.trim().slice(0, 240) || 'No words come through. The orb keeps its counsel.',
  };
}

// ───────────────────── Fallback content (off-platform demo) ─────────────────────

const FALLBACK_BY_TIER: Record<FateTier, { title: string; reading: string }> = {
  whisper: {
    title: 'The Wren in Snow',
    reading: 'A small heat against a large quiet. What you carry today is enough; tend it and walk on.',
  },
  vision: {
    title: 'The Bronze Hour',
    reading: 'Old metal warmed by a sun that does not belong to it. Trust the message you would not have asked for.',
  },
  revelation: {
    title: 'The Lantern Tree',
    reading: 'Lit fruit on a black branch. Something long buried is requesting an audience — name it, and it bows.',
  },
  brink: {
    title: 'The Hollow Wing',
    reading: 'The flight is begun but the bones are vacant. Do not look down for one full breath, then look only down.',
  },
};

const FALLBACK_GLORY = {
  title: 'The Burning Crown',
  reading: 'Gold pours from a place you did not know existed. Take what you can carry; the rest is for those who follow.',
};

const FALLBACK_ASHES = {
  title: 'A Single Ember',
  reading: 'What broke broke clean. From the dust: one small heat, enough to start again at first light.',
};

export function fallbackOracle(
  tier: FateTier,
  outcome: FateOutcome,
): { title: string; reading: string } {
  if (outcome === 'glory') return FALLBACK_GLORY;
  if (outcome === 'ashes') return FALLBACK_ASHES;
  return FALLBACK_BY_TIER[tier];
}

// ───────────────────── Misc ─────────────────────

export function pickSystem(seed?: number): OracleSystem {
  // Random by default; seedable for tests.
  const i = seed != null
    ? Math.floor(seed) % ORACLE_SYSTEMS.length
    : Math.floor(Math.random() * ORACLE_SYSTEMS.length);
  return ORACLE_SYSTEMS[i];
}

export function pickShatterOutcome(): 'glory' | 'ashes' {
  return Math.random() < 0.5 ? 'glory' : 'ashes';
}

export function makeCardId(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

export function cardSeal(card: FateCard): 'reading' | 'glory' | 'ashes' {
  return card.outcome;
}
