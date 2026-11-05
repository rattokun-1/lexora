(function (root) {
  "use strict";
  let dispose = () => {};
  function mount(host, onNext) {
    dispose();
    if (!host) return;
    const active = host.querySelector("[data-feed-current]");
    let ready = false,
      advanced = false,
      frame;
    host.scrollTop = active.offsetTop;
    const advance = () => {
      if (advanced) return;
      advanced = true;
      onNext();
    };
    const scroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        if (!ready) return;
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
    host.addEventListener("scroll", scroll, { passive: true });
    host.addEventListener("keydown", key);
    dispose = () => {
      cancelAnimationFrame(frame);
      cancelAnimationFrame(readyFrame);
      resizeObserver?.disconnect();
      host.removeEventListener("scroll", scroll);
      host.removeEventListener("keydown", key);
    };
  }
  root.KotomiaFeed = { mount, dispose: () => dispose() };
})(window);
