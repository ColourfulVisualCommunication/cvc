import { useEffect, useMemo, useState } from "react";
import { useReducedMotion } from "framer-motion";

// Ported from a Framer community component ("TypewriterEffect") into plain
// React. The original loops through a list of words, typing and deleting
// each forever — this instead types one full sentence once and stops,
// since a hero headline that keeps erasing itself would be the opposite
// of subtle. Words in `highlightWords` render in `highlightColor` as
// they're typed; everything else uses the surrounding text color.
export default function TypewriterEffect({
  text,
  highlightWords = [],
  highlightColor = "var(--color-cvc-amber)",
  speed = 38,
  startDelay = 300,
  className = "",
}) {
  const reduceMotion = useReducedMotion();
  const [revealed, setRevealed] = useState(reduceMotion ? text.length : 0);
  const [blinkOn, setBlinkOn] = useState(true);
  const [cursorDone, setCursorDone] = useState(reduceMotion);

  const highlightSet = useMemo(() => new Set(highlightWords.map((w) => w.toLowerCase())), [highlightWords]);

  // Map each character index to a color, based on which word it belongs to.
  const colorAt = useMemo(() => {
    const colors = new Array(text.length).fill("inherit");
    const wordRe = /[A-Za-z]+/g;
    let match;
    while ((match = wordRe.exec(text)) !== null) {
      const clean = match[0].toLowerCase();
      if (highlightSet.has(clean)) {
        for (let i = match.index; i < match.index + match[0].length; i++) colors[i] = highlightColor;
      }
    }
    return colors;
  }, [text, highlightSet, highlightColor]);

  useEffect(() => {
    if (reduceMotion) return;
    let i = 0;
    let interval;
    const timeout = setTimeout(() => {
      interval = setInterval(() => {
        i += 1;
        setRevealed(i);
        if (i >= text.length) clearInterval(interval);
      }, speed);
    }, startDelay);
    return () => {
      clearTimeout(timeout);
      clearInterval(interval);
    };
  }, [text, speed, startDelay, reduceMotion]);

  useEffect(() => {
    if (reduceMotion) return;
    const blink = setInterval(() => setBlinkOn((v) => !v), 500);
    return () => clearInterval(blink);
  }, [reduceMotion]);

  useEffect(() => {
    if (reduceMotion || revealed < text.length) return;
    const fade = setTimeout(() => setCursorDone(true), 1200);
    return () => clearTimeout(fade);
  }, [revealed, text.length, reduceMotion]);

  // Group consecutive characters of the same color into spans instead of
  // one span per character — plenty for a short headline, far less DOM.
  const segments = useMemo(() => {
    const shown = text.slice(0, revealed);
    const out = [];
    let start = 0;
    for (let i = 1; i <= shown.length; i++) {
      if (i === shown.length || colorAt[i] !== colorAt[start]) {
        out.push({ text: shown.slice(start, i), color: colorAt[start] });
        start = i;
      }
    }
    return out;
  }, [text, revealed, colorAt]);

  return (
    <span className={`whitespace-pre-wrap ${className}`}>
      {segments.map((seg, i) => (
        <span key={i} style={{ color: seg.color }}>
          {seg.text}
        </span>
      ))}
      <span
        aria-hidden="true"
        className="ml-1 inline-block w-[3px] translate-y-[0.08em] bg-current align-middle transition-opacity duration-300"
        style={{ height: "0.82em", opacity: cursorDone ? 0 : blinkOn ? 1 : 0 }}
      />
    </span>
  );
}
