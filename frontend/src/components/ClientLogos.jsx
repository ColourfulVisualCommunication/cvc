import { useEffect, useState } from "react";
import { motion } from "framer-motion";

import { listClientLogos } from "../api/client.js";
import { revealOnce } from "../motion/variants.js";
import Container from "./ui/Container.jsx";
import LogoShowcaseStack from "./ui/LogoShowcaseStack.jsx";

// The stack is a single card's footprint now (logos sit on top of each
// other, not fanned side by side) — sized to genuinely stand out sitting
// inline in the middle of the heading, not read as a small decoration.
function useLogoStackSize() {
  const [size, setSize] = useState(110);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 640px)");
    setSize(mq.matches ? 160 : 110);
    const onChange = (e) => setSize(e.matches ? 160 : 110);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return size;
}

export default function ClientLogos() {
  const [logos, setLogos] = useState([]);
  const stackSize = useLogoStackSize();

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
          <h2 className="mt-6 flex flex-wrap items-center justify-center gap-x-4 gap-y-3 text-4xl font-bold leading-tight tracking-tight text-cvc-ink sm:mt-8 sm:text-5xl">
            <span>We thank you</span>
            <LogoShowcaseStack logos={logos} size={stackSize} />
            <span>for trusting us</span>
          </h2>
          <p className="mt-4 text-lg text-cvc-ink/70">The journey has been colourful.</p>
        </motion.div>
      </Container>
    </section>
  );
}
