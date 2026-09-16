import { useEffect, useState } from "react";

import { listClientLogos } from "../api/client.js";
import Container from "./ui/Container.jsx";
import SectionHeading from "./ui/SectionHeading.jsx";
import LogoMarquee from "./ui/LogoMarquee.jsx";

export default function ClientLogos() {
  const [logos, setLogos] = useState([]);

  useEffect(() => {
    listClientLogos().then((r) => setLogos(r.items ?? [])).catch(() => {});
  }, []);

  if (logos.length === 0) return null;

  return (
    <section className="border-t border-black/10 bg-cvc-paper py-20">
      <Container>
        <SectionHeading
          eyebrow={`${logos.length}+ brands that we work with`}
          title="We thank you for trusting us"
          subtitle="The journey has been colourful."
          center
          onLight
        />

        <div className="mt-16">
          <LogoMarquee logos={logos} />
        </div>
      </Container>
    </section>
  );
}
