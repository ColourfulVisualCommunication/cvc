import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";

// A minimal crosshair cursor — ported from a Framer Marketplace component
// ("CursorStructule") into plain React: only `addPropertyControls`/
// `ControlType` (editor property panel) and `useIsStaticRenderer` (always
// false here, we're not on Framer's canvas) were dropped, everything else
// — the mousemove tracking, the interactive-element hover heuristic, the
// crosshair lines and dot/ring — is unchanged. Colors swapped for CVC's
// own tokens (grey by default, amber on anything clickable) instead of
// the original's placeholder purple.
//
// Desktop-only by design: this replaces the native pointer, which makes
// no sense without one. `cursor: none` itself lives in index.css gated
// behind the same `(pointer: fine) and (hover: hover)` media query this
// component checks in JS, so the two can't drift out of sync — a device
// that doesn't match never loses its native cursor even if this failed
// to mount for some other reason.
const DEFAULT_COLOR = "#999999"; // --color-cvc-grey
const HOVER_COLOR = "#fab216"; // --color-cvc-amber
const DEFAULT_DOT = 8;
const HOVER_DOT = 14;

function useHasFinePointer() {
  const [hasFinePointer, setHasFinePointer] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(pointer: fine) and (hover: hover)");
    setHasFinePointer(mq.matches);
    const onChange = (e) => setHasFinePointer(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return hasFinePointer;
}

export default function CustomCursor() {
  const hasFinePointer = useHasFinePointer();
  const reduceMotion = useReducedMotion();
  const [pos, setPos] = useState({ x: -100, y: -100 });
  const [isHovered, setIsHovered] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (!hasFinePointer) return;

    const updatePosition = (e) => {
      setPos({ x: e.clientX, y: e.clientY });
      setIsVisible(true);
    };
    const updateHover = (e) => {
      const target = e.target;
      if (!target) return;
      const interactive =
        target.tagName === "BUTTON" ||
        target.tagName === "A" ||
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.closest("a, button, [role='button']") !== null ||
        window.getComputedStyle(target).cursor === "pointer";
      setIsHovered(interactive);
    };
    const hide = () => setIsVisible(false);
    const show = () => setIsVisible(true);

    window.addEventListener("mousemove", updatePosition, { passive: true });
    window.addEventListener("mouseover", updateHover, { passive: true });
    document.addEventListener("mouseleave", hide);
    document.addEventListener("mouseenter", show);
    return () => {
      window.removeEventListener("mousemove", updatePosition);
      window.removeEventListener("mouseover", updateHover);
      document.removeEventListener("mouseleave", hide);
      document.removeEventListener("mouseenter", show);
    };
  }, [hasFinePointer]);

  if (!hasFinePointer || !isVisible) return null;

  const spring = reduceMotion ? { duration: 0 } : { type: "spring", stiffness: 450, damping: 28 };
  const ringSpring = reduceMotion ? { duration: 0 } : { type: "spring", stiffness: 350, damping: 25 };

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 overflow-hidden"
      style={{ zIndex: 9999 }}
    >
      <motion.div
        animate={{ opacity: isHovered ? 1 : 0.25 }}
        transition={{ duration: 0.15 }}
        className="absolute inset-y-0 w-px"
        style={{ left: pos.x, background: DEFAULT_COLOR, transform: "translateX(-0.5px)" }}
      />
      <motion.div
        animate={{ opacity: isHovered ? 1 : 0.25 }}
        transition={{ duration: 0.15 }}
        className="absolute inset-x-0 h-px"
        style={{ top: pos.y, background: DEFAULT_COLOR, transform: "translateY(-0.5px)" }}
      />
      <motion.div
        animate={{
          width: isHovered ? HOVER_DOT : DEFAULT_DOT,
          height: isHovered ? HOVER_DOT : DEFAULT_DOT,
          backgroundColor: isHovered ? HOVER_COLOR : DEFAULT_COLOR,
        }}
        transition={spring}
        className="absolute rounded-full"
        style={{ left: pos.x, top: pos.y, transform: "translate(-50%, -50%)" }}
      />
      <motion.div
        animate={{
          width: isHovered ? HOVER_DOT + 14 : 0,
          height: isHovered ? HOVER_DOT + 14 : 0,
          opacity: isHovered ? 1 : 0,
        }}
        transition={ringSpring}
        className="absolute rounded-full"
        style={{ left: pos.x, top: pos.y, border: `1px solid ${HOVER_COLOR}`, transform: "translate(-50%, -50%)" }}
      />
    </div>
  );
}
