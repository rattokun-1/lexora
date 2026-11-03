const STORAGE_KEY = "tango.app.state"; // original legacy localStorage key
const LOCAL_STATE_KEY = "tango.app.state.v4"; // durable primary storage; cookies are migration/fallback only
const COOKIE_KEY = "tango_state";
const COOKIE_CHUNK = 3500;
const VERSION = 3;
let profileDraft = null;
let cloudUser = null;
let authBusy = false;
let syncTimer = null;
let applyingRemoteState = false;
let syncStatus = { state: "idle", message: "" };
let modalReturnFocus = null;
const app = document.querySelector("#app");

const icons = {
  map: `<svg class="icon" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3V6ZM9 3v15M15 6v15"/><path d="m5 10 2-1M17 12l2-1"/></svg>`,
  edit: `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="m15 4 5 5M4 20l5-1L20 8a3.5 3.5 0 0 0-5-5L4 14Z"/></svg>`,
  mail: `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="3"/><path d="m4 7 8 6 8-6"/></svg>`,
  camera: `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 6 10 3h4l2 3h3a2 2 0 0 1 2 2v11H3V8a2 2 0 0 1 2-2Z"/><circle cx="12" cy="12" r="4"/></svg>`,
  capsule: `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="m8 4-4 4a6.4 6.4 0 0 0 9 9l4-4a6.4 6.4 0 0 0-9-9ZM6 6l9 9"/><path d="m17 17 3 3M20 16l1 1M16 20l1 1"/></svg>`,
  medal: `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="9" r="5"/><path d="m8.5 13-1 8 4.5-2.5 4.5 2.5-1-8M10 9h4M12 7v4"/></svg>`,
  gift: `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="10" width="16" height="11" rx="2"/><path d="M3 7h18v4H3zM12 7v14M12 7C4 7 6 1 9 3c2 1 3 4 3 4Zm0 0c8 0 6-6 3-4-2 1-3 4-3 4Z"/></svg>`,
  home: `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/></svg>`,
  learn: `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5C9 3 5 3 2.5 4.5v15c3-1.5 6.5-1.5 9.5.5 3-2 6.5-2 9.5-.5v-15C19 3 15 3 12 5Zm0 0v15M6 8h3M6 12h3M15 8h3M15 12h3"/></svg>`,
  rank: `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 21V12H3v9M15 21V5H9v16M21 21v-7h-5v7M2 21h20"/></svg>`,
  collection: `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12 3c4.5 0 8 2.4 8 5.4v7.1c0 3-3.5 5.4-8 5.4s-8-2.4-8-5.4V8.4C4 5.4 7.5 3 12 3Z"/><path d="M4 8.5c0 3 3.5 5.4 8 5.4s8-2.4 8-5.4"/><path d="M12 6v4"/></svg>`,
  friends: `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="9" cy="9" r="3"/><circle cx="17" cy="10" r="2.5"/><path d="M3.5 19c.6-3.2 2.5-4.8 5.5-4.8s4.9 1.6 5.5 4.8M15 15c2.8 0 4.5 1.3 5 4"/></svg>`,
  user: `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="12" cy="8" r="4"/><path d="M4 21c.8-4.2 3.5-6 8-6s7.2 1.8 8 6"/></svg>`,
  sun: `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/></svg>`,
  moon: `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M20.7 15.2A8.6 8.6 0 0 1 8.8 3.3 9 9 0 1 0 20.7 15.2Z"/></svg>`,
  flame: `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12.5 2.5c1.1 4.8-3.6 5.7-2.2 9.3.5 1.2 1.4 1.8 2.7 1.8 2.2 0 3.6-2.1 2.7-4.4 2.8 2 4.1 4.6 3.2 7.4-.9 2.9-3.5 4.9-6.7 4.9-4.1 0-7.2-3.1-7.2-7.2 0-4.2 3.1-7.1 7.5-11.8Z"/></svg>`,
  coin: `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8.5"/><path d="M14.8 8.5a4.2 4.2 0 1 0 0 7M8 11h6M8 13h5"/></svg>`,
  heart: `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M20.8 5.8a5.2 5.2 0 0 0-7.4 0L12 7.2l-1.4-1.4a5.2 5.2 0 1 0-7.4 7.4L12 22l8.8-8.8a5.2 5.2 0 0 0 0-7.4Z"/></svg>`,
  arrow: `<svg class="icon icon-sm" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M5 12h14M13 6l6 6-6 6"/></svg>`,
  back: `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="m15 18-6-6 6-6"/></svg>`,
  close: `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="m6 6 12 12M18 6 6 18"/></svg>`,
  spark: `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="m12 2 1.8 6.2L20 10l-6.2 1.8L12 18l-1.8-6.2L4 10l6.2-1.8L12 2Z"/><path d="m19 16 .7 2.3L22 19l-2.3.7L19 22l-.7-2.3L16 19l2.3-.7L19 16Z"/></svg>`,
  check: `<svg class="icon icon-sm" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="m5 12 4 4L19 6"/></svg>`,
  play: `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="m8 5 10 7-10 7Z"/></svg>`,
  volume: `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M4 10v4h4l5 4V6L8 10H4Z"/><path d="M16 9a4 4 0 0 1 0 6M18.5 6.5a7.5 7.5 0 0 1 0 11"/></svg>`,
  bookmark: `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M6 4.5A1.5 1.5 0 0 1 7.5 3h9A1.5 1.5 0 0 1 18 4.5V21l-6-3.5L6 21V4.5Z"/></svg>`,
  flag: `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M5 21V4m0 1c4-3 6 2 11-1v9c-5 3-7-2-11 1"/></svg>`,
  skip: `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="m5 5 9 7-9 7V5ZM19 5v14"/></svg>`,
  auto: `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M20 11a8 8 0 1 0 1.1 4"/><path d="M20 4v7h-7"/></svg>`,
  info: `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/></svg>`,
  lock: `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg>`,
  share: `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="18" cy="5" r="2"/><circle cx="6" cy="12" r="2"/><circle cx="18" cy="19" r="2"/><path d="m8 11 8-5M8 13l8 5"/></svg>`,
  gear: `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.1 2.1-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5v.2h-3v-.2a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.9.3l-.1.1-2.1-2.1.1-.1A1.7 1.7 0 0 0 7 15a1.7 1.7 0 0 0-1.5-1H5.3v-3h.2A1.7 1.7 0 0 0 7 10a1.7 1.7 0 0 0-.3-1.9l-.1-.1 2.1-2.1.1.1a1.7 1.7 0 0 0 1.9.3 1.7 1.7 0 0 0 1-1.5v-.2h3v.2a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1 2.1 2.1-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.5 1h.2v3h-.2a1.7 1.7 0 0 0-1.6 1Z"/></svg>`,
  database: `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><ellipse cx="12" cy="5" rx="7" ry="3"/><path d="M5 5v7c0 1.7 3.1 3 7 3s7-1.3 7-3V5M5 12v7c0 1.7 3.1 3 7 3s7-1.3 7-3v-7"/></svg>`,
  chevron: `<svg class="icon icon-sm" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="m9 18 6-6-6-6"/></svg>`,
};

// Adapt the source data to the learning and placement interfaces.
const vocab = WORD_DATA.map((word) => ({
  ...word,
  id: "new-word-" + word.id,
  kana: word.pronunciation || "",
  studyBand: Math.max(1, Math.min(10, word.level)),
}));
// Keep distinct meanings, and exclude alternate senses of the same English word.
const optionPool = [...vocab].sort((a, b) => a.studyBand - b.studyBand || a.id.localeCompare(b.id));
for (const word of vocab) {
  const candidates = optionPool.filter(
    (item) =>
      item.word.toLowerCase() !== word.word.toLowerCase() &&
      item.partOfSpeech === word.partOfSpeech,
  );
  const fallback = optionPool.filter((item) => item.word.toLowerCase() !== word.word.toLowerCase());
  const meanings = new Set([word.meaning]);
  const offset = Number(word.id.replace("new-word-", ""));
  for (const pool of [candidates, fallback]) {
    for (let i = 0; i < pool.length && meanings.size < 4; i++)
      meanings.add(pool[(offset + i) % pool.length].meaning);
  }
  word.options = [...meanings];
}

const sections = [
  {
    id: 1,
    title: "基礎を固める",
    note: "よく使う動詞と基本語",
    units: ["基本動詞", "日常の名詞", "かんたんな形容詞"],
  },
  {
    id: 2,
    title: "会話を広げる",
    note: "考えを伝えるための言葉",
    units: ["気持ちを表す", "つながりの言葉", "学校と社会"],
  },
  {
    id: 3,
    title: "読解に強くなる",
    note: "長文で出会うキーワード",
    units: ["抽象語", "論理の言葉", "アカデミック語彙"],
  },
];

const badges = [
  ...TangoGacha.rewards
    .filter((r) => r.kind === "badge" && !["focus", "sakura-star"].includes(r.id))
    .map((r) => ({
      id: r.id,
      name: r.name,
      note: r.note,
      kind: "capsule",
      rarity: r.rarity,
    })),
  {
    id: "first-step",
    name: "FIRST STEP",
    note: "はじめのレッスン",
    kind: "achievement",
  },
  {
    id: "seven-days",
    name: "7 DAYS",
    note: "7日連続記録",
    kind: "achievement",
  },
  { id: "focus", name: "FOCUS", note: "集中のしるし", kind: "capsule" },
  {
    id: "sakura-star",
    name: "SAKURA STAR",
    note: "春色のしるし",
    kind: "capsule",
  },
  {
    id: "thirty-days",
    name: "30 DAYS",
    note: "30日連続記録",
    kind: "achievement",
  },
  {
    id: "century",
    name: "100 DAYS",
    note: "100日連続記録",
    kind: "achievement",
  },
  {
    id: "word-hunter",
    name: "WORD HUNTER",
    note: "30語を学習",
    kind: "achievement",
  },
  {
    id: "perfect-five",
    name: "PERFECT FIVE",
    note: "5問連続正解",
    kind: "achievement",
  },
  {
    id: "night-owl",
    name: "NIGHT OWL",
    note: "夜のレッスン",
    kind: "achievement",
  },
  {
    id: "streak-maker",
    name: "STREAK MAKER",
    note: "14日連続記録",
    kind: "achievement",
  },
  {
    id: "polyglot",
    name: "POLYGLOT",
    note: "100語を学習",
    kind: "achievement",
  },
  {
    id: "tango-legend",
    name: "KOTOMIA LEGEND",
    note: "レベル20到達",
    kind: "achievement",
  },
];

const themes = [
  {
    id: "midnight",
    name: "MIDNIGHT",
    swatch: "#806fff",
    gradient: "linear-gradient(135deg,#0b0d19,#28244f 48%,#4d3d9a)",
    desc: "深い夜のパープル",
  },
  {
    id: "sakura",
    name: "SAKURA GLASS",
    swatch: "#f487b3",
    gradient: "linear-gradient(135deg,#351729,#9b416e 46%,#ffb4c9)",
    desc: "やわらかな桜色",
  },
  {
    id: "ocean",
    name: "OCEAN GLASS",
    swatch: "#41b3ff",
    gradient: "linear-gradient(135deg,#071625,#075a8f 48%,#39e0d2)",
    desc: "澄んだ水面の青",
  },
  {
    id: "aurora",
    name: "AURORA",
    swatch: "#63e9a8",
    gradient: "linear-gradient(135deg,#071e22,#147a68 45%,#bbf56e)",
    desc: "静かな光のグリーン",
  },
  {
    id: "ember",
    name: "EMBER",
    swatch: "#ff8a5b",
    gradient: "linear-gradient(135deg,#26110d,#8a3425 48%,#ffc05c)",
    desc: "熱を帯びた夕暮れ",
  },
  {
    id: "lavender",
    name: "LAVENDER HAZE",
    swatch: "#c59bff",
    gradient: "linear-gradient(135deg,#17112d,#6545a2 50%,#e6c8ff)",
    desc: "夢のような薄紫",
  },
  {
    id: "forest",
    name: "FOREST",
    swatch: "#7cdb8b",
    gradient: "linear-gradient(135deg,#071a16,#1c6146 48%,#b7e879)",
    desc: "深い森の静けさ",
  },
  {
    id: "mono",
    name: "MONOCHROME",
    swatch: "#e6e9f2",
    gradient: "linear-gradient(135deg,#11131a,#515867 50%,#f1f3f8)",
    desc: "静かな白黒",
  },
];

function avatarMarkup(id, label = "", image = "") {
  return `<span class="avatar avatar-custom avatar-photo" aria-label="${escapeHTML(label || "プロフィール写真")}"><img src="${escapeHTML(image || "./src/assets/profile-default.svg")}" alt="" /></span>`;
}
window.KotomiaUI = {
  avatar: () => avatarMarkup(state.profile.avatarId, state.profile.name, state.profile.avatarImage),
  isLoggedIn: () => Boolean(state.profile.loggedIn),
};

const todayKey = () => TangoProgress.dayKey();
const cleanInitialName = (name) =>
  /^(ミナト|みなと|minato|TANGO USER|Lexora USER)$/i.test(String(name || "").trim())
    ? "コトミア USER"
    : name || "コトミア USER";
function currentWeekKey(dateKey = todayKey()) {
  return TangoProgress.week(dateKey)[0];
}
const defaultState = () => ({
  version: VERSION,
  xp: 0,
  level: 1,
  coin: 0,
  hp: 30,
  hpUpdatedAt: Date.now(),
  combo: 0,
  streak: 0,
  lastStudyDate: null,
  lastLessonStampDate: null,
  streakHistory: [],
  completedLessons: [],
  worldGifts: [],
  adventure: TangoAdventure.normalize(null),
  lessonProgress: {},
  placement: null,
  placementAttempt: null,
  courseOrder: null,
  learningSignals: [],
  words: {},
  savedWords: [],
  difficultWords: [],
  daily: { date: todayKey(), lessons: 0, words: 0, saved: 0 },
  ownedThemes: ["midnight", "sakura", "ocean", "aurora", "ember", "lavender", "forest", "mono"],
  equippedTheme: "midnight",
  items: { hpStock: 1, streakKeep: 1 },
  ownedBadges: [],
  equippedBadges: [],
  history: [],
  gacha: TangoGacha.normalize(null),
  weeklyChallenge: { week: currentWeekKey(), studyDays: [], claimed: false },
  studyGarden: { growth: 0, lastDay: null },
  profile: {
    name: "コトミア USER",
    email: "",
    publicId: "",
    avatarId: "aqua",
    loggedIn: false,
  },
  settings: { dark: false, sound: true, lightUiMigration: true },
  ui: {
    view: "home",
    modal: null,
    authTab: "login",
    auto: false,
    socialTab: "global",
    selectedGroup: "",
    hubTab: "profile",
  },
  social: {
    friends: [],
    following: [],
    followers: [],
    groups: [],
    selectedProfile: null,
  },
});

