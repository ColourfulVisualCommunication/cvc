import { useEffect } from "react";

import { motion } from "framer-motion";

import { fadeUp, stagger, revealOnce } from "../../motion/variants.js";
import Container from "../../components/ui/Container.jsx";
import Breadcrumbs from "../../components/ui/Breadcrumbs.jsx";
import Pullquote from "../../components/ui/Pullquote.jsx";
import WhatsAppCTA from "../../components/ui/WhatsAppCTA.jsx";
import Seo, { localBusinessJsonLd } from "../../components/Seo.jsx";
import { markPrerenderReady } from "../../lib/prerenderReady.js";

// The founder's own account, as written for the site — reformatted for
// JSX, not paraphrased. Kept as one array so the seven sections render
// through one consistent template instead of seven hand-built blocks.
const SECTIONS = [
  {
    number: "01",
    title: "At least we're moving now",
    subtitle: "The matatu, the jam, the sentence that started it all",
    paragraphs: [
      "It started on a matatu, in traffic, on a Saturday.",
      "I was a second-year ICT student, three legs into a journey from the Technical University of Mombasa back home to Ndeiya, Limuru — a bus to Nairobi, then two matatus to carry me the rest of the way. The country was still recovering from lockdown. A 10 p.m. curfew was still in force. A two-lane road was carrying four lines of traffic, all racing the clock. We sat still for close to two hours.",
      "Next to me sat a stranger. Jackie.",
      "I told her about my day — missing the bus in Mombasa by a whisker, chasing it down in a TukTuk, borrowing the last KSh 100 to pay the fare while the TukTuk was still moving. It felt like a bad day at the office.",
      "Somewhere in that jam, the conversation became bigger than traffic. I told her I believed in connections — that in a country where hard work doesn't always guarantee a job, who you know matters as much as what you can do. She disagreed. She believed in hard work.",
      "But she made me a promise anyway: if I believed in connections that strongly, she'd give me one, someday.",
      "Then we went our separate ways.",
    ],
    quote: {
      text: "At least we're moving now.",
      cite: "The whole opening line. Also, it turns out, the whole philosophy.",
    },
  },
  {
    number: "02",
    title: "Two hundred shillings, and then a little more",
    subtitle: "The first paying client — a stranger who trusted a beginner",
    paragraphs: [
      "Almost a year passed. Then Jackie texted: she was getting married, and she needed her wedding invitation designed.",
      "I had no real experience. All I'd ever made were dummy flyers, posted to my WhatsApp status for practice — nothing a client had ever paid for. I said yes anyway.",
      "I was renting a room near campus at the time, surviving more than living. No proper bed — a mattress on the floor and a cardboard packaging box, stuffed with old exam papers to make it solid enough to hold a laptop. My laptop was a refurbished HP EliteBook, bought for KSh 18,000 pooled with my dad's money, that only ran while plugged in and sounded like it was preparing for takeoff. My only software was a cracked copy of Photoshop, passed on by a coursemate. My only teacher was YouTube, watched on mobile data because there was no internet where I stayed.",
      "It took a full week. The laptop crashed constantly. I lost progress, restarted, kept going.",
      "I charged Jackie KSh 200 — what I felt I was worth at the time.",
      "She paid without hesitation. Then added another KSh 150. Unasked.",
    ],
    quote: {
      text: "It's one thing to get an opportunity. It's another to get a reward for it. You can miss both. I'm grateful I didn't.",
    },
    trailingParagraphs: [
      "The wedding was held at Wellington Gardens in Nyali, Mombasa — invitation-only, and every guest had been let in by something I'd made.",
      "I learned much later that Jackie worked at Rockledge, a company her husband founded — and that Rockledge, not a wedding card, was almost certainly the connection she'd meant to give me all along. What she gave me instead wasn't a lesser thing. A wedding invitation, trusted to a total beginner, never is.",
    ],
    closingStatement: (
      <>
        <strong className="font-semibold text-cvc-paper">Colourful Visual Communication was born here.</strong> Not
        from the connection she'd promised — from the belief she extended instead.
      </>
    ),
  },
  {
    number: "03",
    title: "From a face to a full system",
    subtitle: "Gemalocs — the project that taught me what brand identity actually is",
    paragraphs: [
      "The second project came in fourth year: Gemalocs, a full-service salon offering barbershop services, manicure, pedicure, makeup artistry and braiding. A referral, through a coursemate, to a couple starting from nothing but a name.",
      "I built the full identity — a face-and-spiral mark in magenta and deep purple — and carried it across business cards, product packaging for the salon's own makeup line, signage and apparel.",
      "Watching a brand come together as one complete system was beautiful. It also clarified something I'd overlooked about myself for years: as a child I loved drawing, and I was good at it. I'd assumed real time on a canvas could never be economically viable — an assumption built on a lack of exposure, not on truth.",
    ],
    quote: {
      text: "That was the purpose, all along.",
    },
    trailingParagraphs: ["I know better now."],
  },
  {
    number: "04",
    title: "Self-taught stops meaning improvised",
    subtitle: "Finishing the degree, adding development to the design",
    paragraphs: [
      "I finished my ICT degree. I kept teaching myself design and brand strategy the same way I'd learned that first Photoshop card — one project, one client, one late night at a time.",
      "Eventually, “self-taught” stopped meaning improvised and started meaning practiced.",
      "Then I added full-stack development to the same toolkit: Python and Flask, React, PostgreSQL, Framer, the full Adobe suite. Design that could also function — not just look right, but work.",
    ],
  },
  {
    number: "05",
    title: "Thank you, in colour",
    subtitle: "The people who taught me the craft",
    paragraphs: [
      "None of this was built alone. Thanks to Will Paterson, whose work in logo design, hand lettering and brand identity taught me how to think about a mark. To Abi Connick, who taught me strategic brand identity development — and who still gets a mention every time she replies to my emails. And to Peter, of Peter's Design Company in Minneapolis, who taught me the craft of building marks meant to last.",
      "I owe a piece of this to all three.",
    ],
  },
  {
    number: "06",
    title: "Today, across 31 brands",
    subtitle: "Where the work stands now",
    paragraphs: [
      "Today I work across 31 brands. Some built from the ground up. Some I'm still growing alongside their owners. And the everyday work in between — a flyer here, a small IT fix there, a brand audit, a clarity session.",
      "The scale changed. The work changed. I changed — I've become better.",
    ],
  },
  {
    number: "07",
    title: "Still moving",
    subtitle: "Closing — ties back to the opening line",
    paragraphs: [
      "When I look at CVC now, I can still see the room: the mattress on the floor, the cardboard box full of old exam papers, the laptop overheating while Photoshop struggled to stay open. I can still remember the KSh 200. The extra KSh 150. A coursemate handing me a cracked copy of Photoshop. And a matatu, two hours in traffic, a stranger beside me, a promise, and one sentence.",
      "Maybe that's what I've been doing ever since. Moving. Not always quickly. Not always knowing where the road leads. Sometimes with very little, sometimes with the wrong tools, sometimes having to start again.",
      "But moving.",
      "Now a designer, a strategist and a developer — creative lead and founder of Colourful Visual Communication.",
    ],
  },
];

