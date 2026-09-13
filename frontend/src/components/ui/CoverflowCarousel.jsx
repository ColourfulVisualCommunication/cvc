import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

import ArrowIcon from "./ArrowIcon.jsx";

// Ported from a Framer community component ("Coverflow Carousel") into
// plain React — the drag physics, 3D transform math and settle animation
// are unchanged; Framer-only pieces (property controls, the static-render
// branch used inside the Framer editor) are dropped since this always runs
// as a real client component. Radius defaults to 0 and colors default to
// brand tokens instead of the original's rounded, neutral-grey look, to
// match the rest of the site.
export default function CoverflowCarousel({
  slides,
  onSelectSlide,
  rotate = 44,
  depth = 0.6,
  perspective = 3,
  falloff = 0.56,
  fade = 0.1,
  cardWidth = "clamp(180px, 28vw, 320px)",
  gap = 0.05,
  radius = 0,
  loop = true,
  showCaption = true,
  showPagination = true,
  showNavigation = true,
  label = "Work carousel",
  textColor = "var(--color-cvc-ink)",
  mutedColor = "var(--color-cvc-muted)",
  cardColor = "var(--color-cvc-paper)",
  controlColor = "rgba(255,255,255,0.85)",
  controlIconColor = "var(--color-cvc-ink)",
  ringColor = "var(--color-cvc-amber)",
}) {
  const count = slides.length;

  const frameRef = useRef(null);
  const cardRefs = useRef([]);
  const positionRef = useRef(0);
  const targetRef = useRef(0);
  const widthRef = useRef(0);
  const rafRef = useRef(null);
  const dragRef = useRef(null);
  const [selected, setSelected] = useState(0);

  const indexAt = useCallback(
    (position) => {
      if (!count) return 0;
      return ((Math.round(position) % count) + count) % count;
    },
    [count]
  );

  const paint = useCallback(() => {
    const width = widthRef.current;
    if (!width || !count) return;
    const pitch = width * (1 + gap);
    const position = positionRef.current;
    cardRefs.current.forEach((card, index) => {
      if (!card) return;
      let offset = index - position;
      if (loop) {
        offset = ((offset % count) + count) % count;
        if (offset > count / 2) offset -= count;
      }
      const distance = Math.abs(offset);
      const ramp = Math.pow(distance, falloff);
      const tilt = Math.min(rotate * ramp, 82) * Math.sign(offset);
      card.style.transform = `translateX(calc(-50% + ${offset * pitch}px)) translateZ(${-depth * width * ramp}px) rotateY(${-tilt}deg)`;
      const edge = loop ? Math.min(1, Math.max(0, count / 2 - distance)) : 1;
      card.style.opacity = String(Math.max(0, 1 - fade * distance) * edge);
      card.style.zIndex = String(100 - Math.round(distance));
    });
  }, [count, depth, fade, falloff, gap, loop, rotate]);

  const clamp = useCallback((position) => (loop ? position : Math.max(0, Math.min(count - 1, position))), [count, loop]);

  const settle = useCallback(
    (target) => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      targetRef.current = target;
      const nextSelected = indexAt(target);
      setSelected(nextSelected);
      onSelectSlide?.(nextSelected);
      const tick = () => {
        const remaining = target - positionRef.current;
        if (Math.abs(remaining) < 4e-4) {
          positionRef.current = target;
          paint();
          rafRef.current = null;
          return;
        }
        positionRef.current += remaining * 0.16;
        paint();
        rafRef.current = requestAnimationFrame(tick);
      };
      rafRef.current = requestAnimationFrame(tick);
    },
    [indexAt, onSelectSlide, paint]
  );

  const nudge = useCallback((amount) => settle(clamp(Math.round(targetRef.current) + amount)), [clamp, settle]);

  const goTo = useCallback(
    (index) => {
      const target = loop ? index + Math.round((targetRef.current - index) / count) * count : index;
      settle(clamp(target));
    },
    [clamp, count, loop, settle]
  );

  useLayoutEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;
    const measure = () => {
      const card = cardRefs.current[0];
      if (!card) return;
      widthRef.current = card.offsetWidth;
      paint();
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(frame);
    return () => observer.disconnect();
  }, [paint]);

  useEffect(() => () => rafRef.current !== null && cancelAnimationFrame(rafRef.current), []);

  if (count === 0) return null;

  const active = slides[Math.min(selected, count - 1)];

  return (
    <div style={{ width: "100%" }} role="region" aria-roledescription="carousel" aria-label={label}>
      <style>{`
        .cf-frame { cursor: grab; outline: none; }
        .cf-frame:active { cursor: grabbing; }
        .cf-frame:focus-visible { outline: 2px solid ${ringColor}; outline-offset: -2px; }
        .cf-nav { transition: opacity 160ms ease, transform 160ms ease; }
        .cf-nav:hover { opacity: 1 !important; }
        .cf-dot { transition: opacity 200ms ease; }
        @media (prefers-reduced-motion: reduce) { .cf-nav, .cf-dot { transition: none; } }
      `}</style>

      <div style={{ position: "relative" }}>
        <div
          ref={frameRef}
          className="cf-frame"
          tabIndex={0}
          onPointerDown={(event) => {
            if (rafRef.current !== null) {
              cancelAnimationFrame(rafRef.current);
              rafRef.current = null;
            }
            event.currentTarget.setPointerCapture(event.pointerId);
            targetRef.current = positionRef.current;
            dragRef.current = {
              pointerId: event.pointerId,
              startX: event.clientX,
              startPosition: positionRef.current,
              velocity: 0,
              time: performance.now(),
              moved: 0,
            };
          }}
          onPointerMove={(event) => {
            const drag = dragRef.current;
            if (!drag || drag.pointerId !== event.pointerId) return;
            const pitch = widthRef.current * (1 + gap);
            if (!pitch) return;
            const now = performance.now();
            const previous = positionRef.current;
            drag.moved += Math.abs(event.clientX - drag.startX);
            positionRef.current = clamp(drag.startPosition - (event.clientX - drag.startX) / pitch);
            drag.velocity = ((positionRef.current - previous) / Math.max(now - drag.time, 1)) * 1000;
            drag.time = now;
            const nextIndex = indexAt(positionRef.current);
            if (nextIndex !== selected) setSelected(nextIndex);
            paint();
          }}
          onPointerUp={(event) => {
            const drag = dragRef.current;
            if (!drag || drag.pointerId !== event.pointerId) return;
            dragRef.current = null;
            const momentum = Math.max(-2, Math.min(2, drag.velocity * 0.18));
            settle(clamp(Math.round(positionRef.current + momentum)));
          }}
          onPointerCancel={() => {
            dragRef.current = null;
            settle(clamp(Math.round(positionRef.current)));
          }}
          onKeyDown={(event) => {
            if (event.key === "ArrowLeft") {
              event.preventDefault();
              nudge(-1);
            }
            if (event.key === "ArrowRight") {
              event.preventDefault();
              nudge(1);
            }
          }}
          style={{
            overflow: "hidden",
            paddingTop: 40,
            paddingBottom: 40,
            perspective: `${perspective * 300}px`,
            touchAction: "pan-y",
          }}
        >
          <div style={{ position: "relative", height: cardWidth, transformStyle: "preserve-3d" }}>
            {slides.map((slide, index) => (
              <div
                key={slide.key ?? index}
                ref={(node) => (cardRefs.current[index] = node)}
                role="group"
                aria-roledescription="slide"
                aria-label={`${index + 1} of ${count}`}
                onClick={() => {
                  const drag = dragRef.current;
                  if (drag && drag.moved > 6) return;
                  if (index === selected) slide.onOpen?.();
                  else goTo(index);
                }}
                style={{
                  position: "absolute",
                  left: "50%",
                  top: 0,
                  width: cardWidth,
                  aspectRatio: "1 / 1",
                  overflow: "hidden",
                  borderRadius: radius,
                  background: cardColor,
                  boxShadow: "0 20px 25px -5px rgba(0,0,0,0.18), 0 8px 10px -6px rgba(0,0,0,0.14)",
                  backfaceVisibility: "hidden",
                  willChange: "transform",
                  cursor: index === selected ? "pointer" : "grab",
                }}
              >
                <img
                  src={slide.image}
                  alt={slide.alt || ""}
                  draggable={false}
                  style={{ width: "100%", height: "100%", display: "block", objectFit: "cover", pointerEvents: "none" }}
                />
              </div>
            ))}
          </div>
        </div>

        {showNavigation && (
          <>
            <button
              type="button"
              aria-label="Previous slide"
              className="cf-nav"
              onClick={() => nudge(-1)}
              style={{
                position: "absolute",
                left: 12,
                top: "50%",
                transform: "translateY(-50%)",
                zIndex: 200,
                width: 40,
                height: 40,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                border: "none",
                borderRadius: 999,
                background: controlColor,
                backdropFilter: "blur(8px)",
                opacity: 0.85,
                cursor: "pointer",
              }}
            >
              <ArrowIcon size={20} className="rotate-180" style={{ color: controlIconColor }} />
            </button>
            <button
              type="button"
              aria-label="Next slide"
              className="cf-nav"
              onClick={() => nudge(1)}
              style={{
                position: "absolute",
                right: 12,
                top: "50%",
                transform: "translateY(-50%)",
                zIndex: 200,
                width: 40,
                height: 40,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                border: "none",
                borderRadius: 999,
                background: controlColor,
                backdropFilter: "blur(8px)",
                opacity: 0.85,
                cursor: "pointer",
              }}
            >
              <ArrowIcon size={20} style={{ color: controlIconColor }} />
            </button>
          </>
        )}
      </div>

      {showCaption && active?.title && (
        <div style={{ marginTop: 8, display: "flex", flexDirection: "column", alignItems: "center", padding: "0 24px" }}>
          <p style={{ margin: 0, fontSize: 17, fontWeight: 700, color: textColor }}>{active.title}</p>
          {active.subtitle && <p style={{ margin: "4px 0 0", fontSize: 13, color: mutedColor }}>{active.subtitle}</p>}
        </div>
      )}

      {showPagination && (
        <div style={{ marginTop: 20, display: "flex", justifyContent: "center", gap: 8 }}>
          {slides.map((_, index) => (
            <button
              key={index}
              type="button"
              aria-label={`Go to slide ${index + 1}`}
              aria-current={index === selected}
              onClick={() => goTo(index)}
              className="cf-dot"
              style={{
                width: 8,
                height: 8,
                padding: 0,
                border: "none",
                borderRadius: 999,
                background: textColor,
                opacity: index === selected ? 1 : 0.3,
                cursor: "pointer",
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
