import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";

import { listClientLogos } from "../api/client.js";

// Repeat the real logos enough times that the base set alone is wider than
// any realistic viewport — with only a handful of real logos, [...logos,
// ...logos] can end up narrower than the screen, so the "infinite" loop
// visibly plays out in a small cluster instead of crossing edge to edge.
function padToMinimum(items, minimum) {
  if (items.length === 0) return items;
  const repeats = Math.ceil(minimum / items.length);
  return Array.from({ length: repeats }, () => items).flat();
}

export default function ClientLogos() {
  const [logos, setLogos] = useState([]);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    listClientLogos().then((r) => setLogos(r.items ?? [])).catch(() => {});
  }, []);

  if (logos.length === 0) return null;

  const padded = padToMinimum(logos, 10);
  // Duplicated so the loop can wrap seamlessly at -50% instead of snapping.
  const track = [...padded, ...padded];

  return (
    <section className="overflow-hidden border-t border-black/5 py-20">
      <p className="px-6 text-center font-mono text-xs uppercase tracking-[0.18em] text-cvc-muted">
        Clients we've worked with
      </p>

      <div className="relative mt-12">
        <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-24 bg-gradient-to-r from-cvc-paper to-transparent" />
        <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-24 bg-gradient-to-l from-cvc-paper to-transparent" />

        <motion.div
          className="flex w-max items-center gap-20"
          animate={reduceMotion ? undefined : { x: ["0%", "-50%"] }}
          transition={reduceMotion ? undefined : { duration: 36, repeat: Infinity, ease: "linear" }}
        >
          {track.map((logo, i) => (
            <img
              key={`${logo.id}-${i}`}
              src={logo.logo_url}
              alt={logo.name}
              className="h-16 w-auto shrink-0 grayscale transition-all duration-300 hover:scale-110 hover:grayscale-0 sm:h-20"
            />
          ))}
        </motion.div>
      </div>
    </section>
  );
}