function mergeState(saved) {
  const fresh = defaultState();
  if (!saved || typeof saved !== "object") return fresh;
  const attempt = TangoPlacement.normalize(vocab, saved.placementAttempt);
  const placement =
    attempt?.status === "completed" ? attempt : TangoPlacement.normalize(vocab, saved.placement);
  return {
    ...fresh,
    ...saved,
    completedLessons: TangoProgress.completed(saved.completedLessons, TangoProgress.count(vocab)),
    lessonProgress: TangoProgress.progress(vocab, saved.lessonProgress),
    placement,
    placementAttempt: attempt?.status === "in_progress" ? attempt : null,
    courseOrder: TangoProgress.order(TangoProgress.count(vocab), saved.courseOrder),
    gacha: TangoGacha.normalize(saved.gacha),
    adventure: TangoAdventure.normalize(saved.adventure),
    worldGifts: [
      ...new Set(
        Array.isArray(saved.worldGifts)
          ? saved.worldGifts.filter((id) => typeof id === "string" && /^world-gift-\d+$/.test(id))
          : [],
      ),
    ],
    learningSignals: Array.isArray(saved.learningSignals)
      ? saved.learningSignals.slice(-30).filter((a) => typeof a?.correct === "boolean")
      : [],
    hp: Math.max(0, Math.min(30, Number(saved.hp ?? fresh.hp))),
    hpUpdatedAt: Number(saved.hpUpdatedAt || Date.now()),
    daily: { ...fresh.daily, ...(saved.daily || {}) },
    streakHistory: Array.isArray(saved.streakHistory)
      ? saved.streakHistory.slice(-90)
      : fresh.streakHistory,
    items: { ...fresh.items, ...(saved.items || {}) },
    profile: {
      ...fresh.profile,
      ...(saved.profile || {}),
      loggedIn: false,
      name: cleanInitialName(saved.profile?.name),
    },
    settings: {
      ...fresh.settings,
      ...(saved.settings || {}),
      dark: saved.settings?.lightUiMigration ? Boolean(saved.settings.dark) : false,
      lightUiMigration: true,
    },
    weeklyChallenge: {
      ...fresh.weeklyChallenge,
      ...(saved.weeklyChallenge || {}),
    },
    studyGarden: { ...fresh.studyGarden, ...(saved.studyGarden || {}) },
    ui: {
      ...fresh.ui,
      ...(saved.ui || {}),
      modal: null,
      view: ["home", "path", "placement"].includes(saved.ui?.view) ? saved.ui.view : "home",
      hubTab:
        saved.ui?.hubTab ||
        (["profile", "friends", "collection"].includes(saved.ui?.view) ? saved.ui.view : "profile"),
    },
    social: { ...fresh.social, ...(saved.social || {}) },
    ownedThemes: [...new Set([...(saved.ownedThemes || []), ...fresh.ownedThemes])],
    ownedBadges: [...new Set(saved.ownedBadges || [])],
    equippedBadges: saved.equippedBadges || fresh.equippedBadges,
  };
}

