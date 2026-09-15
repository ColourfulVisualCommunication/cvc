import { useEffect } from "react";
import { motion } from "framer-motion";

import { fadeUp, stagger } from "../../motion/variants.js";
import Container from "../../components/ui/Container.jsx";
import Breadcrumbs from "../../components/ui/Breadcrumbs.jsx";
import WhatsAppCTA from "../../components/ui/WhatsAppCTA.jsx";
import Seo, { localBusinessJsonLd } from "../../components/Seo.jsx";
import { markPrerenderReady } from "../../lib/prerenderReady.js";

export default function Contact() {
  useEffect(markPrerenderReady, []);

  return (
    <>
      <Seo
        title="Contact"
        path="/contact"
        description="Reach CVC on WhatsApp, phone, or email. Ndeiya, Limuru, Kenya."
        jsonLd={localBusinessJsonLd}
      />

      <section className="px-6 pb-24 pt-24 sm:pt-32">
        <Container className="max-w-2xl">
          <Breadcrumbs items={[{ label: "Contact" }]} />
          <motion.div variants={stagger(0, 0.1)} initial="hidden" animate="visible">
            <motion.p variants={fadeUp} className="font-mono text-xs font-semibold uppercase tracking-[0.18em] sm:text-sm lg:text-base text-cvc-muted">
              Contact
            </motion.p>
            <motion.h1 variants={fadeUp} className="mt-5 text-5xl font-bold tracking-tight sm:text-6xl lg:text-7xl">
              Let's talk about it.
            </motion.h1>
            <motion.p variants={fadeUp} className="mt-6 text-xl text-cvc-paper/80">
              The fastest way to reach us is WhatsApp — that's where every CVC
              project actually starts.
            </motion.p>

            <motion.div variants={fadeUp} className="mt-10">
              <WhatsAppCTA text="Message us on WhatsApp" />
            </motion.div>

            <motion.div variants={fadeUp} className="mt-14 grid gap-8 border-t border-white/10 pt-10 sm:grid-cols-2">
              <div>
                <p className="text-xs uppercase tracking-wide text-cvc-muted">Email</p>
                <a
                  href="mailto:njoroge@colourfulvisualcommunication.com"
                  className="mt-1 block font-medium text-cvc-paper underline underline-offset-4"
                >
                  njoroge@colourfulvisualcommunication.com
                </a>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-cvc-muted">Phone / WhatsApp</p>
                <a href="tel:+254769604255" className="mt-1 block font-medium text-cvc-paper underline underline-offset-4">
                  +254 769 604255
                </a>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-cvc-muted">Based in</p>
                <p className="mt-1 font-medium text-cvc-paper">Ndeiya, Limuru, Kenya</p>
              </div>
            </motion.div>
          </motion.div>
        </Container>
      </section>
    </>
  );
}
