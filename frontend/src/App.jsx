import { Routes, Route } from "react-router-dom";
import Home from "./pages/public/Home.jsx";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      {/* Phase 2 adds: /about /services /services/:slug /work /work/:slug /blog /contact
          Phase 4 adds: /quote/:token
          Phase 6 adds: /project/:token
          Admin lives under /admin */}
    </Routes>
  );
}
