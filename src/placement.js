/* Provisional, within-material placement. Item bands are editorial, not calibrated
   CEFR/Common Test scores. Bayesian scoring accounts for chance answers, including none-of-the-above items. */
(function (root) {
  "use strict";
  // Short onboarding: trade precise classification for a usable starting point.
  const CONFIDENCE_TARGET = 0.6;
  const MIN_QUESTIONS = 8;
  const MAX_QUESTIONS = 30;
  const LEVELS = 10;
  const VERSION = 3;
  const LABELS = [
    "基礎の一歩",
    "基礎を固める",
    "基礎を広げる",
    "標準への準備",
    "標準を伸ばす",
    "標準から応用へ",
    "応用に挑戦",
    "応用を深める",
    "発展を磨く",
    "発展の先へ",
  ];
  const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
  function band(word, index, total) {
    return clamp(
      Number(word?.level) ||
        Number(word?.studyBand) ||
        Math.floor((index / Math.max(1, total)) * LEVELS) + 1,
      1,
      LEVELS,
    );
  }
  const difficulty = (level) => (level - 5.5) * 0.4;
  const probability = (theta, b, guessing = 0.2) =>
    guessing + (1 - guessing) / (1 + Math.exp(-2.25 * (theta - b)));
  const bankCache = new WeakMap();
  function hash(value) {
    let h = 2166136261;
    for (const char of String(value)) {
      h ^= char.codePointAt(0);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }
  function bank(vocab) {
    if (bankCache.has(vocab)) return bankCache.get(vocab);
    const seen = new Set();
    const items = vocab.flatMap((word, index) => {
      const key = word.word.trim().toLowerCase();
      if (
        seen.has(key) ||
        !Array.isArray(word.options) ||
        new Set(word.options).size !== 4 ||
        !word.options.includes(word.meaning)
      )
        return [];
      seen.add(key);
      const level = band(word, index, vocab.length);
      return [{ id: word.id, band: level, difficulty: difficulty(level) }];
    });
    bankCache.set(vocab, items);
    return items;
  }
  // Ten explicit level hypotheses. Confidence is posterior mass of the most likely level.
  function estimate(answers = []) {
    const grid = Array.from({ length: LEVELS }, (_, i) => difficulty(i + 1));
    const logs = grid.map((theta) =>
      answers.reduce((log, a) => {
        const p = probability(theta, a.difficulty, a.guessing ?? 0.25);
        return log + Math.log(a.correct ? p : 1 - p);
      }, 0),
    );
    const max = Math.max(...logs),
      weights = logs.map((log) => Math.exp(log - max));
    const sum = weights.reduce((a, b) => a + b, 0),
      posterior = weights.map((w) => w / sum);
    const theta = grid.reduce((sum, t, i) => sum + t * posterior[i], 0);
    const sd = Math.sqrt(grid.reduce((sum, t, i) => sum + (t - theta) ** 2 * posterior[i], 0));
    const confidence = Math.max(...posterior),
      level = posterior.indexOf(confidence) + 1;
    return { theta, sd, level, confidence, posterior };
  }
  const entropy = (values) => -values.reduce((sum, p) => sum + (p > 0 ? p * Math.log(p) : 0), 0);
  function next(vocab, session) {
    const used = new Set(session.answers.map((a) => a.id));
    const pool = bank(vocab).filter((item) => !used.has(item.id));
    if (!pool.length) return null;
    const { posterior } = estimate(session.answers);
    const gains = new Map();
    for (const item of pool) {
      if (gains.has(item.band)) continue;
      const likelihood = posterior.map((_, i) => probability(difficulty(i + 1), item.difficulty));
      const correct = posterior.reduce((sum, p, i) => sum + p * likelihood[i], 0);
      const yes = posterior.map((p, i) => (p * likelihood[i]) / correct);
      const no = posterior.map((p, i) => (p * (1 - likelihood[i])) / (1 - correct));
      gains.set(
        item.band,
        entropy(posterior) - correct * entropy(yes) - (1 - correct) * entropy(no),
      );
    }
    // Pick the difficulty with the greatest expected reduction in uncertainty.
    pool.sort(
      (a, b) =>
        gains.get(b.band) - gains.get(a.band) ||
        hash(`${session.seed}:${a.id}`) - hash(`${session.seed}:${b.id}`),
    );
    const chosen = pool[0],
      word = vocab.find((w) => w.id === chosen.id);
    const absent = hash(`${session.seed}:${chosen.id}:absent`) % 5 === 0;
    let meanings = [...word.options];
    if (absent) {
      const extra = vocab.find(
        (other) =>
          other.word.toLowerCase() !== word.word.toLowerCase() && !meanings.includes(other.meaning),
      );
      // Only omit the answer when a fourth distinct distractor is available.
      if (extra)
        meanings = meanings.filter((meaning) => meaning !== word.meaning).concat(extra.meaning);
    }
    const choices = meanings.sort(
      (a, b) =>
        hash(`${session.seed}:${chosen.id}:${a}`) - hash(`${session.seed}:${chosen.id}:${b}`),
    );
    return {
      ...chosen,
      choices: [...choices, "この中にない"],
      correctIndex: choices.includes(word.meaning) ? choices.indexOf(word.meaning) : 4,
    };
  }
  function start(vocab, seed = String(Date.now()), now = Date.now()) {
    if (!bank(vocab).length) throw new Error("診断用の単語がありません。");
    const session = {
      version: VERSION,
      status: "in_progress",
      seed,
      startedAt: now,
      answers: [],
      current: null,
    };
    session.current = next(vocab, session);
    return session;
  }
  function advance(vocab, session, now) {
    const summary = summarize(session.answers);
    const limited = session.answers.length >= MAX_QUESTIONS;
    const current = summary.confirmed || limited ? null : next(vocab, session);
    if (summary.confirmed || limited || !current)
      return {
        ...session,
        status: "completed",
        completedAt: now,
        current: null,
        result: {
          ...summary,
          stopReason: summary.confirmed ? "confidence" : limited ? "limit" : "exhausted",
        },
      };
    return { ...session, current };
  }
  function respond(vocab, session, id, choice, now = Date.now()) {
    if (session?.status !== "in_progress" || session.current?.id !== id) return session;
    const word = vocab.find((w) => w.id === id);
    if (
      !word ||
      (choice !== null &&
        (!Number.isInteger(choice) || choice < 0 || choice >= session.current.choices.length))
    )
      return session;
    const correct =
      choice !== null &&
      (Number.isInteger(session.current.correctIndex)
        ? choice === session.current.correctIndex
        : session.current.choices[choice] === word.meaning);
    const answer = {
      id,
      band: session.current.band,
      difficulty: session.current.difficulty,
      correct,
      unknown: choice === null,
      guessing: session.current.choices.length === 5 ? 0.2 : 0.25,
      answeredAt: now,
    };
    return advance(vocab, { ...session, answers: [...session.answers, answer] }, now);
  }
  function summarize(answers) {
    const { theta, sd, level, confidence, posterior } = estimate(answers);
    return {
      theta,
      sd,
      level,
      confidence,
      posterior,
      confirmed: answers.length >= MIN_QUESTIONS && confidence >= CONFIDENCE_TARGET,
      label: LABELS[level - 1],
      correct: answers.filter((a) => a.correct).length,
      total: answers.length,
      bands: Array.from({ length: LEVELS }, (_, i) => ({
        band: i + 1,
        total: answers.filter((a) => a.band === i + 1).length,
        correct: answers.filter((a) => a.band === i + 1 && a.correct).length,
      })),
      newLimit: level <= 4 ? 3 : 5,
    };
  }
  function route(vocab, level) {
    const units = Array.from({ length: Math.ceil(vocab.length / 10) }, (_, i) => {
      const slice = vocab.slice(i * 10, (i + 1) * 10);
      const mean =
        slice.reduce((sum, w, j) => sum + band(w, i * 10 + j, vocab.length), 0) / slice.length;
      return { index: i, mean, distance: Math.abs(mean - level) };
    });
    const start =
      [...units].sort((a, b) => a.distance - b.distance || a.index - b.index)[0]?.mean || level;
    // Move from the starting difficulty toward harder material, then revisit basics.
    return units
      .sort((a, b) => (a.mean < start) - (b.mean < start) || a.mean - b.mean || a.index - b.index)
      .map((x) => x.index);
  }
  function preferences(session, recent = []) {
    const result = session?.status === "completed" ? session.result : null;
    if (!result) return { newLimit: 5, level: 5, retentionTarget: 0.9 };
    const meaningful = recent.slice(-30);
    const weight = meaningful.reduce((sum, a) => sum + (a.weight || 1), 0);
    const observed = weight
      ? meaningful.reduce((sum, a) => sum + (a.correct ? a.weight || 1 : 0), 0) / weight
      : null;
    let newLimit = Math.min(5, result.newLimit);
    if (meaningful.length >= 8) {
      if (observed < 0.6) newLimit = Math.max(2, newLimit - 2);
      else if (observed > 0.9) newLimit = Math.min(5, newLimit + 1);
    }
    return { newLimit, level: result.level, retentionTarget: 0.9, observed };
  }
  function initialStability(vocab, word, session) {
    if (session?.status !== "completed") return 1;
    const b = difficulty(
      band(
        word,
        vocab.findIndex((w) => w.id === word.id),
        vocab.length,
      ),
    );
    return clamp(0.5 + 1.5 * probability(session.result.theta, b), 0.5, 2);
  }
  function modes(session, length, recent = []) {
    const p = preferences(session, recent);
    const pattern =
      p.level <= 4 || (p.observed !== null && p.observed < 0.6)
        ? ["recall", "meaning-select", "recall", "meaning-select", "spelling"]
        : p.level >= 7
          ? ["recall", "spelling", "meaning-select", "spelling"]
          : ["recall", "meaning-select", "spelling"];
    return Array.from({ length }, (_, i) => pattern[i % pattern.length]);
  }
  function normalize(vocab, saved) {
    if (
      !saved ||
      ![1, 2, VERSION].includes(saved.version) ||
      !["in_progress", "completed"].includes(saved.status) ||
      typeof saved.seed !== "string"
    )
      return null;
    const valid = new Map(bank(vocab).map((item) => [item.id, item])),
      seen = new Set();
    const answers = (Array.isArray(saved.answers) ? saved.answers : [])
      .filter((a) => valid.has(a?.id) && !seen.has(a.id) && (seen.add(a.id), true))
      .map((a) => ({
        ...valid.get(a.id),
        correct: a.correct === true,
        unknown: a.unknown === true,
        guessing: a.guessing === 0.2 ? 0.2 : 0.25,
        answeredAt: Number(a.answeredAt) || 0,
      }));
    const session = {
      version: VERSION,
      status: "in_progress",
      seed: saved.seed,
      startedAt: Number(saved.startedAt) || Date.now(),
      answers,
      current: null,
    };
    // Keep prior completed diagnoses available without applying the new stopping criteria.
    if (
      saved.status === "completed" &&
      (saved.version !== VERSION || saved.result?.stopReason === "legacy")
    )
      return {
        ...session,
        status: "completed",
        completedAt: Number(saved.completedAt) || Date.now(),
        result: { ...summarize(answers), stopReason: "legacy" },
      };
    return advance(vocab, session, Number(saved.completedAt) || Date.now());
  }
  const api = {
    CONFIDENCE_TARGET,
    MIN_QUESTIONS,
    MAX_QUESTIONS,
    LABELS,
    bank,
    band,
    start,
    respond,
    estimate,
    summarize,
    route,
    preferences,
    initialStability,
    modes,
    normalize,
  };
  root.TangoPlacement = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(globalThis);
