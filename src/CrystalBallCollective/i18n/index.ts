// Crystal Ball Collective — lightweight i18n (en + zh).
// Per project standard: detect from navigator.language with localStorage override.

export type Locale = 'en' | 'zh';
const SUPPORTED: Locale[] = ['en', 'zh'];

function detectLocale(): Locale {
  if (typeof localStorage !== 'undefined') {
    const override = localStorage.getItem('game_locale');
    if (override && SUPPORTED.includes(override as Locale)) return override as Locale;
  }
  const lang = (navigator.language || 'en').toLowerCase();
  return lang.startsWith('zh') ? 'zh' : 'en';
}

type Dict = Record<string, string>;

const en: Dict = {
  brand: 'CRYSTAL BALL COLLECTIVE',

  // Idle / hint
  hint_idle: 'press & hold the orb',
  hint_release: 'release to lock the reading',
  hint_brink: 'release now — the orb cannot bear more',
  hint_already: 'today is sealed. return after midnight (UTC).',
  hint_too_brief: 'too brief — the orb stays mute. try again, hold longer.',

  // Tier labels (echoed below the orb)
  tier_none: 'silent',
  tier_whisper: 'whisper',
  tier_vision: 'vision',
  tier_revelation: 'revelation',
  tier_brink: 'the brink',

  // Generating
  gen_status_1: 'consulting the lattice',
  gen_status_2: 'translating the omen',
  gen_status_3: 'inking the card',
  gen_status_4: 'sealing the reading',

  // Card display
  card_today: "today's card",
  card_system_tarot: 'tarot',
  card_system_oracle_bone: 'oracle bone',
  card_system_rune: 'rune',
  card_system_i_ching: 'i ching',
  card_seal_reading: 'reading',
  card_seal_glory: 'glory',
  card_seal_ashes: 'ashes',
  card_held: 'held',

  // Outcome flavour
  outcome_glory_lede: 'a gold-seal vision',
  outcome_ashes_lede: 'the orb shattered — only fragments remain',

  // Navigation
  nav_wall: 'the collective',
  nav_archive: 'my readings',
  nav_back: 'back',
  nav_close: 'close',

  // Wall
  wall_heading: 'recent readings',
  wall_sub: 'the last six divinations across the collective.',
  wall_empty: 'nothing yet. the first reading is yours.',
  wall_self: 'you',
  wall_today: 'today',
  wall_anon: 'a wanderer',

  // Archive
  archive_heading: 'my readings',
  archive_sub: 'every card you have pulled.',
  archive_empty: 'the archive is empty. press the orb to begin.',
  archive_streak_one: '1 day',
  archive_streak_n: '{n} days',
  archive_total_one: '1 card',
  archive_total_n: '{n} cards',
  archive_skipped: 'silent',
};

const zh: Dict = {
  brand: '水晶球公社',

  hint_idle: '按住水晶球',
  hint_release: '松手锁定神谕',
  hint_brink: '快松手 — 水晶球已到极限',
  hint_already: '今日已封 · 子时（UTC）后再来',
  hint_too_brief: '太短 · 水晶球未发声 · 再来 · 按更久',

  tier_none: '静默',
  tier_whisper: '低语',
  tier_vision: '幻象',
  tier_revelation: '启示',
  tier_brink: '临界',

  gen_status_1: '正在叩问星格',
  gen_status_2: '正在翻译预兆',
  gen_status_3: '正在描墨命运卡',
  gen_status_4: '正在烫金封缄',

  card_today: '今日命运卡',
  card_system_tarot: '塔罗',
  card_system_oracle_bone: '甲骨',
  card_system_rune: '如尼',
  card_system_i_ching: '易经',
  card_seal_reading: '神谕',
  card_seal_glory: '金序',
  card_seal_ashes: '灰烬',
  card_held: '按住',

  outcome_glory_lede: '金序传说卡',
  outcome_ashes_lede: '水晶球碎裂 · 唯余残片',

  nav_wall: '公社',
  nav_archive: '我的命运',
  nav_back: '返回',
  nav_close: '关闭',

  wall_heading: '近日占卜',
  wall_sub: '公社最近六张命运卡',
  wall_empty: '尚无人占卜 · 由你开始',
  wall_self: '你',
  wall_today: '今日',
  wall_anon: '某行者',

  archive_heading: '我的命运',
  archive_sub: '你抽到的每一张卡',
  archive_empty: '档案空空 · 按住水晶球开始',
  archive_streak_one: '1 天',
  archive_streak_n: '{n} 天',
  archive_total_one: '1 张',
  archive_total_n: '{n} 张',
  archive_skipped: '静默',
};

const DICTS: Record<Locale, Dict> = { en, zh };

const _locale: Locale = detectLocale();
const _dict: Dict = DICTS[_locale];

export function t(key: string, vars?: { n?: number | string }): string {
  let raw = _dict[key] ?? en[key] ?? key;
  if (vars?.n != null) raw = raw.replace('{n}', String(vars.n));
  return raw;
}

export function locale(): Locale {
  return _locale;
}
