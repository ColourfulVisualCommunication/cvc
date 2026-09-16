import { useEffect, useMemo, useRef } from "react";

// Splits text into characters and reveals them one by one as the page
// scrolls past — ported from a Framer Marketplace component
// ("ScrollRevealText"): only the Characters split mode and Scroll trigger
// are kept (the original also offers Words/Lines splitting and an
// On-Load trigger via 12 presets and ~20 properties — none of the rest
// has anywhere to live here, there's one call site wanting one effect).
// The mechanics are otherwise unchanged: direct DOM writes per character
// on scroll (no React re-renders mid-animation, same imperative-on-scroll
// convention as ScrollTimeline/HeroTunnel elsewhere in this codebase),
// with color eased via CSS color-mix rather than crossfading two layers.
export default function ScrollRevealText({
  text,
  as: Tag = "div",
  className = "",
  colorHidden = "var(--color-cvc-muted)",
  colorRevealed = "var(--color-cvc-paper)",
  stagger = 0.05,
  xOffset = 6,
  blur = 6,
  offsetStart = 85,
  offsetEnd = 35,
}) {
  const containerRef = useRef(null);
  const spanRefs = useRef([]);
  const chars = useMemo(() => Array.from(text), [text]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const dur = 0.7;
    const totalTime = dur + (chars.length - 1) * stagger;
    const startFrac = offsetStart / 100;
    const endFrac = offsetEnd / 100;

    function applyProgress(scrollP) {
      const time = scrollP * totalTime;
      spanRefs.current.forEach((el, i) => {
        if (!el) return;
        const p = chars.length <= 1 ? scrollP : Math.max(0, Math.min(1, (time - i * stagger) / dur));
        el.style.opacity = `${0.3 + p * 0.7}`;
        el.style.transform = `translateX(${(-xOffset + xOffset * p).toFixed(1)}px)`;
        el.style.filter = blur > 0 ? `blur(${(blur * (1 - p)).toFixed(1)}px)` : "";
        el.style.color = `color-mix(in srgb, ${colorRevealed} ${Math.round(p * 100)}%, ${colorHidden})`;
      });
    }

    let raf;
    let scheduled = false;

    function update() {
      const vh = window.innerHeight;
      const rect = container.getBoundingClientRect();
      const range = (startFrac - endFrac) * vh;
      if (range <= 0) return;
      applyProgress(Math.max(0, Math.min(1, (startFrac * vh - rect.top) / range)));
    }

    // The IntersectionObserver callback is async and can lag behind a
    // scroll event firing right after a large jump (a fast flick, or a
    // hash-link landing straight on the section) — gating the scroll
    // handler on its flag risks reading a stale "not visible yet" value
    // and skipping the update it should have run. It isn't needed for
    // correctness, only as an optional skip-when-offscreen optimization,
    // and a single small heading doesn't need that badly enough to risk
    // the race, so the scroll handler always updates directly.
    const observer = new IntersectionObserver(([entry]) => entry.isIntersecting && update(), { rootMargin: "200px" });
    observer.observe(container);

    function onScroll() {
      if (scheduled) return;
      scheduled = true;
      raf = requestAnimationFrame(() => {
        update();
        scheduled = false;
      });
    }

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    update();
    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      cancelAnimationFrame(raf);
    };
  }, [chars, stagger, xOffset, blur, offsetStart, offsetEnd, colorHidden, colorRevealed]);

  return (
    <Tag ref={containerRef} className={className}>
      {chars.map((ch, i) => (
        <span
          key={i}
          ref={(el) => (spanRefs.current[i] = el)}
          style={{ display: "inline-block", willChange: "transform, opacity, color, filter" }}
        >
          {ch === " " ? " " : ch}
        </span>
      ))}
    </Tag>
  );
}
