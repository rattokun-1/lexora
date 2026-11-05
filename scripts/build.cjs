const fs = require("node:fs"),
  path = require("node:path");
const output = path.resolve("dist");
if (path.dirname(output) !== process.cwd()) throw Error("Unexpected build directory");
fs.rmSync(output, { recursive: true, force: true });
fs.mkdirSync("dist", { recursive: true });
for (const p of ["index.html", "new-word-data.js", "sw.js", "privacy.html", ".htaccess", "src"])
  fs.cpSync(p, "dist/" + p, {
    recursive: true,
    filter: (source) =>
      !/(?:world-map(?:\.bundle)?\.js(?:\.LEGAL\.txt)?|world-loader\.js|world-data\.js|adventure-data\.js|three\.module\.js|three\.LICENSE)$/.test(
        source,
      ),
  });
fs.mkdirSync("dist/setup", { recursive: true });
fs.copyFileSync(
  "supabase/migrations/202611040001_leaderboard.sql",
  "dist/setup/202611040001_leaderboard.sql",
);
fs.copyFileSync("docs/v1.4.3.md", "dist/setup/README.md");
console.log("Static release created in dist/");
