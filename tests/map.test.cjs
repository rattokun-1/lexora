const test = require("node:test"),
  assert = require("node:assert/strict"),
  fs = require("node:fs"),
  vm = require("node:vm"),
  path = require("node:path");
const data = require("../src/world-data.js");
const route = Array.from({ length: 250 }, (_, i) => 249 - i);
test("one world contains all lessons, five counties, twenty-five towns and twelve landscapes", () => {
  const world = data.build(route, [], 249, []);
  assert.equal(world.nodes.length, 250);
  assert.equal(world.cities.length, 25);
  assert.equal(new Set(world.cities.map((c) => c.region)).size, 5);
  assert.equal(new Set(world.cities.map((c) => c.theme)).size, 12);
  assert.equal(new Set(world.nodes.map((n) => n.index)).size, 250);
  assert.equal(world.presents.length, 50);
  assert.equal(world.nodes.filter((n) => n.open).length, 1);
  assert(world.nodes[0].active);
  for (const c of world.cities) {
    assert(c.name.endsWith("市"));
    assert(c.region.endsWith("県"));
  }
});
test("gift zones require the preceding route, never just a count of unrelated lessons", () => {
  const done = route.slice(0, 5),
    gift = "world-gift-5";
  assert.equal(data.claim(route, done, [], gift).coins, 15);
  assert.equal(data.claim(route, done, [gift], gift), null);
  assert.equal(data.claim(route, route.slice(5, 10), [], gift), null);
  assert.equal(data.claim(route, done, [], "world-gift-10"), null);
  assert.equal(data.claim(route, done, [], "invalid"), null);
  assert.equal(data.claim(route, route.slice(0, 10), [], "world-gift-10").coins, 30);
});
test("existing course progress and completion determine location and locks", () => {
  const done = route.slice(0, 17),
    world = data.build(route, done, route[17], []);
  assert.equal(world.currentCity, 1);
  assert.equal(world.nodes.filter((n) => n.active).length, 1);
  assert.equal(world.nodes.filter((n) => n.open).length, 18);
  assert.equal(world.presents.filter((g) => g.ready).length, 3);
  assert.equal(data.build(route, route, 250, []).currentCity, 24);
});
test("partial town contains only real lesson ids and earned gifts", () => {
  const world = data.build(route.slice(0, 23), route.slice(0, 23), null, []);
  assert.equal(world.cities.length, 3);
  assert.equal(world.nodes.length, 23);
  assert.equal(world.presents.length, 4);
  assert(world.presents.every((g) => g.ready));
});
test("claiming a present changes coins and persists only once", () => {
  const app = fs.readFileSync(path.join(__dirname, "../src/app.js"), "utf8");
  const snippet = app.slice(
    app.indexOf("function claimWorldGift("),
    app.indexOf("function renderProfileEditor("),
  );
  let saves = 0,
    renders = 0;
  const ctx = {
    TangoWorldData: data,
    courseRoute: () => route,
    state: { completedLessons: route.slice(0, 5), worldGifts: [], coin: 5 },
    persist: () => saves++,
    renderApp: () => renders++,
    toast: () => {},
  };
  vm.createContext(ctx);
  vm.runInContext(snippet, ctx);
  ctx.claimWorldGift("world-gift-5");
  ctx.claimWorldGift("world-gift-5");
  assert.equal(ctx.state.coin, 20);
  assert.equal(ctx.state.worldGifts.length, 1);
  assert.equal(saves, 1);
  assert.equal(renders, 1);
});
