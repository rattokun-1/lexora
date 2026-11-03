const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const scheduler = require("../src/scheduler.js");
const app = fs.readFileSync(require("node:path").join(__dirname, "../src/app.js"), "utf8");
const now = 1800000000000;

test("FSRS uses official defaults and survives persisted dates", () => {
  const f = require("../src/vendor/ts-fsrs-5.2.3.js");
  const expected = f
    .fsrs({ request_retention: 0.9, maximum_interval: 365, enable_fuzz: false })
    .next(f.createEmptyCard(new Date(now)), new Date(now), f.Rating.Good).card;
  const actual = scheduler.update(null, true, now);
  assert.equal(actual.stabilityDays, expected.stability);
  assert.equal(actual.nextReviewAt, expected.due.getTime());
  const restored = JSON.parse(JSON.stringify(actual));
  const next = scheduler.update(restored, false, now + scheduler.DAY);
  assert.equal(next.reviewLog.length, 2);
  assert(Number.isFinite(next.nextReviewAt));
  assert.equal(scheduler.memory(restored, now).dueAt, actual.nextReviewAt);
});

test("new words never exceed five even with larger caller limits", () => {
  const words = Array.from({ length: 30 }, (_, i) => ({ id: String(i) }));
  assert.equal(scheduler.plan(words, {}, { limit: 30, newLimit: 30, now }).selected.length, 5);
});

test("legacy due dates remain unchanged before the next answer", () => {
  const legacy = {
    lastSeen: now - scheduler.DAY,
    stabilityDays: 3,
    schedulerVersion: 1,
  };
  assert.equal(scheduler.memory(legacy, now).dueAt, legacy.lastSeen + 3 * scheduler.DAY);
  assert.equal(scheduler.update(legacy, true, now).schedulerVersion, 2);
});
test("viewing, recognition and same-day recall do not establish mastery", () => {
  const studied = scheduler.practice(null, false, "study", now);
  assert.equal(scheduler.mode(null), "study");
  assert.equal(studied.correct, undefined);
  assert.equal(studied.mastery, undefined);
  assert.equal(scheduler.mode(studied), "meaning-select");
  const selected = scheduler.practice(studied, true, "meaning-select", now + 1000);
  assert.equal(selected.mastery, 0);
  assert.equal(scheduler.mode(selected), "recall");
  const immediate = scheduler.practice(selected, true, "recall", now + 2000);
  assert.equal(immediate.delayedRecalls, 0);
  assert.equal(immediate.stabilityDays, selected.stabilityDays);
  const delayed = scheduler.practice(immediate, true, "recall", now + scheduler.DAY + 2000);
  assert.equal(delayed.delayedRecalls, 1);
  const again = scheduler.practice(delayed, true, "recall", now + 2 * scheduler.DAY + 2000);
  assert.equal(scheduler.mode(again), "spelling");
  const missed = scheduler.practice(again, false, "spelling", now + 3 * scheduler.DAY);
  assert.equal(scheduler.mode(missed), "meaning-select");
});
test("due reviews take priority and new items respect their limit", () => {
  const words = Array.from({ length: 20 }, (_, i) => ({ id: String(i) }));
  const records = Object.fromEntries(
    words.slice(0, 10).map((w) => [
      w.id,
      {
        lastSeen: now - 2 * scheduler.DAY,
        stabilityDays: 1,
        schedulerVersion: 1,
      },
    ]),
  );
  const full = scheduler.plan(words, records, { now, newLimit: 5 });
  assert.equal(full.selected.length, 10);
  assert(full.selected.every((x) => !x.isNew));
  const fresh = scheduler.plan(words.slice(10), {}, { now, newLimit: 3 });
  assert.equal(fresh.selected.length, 3);
});
function context() {
  const word = {
    id: "one",
    word: "word",
    meaning: "意味",
    kana: "/word/",
    options: ["意味", "別", "他", "違う"],
  };
  const ctx = {
    learning: {
      index: 0,
      words: [word, ...Array.from({ length: 6 }, (_, i) => ({ ...word, id: String(i) }))],
      questionModes: Array(7).fill("recall"),
      englishOptions: Array(7).fill([]),
      retryIds: [],
    },
    state: { words: {} },
    TangoScheduler: scheduler,
    questionMode: () => ctx.format || "recall",
    currentWord: () => word,
    persist: () => {},
    renderLearning: () => {},
    escapeHTML: String,
    makeEnglishOptions: () => [],
  };
  vm.createContext(ctx);
  vm.runInContext(
    app.slice(app.indexOf("function queuePractice("), app.indexOf("function applyAnswer(")),
    ctx,
  );
  vm.runInContext(
    app.slice(app.indexOf("function renderQuickTest("), app.indexOf("function renderSwipeIntro(")),
    ctx,
  );
  return { ctx, word };
}
test("mistake retry leaves three intervening questions and occurs once", () => {
  const { ctx, word } = context();
  ctx.queuePractice(word);
  assert.equal(ctx.learning.words[4].id, word.id);
  assert.equal(ctx.learning.questionModes[4], "meaning-select");
  ctx.queuePractice(word);
  assert.equal(ctx.learning.words.length, 8);
  ctx.learning.index = 6;
  ctx.queuePractice({ ...word, id: "late" });
  assert.equal(ctx.learning.words.length, 8);
});
test("study screen queues a check without awarding a correct answer", () => {
  const { ctx, word } = context();
  ctx.format = "study";
  const html = ctx.renderQuickTest(word);
  assert(html.includes("study-next"));
  assert(html.includes("発音を聞く"));
  ctx.finishStudy();
  assert.equal(ctx.state.words.one.correct, undefined);
  assert.equal(ctx.learning.questionModes.at(-1), "meaning-select");
  assert.equal(ctx.learning.index, 1);
  ctx.format = "meaning-select";
  const selection = ctx.renderQuickTest(word);
  assert(selection.includes("この単語に合う意味は"));
  assert(selection.includes("わからない"));
  assert(!selection.includes("この中にない"));
});
