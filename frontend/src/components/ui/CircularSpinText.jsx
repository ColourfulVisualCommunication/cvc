import { useEffect, useRef, useState } from "react";

// Rebuilt to match a specific reference exactly (a CodePen the user
// pointed at) after the earlier Framer-ported version had a real bug:
// driving per-character transforms through Framer Motion's `rotate`
// motion value every frame made the text visibly scale and drop out
// mid-spin. This is deliberately much simpler — one plain CSS
// `@keyframes` rotation on the container (GPU-accelerated, no per-frame
// JS at all once mounted) with each character positioned once via JS
// into its spot around the circle. Nothing but the initial layout runs
// after mount.
const CHARACTER_OFFSET_ANGLE = 8;
const toRadians = (deg) => deg * (Math.PI / 180);
// Below this width the badge scales down a step so it doesn't overwhelm
// the (also smaller) photo it sits on.
const MOBILE_BREAKPOINT = 640;
const MOBILE_SCALE = 0.75;

function useResponsiveScale() {
  const [scale, setScale] = useState(1);
  useEffect(() => {
    const mq = window.matchMedia(`(min-width: ${MOBILE_BREAKPOINT}px)`);
    setScale(mq.matches ? 1 : MOBILE_SCALE);
    const onChange = (e) => setScale(e.matches ? 1 : MOBILE_SCALE);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return scale;
}

export default function CircularSpinText({
  text,
  radius = 80,
  fontSize = 17,
  fontWeight = 900,
  color = "var(--color-cvc-crimson)",
  duration = 14,
  className = "",
}) {
  const ref = useRef(null);
  const scale = useResponsiveScale();
  const scaledRadius = radius * scale;
  const scaledFontSize = fontSize * scale;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.innerHTML = "";
    const characters = Array.from(text);
    const deltaAngle = 360 / characters.length;
    let currentAngle = -90;

    characters.forEach((ch, i) => {
      const span = document.createElement("span");
      span.textContent = ch === " " ? " " : ch;
      span.style.position = "absolute";
      span.style.transformOrigin = "top left";
      const xPos = scaledRadius * (1 + Math.cos(toRadians(currentAngle)));
      const yPos = scaledRadius * (1 + Math.sin(toRadians(currentAngle)));
      span.style.transform = `translate(${xPos}px, ${yPos}px) rotate(${i * deltaAngle + CHARACTER_OFFSET_ANGLE}deg)`;
      el.appendChild(span);
      currentAngle += deltaAngle;
    });
  }, [text, scaledRadius]);

  const diameter = scaledRadius * 2;

  return (
    <>
      <style>{`
        @keyframes cvc-circular-spin {
          from { transform: rotate(0); }
          to { transform: rotate(-360deg); }
        }
      `}</style>
      <div
        ref={ref}
        aria-hidden="true"
        className={className}
        style={{
          position: "relative",
          width: diameter,
          height: diameter,
          borderRadius: "50%",
          fontFamily: "var(--font-heading)",
          fontSize: scaledFontSize,
          fontWeight,
          letterSpacing: "-0.02em",
          color,
          animation: `cvc-circular-spin ${duration}s infinite linear`,
        }}
      />
    </>
  );
}
