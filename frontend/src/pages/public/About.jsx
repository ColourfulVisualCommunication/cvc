import { useEffect } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";

import { fadeUp, stagger, revealOnce } from "../../motion/variants.js";
import Container from "../../components/ui/Container.jsx";
import Pullquote from "../../components/ui/Pullquote.jsx";
import WhatsAppCTA from "../../components/ui/WhatsAppCTA.jsx";
import ArrowIcon from "../../components/ui/ArrowIcon.jsx";
import Breadcrumbs from "../../components/ui/Breadcrumbs.jsx";
import Seo, { localBusinessJsonLd } from "../../components/Seo.jsx";
import { markPrerenderReady } from "../../lib/prerenderReady.js";

export default function About() {
  useEffect(markPrerenderReady, []);

  return (
    <>
      <Seo
        title="About"
        path="/about"
        description="CVC is run by Njoroge from Ndeiya, Limuru — one person doing both brand identity and full-stack development."
        jsonLd={localBusinessJsonLd}
      />

      <section className="px-6 pb-16 pt-24 sm:pt-32">
        <Container>
          <Breadcrumbs items={[{ label: "About" }]} />
          <motion.div variants={stagger(0, 0.1)} initial="hidden" animate="visible" className="max-w-2xl">
            <motion.p variants={fadeUp} className="font-mono text-xs uppercase tracking-[0.18em] text-cvc-muted">
              About
            </motion.p>
            <motion.h1 variants={fadeUp} className="mt-5 text-4xl font-bold tracking-tight sm:text-5xl">
              One person, two disciplines most agencies split in two.
            </motion.h1>
            <motion.p variants={fadeUp} className="mt-6 text-lg text-cvc-muted">
              CVC — Colourful Visual Communication — is a strategic creative and
              digital development agency based in Ndeiya, Limuru, Kenya. Founded
              and run by Njoroge, who does both brand identity and full-stack
              development.
            </motion.p>
            <motion.div variants={fadeUp} className="mt-6">
              <Link
                to="/about/our-story"
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-cvc-paper"
              >
                Read the full story
                <ArrowIcon size={16} />
              </Link>
            </motion.div>
          </motion.div>
        </Container>
      </section>

      <section className="border-t border-white/10 px-6 py-16">
        <Container className="max-w-2xl">
          <motion.div {...revealOnce} variants={stagger(0.1)}>
            <motion.h2 variants={fadeUp} className="text-2xl font-bold tracking-tight">
              The moat
            </motion.h2>
            <motion.div variants={fadeUp} className="mt-4">
              <Pullquote>Most brand designers can&rsquo;t build. Most developers can&rsquo;t brand.</Pullquote>
            </motion.div>
            <motion.p variants={fadeUp} className="mt-4 text-cvc-muted">
              That combination — one person who can define how a business looks
              and then actually build the site or app that carries it — is what
              CVC sells.
            </motion.p>
          </motion.div>
        </Container>
      </section>

      <section className="border-t border-white/10 px-6 py-16">
        <Container className="max-w-2xl">
          <motion.div {...revealOnce} variants={stagger(0.1)}>
            <motion.h2 variants={fadeUp} className="text-2xl font-bold tracking-tight">
              How work reaches us
            </motion.h2>
            <motion.p variants={fadeUp} className="mt-4 text-cvc-muted">
              Almost every client arrives through a relationship — a meeting, a
              WhatsApp message, a phone call from a referral, a friend. We keep
              it that simple: no chatbots, no sales funnel. A conversation,
              a scope, a quote, a deposit, the work, and delivery once it's
              paid for.
            </motion.p>
          </motion.div>
        </Container>
      </section>

      <section className="border-t border-white/10 px-6 py-20 text-center">
        <Container>
          <motion.div {...revealOnce}>
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Talk to us directly on WhatsApp.
            </h2>
            <div className="mt-8">
              <WhatsAppCTA />
            </div>
          </motion.div>
        </Container>
      </section>
    </>
  );
}
