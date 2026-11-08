import { Link } from "react-router-dom";
import Container from "../../components/ui/Container.jsx";
import NoIndex from "../../components/NoIndex.jsx";
import { Helmet } from "react-helmet-async";

export default function NotFound() {
  return (
    <Container className="py-32 text-center">
      <NoIndex />
      <Helmet>
        <title>Page not found — CVC</title>
      </Helmet>
      <p className="text-cvc-muted">That page doesn't exist.</p>
      <Link to="/" className="mt-4 inline-block text-cvc-paper underline">
        Back to the homepage
      </Link>
    </Container>
  );
}
