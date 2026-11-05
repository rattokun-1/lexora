const test = require("node:test"),
  assert = require("node:assert/strict"),
  fs = require("node:fs"),
  vm = require("node:vm");
const choices = require("../src/choice-order.js"),
  gacha = require("../src/gacha.js"),
  progress = require("../src/progression.js");
test("pending quiz answers cannot be discarded by the skip button", () => {
  const app = fs.readFileSync("src/app.js", "utf8");
  for (const pending of ["testAnswered", "answerPending"]) {
    const context = {
      learning: { index: 0, [pending]: true },
      currentWord: () => ({}),
      toast() {
        throw Error("Skip was accepted");
      },
    };
    vm.runInNewContext(
      app.slice(app.indexOf("function learnAction("), app.indexOf("let capsuleLastResults")),
      context,
    );
    context.learnAction("skip");
    assert.equal(context.learning.index, 0);
  }
});
test("English options are cached once when a retry has an empty option array", () => {
  const app = fs.readFileSync("src/app.js", "utf8");
  let generated = 0;
  const context = {
    learning: { index: 0, englishOptions: [[]] },
    questionMode: () => "english-select",
    escapeHTML: String,
    makeEnglishOptions() {
      generated++;
      return [
        { id: "a", word: "apple" },
        { id: "b", word: "pear" },
        { id: "c", word: "grape" },
        { id: "d", word: "melon" },
      ];
    },
  };
  vm.runInNewContext(
    app.slice(app.indexOf("function renderQuickTest("), app.indexOf("function renderSwipeIntro(")),
    context,
  );
  const a = context.renderQuickTest({ meaning: "りんご" }),
    b = context.renderQuickTest({ meaning: "りんご" });
  assert.equal(generated, 1);
  assert.equal(a, b);
  assert.equal((a.match(/data-test-answer=/g) || []).length, 4);
});
test("shuffle distributes correct positions without mutating the source", () => {
  let seed = 143;
  const rng = () => (seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296;
  const counts = [0, 0, 0, 0],
    source = ["correct", "b", "c", "d"];
  for (let i = 0; i < 12000; i++) {
    const result = choices.shuffle(source, rng);
    assert.equal(new Set(result).size, 4);
    counts[result.indexOf("correct")]++;
  }
  assert.deepEqual(source, ["correct", "b", "c", "d"]);
  counts.forEach((n) => assert(n > 2700 && n < 3300, counts.join(",")));
});
test("English choice grading compares word ids, while meaning choice compares meanings", () => {
  const app = fs.readFileSync("src/app.js", "utf8"),
    word = { id: "a", word: "apple", meaning: "りんご", options: ["別", "りんご", "他", "違う"] };
  for (const [mode, choice, expected] of [
    ["english-select", 1, true],
    ["english-select", 0, false],
    ["meaning-select", 1, true],
    ["meaning-select", 0, false],
  ]) {
    let scored;
    const context = {
      learning: {
        testAnswered: false,
        index: 0,
        englishOptions: [[{ id: "b" }, { id: "a" }, { id: "c" }, { id: "d" }]],
      },
      currentWord: () => word,
      questionMode: () => mode,
      document: { querySelectorAll: () => [], querySelector: () => null },
      schedulePracticeAnswer: (v) => (scored = v),
    };
    vm.runInNewContext(
      app.slice(app.indexOf("function testAnswer("), app.indexOf("function checkSpelling(")),
      context,
    );
    context.testAnswer(choice);
    context.testAnswer(choice);
    assert.equal(scored, expected);
  }
});
test("feed scroll advances once and never calls any scoring API", () => {
  let frames = [],
    listeners = {},
    nextCalls = 0;
  const host = {
    scrollTop: 0,
    clientHeight: 100,
    querySelector: (s) => ({ offsetTop: s === "[data-feed-current]" ? 100 : 200 }),
    addEventListener: (name, fn) => (listeners[name] = fn),
    removeEventListener: (name) => delete listeners[name],
  };
  const context = {
    window: {},
    requestAnimationFrame: (fn) => (frames.push(fn), frames.length),
    cancelAnimationFrame() {},
    matchMedia: () => ({ matches: true }),
  };
  vm.runInNewContext(fs.readFileSync("src/study-feed.js", "utf8"), context);
  context.window.KotomiaFeed.mount(host, () => nextCalls++);
  assert.equal(host.scrollTop, 100);
  frames.shift()();
  host.scrollTop = 200;
  listeners.scroll();
  frames.shift()();
  listeners.scroll();
  frames.shift()();
  assert.equal(nextCalls, 1);
  context.window.KotomiaFeed.dispose();
  assert.equal(Object.keys(listeners).length, 0);
});
test("stage progress survives old completion arrays and only the frontier opens", () => {
  const words = Array.from({ length: 30 }, (_, i) => ({ id: String(i) })),
    order = [1, 0, 2],
    saved = { 1: words.slice(10, 20).map((w) => w.id) };
  const complete = progress.clear(words, saved, [], order);
  assert.deepEqual(complete, [1]);
  assert(progress.unlocked(0, complete, 3, order));
  assert(!progress.unlocked(2, complete, 3, order));
  assert.equal(progress.progress(words, saved)[1].length, 10);
});
test("atelier uses cosmetic rewards, preserves old history, and honors tenth-draw guarantee", () => {
  assert.equal(
    gacha.rewards.reduce((n, r) => n + r.weight, 0),
    100,
  );
  assert(gacha.rewards.every((r) => r.kind === "badge"));
  const original = {
    coin: 500,
    hp: 30,
    items: { hpStock: 2, streakKeep: 1 },
    ownedBadges: ["focus"],
    gacha: { total: 9, cycle: 9, history: [{ id: "hp5", at: 1, number: 1 }] },
  };
  const result = gacha.draw(original, 1, () => 0, 2);
  assert(result.ok);
  assert(result.results[0].guaranteed);
  assert.notEqual(result.results[0].id, "focus");
  assert(result.gacha.history.some((r) => r.id === "hp5"));
  assert.equal(original.coin, 500);
  assert.equal(result.coin, 400);
  assert.equal(gacha.draw({ ...original, coin: 99 }, 1).ok, false);
});
test("production build excludes 3D engine and includes leaderboard setup", () => {
  require("node:child_process").execFileSync(process.execPath, ["scripts/build.cjs"]);
  assert(!fs.existsSync("dist/src/world-map.bundle.js"));
  assert(!fs.existsSync("dist/src/vendor/three.module.js"));
  assert(fs.existsSync("dist/setup/202611040001_leaderboard.sql"));
  const index = fs.readFileSync("dist/index.html", "utf8");
  assert(!/world-loader|adventure-data/.test(index));
});
