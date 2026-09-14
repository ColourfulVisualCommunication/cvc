import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";

// Ported from a Framer community component ("TypewriterEffect") — a
// static prefix stays on screen while a list of colored phrases loops
// forever: type a phrase, hold, delete it, type the next, repeat. Used
// for the hero's "From {idea to action | action to reality}" line.
export default function TypewriterEffect({
  prefix = "",
  prefixColor = "inherit",
  phrases,
  typingSpeed = 55,
  deletingSpeed = 32,
  pauseDuration = 1400,
  className = "",
}) {
  const reduceMotion = useReducedMotion();
  const [phraseIndex, setPhraseIndex] = useState(0);
  const [charIndex, setCharIndex] = useState(reduceMotion ? phrases[0].text.length : 0);
  const [isDeleting, setIsDeleting] = useState(false);
  const [blinkOn, setBlinkOn] = useState(true);
  const timeoutRef = useRef(null);

  const current = phrases[phraseIndex % phrases.length];

  useEffect(() => {
    if (reduceMotion) return;
    const blink = setInterval(() => setBlinkOn((v) => !v), 500);
    return () => clearInterval(blink);
  }, [reduceMotion]);

  useEffect(() => {
    if (reduceMotion) return;
    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    if (!isDeleting && charIndex < current.text.length) {
      timeoutRef.current = setTimeout(() => setCharIndex((i) => i + 1), typingSpeed);
    } else if (!isDeleting && charIndex === current.text.length) {
      timeoutRef.current = setTimeout(() => setIsDeleting(true), pauseDuration);
    } else if (isDeleting && charIndex > 0) {
      timeoutRef.current = setTimeout(() => setCharIndex((i) => i - 1), deletingSpeed);
    } else if (isDeleting && charIndex === 0) {
      timeoutRef.current = setTimeout(() => {
        setIsDeleting(false);
        setPhraseIndex((i) => (i + 1) % phrases.length);
      }, 300);
    }
    return () => clearTimeout(timeoutRef.current);
  }, [charIndex, isDeleting, current, typingSpeed, deletingSpeed, pauseDuration, phrases.length, reduceMotion]);

  const shown = reduceMotion ? current.text : current.text.slice(0, charIndex);

  return (
    <span className={`whitespace-pre-wrap ${className}`}>
      <span style={{ color: prefixColor }}>{prefix}</span>
      <span style={{ color: current.color }}>{shown}</span>
      {!reduceMotion && (
        <span
          aria-hidden="true"
          className="ml-1 inline-block w-[3px] translate-y-[0.08em] bg-current align-middle transition-opacity duration-300"
          style={{ height: "0.82em", opacity: blinkOn ? 1 : 0 }}
        />
      )}
    </span>
  );
}
