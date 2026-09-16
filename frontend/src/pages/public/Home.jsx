import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { RoughNotation } from "react-rough-notation";

import { listServices, listPortfolio, listTestimonials, listClientLogos } from "../../api/client.js";
import { fadeUp, stagger, revealOnce } from "../../motion/variants.js";
import Container from "../../components/ui/Container.jsx";
import SectionHeading from "../../components/ui/SectionHeading.jsx";
import WhatsAppCTA from "../../components/ui/WhatsAppCTA.jsx";
import ArrowIcon from "../../components/ui/ArrowIcon.jsx";
import ScrollArrow from "../../components/ui/ScrollArrow.jsx";
import TypewriterEffect from "../../components/ui/TypewriterEffect.jsx";
import HeroTunnel from "../../components/ui/HeroTunnel.jsx";
import Seo, { localBusinessJsonLd } from "../../components/Seo.jsx";
import ClientLogos from "../../components/ClientLogos.jsx";
import ServiceLadder from "../../components/ServiceLadder.jsx";
import OrbitWork from "../../components/ui/OrbitWork.jsx";
import CircularSpinText from "../../components/ui/CircularSpinText.jsx";
import ScrollRevealText from "../../components/ui/ScrollRevealText.jsx";
import { markPrerenderReady } from "../../lib/prerenderReady.js";

const blink = {
  animate: { opacity: [1, 0.25, 1] },
  transition: { duration: 1.3, repeat: Infinity, ease: "easeInOut" },
};

function testimonialGridClass(count) {
  if (count <= 1) return "max-w-lg";
  return "sm:grid-cols-2";
}

const SERVICES_HEADING_PANEL = {
  bg: "var(--color-cvc-ink)",
  fg: "var(--color-cvc-paper)",
  header: (
    // text-left below md, text-center from md up — matching ServiceLadder's
    // own 768px switch from the stacked mobile accordion to the pinned
    // desktop ScrollTimeline, rather than an arbitrary different breakpoint
    // that would leave a tablet width centered while still on the mobile
    // layout.
    <div className="text-left md:text-center">
      <p className="font-mono text-xs font-semibold uppercase tracking-[0.18em] opacity-70 sm:text-sm lg:text-base">
        What we do
      </p>
      <h2 className="mt-3 text-5xl font-bold tracking-tight sm:text-7xl lg:text-8xl">A ladder, not a guess.</h2>
      <p className="mt-4 max-w-2xl text-lg opacity-80 sm:text-xl lg:text-2xl md:mx-auto">
        Fixed prices where the scope is clear, quoted work where it isn't — either way, you know the
        number before we start.
      </p>
    </div>
  ),
};

