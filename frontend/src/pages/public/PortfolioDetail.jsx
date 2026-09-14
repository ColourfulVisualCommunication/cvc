import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { motion } from "framer-motion";

import { getPortfolioProject } from "../../api/client.js";
import { fadeUp, stagger } from "../../motion/variants.js";
import Container from "../../components/ui/Container.jsx";
import WhatsAppCTA from "../../components/ui/WhatsAppCTA.jsx";
import Seo from "../../components/Seo.jsx";
import { markPrerenderReady } from "../../lib/prerenderReady.js";

export default function PortfolioDetail() {
  const { slug } = useParams();
  const [project, setProject] = useState(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    setProject(null);
    setNotFound(false);
    getPortfolioProject(slug)
      .then(setProject)
      .catch(() => setNotFound(true))
      .finally(markPrerenderReady);
  }, [slug]);

  if (notFound) {
    return (
      <Container className="py-32 text-center">
        <p className="text-cvc-muted">That project doesn't exist.</p>
        <Link to="/work" className="mt-4 inline-block text-cvc-paper underline">
          Back to work
        </Link>
      </Container>
    );
  }

  if (!project) return <div className="py-32" />;

  return (
    <>
      <Seo title={project.title} path={`/work/${project.slug}`} description={project.summary} image={project.cover_image_url} />

      <section className="px-6 pb-16 pt-24 sm:pt-32">
        <Container className="max-w-3xl">
          <motion.div variants={stagger(0, 0.1)} initial="hidden" animate="visible">
            <motion.p variants={fadeUp} className="font-mono text-xs uppercase tracking-[0.18em] text-cvc-muted">
              {project.client_name}
            </motion.p>
            <motion.h1 variants={fadeUp} className="mt-5 text-4xl font-bold tracking-tight sm:text-5xl">
              {project.title}
            </motion.h1>

            {project.cover_image_url && (
              <motion.div variants={fadeUp} className="mt-10 overflow-hidden bg-white/5">
                <img src={project.cover_image_url} alt={project.title} className="w-full object-cover" />
              </motion.div>
            )}

            <div className="mt-12 grid gap-10 sm:grid-cols-3">
              {project.problem && (
                <motion.div variants={fadeUp}>
                  <p className="text-xs uppercase tracking-wide text-cvc-muted">Problem</p>
                  <p className="mt-2 text-cvc-paper">{project.problem}</p>
                </motion.div>
              )}
              {project.solution && (
                <motion.div variants={fadeUp}>
                  <p className="text-xs uppercase tracking-wide text-cvc-muted">What we did</p>
                  <p className="mt-2 text-cvc-paper">{project.solution}</p>
                </motion.div>
              )}
              {project.result && (
                <motion.div variants={fadeUp}>
                  <p className="text-xs uppercase tracking-wide text-cvc-muted">Result</p>
                  <p className="mt-2 text-cvc-paper">{project.result}</p>
                </motion.div>
              )}
            </div>

            {project.gallery?.length > 0 && (
              <motion.div variants={fadeUp} className="mt-12 grid gap-4 sm:grid-cols-2">
                {project.gallery.map((src) => (
                  <div key={src} className="overflow-hidden bg-white/5">
                    <img src={src} alt="" className="w-full object-cover" />
                  </div>
                ))}
              </motion.div>
            )}

            <motion.div variants={fadeUp} className="mt-12">
              <WhatsAppCTA text="Start a project like this" />
            </motion.div>
          </motion.div>
        </Container>
      </section>
    </>
  );
}
