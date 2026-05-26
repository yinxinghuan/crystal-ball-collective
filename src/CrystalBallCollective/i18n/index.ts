// Crystal Ball Collective — 8-language i18n (en, zh, es, pt, ru, ja, ko, fr).
// Detect from navigator.language; localStorage 'game_locale' override.

export type Locale = 'en' | 'zh' | 'es' | 'pt' | 'ru' | 'ja' | 'ko' | 'fr';
const SUPPORTED: Locale[] = ['en', 'zh', 'es', 'pt', 'ru', 'ja', 'ko', 'fr'];

function detectLocale(): Locale {
  if (typeof localStorage !== 'undefined') {
    const override = localStorage.getItem('game_locale');
    if (override && SUPPORTED.includes(override as Locale)) return override as Locale;
  }
  const lang = (navigator.language || 'en').toLowerCase();
  if (lang.startsWith('zh')) return 'zh';
  if (lang.startsWith('es')) return 'es';
  if (lang.startsWith('pt')) return 'pt';
  if (lang.startsWith('ru')) return 'ru';
  if (lang.startsWith('ja')) return 'ja';
  if (lang.startsWith('ko')) return 'ko';
  if (lang.startsWith('fr')) return 'fr';
  return 'en';
}

type Dict = Record<string, string>;

