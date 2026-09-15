import { useEffect } from "react";
import { motion } from "framer-motion";

import { fadeUp, stagger, revealOnce } from "../../motion/variants.js";
import Container from "../../components/ui/Container.jsx";
import Breadcrumbs from "../../components/ui/Breadcrumbs.jsx";
import WhatsAppCTA from "../../components/ui/WhatsAppCTA.jsx";
import Seo from "../../components/Seo.jsx";
import { markPrerenderReady } from "../../lib/prerenderReady.js";

const STEPS = [
  {
    n: "01",
    title: "Talk",
    body: "A meeting, a call, or a WhatsApp message. We define the problem before anything is priced.",
  },
  {
    n: "02",
    title: "Quote",
    body: "A clear quote with a deposit, sent as a link. No obligation until you accept it.",
  },
  {
    n: "03",
    title: "Deposit",
    body: "Work starts once the deposit clears — verified automatically, receipt sent the same way.",
  },
  {
    n: "04",
    title: "Build",
    body: "Brand identity, a site, or an app — built, shared for feedback, refined.",
  },
  {
    n: "05",
    title: "Deliver",
    body: "Final files and access unlock once the balance is settled. No awkward chase for payment afterward.",
  },
];

export default function Process() {
  useEffect(markPrerenderReady, []);

  return (
    <>
      <Seo
        title="Process"
        path="/process"
        description="How a project moves from a first conversation to delivered files — quote, deposit, build, deliver."
      />

      <section className="px-6 pb-16 pt-24 sm:pt-32">
        <Container>
          <Breadcrumbs items={[{ label: "Process" }]} />
          <motion.div variants={stagger(0, 0.1)} initial="hidden" animate="visible" className="max-w-2xl">
            <motion.p variants={fadeUp} className="font-mono text-xs font-semibold uppercase tracking-[0.18em] sm:text-sm lg:text-base text-cvc-muted">
              Process
            </motion.p>
            <motion.h1 variants={fadeUp} className="mt-5 text-5xl font-bold tracking-tight sm:text-6xl lg:text-7xl">
              Five steps. No surprises.
            </motion.h1>
          </motion.div>
        </Container>
      </section>

      <section className="border-t border-white/10 px-6 py-16">
        <Container className="max-w-2xl">
          <motion.ol {...revealOnce} variants={stagger(0.12)} className="space-y-10">
            {STEPS.map((s) => (
              <motion.li key={s.n} variants={fadeUp} className="flex gap-6">
                <span className="font-mono text-sm text-cvc-amber">{s.n}</span>
                <div>
                  <h3 className="text-lg font-semibold">{s.title}</h3>
                  <p className="mt-1 text-cvc-muted">{s.body}</p>
                </div>
              </motion.li>
            ))}
          </motion.ol>
        </Container>
      </section>

      <section className="border-t border-white/10 px-6 py-20 text-center">
        <Container>
          <motion.div {...revealOnce}>
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Ready to start step one?</h2>
            <div className="mt-8">
              <WhatsAppCTA />
            </div>
          </motion.div>
        </Container>
      </section>
    </>
  );
}