function getCookie(name) {
  const prefix = `${encodeURIComponent(name)}=`;
  const row = document.cookie.split("; ").find((v) => v.startsWith(prefix));
  return row ? decodeURIComponent(row.slice(prefix.length)) : null;
}
function setCookie(name, value, days = 365) {
  const secure = location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${encodeURIComponent(name)}=${encodeURIComponent(value)}; Max-Age=${days * 86400}; Path=/; SameSite=Lax${secure}`;
}
function deleteCookie(name) {
  document.cookie = `${encodeURIComponent(name)}=; Max-Age=0; Path=/; SameSite=Lax`;
}
function readStateCookie() {
  try {
    const count = Number(getCookie(`${COOKIE_KEY}_count`) || 0);
    if (!Number.isInteger(count) || count < 1 || count > 16) return null;
    let raw = "";
    for (let i = 0; i < count; i++) raw += getCookie(`${COOKIE_KEY}_${i}`) || "";
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
function writeStateCookie(value) {
  const raw = JSON.stringify({ ...value, storageSavedAt: Date.now() });
  const previous = Math.min(180, Math.max(0, Number(getCookie(`${COOKIE_KEY}_count`) || 0)));
  try {
    localStorage.setItem(LOCAL_STATE_KEY, raw);
    if (localStorage.getItem(LOCAL_STATE_KEY) !== raw) throw new Error("write failed");
    for (let i = 0; i < previous; i++) deleteCookie(`${COOKIE_KEY}_${i}`);
    deleteCookie(`${COOKIE_KEY}_count`);
    return true;
  } catch {
    // Limited cookie fallback for browsers that block localStorage. Size after encoding,
    // rather than JavaScript string length, determines the browser cookie limit.
    const chunks = [];
    let chunk = "",
      size = 0;
    for (const character of raw) {
      const encoded = encodeURIComponent(character).length;
      if (size + encoded > 3500) {
        chunks.push(chunk);
        chunk = "";
        size = 0;
      }
      chunk += character;
      size += encoded;
    }
    if (chunk) chunks.push(chunk);
    if (chunks.length <= 3) {
      chunks.forEach((text, i) => setCookie(`${COOKIE_KEY}_${i}`, text));
      setCookie(`${COOKIE_KEY}_count`, String(chunks.length));
      for (let i = chunks.length; i < previous; i++) deleteCookie(`${COOKIE_KEY}_${i}`);
      const loaded = readStateCookie();
      if (loaded?.storageSavedAt === JSON.parse(raw).storageSavedAt) return true;
    }
    if (Date.now() - (writeStateCookie.lastWarning || 0) > 30000) {
      writeStateCookie.lastWarning = Date.now();
      toast("この端末に学習記録を保存できません。ブラウザーの保存設定を確認してください。", "bad");
    }
    return false;
  }
}
function loadState() {
  let local = null;
  try {
    local = JSON.parse(localStorage.getItem(LOCAL_STATE_KEY));
  } catch {}
  const cookie = readStateCookie();
  const candidates = [local, cookie].filter(
    (value) => value && typeof value === "object" && !Array.isArray(value),
  );
  candidates.sort((a, b) => (Number(b.storageSavedAt) || 0) - (Number(a.storageSavedAt) || 0));
  if (candidates.length) return mergeState(candidates[0]);
  try {
    const legacy = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (legacy) return mergeState(legacy);
  } catch {}
  return defaultState();
}

let state = loadState();
let learning = null;
let swipeIntroTimer = null;
let feverTimer = null;
let autoTimer = null;
function recoverHP(now = Date.now()) {
  const last = Number(state.hpUpdatedAt || now);
  if (state.hp >= 30) {
    state.hpUpdatedAt = now;
    return false;
  }
  const recovered = Math.floor(Math.max(0, now - last) / 3600000);
  if (!recovered) return false;
  state.hp = Math.min(30, state.hp + recovered);
  state.hpUpdatedAt = last + recovered * 3600000;
  if (state.hp === 30) state.hpUpdatedAt = now;
  return true;
}
recoverHP();
setInterval(() => {
  if (recoverHP()) {
    persist();
    if (state.ui.view === "home") renderApp();
  }
}, 60000);

function persist({ sync = true } = {}) {
  state.version = VERSION;
  writeStateCookie(state);
  if (sync && cloudUser && !applyingRemoteState) scheduleCloudSync();
}
function cloudPayload() {
  const copy = JSON.parse(JSON.stringify(state));
  delete copy.ui;
  delete copy.reviewEvents;
  delete copy.social;
  delete copy.weeklyXP;
  copy.profile = { ...copy.profile, loggedIn: false };
  delete copy.profile.email;
  delete copy.profile.publicId;
  return copy;
}
function scheduleCloudSync() {
  clearTimeout(syncTimer);
  syncTimer = setTimeout(() => pushCloudState(), 900);
}
async function pushCloudState() {
  setTimeout(flushReviews, 0);
  if (!cloudUser || applyingRemoteState) return false;
  const uid = cloudUser.id;
  syncStatus = { state: "syncing", message: "同期中" };
  try {
    await TangoCloud.save(uid, cloudPayload());
    if (cloudUser?.id === uid) syncStatus = { state: "synced", message: "同期済み" };
    return true;
  } catch {
    syncStatus = { state: "local", message: "端末に保存中" };
    return false;
  }
}
let enrollment = {
  mode: "signup",
  stage: "profile",
  email: "",
  name: "",
  avatarImage: "",
  sentAt: 0,
};
let hydration = null,
  hydratedId = null;
async function acceptCloudUser(user) {
  if (!user) {
    cloudUser = null;
    hydratedId = null;
    hydration = null;
    state.profile.loggedIn = false;
    renderApp();
    return;
  }
  if (hydratedId === user.id) return hydration;
  hydratedId = user.id;
  cloudUser = user;
  clearTimeout(syncTimer);
  hydration = (async () => {
    applyingRemoteState = true;
    try {
      const saved = await TangoCloud.load(user.id);
      if (cloudUser?.id !== user.id) return;
      if (saved) {
        const ui = state.ui,
          pending = state.reviewEvents;
        state = mergeState(saved);
        state.ui = ui;
        state.reviewEvents = pending || [];
      } else if (enrollment.mode === "signup" && enrollment.stage !== "profile") {
        state.profile.name = enrollment.name || state.profile.name;
        state.profile.avatarImage = enrollment.avatarImage || "";
      }
      state.profile.loggedIn = true;
      writeStateCookie(state);
      state.ui.modal =
        enrollment.stage === "code" || enrollment.stage === "passkey" ? "enrollment" : null;
    } finally {
      applyingRemoteState = false;
    }
    renderApp();
    await pushCloudState();
  })();
  try {
    await hydration;
  } catch (error) {
    hydratedId = null;
    syncStatus = { state: "local", message: "同期を確認してください" };
    throw error;
  }
}
async function initCloud() {
  try {
    await TangoCloud.init();
    TangoCloud.activeModel()
      .then((m) => {
        window.LexoraModel = m;
      })
      .catch(() => {});
    TangoCloud.onAuth((user) =>
      acceptCloudUser(user).catch(() =>
        toast("クラウドの保存データを読み込めませんでした。再度お試しください。", "bad"),
      ),
    );
  } catch {
    syncStatus = { state: "local", message: "端末に保存中" };
  }
}
function openEnrollment(mode) {
  enrollment = {
    mode,
    stage: "profile",
    email: "",
    name: mode === "signup" ? state.profile.name : "",
    avatarImage: mode === "signup" ? state.profile.avatarImage || "" : "",
    sentAt: 0,
  };
  state.ui.modal = "enrollment";
  renderApp();
}
async function enrollmentSubmit(form) {
  if (authBusy) return;
  const data = new FormData(form);
  if (enrollment.stage === "profile") {
    enrollment.email = String(data.get("email") || "").trim();
    if (enrollment.mode === "signup") enrollment.name = String(data.get("nickname") || "").trim();
    if (!enrollment.email || (enrollment.mode === "signup" && !enrollment.name)) return;
  }
  authBusy = true;
  renderApp();
  try {
    if (enrollment.stage === "profile") {
      await TangoCloud.sendEmailCode(enrollment.email, enrollment.mode === "signup");
      enrollment.stage = "code";
      enrollment.sentAt = Date.now();
    } else if (enrollment.stage === "code") {
      const result = await TangoCloud.verifyEmailCode(
        enrollment.email,
        String(data.get("code") || "").trim(),
      );
      await acceptCloudUser(result.user);
      enrollment.stage = "passkey";
    }
    state.ui.modal = "enrollment";
  } catch (error) {
    toast(error.message || "メール確認ができませんでした。", "bad");
  } finally {
    authBusy = false;
    renderApp();
  }
}
function renderEnrollment() {
  const recover = enrollment.mode === "recover",
    stage = enrollment.stage,
    step = stage === "passkey" ? 3 : stage === "code" ? 2 : 1;
  const labels = [recover ? "メール" : "プロフィール", "メール確認", "パスキー"];
  const titles = [
    recover ? "登録メールを確認" : "プロフィールを設定",
    "メールを確認",
    "パスキーを作成",
  ];
  const busy = authBusy ? '<span class="enroll-spinner" aria-hidden="true"></span>' : "";
  return `<div class="modal-backdrop enrollment-backdrop"><section class="modal enrollment-modal" data-enroll-stage="${stage}" aria-busy="${authBusy}" role="dialog" aria-modal="true" aria-labelledby="enroll-title"><header class="enroll-header"><span class="enroll-kicker">${recover ? "アカウントの復旧" : "アカウントの作成"}</span><button class="icon-btn" data-action="close-modal" aria-label="閉じる">${icons.close}</button></header><div class="enroll-progress" aria-label="登録の進捗"><div class="enroll-progress-meta"><span>STEP <b>0${step}</b></span><span>0${step} / 03</span></div><div class="enroll-progress-track" role="progressbar" aria-label="${labels[step - 1]}" aria-valuemin="0" aria-valuemax="3" aria-valuenow="${step}" aria-valuetext="3段階中${step}段階目：${labels[step - 1]}"><i style="--enroll-progress:${(step / 3) * 100}%"></i></div><ol class="enroll-step-labels">${labels.map((label, i) => `<li class="${i + 1 === step ? "current" : i + 1 < step ? "done" : ""}" ${i + 1 === step ? 'aria-current="step"' : ""}><span>${i + 1 < step ? "✓" : i + 1}</span>${label}</li>`).join("")}</ol></div><div class="enroll-content"><h2 id="enroll-title">${titles[step - 1]}</h2><p class="enroll-intro">${step === 1 ? (recover ? "確認後、新しいパスキーを登録できます。" : "旅で使う名前と、復旧用のメールを設定します。") : step === 2 ? "メールに届いた確認コードを入力してください。" : "顔認証・指紋認証・端末のPINで登録できます。"}</p>${stage === "passkey" ? `<div class="enroll-passkey-art" aria-hidden="true"><div>${icons.user}</div><span>${icons.check}</span></div><div class="enroll-confirmed">${icons.check}メールの確認ができました</div><button class="primary-btn enroll-submit" data-action="passkey-register" ${authBusy ? "disabled" : ""}>${busy}${authBusy ? "登録中…" : "パスキーを作成する"}</button><p class="enroll-footnote">パスワードを覚える必要はありません。</p>` : `<form id="enrollment-form">${stage === "profile" ? `${!recover ? `<label class="enroll-avatar">${avatarMarkup("", enrollment.name, enrollment.avatarImage)}<span class="enroll-photo-copy"><strong>プロフィール写真</strong><small>写真を選ぶ · 未選択なら標準画像</small></span><span class="enroll-photo-action">${icons.camera}</span><input id="enroll-avatar" class="enroll-file-input" type="file" accept="image/png,image/jpeg,image/webp" aria-label="プロフィール写真を選ぶ" /></label><label>ニックネーム<input name="nickname" autocomplete="nickname" maxlength="20" required placeholder="旅で使う名前" value="${escapeHTML(enrollment.name)}" /></label>` : ""}<label>復旧用メールアドレス<input name="email" type="email" autocomplete="email" required placeholder="you@example.com" value="${escapeHTML(enrollment.email)}" /></label><p class="enroll-field-note">${recover ? "アカウントに登録したメールアドレスを入力してください。" : "パスキーを紛失したときの本人確認に使います。"}</p>` : `<div class="enroll-email-destination">${icons.mail}<span>${escapeHTML(enrollment.email)}</span></div><label>確認コード<input class="enroll-code" name="code" inputmode="numeric" autocomplete="one-time-code" pattern="[0-9]{6,10}" minlength="6" maxlength="10" required placeholder="確認コード" /></label>`}<button class="primary-btn enroll-submit" type="submit" ${authBusy ? "disabled" : ""}>${busy}${authBusy ? "処理中…" : stage === "profile" ? "確認コードを送る" : "メールを確認する"}${authBusy ? "" : icons.arrow}</button>${stage === "code" ? '<button class="text-link enroll-resend" type="button" data-action="enroll-resend">コードを再送信</button>' : '<p class="enroll-footnote">パスワードは作成しません。コトミアは出題改善のため学習履歴を収集します。<a href="privacy.html" target="_blank" rel="noopener">データの取り扱い</a></p>'}</form>`}</div></section></div>`;
}
async function passkeyAction(register = false) {
  if (authBusy) return;
  authBusy = true;
  renderApp();
  try {
    if (register) {
      await TangoCloud.registerPasskey();
      state.profile.passkeyReady = true;
      await pushCloudState();
      enrollment.stage = "done";
    } else {
      const result = await TangoCloud.signIn();
      await acceptCloudUser(result.user);
    }
    state.ui.modal = register ? "account" : null;
    toast(register ? "パスキーを登録しました。" : "ログインしました。", "good");
  } catch (error) {
    toast(
      error.name === "NotAllowedError"
        ? "認証をキャンセルしました。"
        : error.message || "認証できませんでした。",
      "bad",
    );
  } finally {
    authBusy = false;
    renderApp();
  }
}
function resetDailyIfNeeded() {
  if (state.daily.date !== todayKey())
    state.daily = { date: todayKey(), lessons: 0, words: 0, saved: 0 };
}
function levelRemaining() {
  return Math.max(0, 500 - state.xp);
}
function levelProgress() {
  return Math.min(100, (state.xp / 500) * 100);
}
function totalCompleted() {
  return state.completedLessons.length;
}
function courseRoute() {
  return TangoProgress.order(TangoProgress.count(vocab), state.courseOrder);
}
function currentLesson() {
  return TangoProgress.frontier(state.completedLessons, TangoProgress.count(vocab), courseRoute());
}
function isUnlocked(index) {
  return TangoProgress.unlocked(
    index,
    state.completedLessons,
    TangoProgress.count(vocab),
    courseRoute(),
  );
}
function mastery(wordId) {
  return state.words[wordId]?.mastery ?? 0;
}
function masteryText(score) {
  if (score <= 20) return "NEW";
  if (score <= 40) return "LEARNING";
  if (score <= 70) return "GOOD";
  if (score <= 90) return "STRONG";
  return "MASTERED";
}
function wordFontSize(word) {
  return Math.max(26, Math.min(60, Math.round(600 / Math.max(1, word.length))));
}
function escapeHTML(s = "") {
  return String(s).replace(
    /[&<>'"]/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[c],
  );
}
function badgeName(id) {
  return badges.find((b) => b.id === id)?.name || "BADGE";
}
function toast(message, kind = "normal") {
  let stack = document.querySelector(".toast-stack");
  if (!stack) {
    stack = document.createElement("div");
    stack.className = "toast-stack";
    document.body.append(stack);
  }
  const el = document.createElement("div");
  el.className = `toast ${kind === "good" ? "good" : kind === "bad" ? "bad" : ""}`;
  const symbol = kind === "good" ? icons.check : kind === "bad" ? icons.info : icons.spark;
  el.innerHTML = `<span class="toast-icon">${symbol}</span><span>${escapeHTML(message)}</span>`;
  stack.append(el);
  setTimeout(() => el.remove(), 21600);
}
function haptic(pattern = 10) {
  if (navigator.vibrate) navigator.vibrate(pattern);
}
function tone(type = "good") {
  if (!state.settings.sound || (!window.AudioContext && !window.webkitAudioContext)) return;
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = type === "fever" ? 659 : type === "bad" ? 180 : 470;
    gain.gain.setValueAtTime(0.04, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(
      0.001,
      ctx.currentTime + (type === "fever" ? 0.22 : 0.12),
    );
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + (type === "fever" ? 0.22 : 0.12));
  } catch {
    /* audio is optional */
  }
}
function logoHtml() {
  return '<img class="tango-logo-mark" src="src/assets/tango-mark.svg" alt="" width="44" height="44" />';
}
function brandHtml() {
  return `<a class="brand tango-brand" href="#" data-nav="home" aria-label="コトミア ホーム">${logoHtml()}<span>コトミア</span></a>`;
}
function navHtml(active) {
  const items = [
    ["home", "ホーム", "home"],
    ["path", "旅", "map"],
    ["study", "学習", "learn"],
    ["duel", "対戦", "spark"],
  ];
  return `<nav class="bottom-nav" aria-label="メインナビゲーション">${items.map(([id, label, ico]) => `<button class="nav-item ${id === "study" ? "nav-study" : ""} ${active === id || (id === "capsule" && state.ui.modal?.startsWith("capsule")) ? "active" : ""}" ${id === "study" ? 'data-start="daily"' : `data-nav="${id}"`} ${active === id ? 'aria-current="page"' : ""}>${icons[ico]}<span>${label}</span></button>`).join("")}</nav>`;
}
function statusBarHtml() {
  const words = Math.min(
    10,
    Math.max(0, state.daily.date === todayKey() ? Number(state.daily.words || 0) : 0),
  );
  return `<div class="top-glass-chrome"><aside class="liquid-status" aria-label="学習ステータス"><span class="status-level" aria-label="プレイヤーレベル ${state.level}">${icons.spark}<small>Lv.</small><b>${state.level}</b></span><span class="status-coin" aria-label="コイン ${state.coin}">${icons.coin}<b>${state.coin}</b></span><button class="status-progress" data-action="next-plan" aria-label="今日の進捗 ${words} / 10語。次の学習を確認"><svg class="daily-ring" viewBox="0 0 32 32" role="progressbar" aria-label="今日の学習進捗" aria-valuemin="0" aria-valuemax="10" aria-valuenow="${words}"><circle class="daily-ring-track" cx="16" cy="16" r="12"/><circle class="daily-ring-fill" cx="16" cy="16" r="12" pathLength="100" stroke-dasharray="${words * 10} 100"/>${words === 10 ? '<path class="daily-ring-check" d="m11 16 3.5 3.5 7-7"/>' : '<circle class="daily-ring-dot" cx="16" cy="16" r="2"/>'}</svg><span><small>今日</small><b>${words}<em>/10</em></b></span></button></aside><button class="top-profile-button" data-action="account" aria-label="アカウントを開く" aria-haspopup="dialog" aria-expanded="${state.ui.modal === "account"}" ${state.ui.view === "community" ? 'aria-current="page"' : ""}>${avatarMarkup(state.profile.avatarId, state.profile.name, state.profile.avatarImage)}</button></div>`;
}
function topBar(title, action = "") {
  return `<header class="top-bar"><button class="icon-btn" data-nav="home" aria-label="ホームに戻る">${icons.back}</button><h1>${title}</h1>${action || `<span style="width:44px"></span>`}</header>`;
}

function recordWeeklyChallengeStudy(dateKey) {
  const week = currentWeekKey(dateKey);
  if (state.weeklyChallenge.week !== week)
    state.weeklyChallenge = { week, studyDays: [], claimed: false };
  if (!state.weeklyChallenge.studyDays.includes(dateKey))
    state.weeklyChallenge.studyDays.push(dateKey);
  if (!state.weeklyChallenge.claimed && state.weeklyChallenge.studyDays.length >= 3) {
    state.weeklyChallenge.claimed = true;
    state.coin += 50;
    toast("週3日チャレンジ達成！ 50コインを獲得しました", "good");
    tone("fever");
    haptic([18, 35, 18]);
  }
}

function openPlacement() {
  dismissSwipeIntro();
  clearAuto();
  learning = null;
  state.ui.view = "placement";
  state.ui.modal = null;
  state.ui.placementPhase = state.placementAttempt ? "question" : "intro";
  renderApp();
}
function beginPlacement(force = false) {
  if (!state.placementAttempt || force) {
    state.placementAttempt = TangoPlacement.start(
      vocab,
      crypto.getRandomValues(new Uint32Array(2)).join("-"),
    );
  }
  state.ui.view = "placement";
  state.ui.modal = null;
  state.ui.placementPhase = "question";
  renderApp();
}
function answerPlacement(id, choice) {
  const before = state.placementAttempt;
  const after = TangoPlacement.respond(vocab, before, id, choice);
  if (after === before) return;
  state.placementAttempt = after;
  if (after.status === "completed") {
    const hasProgress =
      state.completedLessons.length > 0 ||
      Object.keys(state.lessonProgress).length > 0 ||
      Object.values(state.words).some((record) => record.lastSeen && !record.diagnosticOnly);
    if (!state.placement?.result && !hasProgress)
      state.courseOrder = TangoPlacement.route(vocab, after.result.level);
    state.placement = after;
    state.placementAttempt = null;
    state.learningSignals = [];
    for (const answer of after.answers) {
      const word = vocab.find((w) => w.id === answer.id);
      if (!state.words[answer.id]?.lastSeen || state.words[answer.id]?.diagnosticOnly) {
        const now = Date.now();
        const record = TangoScheduler.update(undefined, answer.correct, now);
        Object.assign(record, {
          diagnosticOnly: true,
          diagnosedAt: now,
          correct: 0,
          wrong: 0,
          reviews: 0,
          mastery: 0,
        });
        if (answer.correct) {
          const stability = TangoPlacement.initialStability(vocab, word, after);
          Object.assign(record, {
            stabilityDays: stability,
            intervalDays: stability,
            nextReviewAt: now + stability * 86400000,
          });
        } else record.nextReviewAt = now;
        state.words[answer.id] = record;
      }
    }
    state.ui.placementPhase = "result";
  }
  persist();
  renderApp();
  document
    .querySelector(".placement-question h1,.placement-result h1")
    ?.focus({ preventScroll: true });
}
function renderPlacement() {
  const phase = state.ui.placementPhase;
  const session = state.placementAttempt;
  const header = `<header class="placement-header">${brandHtml()}<button class="icon-btn" data-action="placement-pause" aria-label="診断を保存して閉じる">${icons.close}</button></header>`;
  if (phase === "intro" || (!session && !state.placement?.result))
    return `<main class="screen placement-screen">${header}<section class="placement-intro"><span class="eyebrow">FIND YOUR STARTING POINT</span><h1>今のあなたから、<br>学習をはじめよう。</h1><p>回答に合わせて問題が変わります。<br>最大${TangoPlacement.MAX_QUESTIONS}問で、あなたに合う学習の始め方を見つけましょう。</p><ul><li>英単語に合う意味を選びます。</li><li>意味がなければ「この中にない」、知らない単語は「わからない」を選びます。</li><li>HPは減りません。途中保存できます。</li></ul><button class="primary-btn" data-action="placement-begin">${session ? `続きから（${session.answers.length}問回答済み）` : "レベル診断を始める"} ${icons.arrow}</button>${state.placement?.result ? `<small>再診断しても、今の進捗とレッスン順は保持します。</small>` : ""}</section></main>`;
  if (session) {
    const item = session.current,
      word = vocab.find((w) => w.id === item.id),
      n = session.answers.length;
    return `<main class="screen placement-screen">${header}<section class="placement-question" aria-labelledby="placement-word"><div class="placement-counter"><span>レベルチェック</span><span>${n + 1}問目</span></div><p class="placement-prompt">この単語に合う意味を選んでください。</p><h1 id="placement-word" tabindex="-1">${escapeHTML(word.word)}</h1><div class="placement-options">${item.choices.map((meaning, i) => `<button data-placement-id="${escapeHTML(item.id)}" data-placement-choice="${i}"><span>${i === 4 ? "—" : String.fromCharCode(65 + i)}</span>${escapeHTML(meaning)}</button>`).join("")}</div><button class="placement-unknown" data-placement-id="${escapeHTML(item.id)}" data-placement-choice="unknown">わからない</button></section></main>`;
  }
  const result = state.placement.result,
    prefs = TangoPlacement.preferences(state.placement, state.learningSignals);
  return `<main class="screen placement-screen">${header}<section class="placement-result"><span class="eyebrow">YOUR LEARNING PLAN</span><span class="placement-level">教材内 Lv.${result.level} / 10</span><h1 tabindex="-1">${result.label}</h1><p>今の結果から、学習の始め方を用意しました。</p><div class="placement-result-cards"><article><small>今回の正解</small><strong>${result.correct}<span> / ${result.total}問</span></strong></article><article><small>1回の新しい単語</small><strong>${prefs.newLimit}<span>語まで＋復習</span></strong></article></div><p class="placement-plan-copy">診断で確認が必要だった単語から復習し、あなたに合う難易度から、より難しい単語へ少しずつ進みます。普段の正誤でも、新しい語の量と復習間隔を調整します。</p><div class="placement-band-results">${result.bands.map((b) => `<div><span>難易度 ${b.band}</span><span>${b.correct} / ${b.total}問</span></div>`).join("")}</div><button class="primary-btn" data-action="placement-finish">学習ホームへ ${icons.arrow}</button><small class="placement-caveat">${result.stopReason === "limit" ? "問題数の上限に達したため、今回は暫定の開始レベルを用意しました。学習中の回答に合わせて学習量と復習を調整します。" : result.stopReason === "exhausted" ? "出題できる単語をすべて確認しました。推定が十分に絞れていないため暫定結果です。" : result.stopReason === "legacy" ? "以前の方式による診断結果です。再診断すると短時間の診断方式で推定します。" : `推定確率 ${Math.floor(result.confidence * 100)}％で診断を終了しました。`} 教材内の仮の難易度に基づくモデル上の目安で、実際の正確さを保証するものではありません。</small></section></main>`;
}
window.addEventListener("click", (event) => {
  const button = event.target.closest("[data-placement-choice]");
  if (!button) return;
  answerPlacement(
    button.dataset.placementId,
    button.dataset.placementChoice === "unknown" ? null : Number(button.dataset.placementChoice),
  );
});
function renderHome() {
  if (!state.placement?.result)
    return `<main class="screen home-screen minimal-home"><section class="home-study placement-home"><span class="eyebrow">YOUR STARTING POINT</span><h1>あなたに合う学習を、ここから。</h1><p>回答に合わせたレベルチェックで、最初のコースと学習量を合わせます。</p><button class="primary-btn home-start-button" data-action="placement-open">${state.placementAttempt ? `診断を再開する（${state.placementAttempt.answers.length}問回答済み）` : "レベルチェックを始める"} ${icons.arrow}</button><small>途中保存できます。診断でHPは減りません。</small></section></main>`;
  const plan = learningPlan(),
    due = plan.selected.filter((item) => !item.isNew).length,
    fresh = plan.selected.filter((item) => item.isNew).length;
  const done = state.daily.date === todayKey() ? state.daily.words : 0,
    target = 10,
    percent = Math.min(100, (done / target) * 100);
  const learned = Object.values(state.words).filter(
    (record) => !record.diagnosticOnly && record.correct > 0,
  ).length;
  const adventure = TangoAdventure.normalize(state.adventure),
    zone = TangoAdventure.zoneAt(adventure.position.z),
    objective = TangoAdventure.objective(adventure);
  return `
<main class="screen home-screen minimal-home expedition-home"><p class="lexora-data-notice">コトミアでは出題改善のため、問題形式・正誤・復習間隔などの学習履歴を収集します。モデル用データに名前・メール・写真は含めません。 <a href="privacy.html">詳しく見る</a></p><section class="home-launch"><div><span class="home-kicker">今日の学習</span><h1>単語を学ぼう</h1><p>復習 ${due}語 · 新しい単語 ${fresh}語</p></div><button class="primary-btn" data-start="daily">${done > 0 ? "学習を再開" : "学習スタート"} ${icons.arrow}</button></section><div class="home-dashboard"><section class="home-voyage" aria-labelledby="home-voyage-title"><header><div><span class="home-kicker">現在の旅</span><h2 id="home-voyage-title">${zone.name}</h2></div><span class="home-region-count">${TangoAdventure.highest(adventure.completed) + 1} / ${TangoAdventure.ZONES.length} 地域</span></header>${renderPath(true)}<div class="home-voyage-footer"><div><strong>${objective.title}</strong><span>${objective.remaining ? "学習をあと" + objective.remaining + "回完了で開放" : "開いた世界を自由に探索できます"}</span></div><button class="primary-btn" data-nav="path">旅を続ける ${icons.arrow}</button></div></section><section class="home-learning" aria-labelledby="home-learning-title"><div class="home-card-top"><span>${icons.learn} 今日の学習</span><span class="home-state">${done >= target ? "目標達成" : done > 0 ? "学習中" : "未開始"}</span></div><h2 id="home-learning-title">あなたに合わせた学習</h2><p>復習と新しい単語を、今の習得状況に合わせて出題します。</p><div class="home-word-plan"><div><strong>${due}</strong><span>復習する単語</span></div><span class="home-plan-plus" aria-hidden="true">＋</span><div><strong>${fresh}</strong><span>新しい単語</span></div></div>${plan.selected.length ? '<button class="primary-btn home-study-start" data-start="daily">学習を始める ' + icons.arrow + "</button>" : '<p class="home-next-review">次の復習：' + reviewTimeLabel(plan.nextReviewAt) + '</p><button class="primary-btn home-study-start" data-nav="path">旅に出る ' + icons.arrow + "</button>"}<div class="home-daily-progress"><div><span>今日の目標</span><strong>${done}<small> / ${target}問</small></strong></div><div class="quest-meter" role="progressbar" aria-label="今日の学習目標" aria-valuemin="0" aria-valuemax="10" aria-valuenow="${Math.min(done, target)}"><i style="width:${percent}%"></i></div></div></section></div><button class="home-duel-link" data-nav="duel"><span><strong>ワードスプリント</strong><small>60秒のランダム対戦</small></span><span>対戦する ${icons.arrow}</span></button></main>`;
}

function renderPath(embedded = false) {
  const progress = TangoAdventure.normalize(state.adventure),
    objective = TangoAdventure.objective(progress),
    zone = TangoAdventure.zoneAt(progress.position.z),
    currentZone = TangoAdventure.highest(progress.completed);
  const model = { state: progress };
  return `${embedded ? '<section class="home-journey adventure-preview" aria-label="旅の現在地">' : '<main class="screen adventure-screen">'}<section class="adventure-world" data-preview="${embedded}" data-adventure-model="${escapeHTML(JSON.stringify(model))}"><header class="adventure-header"><button class="icon-btn adventure-info" data-action="adventure-info" aria-label="旅の使い方">${icons.info}</button><div><span>現在地</span><h2>${zone.name}</h2></div><button class="primary-btn" data-start="daily">今日の学習 ${icons.learn}</button></header>${embedded ? "" : `<section class="adventure-objective" aria-label="旅の目的"><span>${icons.flag}</span><div><strong>${objective.title}</strong><small>${objective.remaining ? `学習をあと${objective.remaining}回完了すると道が開きます` : "どこでも復習や探索を続けられます"}</small></div><span class="adventure-progress-count">${progress.completed}回 学習完了</span></section>`}<div class="adventure-viewport" role="region" aria-label="主人公を操作する3Dの世界"><span class="adventure-loading">旅の世界を準備しています…</span><span class="adventure-location">${zone.name}</span>${embedded ? "" : `<div class="adventure-camera" aria-label="カメラ距離"><button data-adventure-zoom="4" aria-label="景色を広く見る">−</button><button data-adventure-zoom="-4" aria-label="主人公に近づく">＋</button></div><div class="adventure-touch"><div class="adventure-stick" role="group" aria-label="移動スティック"><span class="adventure-stick-knob"></span><small>移動</small></div><button class="adventure-interact" data-adventure-interact disabled><span>${icons.spark}</span><strong data-adventure-action-label>調べる</strong><kbd>E</kbd></button></div><div class="adventure-nearby" aria-live="polite">石碑や人物に近づくと調べられます</div><section class="adventure-dialog" role="dialog" aria-modal="true" aria-label="旅の会話" hidden><span class="adventure-dialog-mark">${icons.spark}</span><h3 data-dialog-title></h3><p data-dialog-text></p><div><button class="outline-btn" data-adventure-later>あとで</button><button class="primary-btn" data-adventure-learn>学習する ${icons.arrow}</button></div></section>`}</div><p class="adventure-status" role="status">今日の学習から、移動せずに始められます。</p>${embedded ? `<button class="map-expand" data-nav="path">旅に出る ${icons.arrow}</button>` : ""}</section>${embedded ? "</section>" : "</main>"}`;
}
function claimWorldGift(id) {
  const gift = TangoWorldData.claim(
    courseRoute(),
    state.completedLessons,
    state.worldGifts || [],
    id,
  );
  if (!gift) return;
  state.worldGifts = [...(state.worldGifts || []), gift.id];
  state.coin += gift.coins;
  persist();
  renderApp();
  toast(`${gift.coins}コインを受け取りました！`, "good");
}

function renderProfileEditor() {
  if (!profileDraft)
    profileDraft = {
      name: state.profile.name,
      avatarImage: state.profile.avatarImage || "",
      badges: [...state.equippedBadges],
    };
  const owned = badges.filter((b) => state.ownedBadges.includes(b.id));
  return `<div class="modal-backdrop" data-close-modal><section class="modal profile-editor" role="dialog" aria-modal="true" aria-labelledby="profile-edit-title"><div class="modal-head"><h2 id="profile-edit-title">プロフィールを編集</h2><button class="icon-btn" data-action="close-modal" aria-label="編集をキャンセル">${icons.close}</button></div><form id="profile-form"><div class="editor-photo"><button class="editor-photo-picker" type="button" data-action="choose-avatar">${avatarMarkup(state.profile.avatarId, profileDraft.name, profileDraft.avatarImage)}<span>${icons.camera} 写真を変更</span></button><input id="avatar-file-input" type="file" accept="image/png,image/jpeg,image/webp" hidden />${profileDraft.avatarImage ? `<button class="text-link" type="button" data-action="reset-avatar-photo">初期画像に戻す</button>` : ""}</div><div class="field"><label for="display-name">${icons.user} 表示名</label><input id="display-name" name="displayName" maxlength="20" required autocomplete="nickname" value="${escapeHTML(profileDraft.name || "")}" placeholder="表示名を入力" /><small>旅で使う表示名です。</small></div><footer class="profile-editor-footer"><button class="outline-btn" type="button" data-action="close-modal">キャンセル</button><button class="primary-btn" type="submit">${icons.check} 変更を保存</button></footer></form></section></div>`;
}
function renderAccountPopup() {
  return `<div class="modal-backdrop account-backdrop" data-close-modal><section class="modal account-popup" role="dialog" aria-modal="true" aria-labelledby="account-title"><div class="modal-head"><h2 id="account-title">コトミア</h2><button class="icon-btn" data-action="close-modal" aria-label="閉じる">${icons.close}</button></div><div class="account-identity">${avatarMarkup(state.profile.avatarId, state.profile.name, state.profile.avatarImage)}<div><h3>${escapeHTML(state.profile.name)}</h3><p>${escapeHTML(cloudUser?.email || "この端末に保存中")}</p></div></div><div class="account-summary"><span>今日の学習<strong>${state.daily.date === todayKey() ? state.daily.words : 0}語</strong></span><span>連続学習<strong>${state.streak}日</strong></span></div><div class="account-links"><button class="primary-btn" data-action="account-settings">アカウント設定 ${icons.arrow}</button>${state.profile.loggedIn ? '<button class="text-link" data-action="logout">ログアウト</button>' : ""}</div></section></div>`;
}
function renderAccountSettings() {
  return `<div class="modal-backdrop" data-close-modal><section class="modal account-settings" role="dialog" aria-modal="true" aria-labelledby="settings-title"><div class="modal-head"><h2 id="settings-title">アカウント設定</h2><button class="icon-btn" data-action="close-modal" aria-label="閉じる">${icons.close}</button></div><div class="account-links"><button class="outline-btn" data-action="profile">プロフィールを編集 ${icons.arrow}</button>${state.profile.loggedIn ? '<button class="outline-btn" data-action="passkey-register">パスキーを追加</button>' : '<button class="primary-btn" data-action="enroll-signup">アカウントを作成</button><button class="outline-btn" data-action="login">パスキーでログイン</button>'}<details><summary>その他の設定</summary><button class="outline-btn" data-action="theme">明るさを切り替える</button><button class="outline-btn" data-action="sound">音を${state.settings.sound ? "オフ" : "オン"}にする</button><a href="privacy.html">学習データの取り扱い</a><p>復旧用メール：${escapeHTML(cloudUser?.email || "未登録")}。パスキーを紛失した場合はログイン画面からメールで復旧できます。</p></details></div></section></div>`;
}
function renderModal() {
  const modal = state.ui.modal;
  if (!modal) return "";
  if (modal === "enrollment") return renderEnrollment();
  if (modal === "adventure-info")
    return `<div class="modal-backdrop" data-close-modal><section class="modal adventure-help-popup" role="dialog" aria-modal="true" aria-labelledby="adventure-help-title"><div class="modal-head"><h2 id="adventure-help-title">旅の使い方</h2><button class="icon-btn" data-action="close-modal" aria-label="閉じる">${icons.close}</button></div><h3>自由に歩く</h3><p>PCはWASD・矢印キー、スマホは左のスティックで移動します。右上の＋・−で景色の広さを変えられます。</p><h3>調べて学習する</h3><p>石碑・焚き火・人物の近くで、Eキーか「調べる」を押してください。会話や寄り道は任意です。「今日の学習」から直接始めることもできます。</p><h3>次の地域へ</h3><p>学習を完了すると道が開きます。全問正解する必要はありません。開いた地域では宝箱や景色を探しながら自由に探索できます。</p></section></div>`;
  if (modal === "account") return renderAccountPopup();
  if (modal === "account-settings") return renderAccountSettings();

  if (modal === "login")
    return `<div class="modal-backdrop" data-close-modal><section class="modal passkey-modal" role="dialog" aria-modal="true" aria-labelledby="auth-title"><div class="modal-head"><h2 id="auth-title">パスキーでログイン</h2><button class="icon-btn" data-action="close-modal" aria-label="閉じる">${icons.close}</button></div><div class="passkey-symbol">${icons.user}</div><p>顔認証・指紋認証・端末のPINで、学習の続きを開けます。</p><button class="primary-btn" data-action="passkey-login" ${authBusy || !TangoCloud.configured() ? "disabled" : ""}>${authBusy ? "認証中…" : "パスキーでログイン"}</button>${!TangoCloud.configured() ? '<p class="auth-status">クラウド接続は準備中です。学習はこの端末に保存されます。</p>' : ""}<button class="outline-btn" data-action="enroll-signup">初めての方：アカウントを作成</button><button class="text-link" data-action="enroll-recover">パスキーを紛失した方</button><button class="text-link" data-action="close-modal">この端末で続ける</button></section></div>`;
  if (modal === "next-plan" || modal === "memory-info") {
    const plan = learningPlan();
    return `<div class="modal-backdrop" data-close-modal><section class="modal memory-modal" role="dialog" aria-modal="true" aria-labelledby="plan-title"><div class="modal-head"><h2 id="plan-title">${modal === "memory-info" ? "あなたに合わせた出題" : "次の学習予定"}</h2><button class="icon-btn" data-action="close-modal" aria-label="閉じる">${icons.close}</button></div>${modal === "memory-info" ? `<p>前回の学習からの時間と、単語ごとの正誤を使って、思い出せる可能性を推定しています。</p><ol><li>期限を迎えた単語を、推定記憶率と前回の間違いをもとに優先します。</li><li>復習が10語未満なら、未学習の単語を加えます。</li><li>正解すると次回までの間隔が伸び、間違えると10分後に再確認します。</li></ol><p>90%を復習の目安にした簡易モデルです。学習直後の連続正解だけで間隔が伸びすぎないようにしています。予測の精度は保証されません。</p>` : `<p>復習待ち ${plan.due.length}語 · 未学習 ${plan.fresh.length}語</p><div class="memory-plan-list">${plan.selected.map((item, i) => `<div class="memory-row"><span class="memory-order">${i + 1}</span><span><b>${escapeHTML(item.word.word)}</b><small>${item.reason}</small></span><span class="memory-retention">${item.isNew ? "NEW" : `${Math.round(item.retention * 100)}%`}</span></div>`).join("") || `<p>次の復習：${reviewTimeLabel(plan.nextReviewAt)}</p>`}</div><button class="primary-btn" data-start="daily" ${!plan.selected.length ? "disabled" : ""}>この${plan.selected.length}語で学習する ${icons.arrow}</button>`}</section></div>`;
  }
  if (modal === "edit-profile") return renderProfileEditor();
  if (modal === "badges") {
    return `<div class="modal-backdrop" data-close-modal><section class="modal" role="dialog" aria-modal="true"><div class="modal-head"><div><div class="eyebrow">PROFILE BADGES</div><h2>バッジを選ぶ</h2></div><button class="icon-btn" data-action="close-modal" aria-label="閉じる">${icons.close}</button></div><p class="modal-sub">プロフィールには最大3個まで装備できます。</p><div class="badge-options">${badges
      .map((b) => {
        const owned = state.ownedBadges.includes(b.id);
        const active = state.equippedBadges.includes(b.id);
        return `<button class="badge-choice ${active ? "active" : ""}" data-badge="${b.id}" ${owned ? "" : "disabled"}>${active ? "● " : "○ "}${b.name}<br><span style="color:var(--muted);font-family:var(--font)">${owned ? b.note : "未獲得"}</span></button>`;
      })
      .join("")}</div></section></div>`;
  }
  if (modal === "missions") {
    const dailyItems = [
      {
        label: "レッスンを完了",
        current: Math.min(1, state.daily.lessons),
        target: 1,
        reward: "+20 XP",
      },
      {
        label: "単語を3語学習",
        current: Math.min(3, state.daily.words),
        target: 3,
        reward: "+10 COIN",
      },
      {
        label: "単語を保存 / 苦手登録",
        current: Math.min(1, state.daily.saved),
        target: 1,
        reward: "+5 XP",
      },
    ];
    const dailyDone = dailyItems.filter((item) => item.current >= item.target).length;
    const monthlyDone = Math.min(20, (state.completedLessons || []).length);
    const monthlyPercent = Math.round((monthlyDone / 20) * 100);
    return `<div class="modal-backdrop" data-close-modal><section class="modal mission-detail-modal" role="dialog" aria-modal="true"><div class="modal-head"><div><div class="eyebrow">MISSION CENTER</div><h2>ミッション</h2></div><button class="icon-btn" data-action="close-modal" aria-label="閉じる">${icons.close}</button></div><div class="mission-detail-hero"><div><span class="eyebrow">TODAY'S PROGRESS</span><h3>${dailyDone} / ${dailyItems.length} 完了</h3><p>毎日の小さな達成を積み重ねよう。</p></div><strong class="mission-detail-percent">${Math.round((dailyDone / dailyItems.length) * 100)}%</strong></div><section class="mission-detail-section"><div class="mission-detail-title"><h3>DAILY</h3><span class="eyebrow">リセット 00:00</span></div>${dailyItems.map((item) => `<div class="mission-task"><span class="mission-task-check ${item.current >= item.target ? "done" : ""}">${item.current >= item.target ? "✓" : ""}</span><span><b>${item.label}</b><small>${item.current} / ${item.target} · ${item.reward}</small></span><i><em style="width:${Math.min(100, Math.round((item.current / item.target) * 100))}%"></em></i></div>`).join("")}</section><section class="mission-detail-section monthly"><div class="mission-detail-title"><h3>MONTHLY</h3><b>${monthlyPercent}%</b></div><p>今月のレッスン達成数に応じて、マイルストーン報酬を獲得できます。</p><div class="monthly-milestones"><span class="${monthlyDone >= 5 ? "reached" : ""}">5 LESSONS</span><span class="${monthlyDone >= 10 ? "reached" : ""}">10 LESSONS</span><span class="${monthlyDone >= 20 ? "reached" : ""}">20 LESSONS</span></div><div class="mini-progress"><i style="width:${monthlyPercent}%"></i></div><small>${monthlyDone} / 20 LESSONS</small></section><button class="primary-btn" data-action="close-modal">ホームに戻る ${icons.arrow}</button></section></div>`;
  }
  if (modal === "capsule-info" || modal === "capsule-menu") return renderCapsuleMenu();
  if (modal === "capsule-result") return renderCapsuleResult();
  if (modal.startsWith("streak:")) {
    const value = Number(modal.slice(7)) || state.streak;
    return `<div class="modal-backdrop streak-backdrop"><section class="streak-modal" role="dialog" aria-modal="true" aria-labelledby="streak-title">${streakStampMarkup(value)}<button class="primary-btn" data-action="close-streak">続ける ${icons.arrow}</button></section></div>`;
  }
  if (modal === "data")
    return `<div class="modal-backdrop" data-close-modal><section class="modal" role="dialog" aria-modal="true"><div class="modal-head"><div><div class="eyebrow">LOCAL DATA</div><h2>この端末に保存中</h2></div><button class="icon-btn" data-action="close-modal" aria-label="閉じる">${icons.close}</button></div><p class="modal-sub">XP、コイン、HP、単語ごとの習熟度、苦手・保存語、進捗、ミッション、テーマ、バッジ、設定はこのブラウザーのlocalStorageに保存されています。</p><div class="storage-note">アプリの更新時にデータが壊れないよう、保存データにはバージョンを持たせています。ブラウザのサイトデータを削除すると、端末内のデータも削除されます。</div></section></div>`;
  if (modal.startsWith("capsule:")) {
    const prize = modal.slice(8);
    return `<div class="modal-backdrop" data-close-modal><section class="modal capsule-result" role="dialog" aria-modal="true"><span class="result-confetti">✦　✧　✦</span><div class="eyebrow">CAPSULE OPENED!</div><div class="capsule-visual pop">${icons.spark}</div><span class="capsule-result-label">今回のアイテム</span><h3>${escapeHTML(prize)}</h3><p>いい引き！コレクションに追加したよ。</p><button class="primary-btn" data-action="close-modal">受け取って戻る ${icons.arrow}</button></section></div>`;
  }
  return "";
}

