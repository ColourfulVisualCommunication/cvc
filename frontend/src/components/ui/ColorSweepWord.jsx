import { useEffect, useMemo, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";

// Ported from a Framer community component ("Color Sweep Word Carousel")
// into plain React + framer-motion. Parses `{a|b}` slots inside a string —
// everything else renders as static text — staggers each word in with a
// colourful gradient sweep on mount, then loops the `{a|b}` slots between
// their options on a timer. Slots share one cycle index, so multiple slots
// swap in lockstep rather than independently.
const SWEEP_EASE = [0.2, 0, 0.3, 0.3];
const GAP_MS = 70;

// Hand-drawn-style doodles that can be pinned to a cycling slot (by the
// order it appears among cycling slots, not its raw token index) so the
// caller can say "underline the first cycling word" without knowing how
// many static words come before it.
const DECORATION_PATHS = {
  underline: "M2 14 C 20 6, 40 18, 55 9 S 85 3, 98 12",
  circle: "M50,4 C74,2 94,16 92,34 C90,54 68,64 46,60 C22,56 6,42 8,24 C10,8 30,4 50,4",
};

function Decoration({ shape, color }) {
  const isUnderline = shape === "underline";
  return (
    <svg
      aria-hidden="true"
      viewBox={isUnderline ? "0 0 100 20" : "0 0 100 64"}
      preserveAspectRatio="none"
      className="pointer-events-none absolute"
      style={
        isUnderline
          ? { left: 0, bottom: "-0.22em", width: "100%", height: "0.5em" }
          : { inset: "-26% -16%", width: "132%", height: "152%" }
      }
    >
      <motion.path
        d={DECORATION_PATHS[shape]}
        fill="none"
        stroke={color}
        strokeWidth={isUnderline ? 5 : 4}
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ duration: 0.7, ease: "easeInOut", delay: 0.15 }}
      />
    </svg>
  );
}

function parseText(text) {
  const segments = [];
  const regex = /\{([^}]+)\}|(\S+)/g;
  let match;
  while ((match = regex.exec(text)) !== null) {
    if (match[1]) {
      const words = match[1].split("|").map((w) => w.trim()).filter(Boolean);
      if (words.length > 0) segments.push({ type: "cycle", words });
    } else if (match[2]) {
      segments.push({ type: "static", word: match[2] });
    }
  }
  return segments;
}

export default function ColorSweepWord({
  text,
  staticColor = "currentColor",
  cycleColor = "currentColor",
  sweepColors = ["#fab216", "#ed3162", "#45bbeb"],
  sweepMs = 700,
  staggerMs = 120,
  holdMs = 2200,
  fadeMs = 250,
  className = "",
  decorations = {},
  keepTogether = 0,
}) {
  const reduceMotion = useReducedMotion();
  const segments = useMemo(() => parseText(text), [text]);
  const wordCount = segments.length;
  const hasCycles = useMemo(() => segments.some((s) => s.type === "cycle" && s.words.length > 1), [segments]);

  const [appearDone, setAppearDone] = useState(false);
  const [cycleIdx, setCycleIdx] = useState(0);
  const [fadeOut, setFadeOut] = useState(false);

  const totalAppearMs = Math.max(0, (wordCount - 1) * staggerMs + sweepMs);

  useEffect(() => {
    if (reduceMotion) {
      setAppearDone(true);
      return;
    }
    const t = setTimeout(() => setAppearDone(true), totalAppearMs + holdMs);
    return () => clearTimeout(t);
  }, [totalAppearMs, holdMs, reduceMotion]);

  useEffect(() => {
    if (!appearDone || !hasCycles) return;
    const fadeTimer = setTimeout(() => setFadeOut(true), Math.max(0, sweepMs + holdMs - fadeMs - GAP_MS));
    const cycleTimer = setTimeout(() => {
      setFadeOut(false);
      setCycleIdx((i) => i + 1);
    }, sweepMs + holdMs + GAP_MS);
    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(cycleTimer);
    };
  }, [appearDone, cycleIdx, hasCycles, sweepMs, holdMs, fadeMs]);

  let cycleOccurrence = -1;

  const renderSegment = (seg, i) => {
        const isCycling = seg.type === "cycle" && seg.words.length > 1;
        if (isCycling) cycleOccurrence += 1;
        const decoration = isCycling ? decorations[cycleOccurrence] : undefined;
        const subIdx = isCycling ? (appearDone ? cycleIdx : 0) % seg.words.length : 0;
        const word = seg.type === "static" ? seg.word : seg.words[subIdx];
        const wordColor = seg.type === "cycle" ? cycleColor : staticColor;
        const gradient = `linear-gradient(90deg, ${wordColor} 0%, ${wordColor} 25%, ${sweepColors.join(", ")}, ${wordColor} 90%, ${wordColor} 100%)`;
        const delaySec = appearDone ? 0 : (i * staggerMs) / 1000;
        const animKey = isCycling && appearDone && cycleIdx > 0 ? `cycle-${cycleIdx}` : `appear-${i}`;
        const shouldFadeOut = isCycling && appearDone && fadeOut;

        if (reduceMotion) {
          return (
            <span key={i} style={{ color: wordColor }}>
              {word}
            </span>
          );
        }

        return (
          <span key={i} className="relative inline-grid">
            {isCycling &&
              seg.words.map((w, j) => (
                <span
                  key={j}
                  aria-hidden="true"
                  style={{ gridArea: "1 / 1", visibility: "hidden", pointerEvents: "none" }}
                >
                  {w}
                </span>
              ))}
            <motion.span
              key={`u-${animKey}`}
              style={{ gridArea: "1 / 1", color: wordColor }}
              initial={{ opacity: 0 }}
              animate={{ opacity: shouldFadeOut ? 0 : 1 }}
              transition={
                shouldFadeOut
                  ? { duration: fadeMs / 1000, ease: "easeOut" }
                  : { delay: delaySec + (sweepMs * 0.8) / 1000, duration: 0.12, ease: "easeOut" }
              }
            >
              {word}
            </motion.span>
            <motion.span
              key={`o-${animKey}`}
              aria-hidden="true"
              style={{
                gridArea: "1 / 1",
                backgroundImage: gradient,
                backgroundSize: "300% 100%",
                backgroundClip: "text",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                color: "transparent",
                pointerEvents: "none",
              }}
              initial={{ backgroundPositionX: "100%", opacity: 1 }}
              animate={{ backgroundPositionX: "0%", opacity: [1, 1, 0] }}
              transition={{
                backgroundPositionX: { delay: delaySec, duration: sweepMs / 1000, ease: SWEEP_EASE },
                opacity: { delay: delaySec, duration: sweepMs / 1000, times: [0, 0.985, 1], ease: "linear" },
              }}
            >
              {word}
            </motion.span>
            {decoration && !shouldFadeOut && <Decoration key={animKey} shape={decoration.shape} color={decoration.color} />}
          </span>
        );
  };

  const nodes = segments.map(renderSegment);
  const groupSize = keepTogether >= 2 && keepTogether <= nodes.length ? keepTogether : 0;
  const groupStart = groupSize > 0 ? nodes.length - groupSize : -1;

  return (
    <span className={`inline-flex flex-wrap items-baseline gap-[0.25em] ${className}`}>
      {groupStart >= 0 ? (
        <>
          {nodes.slice(0, groupStart)}
          <span className="inline-flex flex-nowrap items-baseline gap-[0.25em]">{nodes.slice(groupStart)}</span>
        </>
      ) : (
        nodes
      )}
    </span>
  );
}
