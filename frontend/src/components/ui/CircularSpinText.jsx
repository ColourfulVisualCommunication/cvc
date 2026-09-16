import { useEffect, useRef } from "react";

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

export default function CircularSpinText({
  text,
  radius = 95,
  fontSize = 15,
  fontWeight = 900,
  color = "var(--color-cvc-crimson)",
  duration = 14,
  className = "",
}) {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.innerHTML = "";
    const characters = Array.from(text);
    const deltaAngle = 360 / characters.length;
    let currentAngle = -90;

    characters.forEach((ch, i) => {
      const span = document.createElement("span");
      span.textContent = ch === " " ? " " : ch;
      span.style.position = "absolute";
      span.style.transformOrigin = "top left";
      const xPos = radius * (1 + Math.cos(toRadians(currentAngle)));
      const yPos = radius * (1 + Math.sin(toRadians(currentAngle)));
      span.style.transform = `translate(${xPos}px, ${yPos}px) rotate(${i * deltaAngle + CHARACTER_OFFSET_ANGLE}deg)`;
      el.appendChild(span);
      currentAngle += deltaAngle;
    });
  }, [text, radius]);

  const diameter = radius * 2;

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
          fontSize,
          fontWeight,
          color,
          animation: `cvc-circular-spin ${duration}s infinite linear`,
        }}
      />
    </>
  );
}