const en: Dict = {
  brand: 'CRYSTAL BALL COLLECTIVE',

  hint_idle: 'press & hold the orb',
  hint_holding: 'hold steady, the omen is forming',
  hint_release: 'release to lock the reading',
  hint_brink: 'release now — the orb cannot bear more',
  hint_already: 'today is sealed. return after midnight (UTC).',
  hint_too_brief: 'too brief — the orb stays mute. hold longer.',

  tier_none: 'silent',
  tier_whisper: 'whisper',
  tier_vision: 'vision',
  tier_revelation: 'revelation',
  tier_brink: 'the brink',

  gen_status_1: 'consulting the lattice',
  gen_status_2: 'translating the omen',
  gen_status_3: 'inking the card',
  gen_status_4: 'sealing the reading',

  card_today: "today's card",
  card_system_tarot: 'tarot',
  card_system_oracle_bone: 'oracle bone',
  card_system_rune: 'rune',
  card_system_i_ching: 'i ching',
  card_seal_reading: 'reading',
  card_seal_glory: 'glory',
  card_seal_ashes: 'ashes',
  card_held: 'held',

  outcome_glory_lede: 'a gold-seal vision',
  outcome_ashes_lede: 'the orb shattered — only fragments remain',

  nav_wall: 'the collective',
  nav_archive: 'my readings',
  nav_back: 'back',
  nav_close: 'close',

  wall_heading: 'recent readings',
  wall_sub: 'the last six divinations across the collective.',
  wall_empty: 'nothing yet. the first reading is yours.',
  wall_self: 'you',
  wall_today: 'today',
  wall_anon: 'a wanderer',

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
  hint_holding: '继续按住 · 预兆正在凝成',
  hint_release: '松手锁定神谕',
  hint_brink: '快松手 — 水晶球已到极限',
  hint_already: '今日已封 · 子时（UTC）后再来',
  hint_too_brief: '太短 · 水晶球未发声 · 再按更久',

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

const es: Dict = {
  brand: 'COLECTIVO BOLA DE CRISTAL',

  hint_idle: 'presiona y mantén la bola',
  hint_holding: 'mantén firme · el augurio se forma',
  hint_release: 'suelta para fijar la lectura',
  hint_brink: 'suelta ya — la bola no aguanta más',
  hint_already: 'el día está sellado · vuelve tras medianoche (UTC)',
  hint_too_brief: 'demasiado breve · la bola calla · mantén más tiempo',

  tier_none: 'silencio',
  tier_whisper: 'susurro',
  tier_vision: 'visión',
  tier_revelation: 'revelación',
  tier_brink: 'el límite',

  gen_status_1: 'consultando la retícula',
  gen_status_2: 'traduciendo el augurio',
  gen_status_3: 'tintando la carta',
  gen_status_4: 'sellando la lectura',

  card_today: 'carta de hoy',
  card_system_tarot: 'tarot',
  card_system_oracle_bone: 'hueso oracular',
  card_system_rune: 'runa',
  card_system_i_ching: 'i ching',
  card_seal_reading: 'lectura',
  card_seal_glory: 'gloria',
  card_seal_ashes: 'cenizas',
  card_held: 'mantenido',

  outcome_glory_lede: 'una visión de sello dorado',
  outcome_ashes_lede: 'la bola estalló · solo quedan fragmentos',

  nav_wall: 'el colectivo',
  nav_archive: 'mis lecturas',
  nav_back: 'volver',
  nav_close: 'cerrar',

  wall_heading: 'lecturas recientes',
  wall_sub: 'las últimas seis adivinaciones del colectivo',
  wall_empty: 'aún nada · la primera lectura es tuya',
  wall_self: 'tú',
  wall_today: 'hoy',
  wall_anon: 'un viajero',

  archive_heading: 'mis lecturas',
  archive_sub: 'cada carta que has sacado',
  archive_empty: 'archivo vacío · presiona la bola para empezar',
  archive_streak_one: '1 día',
  archive_streak_n: '{n} días',
  archive_total_one: '1 carta',
  archive_total_n: '{n} cartas',
  archive_skipped: 'silencio',
};

const pt: Dict = {
  brand: 'COLETIVO BOLA DE CRISTAL',

  hint_idle: 'pressione e segure a bola',
  hint_holding: 'segure firme · o presságio se forma',
  hint_release: 'solte para fixar a leitura',
  hint_brink: 'solte agora — a bola não aguenta mais',
  hint_already: 'o dia está selado · volte após a meia-noite (UTC)',
  hint_too_brief: 'breve demais · a bola se cala · segure mais',

  tier_none: 'silêncio',
  tier_whisper: 'sussurro',
  tier_vision: 'visão',
  tier_revelation: 'revelação',
  tier_brink: 'o limite',

  gen_status_1: 'consultando a retícula',
  gen_status_2: 'traduzindo o presságio',
  gen_status_3: 'tintando a carta',
  gen_status_4: 'selando a leitura',

  card_today: 'carta de hoje',
  card_system_tarot: 'tarô',
  card_system_oracle_bone: 'osso oracular',
  card_system_rune: 'runa',
  card_system_i_ching: 'i ching',
  card_seal_reading: 'leitura',
  card_seal_glory: 'glória',
  card_seal_ashes: 'cinzas',
  card_held: 'segurado',

  outcome_glory_lede: 'visão de selo dourado',
  outcome_ashes_lede: 'a bola estilhaçou · só restam fragmentos',

  nav_wall: 'o coletivo',
  nav_archive: 'minhas leituras',
  nav_back: 'voltar',
  nav_close: 'fechar',

  wall_heading: 'leituras recentes',
  wall_sub: 'as últimas seis adivinhações do coletivo',
  wall_empty: 'nada ainda · a primeira leitura é sua',
  wall_self: 'você',
  wall_today: 'hoje',
  wall_anon: 'um viajante',

  archive_heading: 'minhas leituras',
  archive_sub: 'toda carta que você tirou',
  archive_empty: 'arquivo vazio · segure a bola para começar',
  archive_streak_one: '1 dia',
  archive_streak_n: '{n} dias',
  archive_total_one: '1 carta',
  archive_total_n: '{n} cartas',
  archive_skipped: 'silêncio',
};

const ru: Dict = {
  brand: 'КОЛЛЕКТИВ ХРУСТАЛЬНОГО ШАРА',

  hint_idle: 'нажми и удерживай шар',
  hint_holding: 'держи · знамение проявляется',
  hint_release: 'отпусти, чтобы закрепить чтение',
  hint_brink: 'отпусти сейчас — шар не выдержит',
  hint_already: 'день закрыт · вернись после полуночи (UTC)',
  hint_too_brief: 'слишком коротко · шар молчит · держи дольше',

  tier_none: 'тишина',
  tier_whisper: 'шёпот',
  tier_vision: 'видение',
  tier_revelation: 'откровение',
  tier_brink: 'грань',

  gen_status_1: 'сверяюсь с решёткой',
  gen_status_2: 'перевожу знамение',
  gen_status_3: 'тушую карту',
  gen_status_4: 'запечатываю чтение',

  card_today: 'карта дня',
  card_system_tarot: 'таро',
  card_system_oracle_bone: 'оракульная кость',
  card_system_rune: 'руна',
  card_system_i_ching: 'и-цзин',
  card_seal_reading: 'чтение',
  card_seal_glory: 'слава',
  card_seal_ashes: 'пепел',
  card_held: 'удержано',

  outcome_glory_lede: 'видение золотой печати',
  outcome_ashes_lede: 'шар разлетелся · остались осколки',

  nav_wall: 'коллектив',
  nav_archive: 'мои чтения',
  nav_back: 'назад',
  nav_close: 'закрыть',

  wall_heading: 'недавние чтения',
  wall_sub: 'последние шесть гаданий коллектива',
  wall_empty: 'пока ничего · первое чтение твоё',
  wall_self: 'ты',
  wall_today: 'сегодня',
  wall_anon: 'странник',

  archive_heading: 'мои чтения',
  archive_sub: 'каждая вытянутая карта',
  archive_empty: 'архив пуст · удержи шар, чтобы начать',
  archive_streak_one: '1 день',
  archive_streak_n: '{n} дн.',
  archive_total_one: '1 карта',
  archive_total_n: '{n} карт',
  archive_skipped: 'тишина',
};

const ja: Dict = {
  brand: '水晶玉コレクティブ',

  hint_idle: '水晶玉を押さえる',
  hint_holding: 'そのまま · 兆しが立ち上る',
  hint_release: '離して読みを封じる',
  hint_brink: '今、離せ — 玉が保たない',
  hint_already: '本日は封印済 · UTC 午前 0 時以降に再訪',
  hint_too_brief: '短すぎる · 玉は沈黙 · もっと長く押さえて',

  tier_none: '沈黙',
  tier_whisper: 'ささやき',
  tier_vision: '幻',
  tier_revelation: '啓示',
  tier_brink: '極限',

  gen_status_1: '星格に問う',
  gen_status_2: '兆しを訳す',
  gen_status_3: '札に墨入れ',
  gen_status_4: '封蝋する',

  card_today: '本日の札',
  card_system_tarot: 'タロット',
  card_system_oracle_bone: '甲骨',
  card_system_rune: 'ルーン',
  card_system_i_ching: '易',
  card_seal_reading: '読',
  card_seal_glory: '金',
  card_seal_ashes: '灰',
  card_held: '押下',

  outcome_glory_lede: '金封の幻',
  outcome_ashes_lede: '玉は砕け · 残るは欠片のみ',

  nav_wall: 'コレクティブ',
  nav_archive: 'わたしの読み',
  nav_back: '戻る',
  nav_close: '閉じる',

  wall_heading: '最近の読み',
  wall_sub: 'コレクティブ最近の 6 枚',
  wall_empty: 'まだない · 最初の読みはあなたから',
  wall_self: 'あなた',
  wall_today: '本日',
  wall_anon: '旅人',

  archive_heading: 'わたしの読み',
  archive_sub: '引いたすべての札',
  archive_empty: 'アーカイブは空 · 玉を押さえて始める',
  archive_streak_one: '1 日',
  archive_streak_n: '{n} 日',
  archive_total_one: '1 枚',
  archive_total_n: '{n} 枚',
  archive_skipped: '沈黙',
};

const ko: Dict = {
  brand: '수정구슬 컬렉티브',

  hint_idle: '수정구슬을 누르고 있어',
  hint_holding: '계속 누르고 있어 · 징조가 자라',
  hint_release: '손을 떼서 독해를 봉인',
  hint_brink: '지금 떼 — 구슬이 한계',
  hint_already: '오늘은 봉인됨 · UTC 자정 이후 다시',
  hint_too_brief: '너무 짧음 · 구슬 침묵 · 더 오래 누르기',

  tier_none: '침묵',
  tier_whisper: '속삭임',
  tier_vision: '환영',
  tier_revelation: '계시',
  tier_brink: '경계',

  gen_status_1: '격자에 묻는 중',
  gen_status_2: '징조를 옮기는 중',
  gen_status_3: '카드를 새기는 중',
  gen_status_4: '읽기를 봉인하는 중',

  card_today: '오늘의 카드',
  card_system_tarot: '타로',
  card_system_oracle_bone: '갑골',
  card_system_rune: '룬',
  card_system_i_ching: '주역',
  card_seal_reading: '독해',
  card_seal_glory: '금장',
  card_seal_ashes: '재',
  card_held: '누름',

  outcome_glory_lede: '금봉인 환영',
  outcome_ashes_lede: '구슬이 산산조각 · 파편만 남음',

  nav_wall: '컬렉티브',
  nav_archive: '나의 독해',
  nav_back: '뒤로',
  nav_close: '닫기',

  wall_heading: '최근 독해',
  wall_sub: '컬렉티브의 최근 여섯 점',
  wall_empty: '아직 없음 · 첫 독해는 너의 것',
  wall_self: '너',
  wall_today: '오늘',
  wall_anon: '나그네',

  archive_heading: '나의 독해',
  archive_sub: '뽑은 모든 카드',
  archive_empty: '아카이브 비어있음 · 구슬을 눌러 시작',
  archive_streak_one: '1 일',
  archive_streak_n: '{n} 일',
  archive_total_one: '1 장',
  archive_total_n: '{n} 장',
  archive_skipped: '침묵',
};

const fr: Dict = {
  brand: 'COLLECTIF BOULE DE CRISTAL',

  hint_idle: 'appuie et maintiens la boule',
  hint_holding: 'maintiens · le présage se forme',
  hint_release: 'relâche pour figer la lecture',
  hint_brink: 'relâche maintenant — la boule cède',
  hint_already: 'la journée est scellée · reviens après minuit (UTC)',
  hint_too_brief: 'trop bref · la boule se tait · maintiens plus longtemps',

  tier_none: 'silence',
  tier_whisper: 'murmure',
  tier_vision: 'vision',
  tier_revelation: 'révélation',
  tier_brink: 'la limite',

  gen_status_1: 'consultation du treillis',
  gen_status_2: 'traduction du présage',
  gen_status_3: 'encrage de la carte',
  gen_status_4: 'scellement de la lecture',

  card_today: "carte d'aujourd'hui",
  card_system_tarot: 'tarot',
  card_system_oracle_bone: 'os oraculaire',
  card_system_rune: 'rune',
  card_system_i_ching: 'i king',
  card_seal_reading: 'lecture',
  card_seal_glory: 'gloire',
  card_seal_ashes: 'cendres',
  card_held: 'maintenu',

  outcome_glory_lede: 'une vision au sceau doré',
  outcome_ashes_lede: 'la boule s’est brisée · il ne reste que des éclats',

  nav_wall: 'le collectif',
  nav_archive: 'mes lectures',
  nav_back: 'retour',
  nav_close: 'fermer',

  wall_heading: 'lectures récentes',
  wall_sub: 'les six dernières divinations du collectif',
  wall_empty: 'rien encore · la première lecture est tienne',
  wall_self: 'toi',
  wall_today: "aujourd'hui",
  wall_anon: 'un voyageur',

  archive_heading: 'mes lectures',
  archive_sub: 'chaque carte tirée',
  archive_empty: 'archive vide · maintiens la boule pour commencer',
  archive_streak_one: '1 jour',
  archive_streak_n: '{n} jours',
  archive_total_one: '1 carte',
  archive_total_n: '{n} cartes',
  archive_skipped: 'silence',
};

const DICTS: Record<Locale, Dict> = { en, zh, es, pt, ru, ja, ko, fr };

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