function renderApp() {
  resetDailyIfNeeded();
  if (state.ui.modal !== "edit-profile") profileDraft = null;
  clearAuto();

  const previousModal = app.querySelector('[role="dialog"]');
  if (
    state.ui.modal &&
    !previousModal &&
    !modalReturnFocus &&
    app.contains(document.activeElement)
  ) {
    const active = document.activeElement;
    const action = active.dataset?.action;
    const nav = active.dataset?.nav;
    if (action) modalReturnFocus = { selector: `[data-action="${action}"]` };
    else if (nav) modalReturnFocus = { selector: `[data-nav="${nav}"]` };
  }
  if (!state.ui.modal && previousModal && modalReturnFocus) {
    const selector = modalReturnFocus.selector;
    modalReturnFocus = null;
    setTimeout(() => document.querySelector(selector)?.focus({ preventScroll: true }), 0);
  }
  const active = state.ui.view;
  document.body.dataset.theme = state.settings.dark ? "mono" : "light";
  document.body.dataset.colorMode = state.settings.dark ? "dark" : "light";
  const main =
    active === "placement"
      ? renderPlacement()
      : active === "duel"
        ? LexoraDuel.render()
        : active === "home"
          ? renderHome()
          : active === "path"
            ? renderPath()
            : renderHome();
  app.innerHTML = `<div class="app-shell ${active === "path" ? "adventure-shell" : ""}">${active === "placement" ? "" : statusBarHtml()}${main}${active === "placement" ? "" : navHtml(active)}${renderModal()}</div>`;
  document.body.classList.remove("chrome-compact");
  document.body.dataset.screen = active;
  window.TangoWorld?.mount();
  if (active === "duel") LexoraDuel.mount();
  else window.LexoraDuel?.unmount();
  if (state.ui.modal && !previousModal) {
    const dialog = app.querySelector('[role="dialog"]');
    dialog
      ?.querySelector("button:not(:disabled), input:not(:disabled), select:not(:disabled), a[href]")
      ?.focus({ preventScroll: true });
  }
  persist();
}

