import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { motion } from "framer-motion";

import { getService } from "../../api/client.js";
import { fadeUp, stagger } from "../../motion/variants.js";
import Container from "../../components/ui/Container.jsx";
import WhatsAppCTA from "../../components/ui/WhatsAppCTA.jsx";
import Seo from "../../components/Seo.jsx";
import { markPrerenderReady } from "../../lib/prerenderReady.js";

function formatPrice(s) {
  if (!s.price_cents) return "Quoted after a short call";
  const base = `KES ${(s.price_cents / 100).toLocaleString()}`;
  return s.price_max_cents ? `${base} – ${(s.price_max_cents / 100).toLocaleString()}` : base;
}

export default function ServiceDetail() {
  const { slug } = useParams();
  const [service, setService] = useState(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    setService(null);
    setNotFound(false);
    getService(slug)
      .then(setService)
      .catch(() => setNotFound(true))
      .finally(markPrerenderReady);
  }, [slug]);

  if (notFound) {
    return (
      <Container className="py-32 text-center">
        <p className="text-cvc-muted">That service doesn't exist.</p>
        <Link to="/services" className="mt-4 inline-block text-cvc-ink underline">
          Back to services
        </Link>
      </Container>
    );
  }

  if (!service) return <div className="py-32" />;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: service.name,
    description: service.summary,
    provider: { "@type": "LocalBusiness", name: "Colourful Visual Communication" },
    areaServed: "Kenya",
    ...(service.price_cents && {
      offers: {
        "@type": "Offer",
        priceCurrency: "KES",
        price: service.price_cents / 100,
      },
    }),
  };

  return (
    <>
      <Seo title={service.name} path={`/services/${service.slug}`} description={service.summary} jsonLd={jsonLd} />

      <section className="px-6 pb-16 pt-24 sm:pt-32">
        <Container className="max-w-2xl">
          <motion.div variants={stagger(0, 0.1)} initial="hidden" animate="visible">
            <motion.p variants={fadeUp} className="font-mono text-xs uppercase tracking-[0.18em] text-cvc-muted">
              Service
            </motion.p>
            <motion.h1 variants={fadeUp} className="mt-5 text-4xl font-bold tracking-tight sm:text-5xl">
              {service.name}
            </motion.h1>
            <motion.p variants={fadeUp} className="mt-6 text-lg text-cvc-muted">
              {service.summary}
            </motion.p>
            {service.description && (
              <motion.p variants={fadeUp} className="mt-4 text-cvc-muted">
                {service.description}
              </motion.p>
            )}

            <motion.div variants={fadeUp} className="mt-8 flex flex-wrap gap-6 border border-black/10 p-6">
              <div>
                <p className="text-xs uppercase tracking-wide text-cvc-muted">Investment</p>
                <p className="mt-1 font-mono text-lg">{formatPrice(service)}</p>
              </div>
              {service.duration && (
                <div>
                  <p className="text-xs uppercase tracking-wide text-cvc-muted">Timeline</p>
                  <p className="mt-1 font-mono text-lg">{service.duration}</p>
                </div>
              )}
            </motion.div>

            {service.deliverables?.length > 0 && (
              <motion.div variants={fadeUp} className="mt-8">
                <p className="text-xs uppercase tracking-wide text-cvc-muted">What's included</p>
                <ul className="mt-3 space-y-2">
                  {service.deliverables.map((d) => (
                    <li key={d} className="flex items-start gap-2 text-cvc-ink">
                      <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-cvc-amber" />
                      {d}
                    </li>
                  ))}
                </ul>
              </motion.div>
            )}

            <motion.div variants={fadeUp} className="mt-10">
              <WhatsAppCTA
                text={`Ask about ${service.name}`}
                message={`Hi CVC, I'd like to know more about ${service.name}.`}
              />
            </motion.div>
          </motion.div>
        </Container>
      </section>
    </>
  );
}
