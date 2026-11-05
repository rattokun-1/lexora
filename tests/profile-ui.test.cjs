const test = require("node:test"),
  assert = require("node:assert/strict"),
  fs = require("node:fs"),
  vm = require("node:vm");
test("quick profile accepts a loaded photo but discards a load completed after closing", async () => {
  const app = fs.readFileSync("src/app.js", "utf8"),
    code = app.slice(
      app.indexOf("async function handleAvatarFile("),
      app.indexOf("async function handleLogout("),
    );
  for (const close of [false, true]) {
    let resolve,
      rendered = 0;
    const draft = { avatarImage: "" },
      context = {
        profileDraft: draft,
        state: { ui: { modal: "account" } },
        resizeAvatarFile: () => new Promise((r) => (resolve = r)),
        renderApp: () => rendered++,
        toast() {},
      };
    vm.runInNewContext(code, context);
    const pending = context.handleAvatarFile({});
    if (close) context.state.ui.modal = null;
    resolve("data:image/jpeg;base64,example");
    await pending;
    assert.equal(draft.avatarImage, close ? "" : "data:image/jpeg;base64,example");
    assert.equal(rendered, close ? 0 : 1);
  }
});
