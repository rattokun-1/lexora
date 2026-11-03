const test = require("node:test"),
  assert = require("node:assert/strict"),
  fs = require("node:fs"),
  vm = require("node:vm");
const app = fs.readFileSync("src/app.js", "utf8");
test("cloud payload excludes navigation, social data and auth claims", () => {
  const ctx = {
    state: {
      words: { a: { correct: 1 } },
      adventure: { completed: 2 },
      ui: { modal: "login" },
      social: { friends: ["x"] },
      weeklyXP: 10,
      profile: { name: "A", email: "old", publicId: "123", loggedIn: true },
    },
  };
  vm.createContext(ctx);
  vm.runInContext(
    app.slice(app.indexOf("function cloudPayload()"), app.indexOf("function scheduleCloudSync()")),
    ctx,
  );
  const payload = ctx.cloudPayload();
  assert(!payload.ui && !payload.social && !payload.weeklyXP);
  assert.equal(payload.profile.loggedIn, false);
  assert(!payload.profile.email && !payload.profile.publicId);
  assert.equal(payload.words.a.correct, 1);
});
test("unconfigured cloud does not import remote SDK and gives actionable authentication error", async () => {
  const ctx = { window: {}, setTimeout };
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync("src/cloud.js", "utf8"), ctx);
  const cloud = ctx.window.TangoCloud;
  assert.equal(await cloud.init(), null);
  assert.equal(cloud.configured(), false);
  await assert.rejects(cloud.signIn(), /Supabase/);
});
test("navigation has study shortcut and no gacha or social route", () => {
  const ctx = { icons: { home: "h", map: "m", learn: "l" }, state: { ui: {} } };
  vm.createContext(ctx);
  vm.runInContext(
    app.slice(app.indexOf("function navHtml("), app.indexOf("function statusBarHtml(")),
    ctx,
  );
  const nav = ctx.navHtml("path");
  assert(nav.includes('data-start="daily"'));
  assert(!nav.includes("ガチャ") && !nav.includes("フレンド"));
});
test("shrine is reachable without completing a lesson", () => {
  const A = require("../src/adventure-data.js"),
    p = A.POINTS.find((p) => p.kind === "shrine");
  const near = { x: p.x + 2, z: p.z };
  assert(A.canWalk(near.x, near.z, 0));
  assert.equal(A.nearby(near, A.normalize(null)).kind, "shrine");
});
test("recovery requests never create users and signup requires profile before sending", async () => {
  const calls = [];
  const ctx = {
    authBusy: false,
    enrollment: { mode: "recover", stage: "profile", email: "", sentAt: 0 },
    FormData: class {
      constructor(form) {
        this.form = form;
      }
      get(k) {
        return this.form[k];
      }
    },
    TangoCloud: { sendEmailCode: async (...args) => calls.push(args) },
    state: { ui: {} },
    renderApp: () => {},
    toast: () => {},
  };
  vm.createContext(ctx);
  vm.runInContext(
    app.slice(
      app.indexOf("async function enrollmentSubmit("),
      app.indexOf("function renderEnrollment("),
    ),
    ctx,
  );
  await ctx.enrollmentSubmit({ email: "a@example.com" });
  assert.deepEqual(calls[0], ["a@example.com", false]);
  assert.equal(ctx.enrollment.stage, "code");
  ctx.enrollment = { mode: "signup", stage: "profile", email: "", name: "" };
  await ctx.enrollmentSubmit({ email: "a@example.com", nickname: "" });
  assert.equal(calls.length, 1);
  await ctx.enrollmentSubmit({ email: "a@example.com", nickname: "Yuki" });
  assert.deepEqual(calls[1], ["a@example.com", true]);
});
test("failed email verification never advances to passkey registration", async () => {
  const ctx = {
    authBusy: false,
    enrollment: { mode: "recover", stage: "code", email: "a@example.com" },
    FormData: class {
      get() {
        return "bad";
      }
    },
    TangoCloud: {
      verifyEmailCode: async () => {
        throw Error("expired");
      },
    },
    acceptCloudUser: () => {
      throw Error("must not hydrate");
    },
    state: { ui: {} },
    renderApp: () => {},
    toast: () => {},
  };
  vm.createContext(ctx);
  vm.runInContext(
    app.slice(
      app.indexOf("async function enrollmentSubmit("),
      app.indexOf("function renderEnrollment("),
    ),
    ctx,
  );
  await ctx.enrollmentSubmit({});
  assert.equal(ctx.enrollment.stage, "code");
  assert.equal(ctx.authBusy, false);
});
test("existing cloud profile is restored rather than overwritten by signup draft", async () => {
  let saved;
  const ctx = {
    hydratedId: null,
    hydration: null,
    cloudUser: null,
    syncTimer: null,
    clearTimeout: () => {},
    enrollment: { mode: "signup", stage: "code", name: "Draft" },
    state: { ui: {}, profile: { name: "Local" } },
    TangoCloud: { load: async () => ({ profile: { name: "Existing" } }) },
    mergeState: (v) => v,
    writeStateCookie: () => {},
    renderApp: () => {},
    pushCloudState: async () => {
      saved = ctx.state.profile.name;
    },
    syncStatus: {},
  };
  vm.createContext(ctx);
  vm.runInContext(
    app.slice(
      app.indexOf("async function acceptCloudUser("),
      app.indexOf("async function initCloud("),
    ),
    ctx,
  );
  await ctx.acceptCloudUser({ id: "existing" });
  assert.equal(saved, "Existing");
  assert.equal(ctx.state.ui.modal, "enrollment");
});