export default function Home() {
  const heroRef = useRef(null);
  const [services, setServices] = useState([]);
  const [portfolio, setPortfolio] = useState([]);
  const [testimonials, setTestimonials] = useState([]);
  const [clientLogos, setClientLogos] = useState([]);
  const [annotate, setAnnotate] = useState(false);

  useEffect(() => {
    // Delayed so the hand-drawn circles draw on once the hero's own
    // staggered fade-in has settled, rather than animating underneath
    // text that's still appearing.
    const t = setTimeout(() => setAnnotate(true), 900);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    Promise.allSettled([
      listServices().then((s) => setServices(s.items ?? [])),
      listPortfolio().then((p) => setPortfolio(p.items ?? [])),
      listTestimonials().then((t) => setTestimonials(t.items ?? [])),
      listClientLogos().then((c) => setClientLogos(c.items ?? [])),
    ]).then(markPrerenderReady);
  }, []);

  return (
    <>
      <Seo path="/" jsonLd={localBusinessJsonLd} />

      <div className="relative">
      <section ref={heroRef} className="relative overflow-hidden px-6 pb-24 pt-24 sm:pb-36 sm:pt-40">
        <HeroTunnel images={clientLogos.map((l) => l.logo_url)} />

        <Container className="relative">
          <motion.div variants={stagger(0, 0.1)} initial="hidden" animate="visible" className="max-w-4xl">
            <motion.p variants={fadeUp} className="font-mono text-xs font-semibold uppercase tracking-[0.18em] sm:text-sm lg:text-base text-cvc-muted">
              Colourful Visual Communication <span className="text-cvc-amber">.</span><span className="text-cvc-crimson">.</span><span className="text-cvc-cyan">.Online!</span>
            </motion.p>
            <motion.h1 variants={fadeUp} className="mt-8 text-6xl font-bold leading-[1.1] tracking-tight sm:text-8xl">
              <span>You&rsquo;ve an idea?</span>
              <br />
              <span>We shall</span>
              <br />
              {/* Fixed-height allowance, in em so it scales with the h1's
                  own responsive font size — phrases range from "Build
                  it..." to "Put it into the world!", so without this the
                  line wrapping differently per phrase reflows and pushes
                  the subtitle/CTA below up and down as it cycles. The h1
                  sits in a max-w-4xl column regardless of viewport, so
                  the longest phrase still wraps to 2 lines even at the
                  largest desktop font size — verified empirically, not
                  assumed, after an earlier version wrongly reserved only
                  1 line from sm+ and still reflowed on wide screens. */}
              <span className="block min-h-[3.3em] sm:min-h-[2.2em]">
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
              </span>
            </motion.h1>
            <motion.p variants={fadeUp} className="mt-8 max-w-xl text-xl text-cvc-paper/80">
              <RoughNotation type="circle" show={annotate} color="var(--color-cvc-cyan)" strokeWidth={2} padding={4} animationDuration={800}>
                <span className="font-bold">Strategic Brand identity</span>
              </RoughNotation>{" "}
              and{" "}
              <RoughNotation type="underline" show={annotate} color="var(--color-cvc-crimson)" strokeWidth={2} padding={2} animationDuration={800}>
                <span className="font-bold">digital development</span>
              </RoughNotation>{" "}
              from one team — most brand designers can't build, most developers can't brand.{" "}
              <span className="font-bold text-cvc-crimson">We do both.</span>
            </motion.p>
            <motion.div variants={fadeUp} className="mt-12 flex flex-wrap items-center gap-4">
              <WhatsAppCTA />
              <Link to="/work" className="inline-flex items-center gap-1.5 text-sm font-semibold text-cvc-paper sm:text-base lg:text-lg">
                See our work
                <motion.span {...blink} className="inline-flex">
                  <ArrowIcon size={24} />
                </motion.span>
              </Link>
            </motion.div>
          </motion.div>
        </Container>
      </section>

      {services.length > 0 && (
        <div id="services">
          <ServiceLadder services={services} headingPanel={SERVICES_HEADING_PANEL} />
        </div>
      )}
      </div>

      <ScrollArrow className="fixed right-6 top-1/2 hidden -translate-y-1/2 sm:right-10 sm:flex" />

      <section id="work" data-scroll-surface="light" className="relative bg-cvc-cyan">
        {/* overflow-hidden is scoped to this intro block, not the whole
            section — OrbitWork below is much taller (it's the scroll
            track for a pinned effect) and nesting its sticky viewport
            inside an overflow-hidden ancestor risks breaking the pin. */}
        <div className="relative overflow-hidden px-6 pb-12 pt-28">
          {/* The heading centers itself with a lot of open gutter on wide
              screens — these fill that empty space rather than leaving it
              bare, without competing with the heading for attention. */}
          <p className="pointer-events-none absolute left-6 top-8 hidden max-w-80 text-sm leading-relaxed text-cvc-ink/40 lg:block xl:left-10 xl:top-10">
            Brand identity, web builds, and everything between — shipped, not just designed.
          </p>
          <p className="pointer-events-none absolute bottom-6 right-6 hidden max-w-56 text-right text-sm leading-relaxed text-cvc-ink/40 lg:block xl:bottom-10 xl:right-10">
            From Idea to Action. From Action to Reality.
          </p>

          <Container>
            <SectionHeading
              eyebrow="Work? No, we craft!"
              title={portfolio.length > 0 ? "From an idea, to an experience" : "Something's brewing."}
              subtitle={
                portfolio.length > 0
                  ? "Defined, designed, built and shipped to the world — Watch how we turn ideas to reality."
                  : "Case studies are being written up. Ask on WhatsApp and we'll share examples of recent brand and web work directly."
              }
              onLight
            />
          </Container>
        </div>

        {portfolio.length > 0 ? (
          <OrbitWork items={portfolio.filter((p) => p.cover_image_url)} />
        ) : null}
      </section>

      <section id="about" className="border-t border-white/10 px-6 py-20">
        <Container>
          <motion.div
            {...revealOnce}
            variants={stagger(0.1)}
            className="grid items-center gap-10 sm:grid-cols-2"
          >
            <div>
              <motion.p variants={fadeUp} className="font-mono text-xs font-semibold uppercase tracking-[0.18em] sm:text-sm lg:text-base text-cvc-muted">
                From an idea, to a promise, to a platform
              </motion.p>
              <ScrollRevealText
                as="h2"
                text="Ksh 200, cracked photoshop, strangers Trust."
                className="mt-3 block text-5xl font-bold leading-tight tracking-tight sm:text-7xl lg:text-8xl"
              />
              <motion.p variants={fadeUp} className="mt-4 text-lg text-cvc-muted sm:text-xl lg:text-2xl">
                CVC didn&rsquo;t start in a boardroom — it started on a matatu, in traffic, with a
                promise a stranger had no reason to keep. Everything since has just been proving
                that trust right.
              </motion.p>
              <motion.div variants={fadeUp} className="mt-6">
                <Link
                  to="/about/our-story"
                  className="inline-flex items-center gap-1.5 text-sm font-semibold text-cvc-paper sm:text-base lg:text-lg"
                >
                  Read the full story
                  <motion.span {...blink} className="inline-flex">
                    <ArrowIcon size={24} />
                  </motion.span>
                </Link>
              </motion.div>
            </div>

            <motion.div variants={fadeUp} className="relative flex items-center justify-center overflow-hidden">
              <img
                src="/founder/njoroge.webp"
                alt="Njoroge, founder of CVC"
                loading="lazy"
                className="h-full w-full object-contain"
              />
              {/* Centered on the camera lens in the photo (measured at
                  ~46%/67% of the image's own box) — sized well beyond the
                  lens itself on purpose, a bold seal rather than a detail
                  inscribed inside the small circle. */}
              <div className="absolute" style={{ left: "46%", top: "67%", transform: "translate(-50%, -50%)" }}>
                <CircularSpinText text=" DEFINE . POSITION . BUILD . SHIP ." />
              </div>
            </motion.div>
          </motion.div>
        </Container>
      </section>

      <ClientLogos />

      {testimonials.length > 0 && (
        <section className="relative overflow-hidden bg-cvc-ink px-6 py-20">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 bg-cover bg-center opacity-20"
            style={{ backgroundImage: "url(/backgrounds/testimonials-bg.svg)" }}
          />
          <Container className="relative">
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
                        loading="lazy"
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

      <section id="contact" data-scroll-surface="light" className="bg-cvc-amber px-6 py-24">
        <Container>
          <SectionHeading
            title="Stop describing it. Let's build it."
            subtitle="WhatsApp, a quick form, phone, or email — whichever's easiest, we're on it."
            center
            onLight
          />
          <div className="mt-9 flex justify-center">
            <Link
              to="/contact"
              className="inline-flex items-center gap-3 bg-cvc-ink px-6 py-3 text-sm font-semibold text-cvc-paper transition-transform hover:scale-105 sm:text-base lg:text-lg"
            >
              Let&rsquo;s talk
              <ArrowIcon size={24} />
            </Link>
          </div>
        </Container>
      </section>
    </>
  );
}
