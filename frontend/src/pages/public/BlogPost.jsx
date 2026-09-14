import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { motion } from "framer-motion";

import { getPost } from "../../api/client.js";
import { fadeUp, stagger } from "../../motion/variants.js";
import Container from "../../components/ui/Container.jsx";
import Breadcrumbs from "../../components/ui/Breadcrumbs.jsx";
import Seo from "../../components/Seo.jsx";
import { markPrerenderReady } from "../../lib/prerenderReady.js";

export default function BlogPost() {
  const { slug } = useParams();
  const [post, setPost] = useState(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    setPost(null);
    setNotFound(false);
    getPost(slug)
      .then(setPost)
      .catch(() => setNotFound(true))
      .finally(markPrerenderReady);
  }, [slug]);

  if (notFound) {
    return (
      <Container className="py-32 text-center">
        <div className="mb-6 flex justify-center">
          <Breadcrumbs items={[{ label: "Blog", to: "/blog" }, { label: "Not found" }]} className="mb-0" />
        </div>
        <p className="text-cvc-muted">That post doesn't exist.</p>
        <Link to="/blog" className="mt-4 inline-block text-cvc-paper underline">
          Back to the blog
        </Link>
      </Container>
    );
  }

  if (!post) return <div className="py-32" />;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.excerpt,
    image: post.cover_image_url,
    datePublished: post.published_at,
    author: { "@type": "Organization", name: "Colourful Visual Communication" },
  };

  return (
    <>
      <Seo
        title={post.title}
        path={`/blog/${post.slug}`}
        description={post.excerpt}
        image={post.cover_image_url}
        jsonLd={jsonLd}
      />

      <article className="px-6 pb-20 pt-24 sm:pt-32">
        <Container className="max-w-2xl">
          <Breadcrumbs items={[{ label: "Blog", to: "/blog" }, { label: post.title }]} />
          <motion.div variants={stagger(0, 0.1)} initial="hidden" animate="visible">
            <motion.h1 variants={fadeUp} className="text-5xl font-bold tracking-tight sm:text-6xl">
              {post.title}
            </motion.h1>
            {post.published_at && (
              <motion.p variants={fadeUp} className="mt-4 text-sm text-cvc-muted">
                {new Date(post.published_at).toLocaleDateString("en-KE", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </motion.p>
            )}
            {post.cover_image_url && (
              <motion.div variants={fadeUp} className="mt-8 overflow-hidden bg-white/5">
                <img src={post.cover_image_url} alt={post.title} className="w-full object-cover" />
              </motion.div>
            )}
            <motion.div
              variants={fadeUp}
              className="mt-8 space-y-5 text-lg leading-relaxed text-cvc-paper [&_a]:underline [&_a]:underline-offset-4 [&_h2]:mt-8 [&_h2]:text-2xl [&_h2]:font-bold"
              dangerouslySetInnerHTML={{ __html: post.body || "" }}
            />
          </motion.div>
        </Container>
      </article>
    </>
  );
}
