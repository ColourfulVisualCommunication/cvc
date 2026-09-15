import { useEffect, useState } from "react";
import { motion } from "framer-motion";

import { listClientLogos } from "../api/client.js";
import { revealOnce } from "../motion/variants.js";
import Container from "./ui/Container.jsx";
import LogoMarquee from "./ui/LogoMarquee.jsx";

export default function ClientLogos() {
  const [logos, setLogos] = useState([]);

  useEffect(() => {
    listClientLogos().then((r) => setLogos(r.items ?? [])).catch(() => {});
  }, []);

  if (logos.length === 0) return null;

  return (
    <section className="border-t border-black/10 bg-cvc-paper py-20">
      <Container>
        <motion.div {...revealOnce} className="mx-auto max-w-2xl text-center">
          <p className="font-mono text-xs font-semibold uppercase tracking-[0.18em] text-cvc-ink/70 sm:text-sm lg:text-base">
            {logos.length}+ brands that we work with
          </p>
          <h2 className="mt-6 text-4xl font-bold leading-tight tracking-tight text-cvc-ink sm:text-5xl">
            We thank you for trusting us
          </h2>
          <p className="mt-4 text-lg text-cvc-ink/70">The journey has been colourful.</p>
        </motion.div>
      </Container>

      {/* Full-bleed, edge to edge — not nested in Container — so the
          strip reads as continuous rather than boxed in, matching the
          "big and bold" brief. */}
      <div className="mt-16">
        <LogoMarquee logos={logos} />
      </div>
    </section>
  );
}
