import { useEffect } from "react";
import { motion, useAnimation, useMotionValue } from "framer-motion";

// A continuously spinning ring of text, placed by trigonometry — ported
// from a Framer Marketplace component ("CircularSpinText"): only
// `addPropertyControls`/`ControlType` (editor panel) and `RenderTarget`
// (Framer's own canvas/thumbnail check, meaningless outside it) were
// dropped, the rotation math and hover speed-up are unchanged.
function getRotationTransition(duration, from, direction, loop = true) {
  return {
    from,
    to: direction === "clockwise" ? from + 360 : from - 360,
    ease: "linear",
    duration,
    type: "tween",
    repeat: loop ? Infinity : 0,
  };
}

export default function CircularSpinText({
  text = "CRAFTING ... ",
  spinDuration = 14,
  onHover = "speedUp",
  size = 130,
  fontSize = 12,
  fontWeight = 800,
  textColor = "var(--color-cvc-crimson)",
  radius = 58,
  letterSpacing = 1,
  direction = "clockwise",
  className = "",
}) {
  const letters = Array.from(text);
  const controls = useAnimation();
  const rotation = useMotionValue(0);

  useEffect(() => {
    const start = rotation.get();
    controls.start({
      rotate: direction === "clockwise" ? start + 360 : start - 360,
      scale: 1,
      transition: getRotationTransition(spinDuration, start, direction),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spinDuration, text, direction]);

  const handleHoverStart = () => {
    if (onHover === "none") return;
    const start = rotation.get();
    controls.start({
      rotate: direction === "clockwise" ? start + 360 : start - 360,
      scale: 1,
      transition: getRotationTransition(spinDuration / 4, start, direction),
    });
  };

  const handleHoverEnd = () => {
    if (onHover === "none") return;
    const start = rotation.get();
    controls.start({
      rotate: direction === "clockwise" ? start + 360 : start - 360,
      scale: 1,
      transition: getRotationTransition(spinDuration, start, direction),
    });
  };

  return (
    <motion.div
      aria-hidden="true"
      className={className}
      style={{
        margin: "0 auto",
        borderRadius: "50%",
        width: size,
        height: size,
        position: "relative",
        fontWeight,
        color: textColor,
        textAlign: "center",
        transformOrigin: "50% 50%",
        rotate: rotation,
      }}
      initial={{ rotate: 0 }}
      animate={controls}
      onMouseEnter={handleHoverStart}
      onMouseLeave={handleHoverEnd}
    >
      {letters.map((letter, i) => {
        const rotationDeg = (360 / letters.length) * i;
        const angle = (rotationDeg * Math.PI) / 180;
        const x = Math.sin(angle) * radius;
        const y = -Math.cos(angle) * radius;
        const transform = `translate(-50%, -50%) translate(${x}px, ${y}px) rotate(${rotationDeg}deg)`;
        return (
          <span
            key={i}
            style={{
              position: "absolute",
              display: "inline-block",
              left: "50%",
              top: "50%",
              fontSize,
              letterSpacing,
              transform,
              userSelect: "none",
            }}
          >
            {letter}
          </span>
        );
      })}
    </motion.div>
  );
}
