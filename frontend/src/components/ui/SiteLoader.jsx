import { useEffect, useId, useMemo, useState } from "react";

// Ported from a Framer Marketplace component ("Boxloader" — a 3-box
// morphing CSS-keyframe loader) into plain React: the original imports
// `addPropertyControls`/`ControlType` (Framer's canvas property panel,
// meaningless outside their editor) and `useIsStaticRenderer` (always
// false outside Framer's own preview/export contexts) — both dropped,
// nothing else changed about the animation math. Recoloured to the three
// CVC accents instead of the original's single flat color, matching the
// dot treatment already used in the hero eyebrow text.
const UNIT = 36;
const BORDER = 12;
const BIG = 2 * UNIT + BORDER;
const OFF = UNIT + BORDER;
const DURATION = 2.6;
const COLORS = ["var(--color-cvc-amber)", "var(--color-cvc-cyan)", "var(--color-cvc-crimson)"];

function frame(pct, w, h, mt, ml) {
  return `${pct}%{width:${w}px;height:${h}px;margin-top:${mt}px;margin-left:${ml}px;}`;
}

const KEYFRAME_SETS = [
  [frame(0, BIG, UNIT, OFF, 0), frame(12.5, UNIT, UNIT, OFF, 0), frame(25, UNIT, UNIT, OFF, 0), frame(37.5, UNIT, UNIT, OFF, 0), frame(50, UNIT, UNIT, OFF, 0), frame(62.5, UNIT, UNIT, OFF, 0), frame(75, UNIT, BIG, 0, 0), frame(87.5, UNIT, UNIT, 0, 0), frame(100, UNIT, UNIT, 0, 0)],
  [frame(0, UNIT, UNIT, 0, 0), frame(12.5, UNIT, UNIT, 0, 0), frame(25, UNIT, UNIT, 0, 0), frame(37.5, UNIT, UNIT, 0, 0), frame(50, BIG, UNIT, 0, 0), frame(62.5, UNIT, UNIT, 0, OFF), frame(75, UNIT, UNIT, 0, OFF), frame(87.5, UNIT, UNIT, 0, OFF), frame(100, UNIT, UNIT, 0, OFF)],
  [frame(0, UNIT, UNIT, 0, OFF), frame(12.5, UNIT, UNIT, 0, OFF), frame(25, UNIT, BIG, 0, OFF), frame(37.5, UNIT, UNIT, OFF, OFF), frame(50, UNIT, UNIT, OFF, OFF), frame(62.5, UNIT, UNIT, OFF, OFF), frame(75, UNIT, UNIT, OFF, OFF), frame(87.5, UNIT, UNIT, OFF, OFF), frame(100, BIG, UNIT, OFF, 0)],
];
const INITIAL_FRAMES = [
  { width: BIG, height: UNIT, marginTop: OFF, marginLeft: 0 },
  { width: UNIT, height: UNIT, marginTop: 0, marginLeft: 0 },
  { width: UNIT, height: UNIT, marginTop: 0, marginLeft: OFF },
];

function SquareLoader({ reduceMotion }) {
  const rawId = useId();
  const id = useMemo(() => "sl" + rawId.replace(/[^a-zA-Z0-9]/g, ""), [rawId]);
  const css = useMemo(
    () => KEYFRAME_SETS.map((set, i) => `@keyframes ${id}b${i}{${set.join("")}}`).join("\n"),
    [id]
  );

  return (
    <div style={{ width: BIG, height: BIG, position: "relative" }}>
      {!reduceMotion && <style>{css}</style>}
      {INITIAL_FRAMES.map((initial, i) => (
        <div
          key={i}
          style={{
            border: `${BORDER}px solid ${COLORS[i]}`,
            background: "transparent",
            boxSizing: "border-box",
            position: "absolute",
            display: "block",
            ...initial,
            ...(reduceMotion ? {} : { animation: `${id}b${i} ${DURATION}s 0s forwards ease-in-out infinite` }),
          }}
        />
      ))}
    </div>
  );
}

// Shown once per browser session (not on every internal SPA navigation) —
// hides the moment the current page's own data-fetch signals
// window.__PRERENDER_READY__ (see lib/prerenderReady.js — the same flag
// the build-time prerender script already waits on), so this can never
// linger over real content or get caught mid-loading-state by the SSG
// snapshot. A safety-cap timeout hides it regardless if that flag is
// somehow never set, so a slow/failed fetch can't strand a visitor behind
// a permanent overlay.
const SAFETY_CAP_MS = 4000;
const SESSION_KEY = "cvc_loader_shown";

export default function SiteLoader() {
  const [visible, setVisible] = useState(() => {
    try {
      return !sessionStorage.getItem(SESSION_KEY);
    } catch {
      return true;
    }
  });
  const [fading, setFading] = useState(false);
  const reduceMotion =
    typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

  useEffect(() => {
    if (!visible) return;
    let cancelled = false;

    function hide() {
      if (cancelled) return;
      try {
        sessionStorage.setItem(SESSION_KEY, "1");
      } catch {
        // Private-browsing/blocked storage — fine, it'll just show again next load.
      }
      setFading(true);
      setTimeout(() => !cancelled && setVisible(false), 300);
    }

    const poll = setInterval(() => {
      if (window.__PRERENDER_READY__) hide();
    }, 100);
    const cap = setTimeout(hide, SAFETY_CAP_MS);

    return () => {
      cancelled = true;
      clearInterval(poll);
      clearTimeout(cap);
    };
  }, [visible]);

  if (!visible) return null;

  return (
    <div
      aria-hidden="true"
      className={`fixed inset-0 z-[100] flex items-center justify-center bg-cvc-ink transition-opacity duration-300 ${
        fading ? "opacity-0" : "opacity-100"
      }`}
    >
      <SquareLoader reduceMotion={reduceMotion} />
    </div>
  );
}
