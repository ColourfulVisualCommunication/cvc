import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";

import { listPosts } from "../../api/client.js";
import { fadeUp, stagger, revealOnce } from "../../motion/variants.js";
import Container from "../../components/ui/Container.jsx";
import Seo from "../../components/Seo.jsx";
import { markPrerenderReady } from "../../lib/prerenderReady.js";

export default function Blog() {
  const [posts, setPosts] = useState(null);

  useEffect(() => {
    listPosts().then((p) => setPosts(p.items ?? [])).catch(() => setPosts([])).finally(markPrerenderReady);
  }, []);

  return (
    <>
      <Seo
        title="Blog"
        path="/blog"
        description="Notes on brand, web development, and running a creative studio from Limuru, Kenya."
      />

      <section className="px-6 pb-16 pt-24 sm:pt-32">
        <Container>
          <motion.div variants={stagger(0, 0.1)} initial="hidden" animate="visible" className="max-w-2xl">
            <motion.p variants={fadeUp} className="font-mono text-xs uppercase tracking-[0.18em] text-cvc-muted">
              Blog
            </motion.p>
            <motion.h1 variants={fadeUp} className="mt-5 text-4xl font-bold tracking-tight sm:text-5xl">
              Notes from the studio.
            </motion.h1>
          </motion.div>
        </Container>
      </section>

      <section className="border-t border-black/5 px-6 py-16">
        <Container>
          {posts === null && <div className="h-40" />}

          {posts?.length === 0 && (
            <motion.p {...revealOnce} className="max-w-lg text-lg text-cvc-muted">
              First posts are on the way. Check back soon.
            </motion.p>
          )}

          {posts?.length > 0 && (
            <motion.div {...revealOnce} variants={stagger(0.08)} className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {posts.map((p) => (
                <motion.div key={p.slug} variants={fadeUp}>
                  <Link to={`/blog/${p.slug}`} className="group block">
                    {p.cover_image_url && (
                      <div className="aspect-[16/10] overflow-hidden rounded-2xl bg-black/5">
                        <img
                          src={p.cover_image_url}
                          alt={p.title}
                          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                      </div>
                    )}
                    <h3 className="mt-4 text-lg font-semibold">{p.title}</h3>
                    {p.excerpt && <p className="mt-1 text-sm text-cvc-muted">{p.excerpt}</p>}
                  </Link>
                </motion.div>
              ))}
            </motion.div>
          )}
        </Container>
      </section>
    </>
  );
}
