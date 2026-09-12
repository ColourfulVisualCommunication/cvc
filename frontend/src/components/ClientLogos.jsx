import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";

import { listClientLogos } from "../api/client.js";

export default function ClientLogos() {
  const [logos, setLogos] = useState([]);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    listClientLogos().then((r) => setLogos(r.items ?? [])).catch(() => {});
  }, []);

  if (logos.length === 0) return null;

  // Duplicated so the loop can wrap seamlessly at -50% instead of snapping.
  const track = [...logos, ...logos];

  return (
    <section className="overflow-hidden border-t border-black/5 py-16">
      <p className="px-6 text-center font-mono text-xs uppercase tracking-[0.18em] text-cvc-muted">
        Clients we've worked with
      </p>

      <div className="relative mt-10">
        <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-16 bg-gradient-to-r from-cvc-paper to-transparent" />
        <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-16 bg-gradient-to-l from-cvc-paper to-transparent" />

        <motion.div
          className="flex w-max items-center gap-16"
          animate={reduceMotion ? undefined : { x: ["0%", "-50%"] }}
          transition={reduceMotion ? undefined : { duration: 30, repeat: Infinity, ease: "linear" }}
        >
          {track.map((logo, i) => (
            <img
              key={`${logo.id}-${i}`}
              src={logo.logo_url}
              alt={logo.name}
              className="h-10 w-auto shrink-0 grayscale transition-all duration-300 hover:grayscale-0 sm:h-12"
            />
          ))}
        </motion.div>
      </div>
    </section>
  );
}
