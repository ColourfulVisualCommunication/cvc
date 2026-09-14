import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Compass, Palette, Globe, LayoutGrid, Rocket, RefreshCw, Sparkles } from "lucide-react";

import { listServices, listPortfolio, listTestimonials, listClientLogos } from "../../api/client.js";
import { fadeUp, stagger, revealOnce } from "../../motion/variants.js";
import Container from "../../components/ui/Container.jsx";
import SectionHeading from "../../components/ui/SectionHeading.jsx";
import WhatsAppCTA from "../../components/ui/WhatsAppCTA.jsx";
import ArrowIcon from "../../components/ui/ArrowIcon.jsx";
import ScrollArrow from "../../components/ui/ScrollArrow.jsx";
import TypewriterEffect from "../../components/ui/TypewriterEffect.jsx";
import HeroTunnel from "../../components/ui/HeroTunnel.jsx";
import OrbitProjects from "../../components/ui/OrbitProjects.jsx";
import Seo, { localBusinessJsonLd } from "../../components/Seo.jsx";
import ClientLogos from "../../components/ClientLogos.jsx";
import { markPrerenderReady } from "../../lib/prerenderReady.js";

const blink = {
  animate: { opacity: [1, 0.25, 1] },
  transition: { duration: 1.3, repeat: Infinity, ease: "easeInOut" },
};

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
  const navigate = useNavigate();
  const heroRef = useRef(null);
  const [services, setServices] = useState([]);
  const [portfolio, setPortfolio] = useState([]);
  const [testimonials, setTestimonials] = useState([]);
  const [clientLogos, setClientLogos] = useState([]);

  useEffect(() => {
    Promise.allSettled([
      listServices().then((s) => setServices((s.items ?? []).slice(0, 3))),
      listPortfolio().then((p) => setPortfolio(p.items ?? [])),
      listTestimonials().then((t) => setTestimonials(t.items ?? [])),
      listClientLogos().then((c) => setClientLogos(c.items ?? [])),
    ]).then(markPrerenderReady);
  }, []);

  return (
    <>
      <Seo path="/" jsonLd={localBusinessJsonLd} />

      <section ref={heroRef} className="relative overflow-hidden px-6 pb-24 pt-24 sm:pb-36 sm:pt-40">
        <HeroTunnel images={clientLogos.map((l) => l.logo_url)} />

        {/* Bold, saturated color is the whole point of the brand name —
            against the dark page these glow instead of just tinting a
            white background, so they're pushed harder (bigger, brighter)
            than they'd need to be on a light theme. */}
        <motion.div
          aria-hidden="true"
          className="pointer-events-none absolute -left-32 -top-40 h-112 w-md rounded-full bg-cvc-amber/40 blur-3xl"
          animate={{ x: [0, 40, 0], y: [0, 25, 0] }}
          transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          aria-hidden="true"
          className="pointer-events-none absolute -right-24 top-0 h-96 w-96 rounded-full bg-cvc-cyan/40 blur-3xl"
          animate={{ x: [0, -30, 0], y: [0, 30, 0] }}
          transition={{ duration: 16, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          aria-hidden="true"
          className="pointer-events-none absolute bottom-0 left-1/3 h-80 w-80 rounded-full bg-cvc-crimson/30 blur-3xl"
          animate={{ x: [0, 25, 0], y: [0, -20, 0] }}
          transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
        />

        <Container className="relative">
          <motion.div variants={stagger(0, 0.1)} initial="hidden" animate="visible" className="max-w-4xl">
            <motion.p variants={fadeUp} className="font-mono text-sm font-semibold uppercase tracking-[0.18em] text-cvc-muted">
              Colourful Visual Communication <span className="text-cvc-amber">.</span><span className="text-cvc-crimson">.</span><span className="text-cvc-cyan">.Online!</span>
            </motion.p>
            <motion.h1 variants={fadeUp} className="mt-8 text-6xl font-bold leading-[1.1] tracking-tight sm:text-8xl">
              <span>You&rsquo;ve an idea?</span>
              <br />
              <span>We shall</span>
              <br />
              <TypewriterEffect
                prefix=""
                phrases={[
                  { text: "Define it...", color: "var(--color-cvc-cyan)" },
                  { text: "Position it...", color: "var(--color-cvc-grey)" },
                  { text: "Build it...", color: "var(--color-cvc-crimson)" },
                  { text: "Put it into the world!", color: "var(--color-cvc-amber)" },
                ]}
                typingSpeed={50}
                pauseDuration={1500}
              />
            </motion.h1>
            <motion.p variants={fadeUp} className="mt-8 max-w-xl text-xl text-cvc-paper/80">
              <span className="underline decoration-cvc-cyan decoration-2 underline-offset-4 font-bold">Strategic Brand identity</span> and{" "}
              <span className="underline decoration-cvc-crimson decoration-2 underline-offset-4 font-bold">digital development</span> from
              one team — most brand designers can't build, most developers can't brand.{" "}
              <span className="font-bold text-cvc-crimson">We do both.</span>
            </motion.p>
            <motion.div variants={fadeUp} className="mt-12 flex flex-wrap items-center gap-4">
              <WhatsAppCTA />
              <Link to="/work" className="inline-flex items-center gap-1.5 text-sm font-semibold text-cvc-paper">
                See our work
                <motion.span {...blink} className="inline-flex">
                  <ArrowIcon size={32} />
                </motion.span>
              </Link>
            </motion.div>
          </motion.div>
        </Container>

        <ScrollArrow targetRef={heroRef} className="absolute inset-x-0 bottom-8 hidden sm:flex" />
      </section>

      {services.length > 0 && (
        <section id="services" className="border-t border-white/10 px-6 py-20">
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
                      className={`group block h-full ${accent} p-7 transition-all duration-300 hover:-translate-y-1 hover:bg-cvc-ink hover:shadow-xl`}
                    >
                      <div className="flex h-14 w-14 items-center justify-center bg-cvc-ink/10 transition-colors duration-300 group-hover:bg-white/10">
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
                        <ArrowIcon size={16} className="transition-transform duration-300 group-hover:translate-x-1" />
                      </span>
                    </Link>
                  </motion.div>
                );
              })}
            </motion.div>

            <motion.div {...revealOnce} className="mt-8">
              <Link
                to="/services"
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-cvc-paper"
              >
                See the full service ladder
                <motion.span {...blink} className="inline-flex">
                  <ArrowIcon size={16} />
                </motion.span>
              </Link>
            </motion.div>
          </Container>
        </section>
      )}

      <section id="work" className="bg-cvc-cyan px-6 py-20">
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

        </Container>

        {portfolio.length > 0 && (
          <OrbitProjects
            items={portfolio
              .filter((p) => p.cover_image_url)
              .map((p) => ({
                key: p.slug,
                image: p.cover_image_url,
                label: p.title,
                onOpen: () => navigate(`/work/${p.slug}`),
              }))}
            background="transparent"
            content={{ leftTitle: "REAL", rightTitle: "WORK", textColor: "rgba(22, 24, 26, 0.18)" }}
            cards={{ radius: 0, background: "var(--color-cvc-paper)" }}
          />
        )}
      </section>

      <section id="about" className="border-t border-white/10 px-6 py-20">
        <Container>
          <motion.div
            {...revealOnce}
            variants={stagger(0.1)}
            className="grid items-center gap-10 sm:grid-cols-[minmax(0,240px)_1fr]"
          >
            
            <div className="max-w-2xl">
              <motion.p variants={fadeUp} className="font-mono text-xs uppercase tracking-[0.18em] text-cvc-muted">
                From an idea, to a promise, to a platform
              </motion.p>
              <motion.h2 variants={fadeUp} className="mt-4 text-3xl font-bold leading-tight tracking-tight sm:text-4xl">
                It started with KSh 200, a cracked copy of Photoshop, and a stranger&rsquo;s trust.
              </motion.h2>
              <motion.p variants={fadeUp} className="mt-5 text-lg text-cvc-muted">
                CVC didn&rsquo;t start in a boardroom — it started on a matatu, in traffic, with a
                promise a stranger had no reason to keep. Everything since has just been proving
                that trust right.
              </motion.p>
              <motion.div variants={fadeUp} className="mt-6">
                <Link
                  to="/about/our-story"
                  className="inline-flex items-center gap-1.5 text-sm font-semibold text-cvc-paper"
                >
                  Read the full story
                  <motion.span {...blink} className="inline-flex">
                    <ArrowIcon size={16} />
                  </motion.span>
                </Link>
              </motion.div>
            </div>

            <motion.div
              variants={fadeUp}
              className="mx-auto flex aspect-[3/4] w-full items-center justify-center overflow-hidden"
            >
              <img
                src="/founder/njoroge.webp"
                alt="Njoroge, founder of CVC"
                className="h-full w-full object-contain"
              />
            </motion.div>
          </motion.div>
        </Container>
      </section>

      <ClientLogos />

      {testimonials.length > 0 && (
        <section className="bg-cvc-ink px-6 py-20">
          <Container>
            <SectionHeading
              eyebrow="Testimonials"
              title="Don't take our word for it."
              subtitle="Straight from the people we've actually worked with."
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
                  className="bg-white p-7 shadow-xl transition-transform duration-300 hover:-translate-y-1"
                >
                  <p className="accent-quote text-xl leading-snug text-cvc-ink">&ldquo;{t.quote}&rdquo;</p>
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
                      {t.client_role && <p className="text-cvc-ink/60">{t.client_role}</p>}
                    </div>
                  </footer>
                </motion.blockquote>
              ))}
            </motion.div>
          </Container>
        </section>
      )}

      <section id="contact" className="bg-cvc-amber px-6 py-24">
        <Container>
          <SectionHeading
            title="Got an idea, an event, or a business that needs to look real?"
            subtitle="One message on WhatsApp is genuinely how every CVC project starts."
            center
            onLight
          />
          <div className="mt-9 flex justify-center">
            <WhatsAppCTA dark />
          </div>
        </Container>
      </section>
    </>
  );
}
