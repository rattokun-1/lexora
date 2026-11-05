const test = require("node:test"),
  assert = require("node:assert/strict"),
  fs = require("node:fs"),
  vm = require("node:vm");
const app = fs.readFileSync("src/app.js", "utf8");
function scoring() {
  let rewards = 0,
    updates = 0,
    finished = 0;
  const ctx = {
    learning: { index: 0, words: [{ id: "a" }, { id: "b" }], auto: false },
    state: { daily: { words: 0 } },
    currentWord: () => ctx.learning.words[ctx.learning.index],
    queuePractice() {},
    updateWordData() {
      updates++;
    },
    addRewards() {
      rewards++;
    },
    persist() {},
    renderLearning() {},
    finishLearning() {
      finished++;
    },
    setTimeout() {
      throw Error("Answers must not schedule automatic page changes");
    },
  };
  vm.runInNewContext(
    app.slice(app.indexOf("function applyAnswer("), app.indexOf("function testAnswer(")),
    ctx,
  );
  return { ctx, stats: () => ({ rewards, updates, finished }) };
}
test("answer commits once and stays on the same question until explicit navigation", () => {
  const h = scoring();
  h.ctx.schedulePracticeAnswer(true, 1600);
  assert.equal(h.ctx.learning.index, 0);
  assert.equal(h.ctx.state.daily.words, 1);
  h.ctx.applyAnswer(false);
  assert.deepEqual(h.stats(), { rewards: 1, updates: 1, finished: 0 });
  h.ctx.nextLearningQuestion();
  assert.equal(h.ctx.learning.index, 1);
  assert.equal(h.ctx.learning.testAnswered, false);
  assert.equal(h.ctx.learning.responses[0].known, true);
  h.ctx.applyAnswer(false);
  assert.equal(h.ctx.state.daily.words, 2);
  assert.equal(h.ctx.learning.index, 1);
  h.ctx.nextLearningQuestion();
  assert.equal(h.stats().finished, 1);
});
test("unanswered scrolling changes the question without awarding a grade or rewards", () => {
  const h = scoring();
  h.ctx.nextLearningQuestion();
  assert.equal(h.ctx.learning.index, 1);
  assert.equal(h.ctx.state.daily.words, 0);
  assert.deepEqual(h.stats(), { rewards: 0, updates: 0, finished: 0 });
});
test("next page previews the actual question and cannot submit an answer", () => {
  const ctx = {
    learning: {
      index: 0,
      words: [
        { id: "a", word: "alpha", options: ["one", "two"] },
        { id: "b", word: "beta", meaning: "two", options: ["one", "two"] },
      ],
      questionModes: ["meaning-select", "meaning-select"],
    },
    state: { savedWords: [], difficultWords: [] },
    escapeHTML: String,
    icons: { volume: "", bookmark: "", flag: "", check: "" },
  };
  vm.runInNewContext(
    app.slice(
      app.indexOf("function renderShortQuestion("),
      app.indexOf("function renderQuickTest("),
    ),
    ctx,
  );
  const html = ctx.renderShortQuestion(1, true);
  assert(html.includes("beta"));
  assert(html.includes("two"));
  assert(html.includes('inert aria-hidden="true"'));
  assert(!html.includes("data-test-answer="));
  assert(!html.includes("data-learn-action="));
  assert(!html.includes(" id="));
});
