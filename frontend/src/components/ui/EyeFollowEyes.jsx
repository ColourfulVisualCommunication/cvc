import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";

// Ported from a Framer community component ("Eye Follow Button") into
// plain React + framer-motion so it runs without the Framer runtime.
// Two eyes track the cursor anywhere on the page; each pupil's offset is
// clamped to a max radius inside its eye so it never pokes out.
export default function EyeFollowEyes({
  size = 16,
  pupilSize = 6,
  gap = 5,
  range = 70,
  stiffness = 220,
  className = "",
}) {
  const containerRef = useRef(null);
  const [leftPupil, setLeftPupil] = useState({ x: 0, y: 0 });
  const [rightPupil, setRightPupil] = useState({ x: 0, y: 0 });

  const maxDistance = useMemo(() => ((size - pupilSize) / 2) * (range / 100), [size, pupilSize, range]);
  const eyeSpacing = size + gap;

  useEffect(() => {
    function handleMouseMove(e) {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const mouseX = e.clientX - centerX;
      const mouseY = e.clientY - centerY;

      const pupilFor = (eyeOffsetX) => {
        const relativeX = mouseX - eyeOffsetX;
        const relativeY = mouseY;
        const distance = Math.sqrt(relativeX * relativeX + relativeY * relativeY);
        if (distance === 0) return { x: 0, y: 0 };
        const clamped = Math.min(distance, maxDistance);
        const angle = Math.atan2(relativeY, relativeX);
        return { x: Math.cos(angle) * clamped, y: Math.sin(angle) * clamped };
      };

      setLeftPupil(pupilFor(-eyeSpacing / 2));
      setRightPupil(pupilFor(eyeSpacing / 2));
    }

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [eyeSpacing, maxDistance]);

  const eyeStyle = { width: size, height: size };
  const transition = { type: "spring", stiffness, damping: 20 };

  return (
    <span ref={containerRef} className={`inline-flex items-center ${className}`} style={{ gap }}>
      {[leftPupil, rightPupil].map((pupil, i) => (
        <span
          key={i}
          className="inline-flex shrink-0 items-center justify-center rounded-full bg-white"
          style={eyeStyle}
        >
          <motion.span
            className="rounded-full bg-black"
            style={{ width: pupilSize, height: pupilSize }}
            animate={{ x: pupil.x, y: pupil.y }}
            transition={transition}
          />
        </span>
      ))}
    </span>
  );
}
