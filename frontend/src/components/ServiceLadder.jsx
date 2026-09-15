import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";

import { fadeUp, stagger, revealOnce } from "../motion/variants.js";
import Container from "./ui/Container.jsx";
import ScrollTimeline from "./ui/ScrollTimeline.jsx";
import ArrowIcon from "./ui/ArrowIcon.jsx";

export const TIER_LABELS = {
  0: "A place to start",
  1: "Brand identity",
  2: "Digital presence",
  3: "Applications",
  4: "Flagship",
  5: "Retainers",
};

// Cycled per tier panel — alternating accents keeps consecutive panels
// visually distinct as they wipe past each other. Position matters at
// both ends: tier 0 (index 0) must not match the prepended ink heading
// panel right before it, and with 6 tiers cycling through 4 colors,
// index 5 (the last tier, "Retainers") lands back on index 1's color —
// ink, deliberately, so the ladder closes on dark before the cyan "Work"
// section starts (ink contrasts with that cyan; matching it wouldn't).
const PANEL_COLORS = [
  { bg: "var(--color-cvc-cyan)", fg: "var(--color-cvc-ink)" },
  { bg: "var(--color-cvc-ink)", fg: "var(--color-cvc-paper)" },
  { bg: "var(--color-cvc-crimson)", fg: "var(--color-cvc-paper)" },
  { bg: "var(--color-cvc-amber)", fg: "var(--color-cvc-ink)" },
];

// The scroll-wipe timeline pins each tier into one full-height frame — it
// only works when a tier's card grid actually fits inside that frame. A
// 3-column desktop grid does; a single mobile column of 3-4 cards is much
// taller, so two tiers' content visibly collided mid-wipe in testing.
// Below this breakpoint, tiers render as plain stacked sections instead
// (matching how HeroTunnel/the old OrbitProjects also drop their own
// scroll-driven effect on small screens rather than force a fit that
// doesn't work).
function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState(true);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    setIsDesktop(mq.matches);
    const onChange = (e) => setIsDesktop(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return isDesktop;
}

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

// Cards used to pick up each panel's own accent color (an outline tinted
// toward the panel's fg, text colored to match) so they'd read against
// whatever background they landed on. In practice that made every panel
// look like a different component — same layout, different sizes and
// weights of color everywhere. Cards are now a fixed solid-dark chip on
// every panel regardless of that panel's own color, with white text
// throughout (white belongs on a dark background, and every card now has
// one) — the panel color shows through only as the space around the
// cards, not inside them.
function TierCards({ items }) {
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={stagger(0.08)}
      // Flexbox, not CSS Grid — a fixed 3-column grid (grid-cols-3) leaves
      // a visible empty column whenever a tier has fewer than 3 services,
      // and even auto-fit/minmax grid tracks only center as a whole block,
      // not per row: a 4th card left over onto its own row still sticks to
      // column 1 instead of centering under the row above it. flex-wrap +
      // justify-center centers every row independently, remainder or not,
      // which is what "centered" actually needs to mean here.
      className="mx-auto flex max-w-6xl flex-wrap justify-center gap-6"
    >
      {items.map((s) => (
        <motion.div key={s.slug} variants={fadeUp} className="w-full sm:w-[calc(50%-0.75rem)] lg:w-[340px]">
          <Link
            to={`/services/${s.slug}`}
            className="group flex h-full flex-col justify-between border-2 border-white/10 bg-black/85 p-7 text-center text-cvc-paper transition-opacity hover:opacity-80 hover:border-white/30 lg:p-8"
          >
            <div>
              <h3 className="text-2xl font-extrabold sm:text-[1.7rem]">{s.name}</h3>
              <p className="mt-3 text-base text-cvc-paper/70">{s.summary}</p>
            </div>
            <div className="mt-8 flex flex-col items-center gap-1.5 text-base">
              <span className="font-mono text-lg font-bold">{formatPrice(s)}</span>
              {s.duration && <span className="text-cvc-paper/70">{s.duration}</span>}
              <span className="mt-4 inline-flex items-center gap-1.5 text-base font-bold transition-transform duration-200 group-hover:translate-x-1">
                Learn more
                <ArrowIcon size={24} />
              </span>
            </div>
          </Link>
        </motion.div>
      ))}
    </motion.div>
  );
}

