import { useEffect, useRef } from "react";

// A pinned, full-bleed frame that wipes between panels as the page
// scrolls through it — ported from a Framer Marketplace component
// ("Scrolltimeline") into plain React/DOM: the mechanics (a sticky frame,
// panels clipped in/out via clip-path driven by scroll position) don't
// touch Framer's own canvas runtime at all, only `useIsStaticRenderer`
// (always false outside their editor) and `addPropertyControls` (editor
// property panel) were dropped — everything else is untouched. Panel
// content is now arbitrary React children instead of the original's
// fixed eyebrow/description/year strings, so it can hold a full grid of
// clickable cards per panel rather than plain text.
//
// Styles are applied directly to DOM refs on scroll (bypassing React
// state) for a smooth 60fps wipe — the same imperative-style-on-scroll
// technique already used elsewhere in this codebase for scroll-linked
// effects (see HeroTunnel), not a departure from convention.
export default function ScrollTimeline({
  items,
  totalScrollHeight,
  frameInset = 24,
  // The sticky frame's own `top` — separate from `frameInset` (which also
  // sets the side margins and factors into the height calc) because this
  // needs to clear whatever fixed/sticky chrome sits above the page (the
  // site header), while the sides and bottom stay at the tighter default.
  topOffset = frameInset,
  cornerRadius = 24,
}) {
  const wrapRef = useRef(null);
  const panelRefs = useRef([]);
  const numberRefs = useRef([]);

  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const panels = panelRefs.current.filter(Boolean);
    const n = panels.length;
    if (n === 0) return;

    function applyAt(scaled) {
      const idx = Math.min(n - 2, Math.floor(scaled));
      const t = scaled - idx;
      panels.forEach((panel, i) => {
        const number = numberRefs.current[i];
        if (i < idx) {
          panel.style.clipPath = "inset(0 0 0 100%)";
          if (number) number.style.transform = "rotate(-90deg)";
        } else if (i === idx) {
          const visible = 1 - t;
          panel.style.clipPath = `inset(0 ${(1 - visible) * 100}% 0 0)`;
          if (number) number.style.transform = `rotate(${-90 * t}deg)`;
        } else if (i === idx + 1) {
          const visible = t;
          panel.style.clipPath = `inset(0 0 0 ${(1 - visible) * 100}%)`;
          if (number) number.style.transform = "rotate(0deg)";
        } else {
          panel.style.clipPath = "inset(0 0 0 100%)";
          if (number) number.style.transform = "rotate(0deg)";
        }
        panel.style.zIndex = String(i);
      });
    }

    function update() {
      const rect = wrap.getBoundingClientRect();
      const total = wrap.offsetHeight - window.innerHeight;
      let raw = total > 0 ? -rect.top / total : 0;
      raw = Math.min(1, Math.max(0, raw));
      applyAt(raw * (n - 1));
    }

    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    applyAt(0);
    update();
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [items.length]);

  return (
    <div ref={wrapRef} style={{ position: "relative", height: totalScrollHeight ?? `${items.length * 100}vh` }}>
      <div
        style={{
          position: "sticky",
          top: topOffset,
          height: `calc(100svh - ${topOffset}px - ${frameInset}px)`,
          margin: `0 ${frameInset}px`,
          borderRadius: cornerRadius,
          overflow: "hidden",
        }}
      >
        {items.map((item, i) => (
          <section
            key={i}
            ref={(el) => (panelRefs.current[i] = el)}
            style={{
              position: "absolute",
              inset: 0,
              clipPath: i === 0 ? "inset(0 0 0 0)" : "inset(0 0 0 100%)",
              background: item.bg,
              color: item.fg,
            }}
            className="flex flex-col justify-center overflow-y-auto p-6 sm:p-10 lg:p-14"
          >
            <span
              ref={(el) => (numberRefs.current[i] = el)}
              aria-hidden="true"
              className="pointer-events-none absolute right-6 top-2 hidden select-none font-black leading-none sm:right-10 sm:block"
              style={{
                fontSize: "min(14vw, 180px)",
                transformOrigin: "left bottom",
                // A flat low-opacity fg used to wash out to almost nothing
                // on dark panels: white at 10% opacity over near-black
                // composites to a grey barely different from the
                // background it's sitting on. Blending fg into bg instead
                // (at full opacity) guarantees a fixed, visible step away
                // from the panel's own color no matter how dark or light
                // that color is — a muted tint of the panel itself rather
                // than a translucent overlay that depends on what's under it.
                color: `color-mix(in srgb, ${item.fg} 30%, ${item.bg})`,
              }}
            >
              {String(i + 1).padStart(2, "0")}
            </span>
            <div className="relative mx-auto max-w-2xl">{item.header}</div>
            <div className="relative mt-8">{item.content}</div>
          </section>
        ))}
      </div>
    </div>
  );
}
