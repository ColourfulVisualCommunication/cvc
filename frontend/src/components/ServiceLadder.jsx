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
// visually distinct as they wipe past each other. Starts on cyan (not
// ink) specifically so tier 0 contrasts with the prepended ink heading
// panel right before it; with 6 tiers cycling through 4 colors, that also
// lands the last tier on crimson, which contrasts with the cyan "Work"
// section immediately after — both boundaries would otherwise wipe
// between two panels of the *same* color and read as if nothing moved.
const PANEL_COLORS = [
  { bg: "var(--color-cvc-cyan)", fg: "var(--color-cvc-ink)" },
  { bg: "var(--color-cvc-crimson)", fg: "var(--color-cvc-paper)" },
  { bg: "var(--color-cvc-amber)", fg: "var(--color-cvc-ink)" },
  { bg: "var(--color-cvc-ink)", fg: "var(--color-cvc-paper)" },
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

function TierCards({ items, fg }) {
  const mutedFg = fg ? { color: fg, opacity: 0.7 } : undefined;
  return (
    <motion.div
      {...(fg ? { initial: "hidden", animate: "visible" } : revealOnce)}
      variants={stagger(0.08)}
      className="mx-auto grid max-w-6xl gap-6 sm:grid-cols-2 lg:grid-cols-3"
    >
      {items.map((s) => (
        <motion.div key={s.slug} variants={fadeUp}>
          <Link
            to={`/services/${s.slug}`}
            className={`group flex h-full flex-col justify-between border-2 p-7 text-center transition-opacity hover:opacity-80 lg:p-8 ${
              fg ? "" : "border-white/10 hover:border-cvc-paper"
            }`}
            style={fg ? { borderColor: `color-mix(in srgb, ${fg} 35%, transparent)`, color: fg } : undefined}
          >
            <div>
              <h3 className="text-2xl font-extrabold sm:text-[1.7rem]">{s.name}</h3>
              <p className={`mt-3 text-base ${fg ? "" : "text-cvc-muted"}`} style={mutedFg}>
                {s.summary}
              </p>
            </div>
            <div className="mt-8 flex flex-col items-center gap-1.5 text-base">
              <span className="font-mono text-lg font-bold">{formatPrice(s)}</span>
              {s.duration && (
                <span className={fg ? "" : "text-cvc-muted"} style={mutedFg}>
                  {s.duration}
                </span>
              )}
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
      content: <TierCards items={items} fg={fg} />,
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
        <section key={tier} className="border-t border-white/10 px-6 py-16">
          <Container>
            <motion.h2 {...revealOnce} className="text-sm font-semibold uppercase tracking-wide text-cvc-cyan">
              {TIER_LABELS[tier] ?? `Tier ${tier}`}
            </motion.h2>
            <div className="mt-6">
              <TierCards items={items} />
            </div>
          </Container>
        </section>
      ))}
    </>
  );
}
