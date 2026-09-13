import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";

import { listPortfolio } from "../../api/client.js";
import { fadeUp, stagger, revealOnce } from "../../motion/variants.js";
import Container from "../../components/ui/Container.jsx";
import WhatsAppCTA from "../../components/ui/WhatsAppCTA.jsx";
import Seo from "../../components/Seo.jsx";
import { markPrerenderReady } from "../../lib/prerenderReady.js";

export default function Portfolio() {
  const [items, setItems] = useState(null);

  useEffect(() => {
    listPortfolio().then((p) => setItems(p.items ?? [])).catch(() => setItems([])).finally(markPrerenderReady);
  }, []);

  return (
    <>
      <Seo
        title="Work"
        path="/work"
        description="Brand identity and digital development projects delivered by CVC."
      />

      <section className="px-6 pb-16 pt-24 sm:pt-32">
        <Container>
          <motion.div variants={stagger(0, 0.1)} initial="hidden" animate="visible" className="max-w-2xl">
            <motion.p variants={fadeUp} className="font-mono text-xs uppercase tracking-[0.18em] text-cvc-muted">
              Work
            </motion.p>
            <motion.h1 variants={fadeUp} className="mt-5 text-4xl font-bold tracking-tight sm:text-5xl">
              What we've built.
            </motion.h1>
          </motion.div>
        </Container>
      </section>

      <section className="border-t border-black/5 px-6 py-16">
        <Container>
          {items === null && <div className="h-40" />}

          {items?.length === 0 && (
            <motion.div {...revealOnce} className="max-w-lg">
              <p className="text-lg text-cvc-muted">
                Case studies are being written up for the site. In the meantime,
                ask on WhatsApp and we'll walk you through recent brand and web
                work directly — screenshots, links, the lot.
              </p>
              <div className="mt-8">
                <WhatsAppCTA text="See recent work on WhatsApp" />
              </div>
            </motion.div>
          )}

          {items?.length > 0 && (
            <motion.div {...revealOnce} variants={stagger(0.08)} className="grid gap-8 sm:grid-cols-2">
              {items.map((p) => (
                <motion.div key={p.slug} variants={fadeUp}>
                  <Link to={`/work/${p.slug}`} className="group block">
                    {p.cover_image_url && (
                      <div className="aspect-[4/3] overflow-hidden bg-black/5">
                        <img
                          src={p.cover_image_url}
                          alt={p.title}
                          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                      </div>
                    )}
                    <h3 className="mt-4 text-lg font-semibold">{p.title}</h3>
                    <p className="text-sm text-cvc-muted">{p.client_name}</p>
                  </Link>
                </motion.div>
              ))}
            </motion.div>
          )}
        </Container>
      </section>
    </>
  );
}