// Mobile-only compact form — the full TierCards grid (summary, price,
// duration, CTA per card) stacked one tier after another made for a very
// long scroll on a single mobile column. This keeps the tier grouping
// (still its own heading) but collapses each service down to one line:
// name + link, nothing else. Desktop is unaffected — it still gets the
// full cards, inside the pinned ScrollTimeline frame.
function TierLinks({ items }) {
  return (
    <motion.ul {...revealOnce} variants={stagger(0.06)} className="mt-6 divide-y divide-white/10">
      {items.map((s) => (
        <motion.li key={s.slug} variants={fadeUp}>
          <Link
            to={`/services/${s.slug}`}
            className="group flex items-center justify-between gap-4 py-4 transition-opacity hover:opacity-70"
          >
            <span className="text-lg font-bold">{s.name}</span>
            <span className="inline-flex shrink-0 transition-transform duration-200 group-hover:translate-x-1">
              <ArrowIcon size={24} />
            </span>
          </Link>
        </motion.li>
      ))}
    </motion.ul>
  );
}

/**
 * The full service ladder as a scroll-wipe timeline — one tier per pinned
 * panel, each with its own heading and a full clickable card grid.
 * `headingPanel` (optional) is prepended as panel 0: a cover panel shown
 * before any tier, so scrolling into the section reveals the heading in
 * full (pinned) before the ladder starts wiping through — used on the
 * homepage, where this section doesn't already have its own separate
 * intro like the standalone /services page does.
 */
export default function ServiceLadder({ services, headingPanel }) {
  const isDesktop = useIsDesktop();

  const byTier = services.reduce((acc, s) => {
    (acc[s.tier] ??= []).push(s);
    return acc;
  }, {});
  const tierEntries = Object.entries(byTier);
  if (tierEntries.length === 0) return null;

  const tierPanels = tierEntries.map(([tier, items], i) => {
    const { bg, fg } = PANEL_COLORS[i % PANEL_COLORS.length];
    return {
      bg,
      fg,
      header: (
        <div className="text-center">
          <p className="font-mono text-xs font-semibold uppercase tracking-[0.18em] sm:text-sm" style={{ color: fg, opacity: 0.65 }}>
            {String(i + 1).padStart(2, "0")} / {tierEntries.length}
          </p>
          <h2 className="mt-2 text-4xl font-extrabold tracking-tight sm:text-5xl">
            {TIER_LABELS[tier] ?? `Tier ${tier}`}
          </h2>
        </div>
      ),
      content: <TierCards items={items} />,
    };
  });

  if (isDesktop) {
    const items = headingPanel ? [headingPanel, ...tierPanels] : tierPanels;
    return (
      <ScrollTimeline
        totalScrollHeight={`${items.length * 100}vh`}
        cornerRadius={0}
        // The site header is a sticky ~105px bar — without this the pinned
        // panel frame starts 24px from the very top of the viewport and
        // its heading/cards render underneath the header instead of below
        // it (the header wins on stacking order, so the content is simply
        // hidden behind it, not just visually close).
        topOffset={120}
        items={items}
      />
    );
  }

  return (
    <>
      {headingPanel && (
        <section className="px-6 py-16" style={{ background: headingPanel.bg, color: headingPanel.fg }}>
          <Container>{headingPanel.header}</Container>
        </section>
      )}
      {tierEntries.map(([tier, items]) => (
        <section key={tier} className="border-t border-white/10 px-6 py-10">
          <Container>
            <motion.h2 {...revealOnce} className="text-sm font-semibold uppercase tracking-wide text-cvc-cyan">
              {TIER_LABELS[tier] ?? `Tier ${tier}`}
            </motion.h2>
            <TierLinks items={items} />
          </Container>
        </section>
      ))}
    </>
  );
}
