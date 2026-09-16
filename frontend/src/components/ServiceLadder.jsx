import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";

import { fadeUp, stagger } from "../motion/variants.js";
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
// Only the ink panel is "dark" in the sense that matters for text: its fg
// is paper (white belongs on a dark background). The other three are
// light/saturated enough that fg stays ink — dark text on a colored
// background, not white on a mid-tone.
const PANEL_COLORS = [
  { bg: "var(--color-cvc-cyan)", fg: "var(--color-cvc-ink)" },
  { bg: "var(--color-cvc-ink)", fg: "var(--color-cvc-paper)" },
  { bg: "var(--color-cvc-crimson)", fg: "var(--color-cvc-ink)" },
  { bg: "var(--color-cvc-amber)", fg: "var(--color-cvc-ink)" },
];

// Mobile accordion — same cycling idea as PANEL_COLORS but its own order:
// index 0 (the first accordion) needs to land on crimson and, with 6
// tiers cycling through 4 colors, index 5 (the last) needs to land on
// ink — 5 % 4 === 1, so ink goes in slot 1 to satisfy both at once.
const ACCORDION_COLORS = [
  { bg: "var(--color-cvc-crimson)", fg: "var(--color-cvc-ink)" },
  { bg: "var(--color-cvc-ink)", fg: "var(--color-cvc-paper)" },
  { bg: "var(--color-cvc-amber)", fg: "var(--color-cvc-ink)" },
  { bg: "var(--color-cvc-cyan)", fg: "var(--color-cvc-ink)" },
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

// Cards invert each panel's own colors rather than matching them: the one
// dark panel (ink) gets white cards with ink text, the three light/accent
// panels (cyan, crimson, amber) get dark cards with that panel's own
// accent color as the text. Card fill is always one of exactly two fixed,
// fully opaque values — never alpha-blended over the panel's background,
// which is what previously made "dark" cards read as a different shade
// on every panel (black at a fixed opacity composites differently
// depending on what's underneath it; an opaque color never does).
function TierCards({ items, bg, fg }) {
  const isDarkPanel = fg === "var(--color-cvc-paper)";
  const cardBg = isDarkPanel ? "var(--color-cvc-paper)" : "var(--color-cvc-ink)";
  const textColor = isDarkPanel ? "var(--color-cvc-ink)" : bg;

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
            // A fixed height (not h-full) — h-full only equalizes cards
            // within the same flex row, so two different tiers' cards
            // (visible together mid-wipe, or compared shot to shot) could
            // still be different heights. One fixed height everywhere
            // means every card is identical regardless of which panel or
            // how long that service's summary happens to be; justify-
            // between still pushes the price block to the bottom so a
            // short summary just leaves more breathing room above it.
            className="group flex h-[420px] flex-col justify-between border-2 p-7 text-center transition-opacity hover:opacity-80 lg:p-8"
            style={{ backgroundColor: cardBg, color: textColor, borderColor: `color-mix(in srgb, ${textColor} 25%, transparent)` }}
          >
            <div>
              <h3 className="text-2xl font-extrabold sm:text-[1.7rem]">{s.name}</h3>
              <p className="mt-3 text-base opacity-70">{s.summary}</p>
            </div>
            <div className="mt-8 flex flex-col items-center gap-1.5 text-base">
              <span className="font-mono text-lg font-bold">{formatPrice(s)}</span>
              {s.duration && <span className="opacity-70">{s.duration}</span>}
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
function TierLinks({ items, fg }) {
  const dividerStyle = fg ? { borderColor: `color-mix(in srgb, ${fg} 15%, transparent)` } : undefined;
  return (
    <motion.ul
      initial="hidden"
      animate="visible"
      variants={stagger(0.06)}
      className={`pb-6 ${fg ? "" : "divide-y divide-white/10"}`}
    >
      {items.map((s, i) => (
        <motion.li
          key={s.slug}
          variants={fadeUp}
          className={fg && i < items.length - 1 ? "border-b" : ""}
          style={fg && i < items.length - 1 ? dividerStyle : undefined}
        >
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
  const [openTier, setOpenTier] = useState(null);

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
      content: <TierCards items={items} bg={bg} fg={fg} />,
    };
  });

  if (isDesktop) {
    const items = headingPanel ? [headingPanel, ...tierPanels] : tierPanels;
    return (
      <ScrollTimeline
        totalScrollHeight={`${items.length * 100}vh`}
        cornerRadius={0}
        // The floating logo icon sits fixed at top-6 (24px) with its own
        // padding, ending around y=84px — without this the pinned panel
        // frame starts above that, so the panel's own top edge (and its
        // decorative corner number, anchored at the same right-6 inset as
        // the icon) visibly collides with it instead of sitting cleanly
        // below.
        topOffset={110}
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
      {tierEntries.map(([tier, items], i) => {
        const isOpen = openTier === tier;
        const { bg, fg } = ACCORDION_COLORS[i % ACCORDION_COLORS.length];
        return (
          <section key={tier} className="px-6" style={{ background: bg, color: fg }}>
            <Container>
              <button
                onClick={() => setOpenTier(isOpen ? null : tier)}
                className="flex w-full items-center justify-between py-6 text-left"
                aria-expanded={isOpen}
              >
                <span className="text-sm font-semibold uppercase tracking-wide">{TIER_LABELS[tier] ?? `Tier ${tier}`}</span>
                <ArrowIcon size={20} className={`shrink-0 transition-transform duration-200 ${isOpen ? "rotate-90" : ""}`} />
              </button>
              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25, ease: "easeInOut" }}
                    className="overflow-hidden"
                  >
                    <TierLinks items={items} fg={fg} />
                  </motion.div>
                )}
              </AnimatePresence>
            </Container>
          </section>
        );
      })}
    </>
  );
}
