/* A strict allowlist separates model data from account/profile state. */
(function (root) {
  "use strict";

  const MODEL = "fsrs6-default-v1";
  const MAX_PENDING = 500;
  const EVENT_FORMATS = new Set(["meaning-select", "recall", "spelling"]);

  function event(word, record, known, format, now = Date.now(), durationMs = null) {
    if (!EVENT_FORMATS.has(format)) return null;
    const memory = root.TangoScheduler.memory(record, now);
    return {
      event_id: crypto.randomUUID(),
      word_id: String(word.id),
      format,
      correct: Boolean(known),
      elapsed_days: Math.min(3650, Math.max(0, memory.elapsed)),
      prediction: memory.retention,
      response_ms: Number.isFinite(durationMs)
        ? Math.min(600000, Math.max(0, Math.round(durationMs)))
        : null,
      model_version: root.LexoraModel?.version || MODEL,
      occurred_at: new Date(now).toISOString(),
    };
  }

  function probability(retention, artifact) {
    if (!artifact || artifact.kind !== "logistic-calibration-v1") return retention;

    const { intercept, slope } = artifact.parameters || {};
    if (
      !Number.isFinite(intercept) ||
      !Number.isFinite(slope) ||
      slope <= 0 ||
      Math.abs(intercept) > 5 ||
      slope > 5
    ) {
      return retention;
    }

    const probabilityValue = Math.max(0.00001, Math.min(0.99999, retention));
    const odds = Math.log(probabilityValue / (1 - probabilityValue));
    return 1 / (1 + Math.exp(-(intercept + slope * odds)));
  }

  const api = { event, probability, MODEL, MAX_PENDING };
  root.LexoraLearning = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(globalThis);
