import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";

import { listServices } from "../../api/client.js";
import { fadeUp, stagger, revealOnce } from "../../motion/variants.js";
import Container from "../../components/ui/Container.jsx";
import Breadcrumbs from "../../components/ui/Breadcrumbs.jsx";
import Seo from "../../components/Seo.jsx";
import { markPrerenderReady } from "../../lib/prerenderReady.js";

const TIER_LABELS = {
  0: "A place to start",
  1: "Brand identity",
  2: "Digital presence",
  3: "Applications",
  4: "Flagship",
  5: "Retainers",
};

function formatPrice(s) {
  if (s.price_type === "quoted") {
    if (s.price_cents && s.price_max_cents) {
      return `KES ${(s.price_cents / 100).toLocaleString()} – ${(s.price_max_cents / 100).toLocaleString()}`;
    }
    return "Quoted";
  }
  if (!s.price_cents) return "Quoted";
  const base = `KES ${(s.price_cents / 100).toLocaleString()}`;
  return s.price_max_cents ? `${base} – ${(s.price_max_cents / 100).toLocaleString()}` : base;
}

export default function Services() {
  const [services, setServices] = useState([]);

  useEffect(() => {
    listServices().then((s) => setServices(s.items ?? [])).catch(() => {}).finally(markPrerenderReady);
  }, []);

  const byTier = services.reduce((acc, s) => {
    (acc[s.tier] ??= []).push(s);
    return acc;
  }, {});

  return (
    <>
      <Seo
        title="Services"
        path="/services"
        description="The full CVC service ladder — from a KES 10,000 clarity session to flagship brand-and-build engagements, plus monthly retainers."
      />

      <section className="px-6 pb-16 pt-24 sm:pt-32">
        <Container>
          <Breadcrumbs items={[{ label: "Services" }]} />
          <motion.div variants={stagger(0, 0.1)} initial="hidden" animate="visible" className="max-w-2xl">
            <motion.p variants={fadeUp} className="font-mono text-xs font-semibold uppercase tracking-[0.18em] sm:text-sm lg:text-base text-cvc-muted">
              Services
            </motion.p>
            <motion.h1 variants={fadeUp} className="mt-5 text-5xl font-bold tracking-tight sm:text-6xl lg:text-7xl">
              A ladder, not a guess.
            </motion.h1>
            <motion.p variants={fadeUp} className="mt-6 text-xl text-cvc-paper/80">
              Fixed packages where the scope is predictable, quoted bands where
              it isn't. Every price below is a real starting point for a
              conversation, not a locked-in figure.
            </motion.p>
          </motion.div>
        </Container>
      </section>

      {Object.entries(byTier).map(([tier, items]) => (
        <section key={tier} className="border-t border-white/10 px-6 py-16">
          <Container>
            <motion.h2 {...revealOnce} className="text-sm font-semibold uppercase tracking-wide text-cvc-cyan">
              {TIER_LABELS[tier] ?? `Tier ${tier}`}
            </motion.h2>

            <motion.div {...revealOnce} variants={stagger(0.08)} className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((s) => (
                <motion.div key={s.slug} variants={fadeUp}>
                  <Link
                    to={`/services/${s.slug}`}
                    className="group flex h-full flex-col justify-between border border-white/10 p-6 transition-colors hover:border-cvc-paper"
                  >
                    <div>
                      <h3 className="text-lg font-semibold">{s.name}</h3>
                      <p className="mt-2 text-sm text-cvc-muted">{s.summary}</p>
                    </div>
                    <div className="mt-6 flex items-center justify-between text-sm">
                      <span className="font-mono text-cvc-paper">{formatPrice(s)}</span>
                      {s.duration && <span className="text-cvc-muted">{s.duration}</span>}
                    </div>
                  </Link>
                </motion.div>
              ))}
            </motion.div>
          </Container>
        </section>
      ))}
    </>
  );
}
