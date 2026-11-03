const test = require("node:test"),
  assert = require("node:assert/strict"),
  fs = require("node:fs"),
  vm = require("node:vm"),
  path = require("node:path");
test("3D engine waits for visibility and is loaded once", () => {
  const callbacks = [];
  let loads = 0;
  const code = fs
    .readFileSync(path.join(__dirname, "../src/world-loader.js"), "utf8")
    .replace(/import\([^)]*world-map\.bundle\.js[^)]*\)/, "loadModule()");
  const ctx = {
    window: {},
    document: { querySelector: () => ({}) },
    IntersectionObserver: class {
      constructor(fn) {
        callbacks.push(fn);
      }
      observe() {}
      disconnect() {}
    },
    loadModule: () => {
      loads++;
      return Promise.resolve();
    },
  };
  vm.createContext(ctx);
  vm.runInContext(code, ctx);
  assert.equal(loads, 0);
  callbacks[0]([{ isIntersecting: false }]);
  assert.equal(loads, 0);
  callbacks[0]([{ isIntersecting: true }]);
  assert.equal(loads, 1);
  ctx.window.TangoWorld.mount();
  callbacks.at(-1)([{ isIntersecting: true }]);
  assert.equal(loads, 1);
});
