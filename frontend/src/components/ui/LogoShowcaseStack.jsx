import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

// A stack of logo cards sitting directly on top of each other — a couple
// of tilted layers peeking out behind, the front one auto-flipping to the
// next logo on a timer. Matches the "rotating stack" idiom from a Framer
// Marketplace component, rebuilt in plain Framer Motion (already a
// dependency) rather than ported: the original is wired to Framer's own
// canvas runtime and a fixed image count, whereas this needs to autoplay
// through however many real client logos the API returns.
const FLIP_INTERVAL_MS = 2200;
const PEEK_LAYERS = 2; // how many cards show behind the active one

export default function LogoShowcaseStack({ logos, size = 160 }) {
  const cards = logos.slice(0, 5);
  const [index, setIndex] = useState(0);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (cards.length <= 1 || reduceMotion) return;
    const id = setInterval(() => setIndex((i) => (i + 1) % cards.length), FLIP_INTERVAL_MS);
    return () => clearInterval(id);
  }, [cards.length, reduceMotion]);

  if (cards.length === 0) return null;

  const active = cards[index];

  return (
    <div className="relative" style={{ width: size, height: size * 0.8, perspective: 800 }}>
      {cards.map((logo, i) => {
        const depth = (i - index + cards.length) % cards.length;
        if (depth === 0 || depth > PEEK_LAYERS) return null;
        return (
          <div
            key={logo.id}
            aria-hidden="true"
            className="absolute inset-0 rounded-lg border border-black/10 bg-white shadow-md"
            style={{
              transform: `translate(${depth * 8}px, ${depth * 8}px) rotate(${depth * 5}deg)`,
              zIndex: PEEK_LAYERS - depth,
            }}
          />
        );
      })}

      <AnimatePresence mode="popLayout" initial={false}>
        <motion.div
          key={active.id}
          initial={reduceMotion ? { opacity: 0 } : { opacity: 0, rotateY: -100 }}
          animate={{ opacity: 1, rotateY: 0 }}
          exit={reduceMotion ? { opacity: 0 } : { opacity: 0, rotateY: 100 }}
          transition={{ duration: 0.55, ease: "easeInOut" }}
          style={{ zIndex: PEEK_LAYERS + 1, transformStyle: "preserve-3d" }}
          className="absolute inset-0 flex items-center justify-center overflow-hidden rounded-lg border border-black/10 bg-white p-4 shadow-lg"
        >
          <img
            src={active.logo_url}
            alt={active.name}
            loading="lazy"
            className="h-full w-full object-contain grayscale transition-all duration-200 [@media(hover:hover)]:hover:grayscale-0"
          />
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
