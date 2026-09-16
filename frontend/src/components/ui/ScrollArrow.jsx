import { useEffect, useState } from "react";
import { motion, useMotionValue, useTransform } from "framer-motion";

// A vertical line-and-arrowhead scroll hint whose tail retracts toward
// the fixed head as you scroll down — full tail at the top of the page,
// fully retracted at the bottom, growing back on the way up. Progress is
// an absolute scroll fraction (scrollY / total scrollable distance), not
// an incremental per-event accumulator — a fixed pixel threshold meant
// the exact same 400px of scroll fully drained or refilled it regardless
// of how tall the page actually was. Computing it directly from total
// document height instead means the same scroll position always shows
// the same tail length no matter how you got there, doubles as a real
// whole-page progress indicator (the shrinking tail is itself the "keep
// going" cue), and needs no direction-specific logic — one formula
// covers scrolling down or back up.
//
// Color auto-inverts against whatever section currently sits behind its
// fixed position, via the same data-scroll-surface="light" probe
// ScrollToTop uses — without it, the light-paper-on-dark default
// disappears over the cyan Work / amber Contact sections.
export default function ScrollArrow({ startHeight = 96, headSize = 12, thickness = 2, className = "" }) {
  const tailHeight = useMotionValue(startHeight);
  const tipY = startHeight + headSize + 10;
  const tailTopY = useTransform(tailHeight, (h) => tipY - h);
  const [onLight, setOnLight] = useState(false);

  useEffect(() => {
    let target = startHeight;
    let current = startHeight;
    let raf;

    function updateProgress() {
      const scrollable = document.documentElement.scrollHeight - window.innerHeight;
      const progress = scrollable > 0 ? 1 - Math.min(1, Math.max(0, window.scrollY / scrollable)) : 1;
      target = startHeight * progress;

      const probeY = window.innerHeight / 2; // matches the arrow's own fixed top-1/2 position
      let matched = false;
      for (const el of document.querySelectorAll("[data-scroll-surface]")) {
        const rect = el.getBoundingClientRect();
        if (rect.top <= probeY && rect.bottom >= probeY) {
          matched = el.dataset.scrollSurface === "light";
          break;
        }
      }
      setOnLight(matched);
    }

    function loop() {
      current += (target - current) * 0.25;
      tailHeight.set(current);
      raf = requestAnimationFrame(loop);
    }

    updateProgress();
    current = target;
    window.addEventListener("scroll", updateProgress, { passive: true });
    window.addEventListener("resize", updateProgress);
    raf = requestAnimationFrame(loop);
    return () => {
      window.removeEventListener("scroll", updateProgress);
      window.removeEventListener("resize", updateProgress);
      cancelAnimationFrame(raf);
    };
  }, [startHeight, tailHeight]);

  const color = onLight ? "var(--color-cvc-ink)" : "var(--color-cvc-paper)";
  const arm = headSize / 1.5;
  const tipPath = `M ${headSize - arm} ${tipY - arm} L ${headSize} ${tipY} L ${headSize + arm} ${tipY - arm}`;

  return (
    <motion.div
      aria-hidden="true"
      // z-50, not the z-index:auto default — position:sticky content (the
      // ServiceLadder timeline, OrbitWork's pinned viewport) unconditionally
      // opens its own stacking context, and an auto-z-index fixed element
      // that comes earlier in the DOM than a later sticky section loses the
      // paint-order tiebreak and ends up hidden behind it while that
      // section is pinned. z-50 matches the header/ScrollToTop convention
      // for fixed chrome, which is exactly why those don't have this bug.
      className={`pointer-events-none z-50 flex w-[50px] items-end justify-center ${className}`}
    >
      <svg
        width={headSize * 2}
        height={tipY + 10}
        viewBox={`0 0 ${headSize * 2} ${tipY + 10}`}
        fill="none"
        style={{ overflow: "visible" }}
      >
        <motion.line
          x1={headSize}
          y1={tipY}
          x2={headSize}
          y2={tailTopY}
          stroke={color}
          strokeWidth={thickness}
          strokeLinecap="round"
        />
        <path d={tipPath} stroke={color} strokeWidth={thickness} strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </motion.div>
  );
}
