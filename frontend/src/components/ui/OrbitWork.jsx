import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";

import Container from "./Container.jsx";

// A pinned, scroll-driven 3D card carousel — ported from a Framer
// Marketplace component ("OrbitProject") into plain React/DOM. Only the
// Framer-editor-only surface was dropped: `addPropertyControls`,
// `ControlType`, `RenderTarget`, `useIsStaticRenderer`, and the whole
// property-panel config layer they powered (~50 tunable props across 7
// groups). The math — the orbit curve, depth-based scale/opacity, and the
// flatten-into-a-grid finish — is preserved as-is; that finish is the
// whole reason this is safe to ship, see below.
//
// This project already tried a scroll-jacked project gallery once
// ("OrbitProjects", see git history) and removed it: it left a long dead
// stretch of empty background with no cards in view. This component
// doesn't repeat that, structurally — cards enter early (staggered across
// the first ~20% of scroll) and, critically, the orbit doesn't just end;
// it *flattens into a real static grid* over the final third of the
// scroll, so the section closes on settled, fully-visible content rather
// than empty space. `SCROLL_LENGTH` below is still tuned down hard from
// the reference default (460vh) to match having ~5 real portfolio pieces
// rather than a dozen+.
//
// Imperative style-on-scroll (bypassing React state per frame), matching
// the convention already used in ScrollTimeline/HeroTunnel/LogoMarquee.

function clamp(value, min = 0, max = 1) {
  return Math.min(Math.max(value, min), max);
}
function lerp(from, to, progress) {
  return from + (to - from) * progress;
}
// A steeper smoothstep — eases in/out harder than a plain cubic, which is
// what makes the orbit's enter/exit and the grid-flatten read as a
// deliberate settle rather than a linear slide.
function smootherstep(start, end, value) {
  if (start === end) return value < start ? 0 : 1;
  const t = clamp((value - start) / (end - start));
  return t * t * t * (t * (t * 6 - 15) + 10);
}

const DESKTOP_BREAKPOINT = 1024;

// Tuned for ~5 real portfolio pieces — long enough that the orbit reads
// as deliberate, short enough that every stretch of it has cards moving
// in view. Reference default was 460vh; that number was calibrated for a
// much larger item count and is exactly the kind of value that left dead
// scroll space last time.
//
// START_OFFSET is a *fixed-pixel* head start (innerHeight * this), not a
// fraction of the scroll track — measured empirically, the exact same
// number of pixels reappears as dead flat time at the *end* of the pin
// (progress hits 1 well before the sticky frame mechanically releases).
// Keeping it small keeps that tail small; 0.55 (the reference default)
// left roughly 40% of the whole pin sitting on an already-settled grid.
const SCROLL_LENGTH_VH = 220;
const START_OFFSET = 0.12;
const SMOOTHNESS = 7;
const CURVE_WIDTH = 460;
const CURVE_HEIGHT = 170;
const DEPTH = 400;
const ORBIT_ROTATION = 260;
const CARD_WIDTH = 300;
const CARD_ASPECT = 1.3;
const OFFSET_Y = -20;
const GRID_COLUMNS = 3;
const GRID_GAP = 24;
const GRID_MAX_WIDTH = 1160;

// A callback-ref-returned cleanup function only runs automatically in
// React 19+; this codebase is on React 18, so the observer is tracked via
// state + a plain effect instead — a ref callback that returns a cleanup
// here would just leak the ResizeObserver on unmount.
function useContainerSize() {
  const [node, setNode] = useState(null);
  const [size, setSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    if (!node) return;
    const observer = new ResizeObserver(([entry]) => {
      const box = entry.contentBoxSize?.[0];
      setSize(
        box
          ? { width: box.inlineSize, height: box.blockSize }
          : { width: entry.contentRect.width, height: entry.contentRect.height },
      );
    });
    observer.observe(node);
    setSize({ width: node.clientWidth, height: node.clientHeight });
    return () => observer.disconnect();
  }, [node]);

  return [setNode, size];
}

