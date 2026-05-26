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

// Locale code → language name + cased example for the prompt.
const LANG_NAME: Record<string, string> = {
  en: 'English',
  zh: 'Simplified Chinese (简体中文)',
  es: 'Spanish (Español)',
  pt: 'Portuguese (Português)',
  ru: 'Russian (Русский)',
  ja: 'Japanese (日本語)',
  ko: 'Korean (한국어)',
  fr: 'French (Français)',
};

export function buildOraclePrompt(
  tier: FateTier,
  system: OracleSystem,
  outcome: FateOutcome,
  locale: string = 'en',
): string {
  const language = LANG_NAME[locale] ?? 'English';
  return `You are a terse, hushed oracle issuing one divination card.
Reading details:
- divination system: ${system.replace('_', ' ')}
- tier: ${tier}${outcome === 'glory' ? ' (broke past the brink — golden vision)' : outcome === 'ashes' ? ' (broke past the brink — shattered, only ashes remain)' : ''}
- voice: cryptic, image-rich, sparse. think Cormac McCarthy meets the I Ching. No clichés like "the moon", "the path", "embrace your light".
- output language: ${language}. The title AND the reading MUST be in ${language}, not English (unless the language IS English). Use natural idiom of that language, not literal translation.

Return STRICT JSON, no prose around it:
{
  "title": "2-4 word omen title (use Title Case for European languages, natural form for CJK)",
  "reading": "1-3 sentences. Vivid concrete imagery. No second-person pep talk. Length ≤ 200 chars for European languages, ≤ 90 chars for CJK."
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

// Fallback content — only shown when both LLM and image API fail. We
// keep English + Chinese hand-written; other locales fall back to English.
type FallbackEntry = { title: string; reading: string };

const FALLBACK_EN: Record<FateTier | 'glory' | 'ashes', FallbackEntry> = {
  whisper:    { title: 'The Wren in Snow',  reading: 'A small heat against a large quiet. What you carry today is enough; tend it and walk on.' },
  vision:     { title: 'The Bronze Hour',   reading: 'Old metal warmed by a sun that does not belong to it. Trust the message you would not have asked for.' },
  revelation: { title: 'The Lantern Tree',  reading: 'Lit fruit on a black branch. Something long buried is requesting an audience — name it, and it bows.' },
  brink:      { title: 'The Hollow Wing',   reading: 'The flight is begun but the bones are vacant. Do not look down for one full breath, then look only down.' },
  glory:      { title: 'The Burning Crown', reading: 'Gold pours from a place you did not know existed. Take what you can carry; the rest is for those who follow.' },
  ashes:      { title: 'A Single Ember',    reading: 'What broke broke clean. From the dust: one small heat, enough to start again at first light.' },
};

const FALLBACK_ZH: Record<FateTier | 'glory' | 'ashes', FallbackEntry> = {
  whisper:    { title: '雪中之鹪', reading: '小热抵广寂。今日所携已足，护之，再行。' },
  vision:     { title: '青铜之时', reading: '旧金属被一束不属于它的阳光熏暖。信你不曾求过的讯。' },
  revelation: { title: '提灯之树', reading: '黑枝上挂着发光的果。久埋之物正求一面——唤其名，它即俯身。' },
  brink:      { title: '空骨之翼', reading: '飞已起，骨却空。一息内勿俯视，此后只俯视。' },
  glory:      { title: '燃冕',     reading: '金涌自你不知存在之处。能携则携，余者留与后来者。' },
  ashes:      { title: '余烬一点', reading: '碎得干净。尘中之一点小热，足以待明日再生。' },
};

export function fallbackOracle(
  tier: FateTier,
  outcome: FateOutcome,
  locale: string = 'en',
): FallbackEntry {
  const table = locale === 'zh' ? FALLBACK_ZH : FALLBACK_EN;
  if (outcome === 'glory') return table.glory;
  if (outcome === 'ashes') return table.ashes;
  return table[tier];
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
