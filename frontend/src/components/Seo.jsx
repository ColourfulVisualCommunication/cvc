import { Helmet } from "react-helmet-async";

const SITE_NAME = "CVC — Colourful Visual Communication";
const DEFAULT_DESCRIPTION =
  "Strategic creative and digital development agency in Limuru, Kenya. Brand identity, websites and web apps built by one team.";
const SITE_URL = "https://colourfulvisualcommunication.com";

export default function Seo({ title, description = DEFAULT_DESCRIPTION, image, path = "", jsonLd }) {
  const fullTitle = title ? `${title} — ${SITE_NAME}` : SITE_NAME;
  const url = `${SITE_URL}${path}`;
  const ogImage = image || `${SITE_URL}/og-default.jpg`;

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={url} />

      <meta property="og:type" content="website" />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={url} />
      <meta property="og:image" content={ogImage} />
      <meta property="og:site_name" content={SITE_NAME} />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={ogImage} />

      {jsonLd && (
        <script type="application/ld+json">
          {JSON.stringify(Array.isArray(jsonLd) ? jsonLd : [jsonLd])}
        </script>
      )}
    </Helmet>
  );
}

// Reused wherever a page needs to identify CVC as the business — every
// public page should carry this once real content exists, but it's cheap
// enough to include everywhere now.
export const localBusinessJsonLd = {
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  name: "Colourful Visual Communication",
  alternateName: "CVC",
  description: DEFAULT_DESCRIPTION,
  url: SITE_URL,
  telephone: "+254769604255",
  email: "njoroge@colourfulvisualcommunication.com",
  address: {
    "@type": "PostalAddress",
    addressLocality: "Limuru",
    addressRegion: "Kiambu County",
    addressCountry: "KE",
  },
};