// Purely presentational — every positioning style (transform, opacity,
// width, height, zIndex) is set imperatively on this element's own ref by
// the scroll loop below, not computed from props. Driving it through
// props would mean two competing style sources (React's render and the
// rAF loop) fighting over the same element every frame.
function OrbitCard({ innerRef, item, width, height }) {
  return (
    <Link
      ref={innerRef}
      to={`/work/${item.slug}`}
      style={{
        position: "absolute",
        left: "50%",
        top: "50%",
        width,
        height,
        transformStyle: "preserve-3d",
        backfaceVisibility: "hidden",
        willChange: "transform, opacity",
      }}
      className="group block overflow-hidden bg-cvc-paper shadow-2xl"
    >
      <div className="relative h-full w-full overflow-hidden">
        <img
          src={item.cover_image_url}
          alt={item.title}
          loading="lazy"
          draggable={false}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
          style={{ backfaceVisibility: "hidden" }}
        />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-linear-to-t from-cvc-ink/80 to-transparent p-4 pt-10">
          <h3 className="text-base font-bold text-cvc-paper sm:text-lg">{item.title}</h3>
        </div>
      </div>
    </Link>
  );
}

function CompactGrid({ items }) {
  return (
    <div className="grid gap-6 sm:grid-cols-2">
      {items.map((item) => (
        <Link
          key={item.slug}
          to={`/work/${item.slug}`}
          className="group block overflow-hidden bg-cvc-paper shadow-lg transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl"
        >
          <div className="aspect-4/3 overflow-hidden">
            <img
              src={item.cover_image_url}
              alt={item.title}
              loading="lazy"
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
            />
          </div>
          <div className="p-5">
            <h3 className="text-lg font-bold text-cvc-ink">{item.title}</h3>
          </div>
        </Link>
      ))}
    </div>
  );
}

/**
 * A pinned, scroll-driven orbit of project cards that settles into a
 * static grid by the end of its own scroll range. `items` needs
 * `slug`, `title`, `cover_image_url`. Below `DESKTOP_BREAKPOINT` this
 * drops straight to a plain static grid — the same "don't force a
 * scroll-jacked effect that doesn't fit" call this codebase already
 * makes elsewhere (see ServiceLadder's `useIsDesktop`).
 */
