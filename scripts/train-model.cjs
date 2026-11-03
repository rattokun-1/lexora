/* Usage: node scripts/train-model.cjs PRIVATE_EXPORT.json candidate.json
   Export is private; only the aggregate candidate is eligible for publication. */
const fs = require("node:fs"),
  crypto = require("node:crypto");
const clamp = (p) => Math.max(0.00001, Math.min(0.99999, p));
const predict = (p, a, b) => 1 / (1 + Math.exp(-a - b * Math.log(clamp(p) / (1 - clamp(p)))));
function metrics(rows, a = 0, b = 1) {
  return {
    count: rows.length,
    logLoss:
      rows.reduce((s, r) => {
        const p = clamp(predict(r.prediction, a, b));
        return s - (r.correct ? Math.log(p) : Math.log(1 - p));
      }, 0) / rows.length,
    brier:
      rows.reduce((s, r) => s + (predict(r.prediction, a, b) - Number(r.correct)) ** 2, 0) /
      rows.length,
  };
}
function train(input) {
  const rows = input.filter(
    (r) =>
      r.elapsed_days >= 1 &&
      ["recall", "spelling"].includes(r.format) &&
      typeof r.correct === "boolean" &&
      Number.isFinite(r.prediction) &&
      r.prediction > 0 &&
      r.prediction < 1 &&
      typeof r.subject_id === "string",
  );
  const bucket = (id) => crypto.createHash("sha256").update(id).digest()[0] % 5;
  const training = rows.filter((r) => bucket(r.subject_id) !== 0),
    validation = rows.filter((r) => bucket(r.subject_id) === 0);
  if (
    training.length < 500 ||
    validation.length < 100 ||
    new Set(rows.map((r) => r.subject_id)).size < 20
  )
    throw Error("Need >=500 training reviews, >=100 held-out reviews and >=20 learners");
  let a = 0,
    b = 1;
  for (let epoch = 0; epoch < 1000; epoch++) {
    let da = 0,
      db = 0;
    for (const r of training) {
      const x = Math.log(clamp(r.prediction) / (1 - clamp(r.prediction))),
        e = predict(r.prediction, a, b) - Number(r.correct);
      da += e;
      db += e * x;
    }
    a = Math.max(-5, Math.min(5, a - 0.03 * (da / training.length + 0.01 * a)));
    b = Math.max(0.05, Math.min(5, b - 0.03 * (db / training.length + 0.01 * (b - 1))));
  }
  const baseline = metrics(validation),
    candidate = metrics(validation, a, b);
  return {
    kind: "logistic-calibration-v1",
    version: "lexora-" + new Date().toISOString().replace(/[:.]/g, "-"),
    parameters: { intercept: a, slope: b },
    trainedAt: new Date().toISOString(),
    trainingCount: training.length,
    validation: candidate,
    baseline,
    eligible: candidate.logLoss < baseline.logLoss * 0.99 && candidate.brier <= baseline.brier,
    split: "held-out learners; delayed recall/spelling only",
  };
}
if (require.main === module) {
  const [input, output] = process.argv.slice(2);
  if (!input || !output) throw Error("Specify private export and candidate paths");
  const result = train(JSON.parse(fs.readFileSync(input, "utf8")));
  fs.writeFileSync(output, JSON.stringify(result, null, 2));
  console.log({
    eligible: result.eligible,
    validation: result.validation,
    baseline: result.baseline,
  });
}
module.exports = { train, metrics, predict };