function parseLessonIndex(id) {
  const unit = String(id).match(/^unit-(\d+)$/);
  if (unit) return Number(unit[1]) - 1;
  const nums = String(id).split("-").map(Number);
  if (nums.length === 3 && nums.every(Number.isFinite))
    return (nums[0] - 1) * 9 + (nums[1] - 1) * 3 + (nums[2] - 1);
  return 0;
}
function learningPlan(options = {}) {
  const preferences = TangoPlacement.preferences(state.placement, state.learningSignals);
  const signal = preferences.observed,
    target = Math.max(
      1,
      Math.min(
        10,
        preferences.level +
          Math.floor(TangoAdventure.normalize(state.adventure).completed / 4) -
          (signal !== null && signal < 0.6 ? 1 : 0),
      ),
    );
  const available = [...vocab].sort(
    (a, b) => Math.abs(a.level - target) - Math.abs(b.level - target) || a.id.localeCompare(b.id),
  );
  return TangoScheduler.plan(available, state.words, {
    difficult: state.difficultWords,
    saved: state.savedWords,
    newLimit: Math.min(5, preferences.newLimit),
    ...options,
  });
}

function reviewDue(word) {
  return TangoScheduler.memory(state.words[word.id]).due;
}
function dueReviewWords() {
  return learningPlan({ reviewOnly: true }).due.map((item) => item.word);
}
function chooseLessonWords(lessonIndex) {
  const unitWords = vocab.slice(Math.max(0, lessonIndex) * 10, Math.max(0, lessonIndex) * 10 + 10);
  let fresh = 0;
  return unitWords.filter(
    (word) =>
      state.words[word.id]?.lastSeen ||
      fresh++ <
        Math.min(5, TangoPlacement.preferences(state.placement, state.learningSignals).newLimit),
  );
}
function chooseReviewWords() {
  return learningPlan({ limit: 5, reviewOnly: true }).selected.map((item) => item.word);
}
function reviewTimeLabel(time) {
  if (!time) return "予定はまだありません";
  if (time <= Date.now()) return "いま復習できます";
  return new Intl.DateTimeFormat("ja-JP", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(time));
}

function questionMode() {
  return learning?.questionModes?.[learning.index] || "recall";
}
function makeEnglishOptions(word) {
  const distractors = vocab.filter((item) => item.id !== word.id).slice();
  for (let i = distractors.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [distractors[i], distractors[j]] = [distractors[j], distractors[i]];
  }
  const options = [word, ...distractors.slice(0, 3)];
  for (let i = options.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [options[i], options[j]] = [options[j], options[i]];
  }
  return options;
}
function scoreForReview(word) {
  return learningPlan({ limit: 100 }).due.find((item) => item.word.id === word.id)?.priority || 0;
}
function reviewLabel(word) {
  const m = TangoScheduler.memory(state.words[word.id]);
  return m.isNew
    ? "NEW · はじめての単語"
    : `${m.due ? "DUE · 復習のタイミング" : "REVIEW"} · 推定記憶率 ${Math.round(m.retention * 100)}%`;
}
function startLearning(id) {
  if (!state.placement?.result) {
    openPlacement();
    return;
  }

  const lessonIndex = id === "daily" ? -2 : id === "review" ? -1 : parseLessonIndex(id);
  if (
    id !== "daily" &&
    id !== "review" &&
    (!Number.isInteger(lessonIndex) || lessonIndex < 0 || !isUnlocked(lessonIndex))
  ) {
    toast("このLESSONはまだ未解放です。", "bad");
    return;
  }
  const words =
    id === "daily"
      ? learningPlan().selected.map((item) => item.word)
      : id === "review"
        ? chooseReviewWords()
        : chooseLessonWords(lessonIndex);
  if (!words.length) {
    toast(`いま復習する単語はありません。次回：${reviewTimeLabel(learningPlan().nextReviewAt)}`);
    return;
  }
  learning = {
    id,
    sessionId: crypto.randomUUID(),
    lessonIndex,
    words,
    index: 0,
    revealed: false,
    testAnswered: false,
    auto: false,
    completed: false,
    spaced: words.some((word) => reviewDue(word)),
    questionModes: words.map((word) => TangoScheduler.mode(state.words[word.id])),
    retryIds: [],
    initialIds: words.map((word) => word.id),
    englishOptions: words.map(makeEnglishOptions),
    spellingCorrect: false,
  };
  state.ui.view = "learn";
  state.ui.modal = null;
  renderLearning();
}
function currentWord() {
  return learning?.words[learning.index];
}
function isTest() {
  return questionMode() !== "recall";
}
function renderLearning() {
  window.TangoWorld?.dispose();
  dismissSwipeIntro();
  if (!learning) {
    state.ui.view = "home";
    renderApp();
    return;
  }
  document.body.dataset.theme = state.settings.dark ? "mono" : "light";
  document.body.dataset.colorMode = state.settings.dark ? "dark" : "light";
  const word = currentWord();
  const test = isTest();
  const progress = (learning.index / learning.words.length) * 100;
  const showSwipeIntro = !test && !state.settings.swipeIntroSeen;
  if (showSwipeIntro) state.settings.swipeIntroSeen = true;
  const saved = state.savedWords.includes(word.id);
  const difficult = state.difficultWords.includes(word.id);
  const currentCard = test
    ? `<div class="current-test-card">${renderQuickTest(word)}</div>`
    : `<div class="word-card" id="word-card" role="button" tabindex="0" aria-label="単語カード。Enterかスペースで意味を表示。意味の表示後は上スワイプか上矢印で覚えた、下スワイプか下矢印でわからないを回答できます。"><div class="word-count">QUESTION ${String(learning.index + 1).padStart(2, "0")} / ${learning.words.length}</div><div class="word-english" id="word-text" style="font-size:${wordFontSize(word.word)}px">${word.word}</div><div class="word-phonetic">${word.kana}</div><div class="tap-hint" id="tap-hint">${learning.revealed ? "" : "タップして意味を表示"}</div><div class="translation-wrap ${learning.revealed ? "show" : ""}" id="translation"><div class="translation-label">意味</div><div class="translation">${word.meaning}</div></div></div><div class="recall-controls">${learning.revealed ? `<button class="outline-btn" data-action="recall-forgot">思い出せない</button><button class="primary-btn" data-action="recall-known">思い出せた ${icons.check}</button>` : `<button class="primary-btn" data-action="recall-reveal">意味を確認する</button>`}</div>`;
  const wordStage = currentCard;
  const lessonLabel =
    learning.id === "daily"
      ? `おすすめ学習 · ${learning.initialIds.length}語`
      : learning.lessonIndex < 0
        ? "復習"
        : `レッスン · ${learning.initialIds.length}語`;
  const actionRail = test
    ? ""
    : `<aside class="action-rail" aria-label="学習アクション"><div class="action-stack"><button class="action-orb" data-learn-action="pronounce" aria-label="発音">${icons.volume}</button><span>発音</span></div><div class="action-stack"><button class="action-orb ${saved ? "active" : ""}" data-learn-action="save" aria-label="保存">${icons.bookmark}</button><span>保存</span></div><div class="action-stack"><button class="action-orb ${difficult ? "active" : ""}" data-learn-action="difficult" aria-label="苦手">${icons.flag}</button><span>苦手</span></div><div class="action-stack"><button class="action-orb" data-learn-action="skip" aria-label="スキップ">${icons.skip}</button><span>スキップ</span></div><div class="action-stack"><button class="action-orb ${learning.auto ? "active" : ""}" data-learn-action="auto" aria-label="自動">${icons.auto}</button><span>自動</span></div></aside>`;
  document.body.dataset.screen = "learn";
  app.innerHTML = `<div class="app-shell learn-screen"><main class="screen learn-screen"><header class="learn-top"><button class="icon-btn" data-action="exit-learn" aria-label="学習を終了">${icons.close}</button><div class="learn-progress"><small>${lessonLabel}</small><div class="progress-rail"><div class="progress-bar" style="--progress:${progress}%"></div></div><span class="question-mode-label">${test ? (questionMode() === "study" ? "単語を確認" : questionMode() === "spelling" ? "英単語を書く" : "意味を選ぶ") : "意味を思い出す"}</span></div><span class="short-hp" aria-label="HP ${state.hp}">${icons.heart}<b>${state.hp}</b></span></header><div class="learn-meta"><span>${questionMode() === "study" ? "新しい単語を確認" : "覚えた単語を復習"}</span><span class="combo">${state.combo ? `${state.combo} COMBO` : ""}</span></div>${state.fever ? `<div class="fever-banner show" id="fever">${icons.spark} FEVER · XP ×2 · ${state.feverSeconds || 20}s</div>` : ""}<div class="word-stage ${test ? "test-stage" : ""}" id="word-stage">${wordStage}${showSwipeIntro ? renderSwipeIntro() : ""}</div>${actionRail}</main></div>`;
  persist();
  setupLearningEvents();
  if (learning.keyboardAnswer) {
    document
      .querySelector("#word-card, #spelling-answer, .answer-btn")
      ?.focus({ preventScroll: true });
    learning.keyboardAnswer = false;
  }
  if (showSwipeIntro) swipeIntroTimer = setTimeout(dismissSwipeIntro, 5200);
  if (learning.auto && !test) scheduleAuto();
}
function renderQuickTest(word) {
  const letters = ["A", "B", "C", "D"];
  const mode = questionMode();
  if (mode === "study")
    return `<section class="quick-test"><div class="test-label">はじめての単語</div><h2>${escapeHTML(word.word)}</h2><p>${escapeHTML(word.kana)}</p><h3>${escapeHTML(word.meaning)}</h3><button class="outline-btn" data-learn-action="pronounce">発音を聞く</button><button class="primary-btn" data-learn-action="study-next">確認して次へ</button></section>`;
  if (mode === "meaning-select")
    return `<section class="quick-test"><h2>${escapeHTML(word.word)}</h2><p>この単語に合う意味は？</p><div class="answers">${word.options.map((meaning, i) => `<button class="answer-btn" data-test-answer="${i}"><span>${letters[i]}</span><strong>${escapeHTML(meaning)}</strong></button>`).join("")}</div><button class="test-dont-know" data-action="dont-know">わからない</button><div id="test-result" class="test-result" aria-live="polite"></div></section>`;
  if (mode === "spelling")
    return `<section class="quick-test spelling-test"><div class="test-label">WRITE IT</div><h2 class="spelling-prompt">${word.meaning}</h2><p>英単語を入力して答えよう</p><form id="spelling-form" autocomplete="off"><label class="visually-hidden" for="spelling-answer">英単語</label><input id="spelling-answer" name="answer" type="text" autocapitalize="none" spellcheck="false" autocomplete="off" placeholder="英単語を入力" required /><button class="primary-btn spelling-submit" type="submit">答えを確認</button></form><button class="test-dont-know" data-action="dont-know">わからない</button><div id="test-result" class="test-result" aria-live="polite"></div></section>`;
  const options = learning.englishOptions[learning.index] || makeEnglishOptions(word);
  return `<section class="quick-test meaning-select-test"><div class="test-label">日本語から選ぶ</div><h2 class="meaning-prompt">${escapeHTML(word.meaning)}</h2><p>この意味に合う英単語は？</p><div class="answers">${options.map((option, i) => `<button class="answer-btn" data-test-answer="${i}"><span class="answer-letter">${letters[i]}</span><strong>${escapeHTML(option.word)}</strong></button>`).join("")}</div><button class="test-dont-know" data-action="dont-know">わからない</button><div id="test-result" class="test-result" aria-live="polite"></div></section>`;
}
function renderSwipeIntro() {
  return `<div class="swipe-intro" role="status" aria-live="polite"><div class="swipe-intro-up"><span>↑</span><strong>覚えた</strong><small>上にスワイプ</small></div><div class="swipe-intro-hand" aria-hidden="true"><span></span></div><div class="swipe-intro-down"><span>↓</span><strong>わからない</strong><small>下にスワイプ</small></div></div>`;
}
function dismissSwipeIntro() {
  if (swipeIntroTimer) {
    clearTimeout(swipeIntroTimer);
    swipeIntroTimer = null;
  }
  document.querySelector(".swipe-intro")?.remove();
}
function setupLearningEvents() {
  const card = document.querySelector("#word-card");
  if (!card || isTest()) return;
  let startY = 0,
    deltaY = 0,
    moved = false,
    pointerId = null;
  const reset = () => {
    card.classList.remove("dragging");
    delete card.dataset.swipeDirection;
    card.style.removeProperty("--swipe-progress");
    card.style.removeProperty("--swipe-y");
    pointerId = null;
  };
  card.addEventListener("pointerdown", (event) => {
    if (
      pointerId !== null ||
      learning?.answerPending ||
      (event.pointerType === "mouse" && event.button !== 0)
    )
      return;
    startY = event.clientY;
    deltaY = 0;
    moved = false;
    pointerId = event.pointerId;
    card.setPointerCapture?.(pointerId);
  });
  card.addEventListener("pointermove", (event) => {
    if (event.pointerId !== pointerId) return;
    deltaY = event.clientY - startY;
    if (Math.abs(deltaY) > 12) moved = true;
    if (learning?.revealed && !learning.answerPending) {
      card.classList.add("dragging");
      card.dataset.swipeDirection = deltaY < 0 ? "up" : "down";
      card.style.setProperty("--swipe-progress", String(Math.min(1, Math.abs(deltaY) / 100)));
      card.style.setProperty("--swipe-y", `${Math.max(-140, Math.min(140, deltaY))}px`);
    }
  });
  card.addEventListener("pointerup", (event) => {
    if (event.pointerId !== pointerId) return;
    const shouldAnswer = learning?.revealed && Math.abs(deltaY) > 54;
    const shouldReveal = !moved && !learning?.revealed;
    const known = deltaY < 0;
    reset();
    if (shouldAnswer) animateSwipe(known);
    else if (shouldReveal) revealCurrent();
  });
  card.addEventListener("keydown", (event) => {
    if (["Enter", " "].includes(event.key)) {
      event.preventDefault();
      if (!learning?.revealed) revealCurrent();
    }
    if (learning?.revealed && ["ArrowUp", "ArrowDown"].includes(event.key)) {
      event.preventDefault();
      learning.keyboardAnswer = true;
      animateSwipe(event.key === "ArrowUp");
    }
  });
  card.addEventListener("pointercancel", reset);
  card.addEventListener("lostpointercapture", () => {
    if (pointerId !== null) reset();
  });
}

