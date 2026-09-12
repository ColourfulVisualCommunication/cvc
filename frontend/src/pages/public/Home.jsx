import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";

import { listServices, listPortfolio, listTestimonials } from "../../api/client.js";
import { fadeUp, stagger, revealOnce } from "../../motion/variants.js";
import Container from "../../components/ui/Container.jsx";
import WhatsAppCTA from "../../components/ui/WhatsAppCTA.jsx";
import Seo, { localBusinessJsonLd } from "../../components/Seo.jsx";

export default function Home() {
  const [services, setServices] = useState([]);
  const [portfolio, setPortfolio] = useState([]);
  const [testimonials, setTestimonials] = useState([]);

  useEffect(() => {
    listServices().then((s) => setServices((s.items ?? []).slice(0, 3))).catch(() => {});
    listPortfolio().then((p) => setPortfolio(p.items ?? [])).catch(() => {});
    listTestimonials().then((t) => setTestimonials(t.items ?? [])).catch(() => {});
  }, []);

  return (
    <>
      <Seo path="/" jsonLd={localBusinessJsonLd} />

      <section className="px-6 pb-20 pt-24 sm:pt-32">
        <Container>
          <motion.div variants={stagger(0, 0.1)} initial="hidden" animate="visible" className="max-w-3xl">
            <motion.p variants={fadeUp} className="font-mono text-xs uppercase tracking-[0.18em] text-cvc-muted">
              Colourful Visual Communication · Ndeiya, Limuru
            </motion.p>
            <motion.h1 variants={fadeUp} className="mt-5 text-5xl font-bold leading-[1.05] tracking-tight sm:text-7xl">
              From idea to action.
              <br />
              <span className="text-cvc-amber">From action</span> to reality.
            </motion.h1>
            <motion.p variants={fadeUp} className="mt-6 max-w-xl text-lg text-cvc-muted">
              Brand identity and digital development from one team — most brand
              designers can't build, most developers can't brand. We do both.
            </motion.p>
            <motion.div variants={fadeUp} className="mt-9 flex flex-wrap items-center gap-4">
              <WhatsAppCTA />
              <Link to="/work" className="text-sm font-semibold text-cvc-ink underline underline-offset-4">
                See our work
              </Link>
            </motion.div>
          </motion.div>
        </Container>
      </section>

      {services.length > 0 && (
        <section className="border-t border-black/5 px-6 py-20">
          <Container>
            <motion.div {...revealOnce}>
              <p className="font-mono text-xs uppercase tracking-[0.18em] text-cvc-muted">What we do</p>
              <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">A ladder, not a guess.</h2>
            </motion.div>

            <motion.div
              {...revealOnce}
              variants={stagger(0.1)}
              className="mt-10 grid gap-6 sm:grid-cols-3"
            >
              {services.map((s) => (
                <motion.div key={s.slug} variants={fadeUp}>
                  <Link
                    to={`/services/${s.slug}`}
                    className="group block h-full rounded-2xl border border-black/10 p-6 transition-colors hover:border-cvc-ink"
                  >
                    <h3 className="text-lg font-semibold">{s.name}</h3>
                    <p className="mt-2 text-sm text-cvc-muted">{s.summary}</p>
                    <span className="mt-4 inline-block text-sm font-medium text-cvc-ink underline underline-offset-4">
                      Learn more
                    </span>
                  </Link>
                </motion.div>
              ))}
            </motion.div>

            <motion.div {...revealOnce} className="mt-8">
              <Link to="/services" className="text-sm font-semibold text-cvc-ink underline underline-offset-4">
                See the full service ladder
              </Link>
            </motion.div>
          </Container>
        </section>
      )}

      <section className="border-t border-black/5 px-6 py-20">
        <Container>
          <motion.div {...revealOnce}>
            <p className="font-mono text-xs uppercase tracking-[0.18em] text-cvc-muted">Work</p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
              {portfolio.length > 0 ? "Recent projects." : "New work, in progress."}
            </h2>
          </motion.div>

          {portfolio.length > 0 ? (
            <motion.div {...revealOnce} variants={stagger(0.1)} className="mt-10 grid gap-6 sm:grid-cols-3">
              {portfolio.slice(0, 3).map((p) => (
                <motion.div key={p.slug} variants={fadeUp}>
                  <Link to={`/work/${p.slug}`} className="group block">
                    {p.cover_image_url && (
                      <div className="aspect-[4/3] overflow-hidden rounded-2xl bg-black/5">
                        <img
                          src={p.cover_image_url}
                          alt={p.title}
                          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                      </div>
                    )}
                    <h3 className="mt-4 font-semibold">{p.title}</h3>
                    <p className="text-sm text-cvc-muted">{p.client_name}</p>
                  </Link>
                </motion.div>
              ))}
            </motion.div>
          ) : (
            <motion.p {...revealOnce} className="mt-6 max-w-lg text-cvc-muted">
              The case studies are being written up. Ask on WhatsApp and we'll
              share examples of recent brand and web work directly.
            </motion.p>
          )}
        </Container>
      </section>

      {testimonials.length > 0 && (
        <section className="border-t border-black/5 px-6 py-20">
          <Container>
            <motion.div {...revealOnce} variants={stagger(0.1)} className="grid gap-6 sm:grid-cols-2">
              {testimonials.slice(0, 4).map((t) => (
                <motion.blockquote key={t.id} variants={fadeUp} className="rounded-2xl border border-black/10 p-6">
                  <p className="text-cvc-ink">&ldquo;{t.quote}&rdquo;</p>
                  <footer className="mt-4 text-sm text-cvc-muted">
                    {t.client_name}
                    {t.client_role && <> · {t.client_role}</>}
                  </footer>
                </motion.blockquote>
              ))}
            </motion.div>
          </Container>
        </section>
      )}

      <section className="border-t border-black/5 px-6 py-20">
        <Container className="text-center">
          <motion.div {...revealOnce}>
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Got an idea, an event, or a business that needs to look real?
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
