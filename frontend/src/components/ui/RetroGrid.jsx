import { useEffect, useRef } from "react";

// Ported from a Framer community component ("RetroGrid") into plain
// React/CSS — a perspective grid floor that scrolls slowly and fades into
// the page background near the bottom, without needing the Framer runtime.
export default function RetroGrid({
  angle = 40,
  cellSize = 56,
  opacity = 0.5,
  lineColor = "#19191940",
  animationSpeed = 8,
  perspective = 300,
  fadeHeight = 45,
  fadeColor = "#fdfcfb",
  className = "",
}) {
  const gridRef = useRef(null);

  useEffect(() => {
    const name = `cvc-grid-move-${Math.random().toString(36).slice(2)}`;
    const styleSheet = document.createElement("style");
    styleSheet.innerHTML = `
      @keyframes ${name} {
        from { background-position: 0 0, 0 0; }
        to { background-position: ${cellSize}px ${cellSize}px, ${cellSize}px ${cellSize}px; }
      }
    `;
    document.head.appendChild(styleSheet);
    if (gridRef.current) {
      gridRef.current.style.animation = `${name} ${animationSpeed}s linear infinite`;
    }
    return () => {
      try {
        document.head.removeChild(styleSheet);
      } catch {
        // already removed
      }
    };
  }, [cellSize, animationSpeed]);

  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}
      style={{ perspective: `${perspective}px`, opacity }}
    >
      <div className="absolute inset-0" style={{ transform: `rotateX(${angle}deg)` }}>
        <div
          ref={gridRef}
          className="absolute inset-0"
          style={{
            backgroundImage: `linear-gradient(to right, ${lineColor} 1px, transparent 1px), linear-gradient(to bottom, ${lineColor} 1px, transparent 1px)`,
            backgroundSize: `${cellSize}px ${cellSize}px`,
          }}
        />
      </div>
      <div
        className="absolute inset-0"
        style={{ background: `linear-gradient(to top, ${fadeColor}, transparent ${fadeHeight}%)` }}
      />
    </div>
  );
}
