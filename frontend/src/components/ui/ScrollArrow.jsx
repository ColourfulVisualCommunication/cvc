import { useEffect } from "react";
import { motion, useMotionValue, useTransform } from "framer-motion";

// Ported/adapted from a Framer community component ("Arrow") — a vertical
// line-and-arrowhead scroll hint whose tail retracts toward the fixed
// head. Originally scoped to one target section's own scroll range (the
// hero), fading out once that section was behind you; now it tracks
// scroll DISTANCE across the whole page instead — a first attempt at
// this reacted only to scroll direction (any scroll-down event snapped a
// target to "shrunk", any scroll-up event snapped it to "full"), which
// meant it fully shrank or fully grew back after the smallest scroll
// tick regardless of how far you'd actually moved. `progress` here is a
// running value that a downward scroll of THRESHOLD px drains from 1 to
// 0, and an upward scroll refills at the same rate — proportional to
// distance covered either way, and it naturally cycles start-to-shrunk
// repeatedly down a long page rather than settling into one state.
const THRESHOLD = 400;

export default function ScrollArrow({
  color = "var(--color-cvc-paper)",
  startHeight = 64,
  headSize = 12,
  thickness = 2,
  className = "",
}) {
  const tailHeight = useMotionValue(startHeight);
  const tipY = startHeight + headSize + 10;
  const tailTopY = useTransform(tailHeight, (h) => tipY - h);

  useEffect(() => {
    let progress = 1;
    let target = startHeight;
    let current = startHeight;
    let raf;
    let lastY = window.scrollY;

    function onScroll() {
      const y = window.scrollY;
      const dy = y - lastY;
      lastY = y;
      progress = Math.max(0, Math.min(1, progress - dy / THRESHOLD));
      target = startHeight * progress;
    }

    function loop() {
      current += (target - current) * 0.25;
      tailHeight.set(current);
      raf = requestAnimationFrame(loop);
    }

    window.addEventListener("scroll", onScroll, { passive: true });
    raf = requestAnimationFrame(loop);
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf);
    };
  }, [startHeight, tailHeight]);

  const arm = headSize / 1.5;
  const tipPath = `M ${headSize - arm} ${tipY - arm} L ${headSize} ${tipY} L ${headSize + arm} ${tipY - arm}`;

  return (
    <motion.div
      aria-hidden="true"
      className={`pointer-events-none flex w-[50px] items-end justify-center ${className}`}
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
