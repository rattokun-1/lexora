(function (root) {
  "use strict";
  let dispose = () => {};
  function peekOffset(elapsed, height) {
    if (elapsed <= 0 || elapsed >= 1400) return 0;
    return Math.min(96, height * 0.13) * Math.sin((Math.PI * elapsed) / 1400) ** 2;
  }
  function mount(host, onNext, options = {}) {
    dispose();
    if (!host) return;
    const active = host.querySelector("[data-feed-current]");
    let ready = false,
      advanced = false,
      frame,
      introFrame,
      introRunning = false,
      introStart = null;
    host.scrollTop = active.offsetTop;
    const advance = () => {
      if (advanced) return;
      advanced = true;
      onNext();
    };
    const scroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        if (!ready || introRunning) return;
        const next = host.querySelector("[data-feed-next]");
        if (next && host.scrollTop >= next.offsetTop - 2) advance();
      });
    };
    const key = (e) => {
      if (e.target.closest("input,textarea,button,[contenteditable]")) return;
      if (["PageDown", "ArrowDown", "PageUp", "ArrowUp"].includes(e.key)) {
        e.preventDefault();
        host.scrollBy({
          top: (e.key === "PageDown" || e.key === "ArrowDown" ? 1 : -1) * host.clientHeight,
          behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth",
        });
      }
    };
    let readyFrame = requestAnimationFrame(() => (ready = true));
    const resizeObserver =
      typeof ResizeObserver === "undefined"
        ? null
        : new ResizeObserver(() => {
            ready = false;
            host.scrollTop = active.offsetTop;
            cancelAnimationFrame(readyFrame);
            readyFrame = requestAnimationFrame(() => (ready = true));
          });
    resizeObserver?.observe(host);
    const bottom = active.querySelector?.(".short-bottom");
    const positionRail = () => {
      if (bottom)
        active.style.setProperty(
          "--short-answer-height",
          bottom.getBoundingClientRect().height + "px",
        );
    };
    const railObserver =
      typeof ResizeObserver === "undefined" || !bottom ? null : new ResizeObserver(positionRail);
    railObserver?.observe(bottom);
    positionRail();
    const oldSnap = host.style?.scrollSnapType || "";
    const endIntro = (reset = false) => {
      if (!introRunning) return;
      introRunning = false;
      cancelAnimationFrame(introFrame);
      if (reset) host.scrollTop = active.offsetTop;
      host.style.scrollSnapType = oldSnap;
      host.classList?.remove("is-peeking");
    };
    const cancelIntro = () => endIntro(false);
    if (
      options.intro &&
      !matchMedia("(prefers-reduced-motion: reduce)").matches &&
      host.querySelector("[data-feed-next]")
    ) {
      introRunning = true;
      host.style.scrollSnapType = "none";
      host.classList?.add("is-peeking");
      options.onIntroSeen?.();
      const animate = (time) => {
        if (!introRunning) return;
        if (introStart === null) introStart = time;
        const elapsed = time - introStart;
        if (elapsed >= 1400) {
          endIntro(true);
          return;
        }
        host.scrollTop = active.offsetTop + peekOffset(elapsed, host.clientHeight);
        introFrame = requestAnimationFrame(animate);
      };
      introFrame = requestAnimationFrame(animate);
    } else if (options.intro) {
      options.onIntroSeen?.();
    }
    for (const event of ["pointerdown", "wheel", "keydown"])
      host.addEventListener(event, cancelIntro, { passive: true });
    host.addEventListener("scroll", scroll, { passive: true });
    host.addEventListener("keydown", key);
    dispose = () => {
      cancelAnimationFrame(frame);
      cancelAnimationFrame(readyFrame);
      resizeObserver?.disconnect();
      railObserver?.disconnect();
      endIntro(false);
      for (const event of ["pointerdown", "wheel", "keydown"])
        host.removeEventListener(event, cancelIntro);
      host.removeEventListener("scroll", scroll);
      host.removeEventListener("keydown", key);
    };
  }
  root.KotomiaFeed = { mount, peekOffset, dispose: () => dispose() };
})(window);