function revealCurrent() {
  if (!learning || learning.revealed || isTest()) return;
  learning.revealed = true;
  document.querySelector("#translation")?.classList.add("show");
  const hint = document.querySelector("#tap-hint");
  if (hint) hint.textContent = "";
  document.querySelector("#swipe-guide")?.classList.add("show");
  renderLearning();
  document.querySelector('[data-action="recall-known"]')?.focus({ preventScroll: true });
  haptic(8);
}
function animateSwipe(known) {
  if (!learning || !learning.revealed || learning.answerPending) return;
  dismissSwipeIntro();
  const session = learning,
    index = learning.index;
  session.answerPending = true;
  const card = document.querySelector("#word-card");
  if (card) card.classList.add(known ? "is-out-up" : "is-out-down");
  setTimeout(
    () => {
      if (learning !== session || learning.index !== index) return;
      session.answerPending = false;
      applyAnswer(known);
    },
    window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 290,
  );
}

let reviewFlush = null;
async function flushReviews() {
  if (!cloudUser || reviewFlush) return;
  const batch = (state.reviewEvents || []).slice(0, 100);
  if (!batch.length) return;
  reviewFlush = true;
  try {
    await TangoCloud.recordReviews(batch);
    const sent = new Set(batch.map((e) => e.event_id));
    state.reviewEvents = (state.reviewEvents || []).filter((e) => !sent.has(e.event_id));
    persist({ sync: false });
  } catch {
    /* Offline queue retries after the next answer. */
  } finally {
    reviewFlush = null;
  }
}
function updateWordData(word, known) {
  if (learning?.auto) return;
  const previous = state.words[word.id];
  const review = LexoraLearning.event(word, previous, known, questionMode());
  if (review) {
    state.reviewEvents = [...(state.reviewEvents || []), review].slice(-LexoraLearning.MAX_PENDING);
    setTimeout(flushReviews, 0);
  }
  state.words[word.id] = {
    ...TangoScheduler.practice(previous, known, questionMode()),
    diagnosticOnly: false,
  };
  if (learning && !learning.auto) {
    state.learningSignals.push({
      correct: known,
      weight: questionMode() === "recall" ? 0.35 : questionMode() === "spelling" ? 1 : 0.7,
    });
    state.learningSignals = state.learningSignals.slice(-30);
  }
  state.lessonProgress = TangoProgress.answer(
    vocab,
    state.lessonProgress,
    state.completedLessons,
    word.id,
    courseRoute(),
  );
  if (learning) learning.answeredIds = [...new Set([...(learning.answeredIds || []), word.id])];
}
function addRewards(known) {
  const beforeCapsules = Math.floor(state.coin / 100);
  const multiplier = state.fever ? 2 : 1;
  const xpGain = (known ? 10 : 3) * multiplier;
  const coinGain = (known ? 5 : 1) * multiplier;
  state.xp += xpGain;
  state.coin += coinGain;
  while (state.xp >= 500) {
    state.xp -= 500;
    state.level += 1;
    toast(`Lv ${state.level} にアップ！`, "good");
  }
  const afterCapsules = Math.floor(state.coin / 100);
  if (afterCapsules > beforeCapsules) toast("ガチャを1回引けます", "good");
  if (known) {
    state.combo += 1;
    tone("good");
    haptic(12);
    if (state.combo > 0 && state.combo % 7 === 0) startFever();
  } else {
    state.combo = 0;
    state.hp = Math.max(0, state.hp - 1);
    state.hpUpdatedAt = Date.now();
    state.fever = false;
    clearFever();
    tone("bad");
    haptic([15, 35, 15]);
  }
}
function startFever() {
  state.fever = true;
  state.feverSeconds = 20;
  tone("fever");
  toast("FEVER TIME — XPとCoinが2倍！", "good");
  clearFever();
  feverTimer = setInterval(() => {
    if (!state.fever) return clearFever();
    state.feverSeconds -= 1;
    const banner = document.querySelector("#fever");
    if (banner) banner.innerHTML = `${icons.spark} FEVER · XP ×2 · ${state.feverSeconds}s`;
    if (state.feverSeconds <= 0) {
      state.fever = false;
      clearFever();
      toast("Fever Time 終了。", "normal");
    }
    persist();
  }, 1000);
}
function clearFever() {
  if (feverTimer) {
    clearInterval(feverTimer);
    feverTimer = null;
  }
}
function clearAuto() {
  if (autoTimer) {
    clearTimeout(autoTimer);
    autoTimer = null;
  }
}
function scheduleAuto() {
  clearAuto();
  autoTimer = setTimeout(() => {
    if (!learning || !learning.auto || isTest()) return;
    if (!learning.revealed) revealCurrent();
    autoTimer = setTimeout(() => {
      if (learning?.auto) animateSwipe(true);
    }, 1050);
  }, 900);
}
function queuePractice(word) {
  if (
    learning.retryIds.includes(word.id) ||
    learning.words.length >= 20 ||
    learning.words.length - learning.index < 4
  )
    return;
  learning.retryIds.push(word.id);
  const at = learning.index + 4;
  learning.words.splice(at, 0, word);
  learning.questionModes.splice(at, 0, "meaning-select");
  learning.englishOptions.splice(at, 0, []);
}
function finishStudy() {
  if (!learning || questionMode() !== "study") return;
  const word = currentWord();
  state.words[word.id] = TangoScheduler.practice(state.words[word.id], false, "study");
  // Put a retrieval check after other words; never award mastery for viewing a card.
  learning.words.push(word);
  learning.questionModes.push("meaning-select");
  learning.englishOptions.push([]);
  persist();
  learning.index++;
  learning.testAnswered = false;
  renderLearning();
}
function applyAnswer(known) {
  if (!learning) return;
  const word = currentWord();
  if (!known) queuePractice(word);
  updateWordData(word, known);
  if (!learning.auto) {
    addRewards(known);
    state.daily.words += 1;
  }
  persist();
  learning.index += 1;
  learning.revealed = false;
  learning.testAnswered = false;
  if (learning.index >= learning.words.length) return finishLearning();
  renderLearning();
}
function schedulePracticeAnswer(known, delay) {
  const session = learning,
    index = learning?.index;
  setTimeout(() => {
    if (learning === session && learning?.index === index) applyAnswer(known);
  }, delay);
}
function testAnswer(choice) {
  if (!learning || learning.testAnswered) return;
  const word = currentWord();
  const mode = questionMode();
  const correct = word.options[choice] === word.meaning;
  learning.testAnswered = true;
  document.querySelectorAll("[data-test-answer]").forEach((btn) => {
    const index = Number(btn.dataset.testAnswer);
    const isCorrect = word.options[index] === word.meaning;
    btn.disabled = true;
    if (isCorrect) btn.classList.add("correct");
    else if (index === choice) btn.classList.add("wrong");
  });
  const result = document.querySelector("#test-result");
  if (result) {
    result.className = `test-result ${correct ? "good" : "bad"}`;
    result.textContent = correct ? "正解！ この調子。" : `おしい。正解は「${word.meaning}」。`;
  }
  schedulePracticeAnswer(correct, 1600);
}
function checkSpelling(event) {
  event.preventDefault();
  if (!learning || learning.testAnswered || questionMode() !== "spelling") return;
  const word = currentWord();
  const input = document.querySelector("#spelling-answer");
  const button = document.querySelector(".spelling-submit");
  const result = document.querySelector("#test-result");
  const correct =
    String(input?.value || "")
      .trim()
      .toLocaleLowerCase() === word.word.toLocaleLowerCase();
  learning.testAnswered = true;
  learning.spellingCorrect = correct;
  if (input) input.disabled = true;
  if (button) {
    button.disabled = true;
    button.textContent = "判定しました";
  }
  document.querySelector(".test-dont-know")?.setAttribute("disabled", "");
  if (result) {
    result.className = `test-result ${correct ? "good" : "bad"}`;
    result.textContent = correct
      ? "正解！自分で書けました。"
      : `おしい。正解は「${word.word}」。次で取り返そう。`;
  }
  if (correct) {
    tone("good");
    haptic(12);
  } else {
    tone("bad");
    haptic(10);
  }
  schedulePracticeAnswer(correct, 1600);
}
function dontKnowTestAnswer() {
  if (!learning || learning.testAnswered) return;
  learning.testAnswered = true;
  document
    .querySelectorAll("[data-test-answer], #spelling-answer, .spelling-submit, .test-dont-know")
    .forEach((el) => {
      el.disabled = true;
    });
  const result = document.querySelector("#test-result");
  if (result) {
    result.className = "test-result bad";
    result.textContent = `正解は「${currentWord().word}」 · 次の問題へ進みます`;
  }
  tone("bad");
  haptic(10);
  schedulePracticeAnswer(false, 1600);
}
function streakStampMarkup(streak) {
  const labels = ["月", "火", "水", "木", "金", "土", "日"],
    days = TangoProgress.week();
  return `<div class="streak-renewal"><span class="eyebrow">A LITTLE MORE, EVERY DAY</span><div class="streak-orbit" aria-label="${streak}日連続"><svg viewBox="0 0 180 180" aria-hidden="true"><circle class="streak-orbit-track" cx="90" cy="90" r="76"/><circle class="streak-orbit-fill" cx="90" cy="90" r="76"/></svg><div class="streak-number-window"><div class="streak-number-roll"><span aria-hidden="true">${Math.max(0, streak - 1)}</span><strong>${streak}</strong></div></div><span class="streak-number-unit">日連続</span><span class="streak-orbit-check">${icons.check}</span></div><h2 id="streak-title">今日のひとつが、<br>明日につながる。</h2><p>学習の記録が積み重なりました。</p><div class="renewal-week">${days.map((key, i) => `<div class="${state.streakHistory.includes(key) ? "done" : ""} ${key === todayKey() ? "today" : ""}" style="--day-order:${i}"><small>${labels[i]}</small><span>${state.streakHistory.includes(key) ? "✓" : "·"}</span></div>`).join("")}</div></div>`;
}

