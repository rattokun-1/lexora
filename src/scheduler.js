/* FSRS-6 via official ts-fsrs 5.2.3, published default weights, 90% retention.
   Defaults are not individually fitted weights. Legacy due dates are preserved. */
(function (root) {
  "use strict";

  const DAY = 86400000;
  const MIN_STABILITY = 10 / 1440;
  const MAX_STABILITY = 365;
  const TARGET = 0.9;
  const lib = typeof module !== 'undefined' && module.exports ? require('./vendor/ts-fsrs-5.2.3.js') : root.FSRS;
  const engine = lib.fsrs({request_retention:TARGET,maximum_interval:365,enable_fuzz:false});
  function selectedEngine() {
    const model = root.LexoraModel;
    const parameters = model?.parameters;
    const valid =
      model?.eligible &&
      model.kind === "logistic-calibration-v1" &&
      Number.isFinite(parameters?.intercept) &&
      Number.isFinite(parameters?.slope) &&
      parameters.slope > 0 &&
      parameters.slope <= 5 &&
      Math.abs(parameters.intercept) <= 5;
    if (!valid) return engine;

    const target = 1 / (
      1 +
      Math.exp(
        -(
          Math.log(TARGET / (1 - TARGET)) - parameters.intercept
        ) / parameters.slope,
      )
    );
    return lib.fsrs({
      request_retention: Math.max(0.7, Math.min(0.99, target)),
      maximum_interval: 365,
      enable_fuzz: false,
    });
  }
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const finite = (value, fallback = 0) =>
    Number.isFinite(Number(value)) ? Number(value) : fallback;

  function memory(record, now = Date.now()) {
    const saved = record && typeof record === "object" ? record : {};
    const lastSeen = Math.max(0, finite(saved.lastSeen));
    if (!lastSeen) return { isNew: true, retention: null, due: false, dueAt: null, stability: 1, difficulty: 5, elapsed: 0 };
    const elapsed = Math.max(0, now - lastSeen) / DAY;
    // Legacy data has intervalDays/nextReviewAt, but no stability. Preserve its scheduled date.
    const oldInterval = Math.max(MIN_STABILITY, finite(saved.intervalDays, 1));
    const stability = clamp(finite(saved.stabilityDays, oldInterval), MIN_STABILITY, MAX_STABILITY);
    const difficulty = clamp(finite(saved.difficulty, 5 + Math.min(3, finite(saved.wrong) * 0.25)), 1, 10);
    const retention = clamp(engine.forgetting_curve(elapsed, stability), 0, 1);
    const dueAt =
      saved.schedulerVersion === 2
        ? finite(saved.nextReviewAt, lastSeen + stability * DAY)
        : saved.diagnosticOnly && saved.lastResult === "forgot"
          ? finite(saved.nextReviewAt, lastSeen)
          : saved.schedulerVersion === 1
            ? lastSeen + stability * DAY
            : Math.max(
                lastSeen,
                finite(saved.nextReviewAt, lastSeen + stability * DAY),
              );
    return { isNew: false, retention, due: now >= dueAt, dueAt, stability, difficulty, elapsed };
  }

  function update(record, known, now = Date.now()) {
    const previous = record && typeof record === "object" ? record : {};
    const before = memory(previous, now);
    const card = previous.fsrsCard ? {...previous.fsrsCard, due:new Date(previous.fsrsCard.due), last_review:previous.fsrsCard.last_review ? new Date(previous.fsrsCard.last_review) : undefined} : before.isNew ? lib.createEmptyCard(new Date(now)) : {
      ...lib.createEmptyCard(new Date(now)), due:new Date(before.dueAt), stability:before.stability,
      difficulty:before.difficulty, state:lib.State.Review, reps:Math.max(1,finite(previous.reviews,1)),
      lapses:Math.max(0,finite(previous.wrong)), last_review:new Date(previous.lastSeen)
    };
    const scheduled=selectedEngine().next(card,new Date(now),known?lib.Rating.Good:lib.Rating.Again);
    const next=scheduled.card;
    return {...previous,schedulerVersion:2,fsrsVersion:'FSRS-6 / ts-fsrs 5.2.3',fsrsCard:next,
      reviewLog:[...(Array.isArray(previous.reviewLog)?previous.reviewLog:[]),{...scheduled.log,review:new Date(now).toISOString()}],
      stabilityDays:next.stability,difficulty:next.difficulty,intervalDays:(next.due.getTime()-now)/DAY,
      nextReviewAt:next.due.getTime(),lastSeen:now,lastResult:known?'remembered':'forgot',
      correct:Math.max(0,finite(previous.correct))+(known?1:0),wrong:Math.max(0,finite(previous.wrong))+(known?0:1),
      reviews:Math.max(0,finite(previous.reviews))+1,
      mastery:clamp(finite(previous.mastery)+(known?16:-12),0,100)};
  }

  function plan(vocab, records = {}, { now = Date.now(), limit = 10, reviewOnly = false, difficult = [], saved = [], newLimit = limit } = {}) {
    const difficultSet = new Set(difficult), savedSet = new Set(saved);
    const seen = new Set();
    const entries = vocab.filter(word => { if (seen.has(word.id)) return false; seen.add(word.id); return true; }).map((word, index) => {
      const record = records[word.id]; const m = memory(record, now);
      // Forgetting risk dominates; user-selected words only break close priorities.
      const priority = m.isNew ? 0 : (1 - m.retention) * 1000 + (record?.lastResult === "forgot" ? 35 : 0) + (difficultSet.has(word.id) ? 8 : 0) + (savedSet.has(word.id) ? 2 : 0);
      const reason = m.isNew ? "はじめて学ぶ単語" : record?.diagnosticOnly && record.lastResult === 'forgot' ? "診断で確認が必要だった単語" : record?.lastResult === "forgot" && m.due ? "前回間違えた単語を再確認" : m.due ? "記憶が薄れる頃の復習" : "次の復習まで待機中";
      return { word, index, ...m, priority, reason };
    });
    const order = (a, b) => b.priority - a.priority || a.dueAt - b.dueAt || a.index - b.index;
    const due = entries.filter(x => x.due).sort(order);
    const fresh = entries.filter(x => x.isNew);
    const upcoming = entries.filter(x => !x.isNew && !x.due).sort((a, b) => a.dueAt - b.dueAt || a.index - b.index);
    const count = clamp(Math.floor(finite(limit, 10)), 0, 100);
    const freshCount = clamp(Math.floor(finite(newLimit,5)),0,Math.min(5,count));
    const selected = (reviewOnly ? due : [...due, ...fresh.slice(0,freshCount)]).slice(0, count);
    return { selected, due, fresh, upcoming, nextReviewAt: upcoming[0]?.dueAt ?? null };
  }

  function mode(record,now=Date.now()) {
    if(!record?.lastSeen||record.diagnosticOnly)return 'study';
    if(record.lastResult==='forgot'||!(record.selectionSuccesses>0))return 'meaning-select';
    return record.delayedRecalls>=2?'spelling':'recall';
  }
  function practice(record,known,format,now=Date.now()) {
    const previous=record||{},before=memory(previous,now);
    if(format==='study')return {...previous,lastSeen:now,diagnosticOnly:false,schedulerVersion:1,stabilityDays:10/1440,nextReviewAt:now+600000,lastResult:'studied'};
    const eligible=!known||format==='meaning-select'||before.elapsed>=1||previous.lastResult==='forgot';
    const result=eligible?update(previous,known,now):{...previous,lastResult:'remembered'};
    const delayed=!before.isNew&&before.elapsed>=1;
    result.selectionSuccesses=known?Math.max(0,finite(previous.selectionSuccesses))+(format==='meaning-select'?1:0):0;
    result.delayedRecalls=Math.max(0,finite(previous.delayedRecalls))+(known&&delayed&&['recall','spelling'].includes(format)?1:0);
    // Recognition and same-session retries are practice, not long-term mastery.
    if(format==='meaning-select'||!delayed){
      result.mastery=known?finite(previous.mastery):result.mastery;
      // Preserve the FSRS schedule.
    }
    return {...result,diagnosticOnly:false};
  }
  const api = { DAY, TARGET, memory, update, plan, mode, practice };
  root.TangoScheduler = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(globalThis);
