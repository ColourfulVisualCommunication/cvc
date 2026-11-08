import { Helmet } from "react-helmet-async";

// Unknown URLs still return HTTP 200 (the host serves the SPA shell for any
// path), so this tag is what tells search engines not to index a "not
// found" state — otherwise every mistyped URL looks like a duplicate page.
export default function NoIndex() {
  return (
    <Helmet>
      <meta name="robots" content="noindex" />
    </Helmet>
  );
}
