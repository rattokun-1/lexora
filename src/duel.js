(function (root) {
  "use strict";
  let view = { state: "idle" },
    poll = null,
    clock = null,
    busy = false,
    error = "",
    mounted = false,
    received = 0,
    feedback = "";
  const escape = (s) =>
    String(s ?? "").replace(
      /[&<>"']/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[c],
    );
  function seconds() {
    return Math.max(
      0,
      Math.ceil(
        (Date.parse(view.state === "countdown" ? view.startsAt : view.endsAt) -
          Date.parse(view.serverNow) -
          (performance.now() - received)) /
          1000,
      ),
    );
  }
  function syncChrome() {
    document.body.classList.toggle(
      "duel-active",
      mounted && ["countdown", "playing"].includes(view.state),
    );
  }
  async function request(action, choice = null) {
    if (busy) return;
    busy = true;
    const before = JSON.stringify(view);
    const hadError = error;
    error = "";
    if (action !== "status") paint();
    try {
      const c = await root.TangoCloud.init();
      if (!c) throw Error("接続設定が必要です");
      const old = view;
      const { data, error: e } = await c.rpc("lexora_duel", {
        action,
        choice,
        expected: view.index ?? null,
      });
      if (e) {
        if (e.code === "42501" || e.code === "PGRST301")
          throw Error("対戦するにはプロフィールからログインしてください。");
        throw e;
      }
      view = data;
      received = performance.now();
      if (action === "answer" && view.index > old.index)
        feedback = view.score > old.score ? "正解！" : "次の問題へ";
      else if (view.matchId !== old.matchId) feedback = "";
    } catch (e) {
      error = e.message || "接続できませんでした";
    } finally {
      busy = false;
      if (
        mounted &&
        (action !== "status" ||
          hadError ||
          error ||
          before !==
            JSON.stringify({
              ...view,
              serverNow: JSON.parse(before).serverNow,
            }))
      )
        paint();
      if (!mounted && view.state === "waiting" && action !== "cancel") request("cancel");
    }
  }
  function render() {
    return '<main class="screen duel-screen"><header class="duel-heading"><span class="duel-label">60秒・ランダム対戦</span><h1>ワードスプリント</h1><p>ひとつでも多く、正解しよう。</p></header><div id="duel-content" aria-busy="true"></div></main>';
  }
  function paint() {
    const el = document.getElementById("duel-content");
    if (!el) return;
    const active = document.activeElement;
    let focusSelector = "";
    if (active && el.contains(active)) {
      if (active.dataset.duelChoice !== undefined)
        focusSelector = `[data-duel-choice="${active.dataset.duelChoice}"]`;
      else if (active.dataset.duel) focusSelector = `[data-duel="${active.dataset.duel}"]`;
    }
    syncChrome();
    const q = view.question,
      finished = view.state === "finished",
      playing = view.state === "playing",
      matching = ["idle", "waiting"].includes(view.state),
      score = Number(view.score) || 0,
      other = Number(view.opponentScore) || 0,
      loggedIn = root.KotomiaUI?.isLoggedIn?.() ?? true,
      selfAvatar =
        root.KotomiaUI?.avatar?.() || '<span class="runner-mark" aria-hidden="true">✦</span>';
    el.setAttribute("aria-busy", String(busy));
    const button = (action, text, cls = "primary-btn") =>
      `<button class="${cls}" data-duel="${action}" ${busy ? "disabled" : ""}>${text}</button>`;
    el.innerHTML = `${error ? `<p class="duel-error" role="alert">${escape(error)}</p>` : ""}${matching ? `<section class="match-arena"><div class="match-players"><article class="match-player self">${selfAvatar}<strong>あなた</strong><small>準備OK</small></article><span class="match-vs">VS</span><article class="match-player rival ${view.state === "waiting" ? "searching" : ""}"><span class="runner-mark" aria-hidden="true">?</span><strong>${view.state === "waiting" ? "相手を探しています" : "対戦相手"}</strong><small>${view.state === "waiting" ? "近いレベルからマッチング" : "ランダムマッチ"}</small></article></div><div class="match-status" role="status">${view.state === "waiting" ? '<span class="search-orbit" aria-hidden="true"></span>マッチング中…' : "60秒で、正解数を競います"}</div>${view.state === "waiting" ? button("cancel", "キャンセル", "outline-btn") : button("join", "対戦相手を探す")}${!loggedIn && view.state === "idle" ? '<button class="duel-login-link" data-action="login">ログインして対戦する</button>' : ""}<p class="duel-fine">対戦の回答は、通常の習得判定には影響しません。</p></section>` : `<section class="sprint-arena"><div class="sprint-scoreboard"><div class="sprint-player self"><small>あなた</small><strong>${score}</strong></div><div class="sprint-timer"><span id="duel-clock" role="timer" aria-label="残り時間">${seconds()}</span><small>${view.state === "countdown" ? "開始まで" : "秒"}</small></div><div class="sprint-player rival"><small>相手</small><strong>${other}</strong></div></div><div class="sprint-balance" aria-label="あなた ${score}点、相手 ${other}点"><i style="width:${((score + 1) / (score + other + 2)) * 100}%"></i></div>${finished ? `<div class="sprint-result"><span class="result-medal" aria-hidden="true">✦</span><h2>${score === other ? "引き分け" : score > other ? "あなたの勝利！" : "ナイスチャレンジ！"}</h2><p>正解 <strong>${score}</strong> 問 / 回答 ${Number(view.index) || 0} 問</p><p>正答率 ${view.index ? Math.round((score / view.index) * 100) : 0}%</p>${button("join", "もう一度対戦する")}<button class="outline-btn" data-start="daily">学習を続ける</button></div>` : view.state === "countdown" ? '<div class="sprint-countdown"><span>準備はいい？</span><strong id="duel-countdown" aria-live="polite">' + seconds() + "</strong></div>" : q ? `<div class="sprint-question"><p class="sprint-feedback" role="status">${escape(feedback) || "意味を選んでください"}</p><h2>${escape(q.word)}</h2><div class="duel-options">${q.options.map((o, i) => `<button class="sprint-answer" data-duel-choice="${i}" ${busy ? "disabled" : ""}><span aria-hidden="true">${String.fromCharCode(65 + i)}</span>${escape(o)}</button>`).join("")}</div></div>` : '<p role="status">結果を確認しています…</p>'}</section>`}`;
    if (focusSelector) el.querySelector(focusSelector)?.focus({ preventScroll: true });
    if (playing) el.querySelector(".sprint-timer")?.classList.toggle("urgent", seconds() <= 10);
  }
  function tick() {
    if (!mounted || !["countdown", "playing"].includes(view.state)) return;
    const n = seconds();
    const el = document.getElementById("duel-clock");
    if (el) el.textContent = n;
    const count = document.getElementById("duel-countdown");
    if (count) count.textContent = n;
    document
      .querySelector(".sprint-timer")
      ?.classList.toggle("urgent", view.state === "playing" && n <= 10);
    if (n === 0 && !busy) request("status");
  }
  function mount() {
    if (mounted) {
      paint();
      return;
    }
    mounted = true;
    paint();
    request("status");
    poll = setInterval(() => {
      if (mounted && ["waiting", "playing", "countdown"].includes(view.state) && !document.hidden)
        request("status");
    }, 1500);
    clock = setInterval(tick, 200);
  }
  function unmount() {
    const cancel = mounted && view.state === "waiting";
    mounted = false;
    clearInterval(poll);
    clearInterval(clock);
    syncChrome();
    if (cancel) request("cancel");
  }
  document.addEventListener("click", (e) => {
    const b = e.target.closest("[data-duel],[data-duel-choice]");
    if (!b || busy || !mounted) return;
    if (b.dataset.duelChoice !== undefined) {
      if (view.state !== "playing" || seconds() <= 0) return;
      request("answer", Number(b.dataset.duelChoice));
    } else request(b.dataset.duel);
  });
  root.LexoraDuel = { render, mount, unmount };
})(window);
