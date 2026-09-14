import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";

import { listClientLogos } from "../api/client.js";
import { fadeUp, stagger, revealOnce } from "../motion/variants.js";
import Container from "./ui/Container.jsx";

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
    <section className="overflow-hidden border-t border-white/10 py-20">
      <Container>
        <motion.div {...revealOnce} variants={stagger(0.08)} className="text-center">
          <motion.p variants={fadeUp} className="font-mono text-xs uppercase tracking-[0.18em] text-cvc-muted">
            Who we've worked with
          </motion.p>
          <motion.h2 variants={fadeUp} className="mx-auto mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
            In good company.
          </motion.h2>
        </motion.div>
      </Container>

      {/* No edge fade — the logos should read clearly all the way to the
          screen edge, not dissolve into the background. The scroll itself
          only starts once this section is actually in view. */}
      <motion.div
        className="mt-12 flex w-max items-center gap-20"
        whileInView={reduceMotion ? undefined : { x: ["0%", "-50%"] }}
        viewport={{ once: true }}
        transition={reduceMotion ? undefined : { duration: 36, repeat: Infinity, ease: "linear" }}
      >
        {track.map((logo, i) => (
          // Client logos are uploaded art with their own (often dark)
          // colors, designed against a light background — a solid paper
          // chip behind each one keeps them visible now that the page
          // itself is dark, regardless of what color the logo is.
          <div key={`${logo.id}-${i}`} className="flex h-16 shrink-0 items-center bg-cvc-paper px-5 sm:h-20">
            <img
              src={logo.logo_url}
              alt={logo.name}
              className="h-8 w-auto transition-all duration-300 [@media(hover:hover)]:grayscale [@media(hover:hover)]:hover:scale-110 [@media(hover:hover)]:hover:grayscale-0 sm:h-10"
            />
          </div>
        ))}
      </motion.div>
    </section>
  );
}