function finishLearning() {
  dismissSwipeIntro();
  clearAuto();
  clearFever();
  state.fever = false;
  const automaticLesson = learning.id === "daily";
  const fromAdventure = Boolean(learning.adventureSource);
  const beforeRegion = TangoAdventure.highest(TangoAdventure.normalize(state.adventure).completed);
  const hadAnswers = (learning.answeredIds || []).length > 0;
  const finishedAll = learning.initialIds.every((id) => (learning.answeredIds || []).includes(id));
  if (finishedAll && hadAnswers && !learning.usedAuto)
    state.adventure = TangoAdventure.complete(state.adventure, learning.sessionId);
  const openedRegion =
    TangoAdventure.highest(TangoAdventure.normalize(state.adventure).completed) > beforeRegion;
  const completedIndex = learning.lessonIndex;
  const beforeCompleted = [...state.completedLessons];
  if (hadAnswers)
    state.completedLessons = TangoProgress.clear(
      vocab,
      state.lessonProgress,
      state.completedLessons,
      courseRoute(),
    );
  const unlockedNew = state.completedLessons.filter((index) => !beforeCompleted.includes(index));
  const newLesson = unlockedNew.length > 0;
  const wasLesson = hadAnswers && (automaticLesson || completedIndex >= 0);
  if (automaticLesson && finishedAll) state.daily.lessons += 1;
  else if (!automaticLesson && newLesson) state.daily.lessons += unlockedNew.length;
  if (!hadAnswers) {
    state.ui.view = "path";
    state.ui.modal = null;
    learning = null;
    persist();
    renderApp();
    toast("スキップした単語に回答して、レッスンをクリアしましょう。");
    return;
  }
  const today = todayKey();
  if (state.lastStudyDate !== today) {
    const oldDate = state.lastStudyDate;
    const yesterday = TangoProgress.shiftDay(today, -1);
    if (oldDate && oldDate !== yesterday) {
      if (state.items.streakKeep > 0) {
        state.items.streakKeep -= 1;
        toast("Streak Keep が今日をつなぎました。", "good");
      } else state.streak = 1;
    } else state.streak += 1;
    state.lastStudyDate = today;
    state.streakHistory = [...new Set([...(state.streakHistory || []), today])].slice(-90);
    recordWeeklyChallengeStudy(today);
    if (state.studyGarden.lastDay !== today) {
      state.studyGarden.growth = Number(state.studyGarden.growth || 0) + 1;
      state.studyGarden.lastDay = today;
    }
  }
  if (wasLesson && !state.ownedBadges.includes("first-step")) state.ownedBadges.push("first-step");
  toast(
    newLesson
      ? "レッスンクリア。次の道が開きました！"
      : !finishedAll
        ? "回答を保存しました。残りの単語にも挑戦しましょう。"
        : "学習完了。記録を更新しました。",
    "good",
  );
  const showStamp = hadAnswers && state.lastLessonStampDate !== today;
  if (hadAnswers) state.lastLessonStampDate = today;
  state.ui.modal = showStamp ? `streak:${state.streak}` : null;
  state.ui.view = fromAdventure ? "path" : "home";
  if (fromAdventure) state.ui.modal = null;
  learning = null;
  persist();
  renderApp();
  if (openedRegion) toast("記憶の灯が戻り、新しい道が開きました。", "good");
}
function learnAction(action) {
  if (!learning) return;
  const word = currentWord();
  if (action === "study-next") {
    finishStudy();
    return;
  }
  if (action === "pronounce") {
    const utterance = new SpeechSynthesisUtterance(word.word);
    utterance.lang = "en-US";
    utterance.rate = 0.85;
    speechSynthesis.cancel();
    speechSynthesis.speak(utterance);
    haptic(7);
  }
  if (action === "save" || action === "difficult") {
    const key = action === "save" ? "savedWords" : "difficultWords";
    const item = state[key];
    const on = item.includes(word.id);
    state[key] = on ? item.filter((id) => id !== word.id) : [...item, word.id];
    if (!on) {
      state.daily.saved += 1;
      toast(action === "save" ? "保存しました。" : "苦手リストに入れました。", "good");
    }
    persist();
    renderLearning();
  }
  if (action === "skip") {
    toast("スキップしました。あとでまた出会えます。", "normal");
    learning.index += 1;
    learning.revealed = false;
    if (learning.index >= learning.words.length) finishLearning();
    else renderLearning();
  }
  if (action === "auto") {
    learning.auto = !learning.auto;
    if (learning.auto) learning.usedAuto = true;
    toast(learning.auto ? "自動送りをオンにしました。" : "自動送りをオフにしました。");
    renderLearning();
  }
}
let capsuleLastResults = [];
function useCapsule(count = 1) {
  if (!["capsule-menu", "capsule-info"].includes(state.ui.modal)) return;
  const result = TangoGacha.draw(state, count);
  if (!result.ok) {
    toast(
      result.reason === "coins" ? `${count * 100}コイン必要です。` : "回数を確認してください。",
      "normal",
    );
    return;
  }
  const hpBefore = state.hp;
  Object.assign(state, {
    coin: result.coin,
    hp: result.hp,
    items: { ...state.items, ...result.items },
    ownedBadges: result.ownedBadges,
    gacha: result.gacha,
  });
  if (state.hp !== hpBefore) state.hpUpdatedAt = Date.now();
  capsuleLastResults = result.results;
  state.history = result.results
    .map((r) => ({
      name: r.name,
      date: new Intl.DateTimeFormat("ja-JP", {
        month: "numeric",
        day: "numeric",
      }).format(new Date()),
    }))
    .concat(state.history)
    .slice(0, 8);
  state.ui.modal = "capsule-result";
  persist();
  tone("fever");
  haptic([12, 40, 18]);
  renderApp();
}
function capsuleArt() {
  return `<svg class="gacha-machine" viewBox="0 0 240 230" aria-hidden="true"><defs><linearGradient id="capsuleGlass" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#fff" stop-opacity=".85"/><stop offset="1" stop-color="#8ca9c4" stop-opacity=".28"/></linearGradient><linearGradient id="capsuleBase" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#9bb1c6"/><stop offset="1" stop-color="#4c657d"/></linearGradient></defs><ellipse cx="120" cy="216" rx="78" ry="8" fill="#58738d" opacity=".1"/><rect x="56" y="122" width="128" height="88" rx="27" fill="url(#capsuleBase)"/><rect x="92" y="171" width="56" height="24" rx="10" fill="#263e55"/><circle cx="120" cy="145" r="17" fill="#eaf0f6" stroke="#fff"/><path d="M109 145h22" stroke="#6a8095" stroke-width="5" stroke-linecap="round"/><rect x="48" y="22" width="144" height="108" rx="40" fill="url(#capsuleGlass)" stroke="#fff" stroke-width="1.5"/>${[
    [83, 96, "#a4bbce"],
    [117, 105, "#cec2db"],
    [151, 94, "#9fc4ba"],
    [102, 69, "#c6cbd2"],
    [142, 62, "#d6c4a3"],
  ]
    .map(
      ([x, y, c]) =>
        `<g class="machine-capsule"><circle cx="${x}" cy="${y}" r="17" fill="${c}"/><path d="M${x - 15} ${y}h30" stroke="#fff" stroke-opacity=".8"/><path d="M${x - 7} ${y - 11}h5" stroke="#fff" stroke-width="2" stroke-linecap="round"/></g>`,
    )
    .join(
      "",
    )}<path d="M65 57c0-11 8-19 19-19" stroke="#fff" stroke-width="4" stroke-linecap="round" opacity=".85"/></svg>`;
}
function rewardIcon(reward) {
  return reward.kind === "badge"
    ? badgeArt(reward.id)
    : reward.kind === "streakKeep"
      ? icons.flame
      : icons.heart;
}
function badgeArt(id) {
  const index = TangoGacha.rewards.filter((r) => r.kind === "badge").findIndex((r) => r.id === id);
  const shapes = [
    '<path d="m12 3 2 6 6 3-6 2-2 7-2-7-6-2 6-3Z"/>',
    '<path d="M12 12C3 8 6 2 10 5c2 1 2 7 2 7Zm0 0c0-10 7-11 7-6 0 3-7 6-7 6Zm0 0c9-3 13 3 8 5-3 1-8-5-8-5Zm0 0c6 7 2 13-2 9-2-3 2-9 2-9Zm0 0c-4 8-11 7-10 2 1-3 10-2 10-2Z"/>',
    '<path d="M19 15a8 8 0 0 1-10-10 8.5 8.5 0 1 0 10 10Z"/><path d="m17 3 .8 2.2L20 6l-2.2.8L17 9l-.8-2.2L14 6l2.2-.8Z"/>',
    '<path d="m17 3 1.5 3.5L22 8l-3.5 1.5L17 13l-1.5-3.5L12 8l3.5-1.5Z M3 21l9-9M3 14l5-5M10 21l5-5"/>',
    '<path d="M3 7c3-5 6 5 9 0s6 5 9 0M3 12c3-5 6 5 9 0s6 5 9 0M3 17c3-5 6 5 9 0s6 5 9 0"/>',
    '<path d="M19 4C8 2 2 8 5 15s16 5 14-11ZM5 20l10-12M9 16V9M10 15h6"/>',
    '<path d="m12 2 9 9-9 11L3 11Zm-9 9h18M12 2l4 9-4 11-4-11Z"/>',
    '<circle cx="12" cy="12" r="6"/><ellipse cx="12" cy="12" rx="11" ry="3.5" transform="rotate(-30 12 12)"/><path d="M11 8h.01"/>',
  ];
  const glyph = `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true">${shapes[Math.max(0, index)]}</svg>`;
  return `<span class="badge-art badge-art-${Math.max(0, index)}">${glyph}</span>`;
}
function renderCapsuleMenu() {
  const gacha = TangoGacha.normalize(state.gacha);
  return `<div class="modal-backdrop shrine-backdrop" data-close-modal><section class="modal shrine-modal" role="dialog" aria-modal="true" aria-labelledby="gacha-title"><header class="shrine-heading"><div><span>旅の祈願所</span><h2 id="gacha-title">星灯の祠</h2></div><button class="icon-btn" data-action="close-modal" aria-label="旅に戻る">${icons.close}</button></header><div class="shrine-art" aria-hidden="true"><div class="shrine-halo"></div><div class="shrine-crystal">${icons.spark}</div><div class="shrine-pedestal"></div><i></i><i></i><i></i></div><p class="shrine-description">旅で集めたコインを、贈り物に。</p><div class="shrine-balance">${icons.coin}<span>所持コイン</span><strong>${state.coin}</strong></div><div class="shrine-guarantee"><span>バッジ確定まで <b>あと${10 - gacha.cycle}回</b></span><div>${Array.from({ length: 10 }, (_, i) => `<i class="${i < gacha.cycle ? "lit" : ""}"></i>`).join("")}</div></div><div class="shrine-actions"><button class="primary-btn" data-action="capsule-draw" ${state.coin < 100 ? "disabled" : ""}>1回祈願する <small>${icons.coin}100</small></button><button class="outline-btn" data-action="capsule-five" ${state.coin < 500 ? "disabled" : ""}>5回祈願する <small>${icons.coin}500</small></button></div>${state.coin < 100 ? `<p class="shrine-hint">あと${100 - state.coin}コイン。学習や宝箱で集められます。</p>` : ""}<details class="shrine-rates"><summary>贈り物と確率</summary><p>10回目は未所持のバッジから均等に抽選します。全種類所持後はコインに交換します。</p>${TangoGacha.rewards.map((r) => `<div><span>${escapeHTML(r.name)}</span><b>${r.weight}%</b></div>`).join("")}<p>重複はR:25・SR:40・SSR:75コインに交換。HP満タン時は回復ストックになります。</p></details><details class="shrine-history"><summary>祈願の履歴 · ${gacha.total}回</summary>${gacha.history.map((r) => `<div><span>${escapeHTML(r.name)}</span><small>${escapeHTML(r.effect || "")}</small></div>`).join("") || "<p>まだ祈願していません。</p>"}</details></section></div>`;
}
function renderCapsuleResult() {
  const results = capsuleLastResults.length ? capsuleLastResults : state.gacha.history.slice(0, 1);
  return `<div class="modal-backdrop" data-close-modal><section class="modal capsule-result gacha-result" role="dialog" aria-modal="true" aria-labelledby="gacha-result-title"><div class="modal-head"><h2 id="gacha-result-title">祠からの贈り物</h2><button class="icon-btn" data-action="close-modal" aria-label="閉じる">${icons.close}</button></div><div class="gacha-results ${results.length === 1 ? "single" : ""}">${results.map((r, i) => `<article class="gacha-reward rarity-border-${r.rarity}" style="--reveal:${i}"><span class="rarity rarity-${r.rarity}">${escapeHTML(r.rarity)}</span>${rewardIcon(r)}${r.kind === "badge" && !r.duplicate ? '<span class="gacha-new">NEW</span>' : ""}<h3>${escapeHTML(r.name)}</h3><p>${escapeHTML(r.effect || "")}</p>${r.guaranteed ? '<small class="gacha-guaranteed">10回目の確定バッジ</small>' : ""}</article>`).join("")}</div><p class="gacha-result-balance">${icons.coin} 残り ${state.coin}コイン</p><button class="primary-btn" data-action="capsule-menu">祠に戻る ${icons.arrow}</button>${results.some((r) => r.kind === "badge" && !r.duplicate) ? `<button class="text-link" data-action="gacha-profile">${icons.edit} プロフィールに装備する</button>` : ""}</section></div>`;
}
function addTheme(theme) {
  if (!state.ownedThemes.includes(theme)) state.ownedThemes.push(theme);
}
function addBadge(badge) {
  if (!state.ownedBadges.includes(badge)) state.ownedBadges.push(badge);
}
function toggleBadge(id) {
  const active = state.equippedBadges.includes(id);
  if (active) state.equippedBadges = state.equippedBadges.filter((b) => b !== id);
  else {
    if (state.equippedBadges.length >= 3) {
      toast("バッジは3個まで選択できます", "bad");
      return;
    }
    state.equippedBadges.push(id);
  }
  persist();
  renderApp();
}
function shareProfile() {
  const text = `コトミア｜Lv ${state.level} · ${state.streak} day streak\n${state.equippedBadges.map(badgeName).join(" · ") || "Badgeを集め中"}`;
  if (navigator.share) navigator.share({ title: "コトミア", text }).catch(() => {});
  else if (navigator.clipboard)
    navigator.clipboard
      .writeText(text)
      .then(() => toast("共有用テキストをコピーしました。", "good"))
      .catch(() => toast(text));
  else toast(text);
}
async function saveProfile(form) {
  const formData = new FormData(form);
  const displayName = String(formData.get("displayName") || "").trim();
  if (!displayName) {
    toast("表示名を入力してください。", "bad");
    return;
  }
  state.profile.name = displayName;
  if (profileDraft) {
    state.profile.avatarImage = profileDraft.avatarImage;
    state.equippedBadges = profileDraft.badges
      .filter((id) => state.ownedBadges.includes(id))
      .slice(0, 3);
    profileDraft = null;
  }
  persist({ sync: false });
  state.ui.modal = null;
  renderApp();
  persist();
  toast("プロフィールを更新しました。", "good");
}
async function resizeAvatarFile(file) {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 5 * 1024 * 1024)
    throw Error("5MB以下のJPG・PNG・WebPを選んでください。");
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 192;
    const side = Math.min(image.naturalWidth, image.naturalHeight);
    canvas
      .getContext("2d")
      .drawImage(
        image,
        (image.naturalWidth - side) / 2,
        (image.naturalHeight - side) / 2,
        side,
        side,
        0,
        0,
        192,
        192,
      );
    return canvas.toDataURL("image/jpeg", 0.85);
  } finally {
    URL.revokeObjectURL(url);
  }
}
async function handleAvatarFile(file) {
  const draft = profileDraft;
  if (!draft || state.ui.modal !== "edit-profile") return;
  try {
    const image = await resizeAvatarFile(file);
    if (profileDraft !== draft || state.ui.modal !== "edit-profile") return;
    draft.avatarImage = image;
    renderApp();
    toast("写真を読み込みました。変更を保存すると反映されます。", "good");
  } catch {
    toast("画像を読み込めませんでした。JPG・PNG・WebPを選択してください。", "bad");
  }
}
async function handleLogout() {
  clearTimeout(syncTimer);
  try {
    await TangoCloud.signOut();
    cloudUser = null;
    state.profile.loggedIn = false;
    state.ui.modal = "account";
    persist({ sync: false });
    renderApp();
    toast("ログアウトしました。");
  } catch {
    toast("ログアウトできませんでした。", "bad");
  }
}
window.addEventListener("click", (event) => {
  const target = event.target.closest("button, a[data-nav], [data-close-modal]");
  if (!target) return;
  if (target.hasAttribute("data-close-modal") && event.target === target) {
    state.ui.modal = null;
    renderApp();
    return;
  }
  if (target.matches("a[data-nav]")) event.preventDefault();
  if (target.dataset.capsuleTab) {
    state.ui.capsuleTab = target.dataset.capsuleTab;
    renderApp();
    return;
  }
  if (target.dataset.profileBadge) {
    const id = target.dataset.profileBadge;
    if (!profileDraft || !state.ownedBadges.includes(id)) return;
    if (profileDraft.badges.includes(id))
      profileDraft.badges = profileDraft.badges.filter((b) => b !== id);
    else if (profileDraft.badges.length < 3) profileDraft.badges.push(id);
    else {
      toast("バッジは3つまで選べます。", "normal");
      return;
    }
    renderApp();
    return;
  }
  if (target.dataset.nav) {
    const requested = target.dataset.nav;
    state.ui.view = ["home", "path", "duel"].includes(requested) ? requested : "home";
    state.ui.modal = null;
    renderApp();
    window.scrollTo({ top: 0, behavior: "instant" });
    return;
  }
  if (target.dataset.start) {
    startLearning(target.dataset.start);
    return;
  }
  if (target.dataset.socialTab) {
    state.ui.socialTab = target.dataset.socialTab;
    if (target.dataset.socialTab !== "group") renderApp();
    else renderApp();
    return;
  }
  if (target.dataset.selectGroup) {
    state.ui.selectedGroup = target.dataset.selectGroup;
    state.ui.modal = null;
    renderApp();
    return;
  }
  if (target.dataset.themeSelect) return;
  if (target.dataset.badge) {
    toggleBadge(target.dataset.badge);
    return;
  }
  if (target.dataset.equipTheme) {
    state.equippedTheme = target.dataset.equipTheme;
    state.settings.dark = true;
    persist();
    renderApp();
    toast(`${themes.find((t) => t.id === state.equippedTheme)?.name} を装備しました。`, "good");
    return;
  }
  if (target.dataset.testAnswer !== undefined) {
    testAnswer(Number(target.dataset.testAnswer));
    return;
  }
  if (target.dataset.action === "dont-know") {
    dontKnowTestAnswer();
    return;
  }
  if (target.dataset.learnAction) {
    learnAction(target.dataset.learnAction);
    return;
  }
  const action = target.dataset.action;
  if (!action) return;
  if (action === "placement-open") {
    openPlacement();
    return;
  }
  if (action === "placement-begin") {
    beginPlacement();
    return;
  }
  if (action === "placement-pause") {
    state.ui.view = "home";
    persist();
    renderApp();
    return;
  }
  if (action === "placement-finish") {
    state.ui.view = "home";
    renderApp();
    return;
  }
  if (action === "placement-retake") {
    state.ui.view = "placement";
    state.ui.placementPhase = "intro";
    renderApp();
    return;
  }
  if (action === "placement-new") {
    beginPlacement(true);
    return;
  }
  if (action === "world-gift") {
    claimWorldGift(target.dataset.giftId);
    return;
  }
  if (action === "recall-reveal") {
    revealCurrent();
    return;
  }
  if (action === "recall-known" || action === "recall-forgot") {
    animateSwipe(action === "recall-known");
    return;
  }
  if (action === "journey-current") {
    document.querySelector(".journey-stop.current")?.scrollIntoView({
      block: "center",
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
    });
    return;
  }
  if (action === "next-plan" || action === "memory-info") {
    state.ui.modal = action;
    renderApp();
  }
  if (action === "theme") {
    state.settings.dark = !state.settings.dark;
    persist();
    renderApp();
  }
  if (action === "review") {
    startLearning("review");
    return;
  }
  if (action === "adventure-info") {
    state.ui.modal = "adventure-info";
    renderApp();
  }
  if (action === "account") {
    state.ui.modal = state.ui.modal === "account" ? null : "account";
    renderApp();
  }
  if (action === "account-settings") {
    state.ui.modal = "account-settings";
    renderApp();
  }
  if (action === "profile") {
    profileDraft = null;
    state.ui.modal = "edit-profile";
    renderApp();
  }
  if (action === "enroll-signup" || action === "enroll-recover") {
    openEnrollment(action === "enroll-signup" ? "signup" : "recover");
    return;
  }
  if (action === "enroll-resend") {
    if (authBusy || Date.now() - enrollment.sentAt < 60000) {
      toast("再送信は60秒後にできます。");
      return;
    }
    authBusy = true;
    TangoCloud.sendEmailCode(enrollment.email, enrollment.mode === "signup")
      .then(() => {
        enrollment.sentAt = Date.now();
        toast("確認コードを再送信しました。");
      })
      .catch((e) => toast(e.message, "bad"))
      .finally(() => {
        authBusy = false;
        renderApp();
      });
    return;
  }
  if (action === "passkey-login") {
    passkeyAction();
    return;
  }
  if (action === "passkey-register") {
    passkeyAction(true);
    return;
  }
  if (action === "login") {
    state.ui.modal = "login";
    renderApp();
  }
  if (action === "logout") {
    handleLogout();
  }
  if (action === "edit-profile") {
    profileDraft = null;
    state.ui.modal = "edit-profile";
    renderApp();
  }
  if (action === "choose-avatar") document.querySelector("#avatar-file-input")?.click();
  if (action === "reset-avatar-photo" && profileDraft) {
    profileDraft.avatarImage = "";
    renderApp();
  }
  if (action === "badges") {
    state.ui.modal = "badges";
    renderApp();
  }
  if (action === "data-info") {
    state.ui.modal = "data";
    renderApp();
  }
  if (action === "missions") {
    state.ui.modal = "missions";
    renderApp();
  }
  if (action === "capsule-info") {
    state.ui.modal = "capsule-info";
    renderApp();
  }
  if (action === "close-modal" || action === "close-streak") {
    state.ui.modal = null;
    renderApp();
  }
  if (action === "share") shareProfile();
  if (action === "sound") {
    state.settings.sound = !state.settings.sound;
    persist();
    renderApp();
    toast(state.settings.sound ? "サウンドをオンにしました。" : "サウンドをオフにしました。");
  }
  if (action === "capsule" || action === "capsule-menu") {
    state.ui.modal = "capsule-menu";
    state.ui.capsuleTab = "draw";
    renderApp();
  }
  if (action === "capsule-draw") useCapsule();
  if (action === "capsule-five") useCapsule(5);
  if (action === "gacha-profile") {
    profileDraft = null;
    state.ui.modal = "edit-profile";
    renderApp();
  }
  if (action === "use-hp") {
    if (state.items.hpStock > 0 && state.hp < 30) {
      state.items.hpStock -= 1;
      state.hp = Math.min(30, state.hp + 1);
      persist();
      renderApp();
      toast("HPを1回復しました。", "good");
    }
  }
  if (action === "exit-learn") {
    dismissSwipeIntro();
    clearAuto();
    clearFever();
    learning = null;
    state.ui.view = "home";
    renderApp();
  }
  if (action === "learn-info")
    toast("タップで意味を表示。覚えたら上へ、復習したいときは下へスワイプ。");
});
window.addEventListener("input", (event) => {
  if (event.target.id === "display-name" && profileDraft) profileDraft.name = event.target.value;
});
window.addEventListener("submit", (event) => {
  if (event.target.id === "profile-form") {
    event.preventDefault();
    saveProfile(event.target).catch(() => toast("プロフィールを更新できませんでした。", "bad"));
  }
});
window.addEventListener("submit", (event) => {
  if (event.target.id === "spelling-form") checkSpelling(event);
});
window.addEventListener("change", (event) => {
  if (event.target.matches("[data-theme-select]")) {
    state.equippedTheme = event.target.value;
    state.settings.dark = true;
    persist();
    renderApp();
    toast(
      `${themes.find((t) => t.id === state.equippedTheme)?.name || "テーマ"} に変更しました。`,
      "good",
    );
  }
  if (event.target.id === "avatar-file-input") handleAvatarFile(event.target.files?.[0]);
});
window.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && state.ui.modal) {
    state.ui.modal = null;
    renderApp();
  }
});

