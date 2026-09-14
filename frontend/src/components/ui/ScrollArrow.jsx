import { motion, useScroll, useTransform, useSpring } from "framer-motion";

// Ported from a Framer community component ("Arrow") — a vertical
// line-and-arrowhead scroll hint whose tail retracts toward the fixed head
// as the visitor scrolls, then fades out. Scoped to a single section via
// `targetRef` (the hero) rather than the whole page, like the original
// defaulted to, so it disappears once that section is behind them instead
// of lingering the entire way down a long homepage.
export default function ScrollArrow({
  targetRef,
  color = "var(--color-cvc-paper)",
  startHeight = 64,
  headSize = 12,
  thickness = 2,
  className = "",
}) {
  const { scrollYProgress } = useScroll({
    target: targetRef,
    offset: ["start start", "end start"],
  });
  const smoothProgress = useSpring(scrollYProgress, { stiffness: 100, damping: 30, restDelta: 0.001 });

  const tipY = startHeight + headSize + 10;
  const tailHeight = useTransform(smoothProgress, [0, 1], [startHeight, 0]);
  const tailTopY = useTransform(tailHeight, (latest) => tipY - latest);
  const opacity = useTransform(scrollYProgress, [0, 0.85, 1], [1, 1, 0]);

  const arm = headSize / 1.5;
  const tipPath = `M ${headSize - arm} ${tipY - arm} L ${headSize} ${tipY} L ${headSize + arm} ${tipY - arm}`;

  return (
    <motion.div
      aria-hidden="true"
      style={{ opacity }}
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
