import { useEffect, useState } from "react";
import { motion } from "framer-motion";

import { health, listServices } from "../../api/client.js";
import { fadeUp, stagger, revealOnce } from "../../motion/variants.js";

/**
 * Phase 1 placeholder. Its only job is to prove the whole chain works:
 * React → Vite proxy → Flask → PostgreSQL → back again.
 * Phase 2 replaces this entirely with the real site.
 */
export default function Home() {
  const [status, setStatus] = useState(null);
  const [services, setServices] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    Promise.all([health(), listServices()])
      .then(([h, s]) => {
        setStatus(h);
        setServices(s.items);
      })
      .catch((e) => setError(e.message));
  }, []);

  return (
    <main className="min-h-screen px-6 py-20">
      <motion.div
        className="mx-auto max-w-3xl"
        variants={stagger(0, 0.1)}
        initial="hidden"
        animate="visible"
      >
        <motion.p
          variants={fadeUp}
          className="font-mono text-xs uppercase tracking-[0.18em] text-cvc-muted"
        >
          Phase 1 · Foundation
        </motion.p>

        <motion.h1
          variants={fadeUp}
          className="mt-5 text-5xl font-bold leading-none tracking-tight sm:text-6xl"
        >
          Colourful Visual
          <br />
          <span className="text-cvc-amber">Communication</span>
        </motion.h1>

        <motion.div variants={fadeUp} className="mt-6 flex h-1.5 w-40">
          <div className="flex-1 bg-cvc-amber" />
          <div className="flex-1 bg-cvc-cyan" />
          <div className="flex-1 bg-cvc-crimson" />
        </motion.div>

        <motion.p variants={fadeUp} className="mt-6 text-lg text-cvc-muted">
          From Idea to Action. From Action to Reality.
        </motion.p>

        <motion.div
          variants={fadeUp}
          className="mt-12 border-t border-black/10 pt-6 font-mono text-sm"
        >
          {error && <p className="text-cvc-crimson">API unreachable — {error}</p>}
          {status && (
            <p className="text-cvc-muted">
              API <span className="text-cvc-ink">{status.status}</span> · database{" "}
              <span className="text-cvc-ink">{status.database}</span> · {services.length}{" "}
              services loaded
            </p>
          )}
          {!status && !error && <p className="text-cvc-muted">Checking the API…</p>}
        </motion.div>

        {services.length > 0 && (
          <motion.ul {...revealOnce} variants={stagger(0.1)} className="mt-8 space-y-2">
            {services.map((s) => (
              <motion.li
                key={s.slug}
                variants={fadeUp}
                className="flex items-baseline justify-between gap-4 border-b border-black/5 py-2"
              >
                <span className="font-medium">{s.name}</span>
                <span className="font-mono text-xs text-cvc-muted">
                  Tier {s.tier} · {s.price_type}
                </span>
              </motion.li>
            ))}
          </motion.ul>
        )}
      </motion.div>
    </main>
  );
}
