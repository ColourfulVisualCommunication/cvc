import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";

import { listServices, listPortfolio, listTestimonials } from "../../api/client.js";
import { fadeUp, stagger, revealOnce } from "../../motion/variants.js";
import Container from "../../components/ui/Container.jsx";
import WhatsAppCTA from "../../components/ui/WhatsAppCTA.jsx";
import Seo, { localBusinessJsonLd } from "../../components/Seo.jsx";
import ClientLogos from "../../components/ClientLogos.jsx";
import { markPrerenderReady } from "../../lib/prerenderReady.js";

// A grid built for 3 items looks broken with 1 — two-thirds of the row sits
// empty. Cap the track width and column count to what's actually there
// instead of stretching a mostly-empty grid.
function workGridClass(count) {
  if (count <= 1) return "max-w-sm sm:mx-0";
  if (count === 2) return "max-w-2xl sm:grid-cols-2 sm:mx-0";
  return "sm:grid-cols-3";
}

function testimonialGridClass(count) {
  if (count <= 1) return "max-w-lg";
  return "sm:grid-cols-2";
}

export default function Home() {
  const [services, setServices] = useState([]);
  const [portfolio, setPortfolio] = useState([]);
  const [testimonials, setTestimonials] = useState([]);

  useEffect(() => {
    Promise.allSettled([
      listServices().then((s) => setServices((s.items ?? []).slice(0, 3))),
      listPortfolio().then((p) => setPortfolio(p.items ?? [])),
      listTestimonials().then((t) => setTestimonials(t.items ?? [])),
    ]).then(markPrerenderReady);
  }, []);

  return (
    <>
      <Seo path="/" jsonLd={localBusinessJsonLd} />

      <section className="relative overflow-hidden px-6 pb-24 pt-24 sm:pb-32 sm:pt-36">
        <img
          src="/favicon.svg"
          alt=""
          aria-hidden="true"
          className="pointer-events-none absolute -right-32 -top-32 h-[420px] w-[420px] opacity-[0.08] sm:-right-24 sm:-top-24 sm:h-[560px] sm:w-[560px]"
        />
        <Container className="relative">
          <motion.div variants={stagger(0, 0.1)} initial="hidden" animate="visible" className="max-w-3xl">
            <motion.p variants={fadeUp} className="font-mono text-xs uppercase tracking-[0.18em] text-cvc-muted">
              Colourful Visual Communication ...Online!
            </motion.p>
            <motion.h1 variants={fadeUp} className="mt-5 text-5xl font-bold leading-[1.05] tracking-tight sm:text-7xl">
              From idea to action.
              <br />
              <span className="text-cvc-amber">From action</span> to reality.
            </motion.h1>
            <motion.p variants={fadeUp} className="mt-6 max-w-xl text-lg text-cvc-muted">
              Strategic Brand identity and digital development from one team — most brand
              designers can't build, most developers can't brand. <span className="font-bold text-cvc-crimson">We do both.</span>
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
              {services.map((s, i) => {
                const accent = [
                  "bg-cvc-amber",
                  "bg-cvc-cyan",
                  "bg-cvc-crimson",
                ][i % 3];
                return (
                  <motion.div key={s.slug} variants={fadeUp}>
                    <Link
                      to={`/services/${s.slug}`}
                      className="group block h-full overflow-hidden rounded-2xl border border-black/10 transition-all hover:-translate-y-1 hover:border-cvc-ink hover:shadow-lg"
                    >
                      <div className={`h-1.5 w-full ${accent}`} />
                      <div className="p-6">
                        <h3 className="text-lg font-semibold">{s.name}</h3>
                        <p className="mt-2 text-sm text-cvc-muted">{s.summary}</p>
                        <span className="mt-4 inline-block text-sm font-medium text-cvc-ink underline underline-offset-4">
                          Learn more
                        </span>
                      </div>
                    </Link>
                  </motion.div>
                );
              })}
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
            <motion.div
              {...revealOnce}
              variants={stagger(0.1)}
              className={`mt-10 grid gap-6 ${workGridClass(portfolio.length)}`}
            >
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

      <ClientLogos />

      {testimonials.length > 0 && (
        <section className="bg-cvc-crimson px-6 py-20">
          <Container>
            <motion.p {...revealOnce} className="font-mono text-xs uppercase tracking-[0.18em] text-white/70">
              What clients say
            </motion.p>
            <motion.div
              {...revealOnce}
              variants={stagger(0.1)}
              className={`mt-8 grid gap-6 ${testimonialGridClass(testimonials.length)}`}
            >
              {testimonials.slice(0, 4).map((t) => (
                <motion.blockquote key={t.id} variants={fadeUp} className="rounded-2xl bg-white/10 p-6 backdrop-blur-sm">
                  <p className="text-lg font-medium leading-snug text-white">&ldquo;{t.quote}&rdquo;</p>
                  <footer className="mt-4 text-sm text-white/70">
                    {t.client_name}
                    {t.client_role && <> · {t.client_role}</>}
                  </footer>
                </motion.blockquote>
              ))}
            </motion.div>
          </Container>
        </section>
      )}

      <section className="bg-cvc-amber/15 px-6 py-24">
        <Container className="text-center">
          <motion.div {...revealOnce}>
            <h2 className="text-3xl font-bold tracking-tight sm:text-5xl">
              Got an idea, an event, or a business that needs to look real?
            </h2>
            <div className="mt-9">
              <WhatsAppCTA />
            </div>
          </motion.div>
        </Container>
      </section>
    </>
  );
}
