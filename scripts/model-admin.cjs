/* Server/operator only. SUPABASE_SERVICE_ROLE_KEY must never reach the browser. */
const fs = require("node:fs");
const url = process.env.SUPABASE_URL,
  key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key)
  throw Error("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY on the operator machine");
async function call(path, body, method = "POST") {
  const r = await fetch(url + "/rest/v1/" + path, {
    method,
    headers: {
      apikey: key,
      Authorization: "Bearer " + key,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw Error("Database request failed: " + r.status);
  return r.json();
}
(async () => {
  const [command, file] = process.argv.slice(2);
  if (command === "export") {
    let rows = [],
      offset = 0;
    while (true) {
      const batch = await call("rpc/lexora_export_reviews", {
        page_offset: offset,
      });
      rows.push(...batch);
      if (batch.length < 1000) break;
      offset += 1000;
    }
    fs.writeFileSync(file, JSON.stringify(rows));
    console.log("Private reviews exported:", rows.length);
  } else if (command === "activate") {
    const artifact = JSON.parse(fs.readFileSync(file, "utf8"));
    if (!artifact.eligible) throw Error("Candidate did not pass evaluation");
    await call("rpc/lexora_activate_model", { candidate: artifact });
    console.log("Active model:", artifact.version);
  } else if (command === "rollback") {
    await call("rpc/lexora_reset_model", {});
    console.log("Restored FSRS defaults");
  } else throw Error("Use export FILE, activate FILE, or rollback");
})().catch((e) => {
  console.error(e.message);
  process.exitCode = 1;
});