export default function OurStory() {
  useEffect(markPrerenderReady, []);

  return (
    <>
      <Seo
        title="Our Story"
        path="/about/our-story"
        description="How Colourful Visual Communication started — on a matatu, in traffic, on a Saturday. From a KSh 200 wedding invitation to 31 brands."
        jsonLd={localBusinessJsonLd}
      />

      <section className="px-6 pb-16 pt-24 sm:pt-32">
        <Container className="max-w-2xl">
          <Breadcrumbs items={[{ label: "About", to: "/about" }, { label: "Our Story" }]} />
          <motion.div variants={stagger(0, 0.1)} initial="hidden" animate="visible">
            <motion.p variants={fadeUp} className="font-mono text-xs uppercase tracking-[0.18em] text-cvc-muted">
              Our Story
            </motion.p>
            <motion.h1 variants={fadeUp} className="mt-5 text-4xl font-bold tracking-tight sm:text-5xl">
              Colourful Visual Communication didn&rsquo;t start in a boardroom. It started in traffic.
            </motion.h1>
            <motion.p variants={fadeUp} className="mt-6 text-lg text-cvc-muted">
              From an idea, to a promise, to a platform.
            </motion.p>
          </motion.div>
        </Container>
      </section>

      {SECTIONS.map((s, i) => (
        <section
          key={s.number}
          className={`border-t border-white/10 px-6 py-16 ${i % 2 === 1 ? "bg-cvc-cyan/5" : ""}`}
        >
          <Container className="max-w-2xl">
            <motion.div {...revealOnce} variants={stagger(0.08)}>
              <motion.p variants={fadeUp} className="font-mono text-xs uppercase tracking-[0.18em] text-cvc-crimson">
                {s.number}
              </motion.p>
              <motion.h2 variants={fadeUp} className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
                {s.title}
              </motion.h2>
              <motion.p variants={fadeUp} className="mt-1 text-sm italic text-cvc-muted">
                {s.subtitle}
              </motion.p>
              <motion.div variants={fadeUp} className="mt-6 space-y-4 text-cvc-muted">
                {s.paragraphs.map((p, pi) => (
                  <p key={pi}>{p}</p>
                ))}
              </motion.div>

              {s.quote && (
                <motion.div variants={fadeUp} className="mt-8">
                  <Pullquote cite={s.quote.cite}>{s.quote.text}</Pullquote>
                </motion.div>
              )}

              {s.trailingParagraphs && (
                <motion.div variants={fadeUp} className="mt-8 space-y-4 text-cvc-muted">
                  {s.trailingParagraphs.map((p, pi) => (
                    <p key={pi}>{p}</p>
                  ))}
                </motion.div>
              )}

              {s.closingStatement && (
                <motion.p variants={fadeUp} className="mt-6 text-cvc-paper">
                  {s.closingStatement}
                </motion.p>
              )}
            </motion.div>
          </Container>
        </section>
      ))}

      <section className="border-t border-white/10 bg-cvc-ink px-6 py-24 text-center">
        <Container className="max-w-2xl">
          <motion.div {...revealOnce} variants={stagger(0.1)}>
            <motion.p variants={fadeUp} className="text-2xl font-bold tracking-tight text-cvc-amber sm:text-3xl">
              For the journey has been Colourful.
            </motion.p>
            <motion.div variants={fadeUp} className="mt-9 flex justify-center">
              <WhatsAppCTA text="Start your own story" />
            </motion.div>
          </motion.div>
        </Container>
      </section>
    </>
  );
}