export default function OrbitWork({ items }) {
  const rootRef = useRef(null);
  const cardRefs = useRef([]);
  const titleRef = useRef(null);
  const [viewportRef, viewport] = useContainerSize();
  const [isDesktop, setIsDesktop] = useState(true);

  useLayoutEffect(() => {
    const mq = window.matchMedia(`(min-width: ${DESKTOP_BREAKPOINT}px)`);
    setIsDesktop(mq.matches);
    const onChange = (e) => setIsDesktop(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    if (!isDesktop) return;
    const root = rootRef.current;
    if (!root) return;

    // Optimistic default, not false — IntersectionObserver's first
    // callback is asynchronous and not guaranteed to land promptly,
    // especially under the exact main-thread load a fast scroll gesture
    // creates. Gating the loop's very first start on that callback meant
    // a fast scroll could reach this section before the observer ever
    // confirmed it was near, leaving every card frozen at its initial
    // (fully transparent, unrevealed) state with nothing left to wake it
    // — reproduced directly: fast-scroll in, stop, wait, still empty.
    // Starting optimistically costs nothing (the loop is cheap, and the
    // observer corrects `isNear` to false soon after if it's ever wrong)
    // and makes correctness independent of the callback's timing.
    let isNear = true;
    const io = new IntersectionObserver(
      ([entry]) => {
        isNear = entry.isIntersecting;
        if (isNear) wake();
      },
      { rootMargin: "100% 0px 100% 0px" },
    );
    io.observe(root);

    let target = 0;
    let current = 0;
    let raf = null;
    let lastTime = performance.now();

    function computeTarget() {
      const bounds = root.getBoundingClientRect();
      const entryLead = window.innerHeight * START_OFFSET;
      const availableDistance = Math.max(bounds.height - window.innerHeight, 1);
      target = clamp((entryLead - bounds.top) / availableDistance);
    }

    function applyAt(progress) {
      const viewportWidth = viewport.width || window.innerWidth;
      const viewportHeight = viewport.height || window.innerHeight;
      const cardHeight = CARD_WIDTH / CARD_ASPECT;

      const itemCount = items.length;
      const orbitProgress = smootherstep(0.05, 0.68, progress);

      const columns = Math.min(GRID_COLUMNS, itemCount);
      const gridWidth = Math.min(GRID_MAX_WIDTH, viewportWidth - 48);
      const gridCardWidth = (gridWidth - GRID_GAP * (columns - 1)) / columns;
      const gridCardHeight = gridCardWidth / CARD_ASPECT;
      const rows = Math.ceil(itemCount / columns);
      const gridBlockHeight = rows * gridCardHeight + (rows - 1) * GRID_GAP;

      items.forEach((_, i) => {
        const el = cardRefs.current[i];
        if (!el) return;

        const baseAngle = (i / itemCount) * 360 - 110;
        const angle = baseAngle + orbitProgress * ORBIT_ROTATION;
        const radians = (angle * Math.PI) / 180;

        const arcCenterX = Math.sin(radians) * CURVE_WIDTH;
        const arcCenterY = Math.cos(radians + 0.65) * CURVE_HEIGHT - viewportHeight * 0.02 + OFFSET_Y;
        const arcZ = Math.cos(radians) * DEPTH;

        const normalizedDepth = (arcZ + DEPTH) / (DEPTH * 2);
        const arcScale = lerp(0.62, 1.08, normalizedDepth);
        const arcOpacity = lerp(0.35, 1, normalizedDepth);
        const arcRotateY = -Math.sin(radians) * 55;
        const arcRotateZ = -Math.sin(radians) * 7;

        const revealStart = 0.02 + i * 0.015;
        const revealEnd = revealStart + 0.16;
        const cardReveal = smootherstep(revealStart, revealEnd, progress);
        const entranceOffset = (1 - cardReveal) * 140;

        const flattenStart = 0.66 + i * 0.01;
        const flattenEnd = flattenStart + 0.24;
        const flattenProgress = smootherstep(flattenStart, flattenEnd, progress);

        const column = i % columns;
        const row = Math.floor(i / columns);
        const gridX = column * (gridCardWidth + GRID_GAP) - gridWidth / 2 + gridCardWidth / 2;
        const gridY = row * (gridCardHeight + GRID_GAP) - gridBlockHeight / 2 + gridCardHeight / 2;

        const x = lerp(arcCenterX, gridX, flattenProgress);
        const y = lerp(arcCenterY + entranceOffset, gridY, flattenProgress);
        const z = lerp(arcZ, 0, flattenProgress);
        const width = lerp(CARD_WIDTH, gridCardWidth, flattenProgress);
        const height = lerp(cardHeight, gridCardHeight, flattenProgress);
        const rotateY = lerp(arcRotateY, 0, flattenProgress);
        const rotateZ = lerp(arcRotateZ, 0, flattenProgress);
        const scale = lerp(arcScale, 1, flattenProgress);
        const opacity = Math.min(cardReveal, lerp(arcOpacity, 1, flattenProgress));

        el.style.width = `${width}px`;
        el.style.height = `${height}px`;
        el.style.opacity = String(opacity);
        el.style.zIndex = String(Math.round(1000 - z));
        el.style.transform = `translate3d(calc(-50% + ${x}px), calc(-50% + ${y}px), ${z}px) rotateY(${rotateY}deg) rotateZ(${rotateZ}deg) scale(${scale})`;
      });

      // Oversized decorative word, sitting behind the orbiting cards —
      // position:absolute inside the pinned viewport, so however big it
      // gets it never adds height to the section itself (per Njoroge:
      // "any text outside the normal section size should float outside
      // the section to avoid adding more height"). Faded in for the
      // early orbit, faded back out before the grid-flatten settles so it
      // never competes with the finished, static layout.
      const title = titleRef.current;
      if (title) {
        const titleIn = smootherstep(0, 0.16, progress);
        const titleOut = smootherstep(0.5, 0.7, progress);
        title.style.opacity = String(titleIn * (1 - titleOut));
        title.style.transform = `translate3d(-50%, calc(-50% + ${(1 - titleIn) * 24}px), 0)`;
      }
    }

    // computeTarget() (a getBoundingClientRect read — forces a synchronous
    // layout recalc) used to be called directly from the 'scroll' event
    // handler, which also decided whether to restart the loop based on
    // whether it had already stopped. That's a race: if a scroll event's
    // computeTarget() landed in between this loop's own settle-check and
    // its `raf = null`, the loop could stop on a target that was already
    // stale by the time it stopped — and since nothing else would ever
    // restart it once the user stopped scrolling, the section could get
    // stuck mid-orbit indefinitely (reproduced with fast real scrolling:
    // cards gone, still gone 800ms after scrolling stopped). Now
    // computeTarget() runs only here, fresh, immediately before it's
    // used, every frame — target and its use are always in the same
    // synchronous tick, so there's no window for a stale read.
    function loop(time) {
      computeTarget();
      const deltaSeconds = Math.min((time - lastTime) / 1000, 0.1);
      lastTime = time;
      const dampingRate = 1 - Math.exp(-SMOOTHNESS * deltaSeconds);
      current += (target - current) * dampingRate;
      const settled = Math.abs(target - current) < 1e-4;
      if (settled) current = target;
      applyAt(current);
      if (!settled && isNear) raf = requestAnimationFrame(loop);
      else raf = null;
    }

    // Scroll/resize now only ever ensure the loop is running — no DOM
    // reads here, so this costs nothing even at native scroll-event
    // frequency (which can far exceed the frame rate during a fast real
    // scroll gesture, unlike a scripted scrollTo-and-wait test).
    function wake() {
      if (isNear && raf == null) {
        lastTime = performance.now();
        raf = requestAnimationFrame(loop);
      }
    }

    window.addEventListener("scroll", wake, { passive: true });
    window.addEventListener("resize", wake);
    computeTarget();
    current = target;
    applyAt(current);
    wake(); // start immediately on mount rather than waiting on the observer's first callback

    return () => {
      io.disconnect();
      window.removeEventListener("scroll", wake);
      window.removeEventListener("resize", wake);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [isDesktop, items, viewport.width, viewport.height]);

  if (!isDesktop) {
    // Unlike the desktop orbit (intentionally full-bleed), the compact
    // fallback is plain content and should sit in the same column as the
    // heading above it — it had no padding at all before this, so cards
    // ran edge-to-edge while the heading was inset by Container's px-6.
    // pb-20 restores the bottom breathing room the old grid had for free
    // (it used to live inside the Work section's own pb-20) — OrbitWork
    // is a separate sibling with no padding of its own, so without this
    // the last card ran flush into the About section below it.
    return (
      <Container className="pb-20">
        <CompactGrid items={items} />
      </Container>
    );
  }

  return (
    <div ref={rootRef} style={{ position: "relative", height: `${SCROLL_LENGTH_VH}vh` }}>
      <div
        ref={viewportRef}
        style={{
          position: "sticky",
          top: 0,
          height: "100svh",
          overflow: "hidden",
        }}
      >
        <span
          ref={titleRef}
          aria-hidden="true"
          className="pointer-events-none absolute left-1/2 top-1/2 select-none whitespace-nowrap font-bold uppercase leading-none tracking-tight text-cvc-ink/10"
          style={{ fontSize: "min(20vw, 260px)", opacity: 0, willChange: "transform, opacity" }}
        >
          Our Work
        </span>

        {/* perspective lives here, not on the sticky element itself —
            perspective (like transform) makes an element establish a new
            3D rendering context, and setting it directly on a
            position:sticky element is a known way to corrupt that
            element's own sticky-offset calculation in some browsers.
            Reproduced directly: under fast real scrolling the sticky
            viewport's own getBoundingClientRect().top measured -872px —
            fully unstuck — at a scroll position well within its
            documented "should still be pinned" range, which is exactly
            this failure mode. perspective only needs to be on an
            ancestor of the 3D-transformed cards, not on the sticky
            element carrying it. */}
        <div style={{ position: "absolute", inset: 0, perspective: 1300, transformStyle: "preserve-3d" }}>
          {items.map((item, i) => (
            <OrbitCard
              key={item.slug}
              innerRef={(el) => (cardRefs.current[i] = el)}
              item={item}
              width={CARD_WIDTH}
              height={CARD_WIDTH / CARD_ASPECT}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