initCloud();
renderApp();

// Keep keyboard navigation within an open modal.
window.addEventListener("keydown", (event) => {
  if (event.key !== "Tab") return;
  const dialog = document.querySelector('[role="dialog"]');
  if (!dialog) return;
  const controls = [
    ...dialog.querySelectorAll(
      "button:not(:disabled), input:not(:disabled), select:not(:disabled), a[href]",
    ),
  ].filter((el) => el.getClientRects().length);
  const first = controls[0],
    last = controls.at(-1);
  if (!first) return;
  if (
    event.shiftKey &&
    (document.activeElement === first || !dialog.contains(document.activeElement))
  ) {
    event.preventDefault();
    last.focus();
  } else if (
    !event.shiftKey &&
    (document.activeElement === last || !dialog.contains(document.activeElement))
  ) {
    event.preventDefault();
    first.focus();
  }
});

// Update the visible plan after returning to the app. Never replace an active session.
let memoryPlanMinute = Math.floor(Date.now() / 60000);
function refreshMemoryPlan() {
  const minute = Math.floor(Date.now() / 60000);
  if (
    minute !== memoryPlanMinute &&
    !document.hidden &&
    state.ui.view === "home" &&
    !state.ui.modal
  ) {
    memoryPlanMinute = minute;
    // Avoid interrupting keyboard focus while navigating home controls.
    if (!app.contains(document.activeElement)) renderApp();
  }
}
setInterval(refreshMemoryPlan, 60000);
document.addEventListener("visibilitychange", refreshMemoryPlan);

window.addEventListener("tango-adventure-position", (event) => {
  const base = TangoAdventure.normalize(state.adventure),
    p = event.detail;
  if (
    p &&
    Number.isFinite(p.x) &&
    Number.isFinite(p.z) &&
    TangoAdventure.canWalk(p.x, p.z, base.completed)
  ) {
    state.adventure = { ...base, position: { x: p.x, z: p.z } };
    persist({ sync: false });
  }
});
window.addEventListener("tango-adventure-study", (event) => {
  if (!TangoAdventure.POINTS.some((p) => p.id === event.detail?.source)) return;
  startLearning("daily");
  if (learning) learning.adventureSource = event.detail.source;
});
window.addEventListener("tango-adventure-chest", (event) => {
  const base = TangoAdventure.normalize(state.adventure),
    p = event.detail?.position;
  if (!p || !TangoAdventure.canWalk(p.x, p.z, base.completed)) return;
  const result = TangoAdventure.claim({ ...base, position: p }, event.detail.id);
  if (!result) return;
  state.adventure = result.state;
  state.coin += result.coins;
  persist();
  renderApp();
  toast(result.coins + "コインを見つけました。", "good");
});

window.addEventListener("tango-adventure-shrine", (event) => {
  const p = event.detail?.position,
    shrine = TangoAdventure.POINTS.find((p) => p.kind === "shrine");
  if (!p || !shrine || Math.hypot(p.x - shrine.x, p.z - shrine.z) > 3.4) return;
  state.ui.modal = "capsule-menu";
  renderApp();
});

window.addEventListener("submit", (event) => {
  if (event.target.id === "enrollment-form") {
    event.preventDefault();
    enrollmentSubmit(event.target);
  }
});
window.addEventListener("change", async (event) => {
  if (event.target.id !== "enroll-avatar" || !event.target.files?.[0]) return;
  const name = document.querySelector('#enrollment-form [name="nickname"]'),
    email = document.querySelector('#enrollment-form [name="email"]');
  if (name) enrollment.name = name.value;
  if (email) enrollment.email = email.value;
  try {
    enrollment.avatarImage = await resizeAvatarFile(event.target.files[0]);
    renderApp();
  } catch {
    toast("画像を読み込めませんでした。", "bad");
  }
});
let lastChromeScroll = window.scrollY,
  chromeReturn = null;
window.addEventListener(
  "scroll",
  () => {
    const y = window.scrollY,
      delta = y - lastChromeScroll;
    lastChromeScroll = y;
    if (state.ui.modal || state.ui.view !== "home") return;
    if (Math.abs(delta) > 4) document.body.classList.toggle("chrome-compact", delta > 0 && y > 60);
  },
  { passive: true },
);
window.addEventListener("kotomia-walking", (event) => {
  clearTimeout(chromeReturn);
  if (event.detail) document.body.classList.add("chrome-compact");
  else chromeReturn = setTimeout(() => document.body.classList.remove("chrome-compact"), 700);
});
