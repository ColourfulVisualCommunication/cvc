import { useEffect } from "react";
import { motion, useMotionValue, useTransform } from "framer-motion";

// Ported/adapted from a Framer community component ("Arrow") — a vertical
// line-and-arrowhead scroll hint whose tail retracts toward the fixed
// head. Originally scoped to one target section's own scroll range (the
// hero), fading out once that section was behind you; now it reacts to
// scroll DIRECTION across the whole page instead — shrinking while
// scrolling down, growing back while scrolling up — so it keeps
// prompting "scroll down" the entire way through the page rather than
// disappearing after the first section or two.
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
    let target = startHeight;
    let current = startHeight;
    let raf;
    let lastY = window.scrollY;

    function onScroll() {
      const y = window.scrollY;
      target = y > lastY ? 0 : startHeight;
      lastY = y;
    }

    function loop() {
      current += (target - current) * 0.12;
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
