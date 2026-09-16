import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";

// A continuous, full-bleed logo strip — inspired by a Framer Marketplace
// component ("LogoScroll"), rebuilt rather than ported: the original is a
// ~40-property motion engine (five interchangeable variants, drag physics,
// tint masking, an editor property panel for every knob) built for
// Framer's canvas, and none of that configurability has anywhere to live
// in this app — there's one call site, wanting one fixed look. What's
// kept is the idea worth keeping: an imperative rAF loop driving
// transform directly (bypassing React state, same convention as
// ScrollTimeline/HeroTunnel elsewhere in this codebase) so the scroll is
// smooth regardless of how many logos there are, plus the edge-fade mask
// for a seamless infinite feel.
const SPEED_PX_S = 40;
// Page-scroll input temporarily overrides the free-run speed above —
// scrolling down speeds the strip up (same direction), scrolling up
// pushes hard enough the other way to actually reverse it, and the
// impulse decays back to the free-run speed once scrolling stops. Same
// idea as the original Framer component's own "scroll boost" property.
const SCROLL_BOOST = 6;
const BOOST_DECAY = 0.45;

function mod(n, m) {
  return ((n % m) + m) % m;
}

// 72 was too small for the wider/more detailed logos in the actual set —
// several run 2.5-3.8:1 (width:height), often a wordmark stacked over a
// tagline or a swirl mark beside text, designed to read clearly at normal
// size but not at a 72px-tall render — elements that are simply close
// together in the source artwork start looking like they overlap once
// scaled down that far. 96 gives them enough room without making the
// strip's overall height feel oversized next to its own gap-16 spacing.
export default function LogoMarquee({ logos, height = 96 }) {
  const trackRef = useRef(null);
  const offsetRef = useRef(0);
  const boostRef = useRef(0);
  const [setWidth, setSetWidth] = useState(0);
  const reduceMotion = useReducedMotion();

  // The track renders two back-to-back copies of the logo list; once it
  // has scrolled exactly one copy's width, wrapping the offset back to 0
  // is invisible — the second copy is sitting exactly where the first
  // started. scrollWidth is measured post-layout since logo images
  // decode asynchronously and change it.
  useEffect(() => {
    const track = trackRef.current;
    if (!track || typeof ResizeObserver === "undefined") return;
    const measure = () => setSetWidth(track.scrollWidth / 2);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(track);
    return () => ro.disconnect();
  }, [logos]);

  useEffect(() => {
    if (reduceMotion) return;
    let lastY = window.scrollY;
    function onScroll() {
      const y = window.scrollY;
      boostRef.current = Math.max(-400, Math.min(400, boostRef.current + (y - lastY) * SCROLL_BOOST));
      lastY = y;
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [reduceMotion]);

  useEffect(() => {
    if (reduceMotion || !setWidth) return;
    let raf;
    let last = 0;
    const step = (ts) => {
      if (!last) last = ts;
      const dt = Math.min(0.05, (ts - last) / 1000);
      last = ts;
      boostRef.current *= Math.exp(-dt / BOOST_DECAY);
      offsetRef.current = mod(offsetRef.current + (SPEED_PX_S + boostRef.current) * dt, setWidth);
      if (trackRef.current) trackRef.current.style.transform = `translateX(${-offsetRef.current}px)`;
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [setWidth, reduceMotion]);

  if (logos.length === 0) return null;
  const doubled = [...logos, ...logos];

  return (
    <div
      className="relative w-full overflow-hidden"
      style={{
        WebkitMaskImage: "linear-gradient(90deg, transparent 0, #000 8%, #000 92%, transparent 100%)",
        maskImage: "linear-gradient(90deg, transparent 0, #000 8%, #000 92%, transparent 100%)",
      }}
    >
      <div ref={trackRef} className="flex w-max items-center gap-16">
        {doubled.map((logo, i) => (
          <img
            key={`${logo.id}-${i}`}
            src={logo.logo_url}
            alt={logo.name}
            loading="lazy"
            className="shrink-0 object-contain grayscale transition-all duration-300 [@media(hover:hover)]:hover:scale-110 [@media(hover:hover)]:hover:grayscale-0"
            style={{ height }}
          />
        ))}
      </div>
    </div>
  );
}
