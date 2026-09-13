import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Compass, Palette, Globe, LayoutGrid, Rocket, RefreshCw, Sparkles, ArrowRight } from "lucide-react";

import { listServices, listPortfolio, listTestimonials } from "../../api/client.js";
import { fadeUp, stagger, revealOnce } from "../../motion/variants.js";
import Container from "../../components/ui/Container.jsx";
import SectionHeading from "../../components/ui/SectionHeading.jsx";
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

// One icon per service tier (0-5, see backend/seed.py) — derived from real
// structural data, not decorative guesswork.
const TIER_ICONS = {
  0: Compass,
  1: Palette,
  2: Globe,
  3: LayoutGrid,
  4: Rocket,
  5: RefreshCw,
};

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

      <section className="relative overflow-hidden px-6 pb-24 pt-24 sm:pb-36 sm:pt-40">
        {/* Three brand-colored blobs instead of one faint watermark — the
            "colourful" in the name should show up before a single word of
            copy is read. Slow drift keeps it playful without being busy. */}
        <motion.div
          aria-hidden="true"
          className="pointer-events-none absolute -left-24 -top-32 h-72 w-72 rounded-full bg-cvc-amber/30 blur-3xl sm:h-96 sm:w-96"
          animate={{ x: [0, 30, 0], y: [0, 20, 0] }}
          transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          aria-hidden="true"
          className="pointer-events-none absolute -right-20 top-10 h-64 w-64 rounded-full bg-cvc-cyan/30 blur-3xl sm:h-80 sm:w-80"
          animate={{ x: [0, -25, 0], y: [0, 25, 0] }}
          transition={{ duration: 16, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          aria-hidden="true"
          className="pointer-events-none absolute bottom-0 left-1/3 h-56 w-56 rounded-full bg-cvc-crimson/20 blur-3xl sm:h-72 sm:w-72"
          animate={{ x: [0, 20, 0], y: [0, -15, 0] }}
          transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
        />

        <Container className="relative">
          <motion.div variants={stagger(0, 0.1)} initial="hidden" animate="visible" className="max-w-4xl">
            <motion.p variants={fadeUp} className="font-mono text-xs uppercase tracking-[0.18em] text-cvc-muted">
              Colourful Visual Communication <span className="text-cvc-amber">.</span><span className="text-cvc-crimson">.</span><span className="text-cvc-cyan">.Online!</span>
            </motion.p>
            <motion.h1 variants={fadeUp} className="mt-5 text-6xl font-bold leading-[0.98] tracking-tight sm:text-8xl">
              From idea to action.
              <br />
              <span className="relative inline-block text-cvc-amber">
                From action
                <svg
                  viewBox="0 0 300 20"
                  className="absolute -bottom-2 left-0 w-full text-cvc-cyan sm:-bottom-3"
                  preserveAspectRatio="none"
                  aria-hidden="true"
                >
                  <motion.path
                    d="M2 14 C 60 4, 120 18, 150 10 S 260 2, 298 12"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="5"
                    strokeLinecap="round"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 1, delay: 0.9, ease: "easeInOut" }}
                  />
                </svg>
              </span>{" "}
              to reality.
            </motion.h1>
            <motion.p variants={fadeUp} className="mt-8 max-w-xl text-lg text-cvc-muted">
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
            <SectionHeading
              eyebrow="What we do"
              title="A ladder, not a guess."
              subtitle="Fixed prices where the scope is clear, quoted work where it isn't — either way, you know the number before we start."
            />

            <motion.div
              {...revealOnce}
              variants={stagger(0.1)}
              className="mt-10 grid gap-6 sm:grid-cols-3"
            >
              {services.map((s, i) => {
                const accent = ["bg-cvc-amber", "bg-cvc-cyan", "bg-cvc-crimson"][i % 3];
                const Icon = TIER_ICONS[s.tier] ?? Sparkles;
                return (
                  <motion.div key={s.slug} variants={fadeUp}>
                    <Link
                      to={`/services/${s.slug}`}
                      className={`group block h-full rounded-2xl ${accent} p-7 transition-all duration-300 hover:-translate-y-1 hover:bg-cvc-ink hover:shadow-xl`}
                    >
                      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-cvc-ink/10 transition-colors duration-300 group-hover:bg-white/10">
                        <Icon
                          size={26}
                          strokeWidth={2.25}
                          className="text-cvc-ink transition-all duration-300 group-hover:rotate-6 group-hover:text-white"
                        />
                      </div>
                      <h3 className="mt-6 text-2xl font-bold tracking-tight text-cvc-ink transition-colors duration-300 group-hover:text-white">
                        {s.name}
                      </h3>
                      <p className="mt-2 text-sm text-cvc-ink/70 transition-colors duration-300 group-hover:text-white/70">
                        {s.summary}
                      </p>
                      <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-bold text-cvc-ink transition-colors duration-300 group-hover:text-white">
                        Learn more
                        <ArrowRight size={16} className="transition-transform duration-300 group-hover:translate-x-1" />
                      </span>
                    </Link>
                  </motion.div>
                );
              })}
            </motion.div>

            <motion.div {...revealOnce} className="mt-8">
              <Link
                to="/services"
                className="group inline-flex items-center gap-1.5 text-sm font-semibold text-cvc-ink underline underline-offset-4"
              >
                See the full service ladder
                <ArrowRight size={16} className="transition-transform duration-300 group-hover:translate-x-1" />
              </Link>
            </motion.div>
          </Container>
        </section>
      )}

      <section className="bg-cvc-cyan/10 px-6 py-20">
        <Container>
          <SectionHeading
            eyebrow="Work"
            title={portfolio.length > 0 ? "Proof, not promises." : "Something's brewing."}
            subtitle={
              portfolio.length > 0
                ? "A look at what's actually shipped — real problems, real solutions."
                : "Case studies are being written up. Ask on WhatsApp and we'll share examples of recent brand and web work directly."
            }
          />

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
                      <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-black/5">
                        <img
                          src={p.cover_image_url}
                          alt={p.title}
                          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                        <div className="absolute inset-0 flex items-end bg-cvc-ink/0 p-5 transition-colors duration-300 group-hover:bg-cvc-ink/40">
                          <span className="translate-y-3 text-sm font-semibold text-white opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
                            View project →
                          </span>
                        </div>
                      </div>
                    )}
                    <h3 className="mt-4 font-semibold">{p.title}</h3>
                    <p className="text-sm text-cvc-muted">{p.client_name}</p>
                  </Link>
                </motion.div>
              ))}
            </motion.div>
          ) : null}
        </Container>
      </section>

      <ClientLogos />

      {testimonials.length > 0 && (
        <section className="bg-cvc-crimson px-6 py-20">
          <Container>
            <SectionHeading
              eyebrow="Testimonials"
              title="Don't take our word for it."
              subtitle="Straight from the people we've actually worked with."
              light
            />
            <motion.div
              {...revealOnce}
              variants={stagger(0.1)}
              className={`mt-8 grid gap-6 ${testimonialGridClass(testimonials.length)}`}
            >
              {testimonials.slice(0, 4).map((t) => (
                <motion.blockquote
                  key={t.id}
                  variants={fadeUp}
                  className="rounded-2xl bg-white p-7 shadow-xl transition-transform duration-300 hover:-translate-y-1"
                >
                  <p className="text-xl font-medium leading-snug text-cvc-ink">&ldquo;{t.quote}&rdquo;</p>
                  <footer className="mt-5 flex items-center gap-3">
                    {t.avatar_url ? (
                      <img
                        src={t.avatar_url}
                        alt={t.client_name}
                        className="h-11 w-11 shrink-0 rounded-full object-cover"
                      />
                    ) : (
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-cvc-crimson/15 text-sm font-bold text-cvc-crimson">
                        {t.client_name?.[0]?.toUpperCase()}
                      </div>
                    )}
                    <div className="text-sm">
                      <p className="font-semibold text-cvc-ink">{t.client_name}</p>
                      {t.client_role && <p className="text-cvc-muted">{t.client_role}</p>}
                    </div>
                  </footer>
                </motion.blockquote>
              ))}
            </motion.div>
          </Container>
        </section>
      )}

      <section className="bg-cvc-amber/15 px-6 py-24">
        <Container>
          <SectionHeading
            title="Got an idea, an event, or a business that needs to look real?"
            subtitle="One message on WhatsApp is genuinely how every CVC project starts."
            center
          />
          <div className="mt-9 flex justify-center">
            <WhatsAppCTA />
          </div>
        </Container>
      </section>
    </>
  );
}
