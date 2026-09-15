import { useEffect, useState } from "react";
import { motion } from "framer-motion";

import { listClientLogos } from "../api/client.js";
import { revealOnce } from "../motion/variants.js";
import Container from "./ui/Container.jsx";
import LogoShowcaseStack from "./ui/LogoShowcaseStack.jsx";

// The stack's footprint scales directly with `size` (5 cards fanned out
// at size=140 is ~500px wide) — too wide for a phone screen, so this
// picks a smaller size below the sm breakpoint rather than overflowing.
function useLogoStackSize() {
  const [size, setSize] = useState(84);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 640px)");
    setSize(mq.matches ? 140 : 76);
    const onChange = (e) => setSize(e.matches ? 140 : 76);
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
          <div className="mt-8 flex justify-center sm:mt-10">
            <LogoShowcaseStack logos={logos} size={stackSize} />
          </div>
          <h2 className="mt-8 text-4xl font-bold leading-tight tracking-tight text-cvc-ink sm:mt-10 sm:text-5xl">
            We thank you for trusting us
          </h2>
          <p className="mt-4 text-lg text-cvc-ink/70">The journey has been colourful.</p>
        </motion.div>
      </Container>
    </section>
  );
}
