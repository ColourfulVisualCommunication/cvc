import { Routes, Route, Navigate } from "react-router-dom";

import { AuthProvider } from "./admin/AuthContext.jsx";
import ProtectedRoute from "./admin/ProtectedRoute.jsx";

import ScrollManager from "./components/ScrollManager.jsx";
import Layout from "./components/layout/Layout.jsx";
import AdminLayout from "./components/layout/AdminLayout.jsx";

import Home from "./pages/public/Home.jsx";
import About from "./pages/public/About.jsx";
import OurStory from "./pages/public/OurStory.jsx";
import Process from "./pages/public/Process.jsx";
import ServiceDetail from "./pages/public/ServiceDetail.jsx";
import Portfolio from "./pages/public/Portfolio.jsx";
import PortfolioDetail from "./pages/public/PortfolioDetail.jsx";
import Blog from "./pages/public/Blog.jsx";
import BlogPost from "./pages/public/BlogPost.jsx";
import Contact from "./pages/public/Contact.jsx";
import QuotePage from "./pages/public/QuotePage.jsx";
import ProjectPage from "./pages/public/ProjectPage.jsx";

import Login from "./pages/admin/Login.jsx";
import Dashboard from "./pages/admin/Dashboard.jsx";
import LeadsAdmin from "./pages/admin/Leads.jsx";
import QuotesAdmin from "./pages/admin/Quotes.jsx";
import InvoicesAdmin from "./pages/admin/Invoices.jsx";
import ProjectsAdmin from "./pages/admin/Projects.jsx";
import PortfolioAdmin from "./pages/admin/Portfolio.jsx";
import PostsAdmin from "./pages/admin/Posts.jsx";
import TestimonialsAdmin from "./pages/admin/Testimonials.jsx";
import ClientLogosAdmin from "./pages/admin/ClientLogos.jsx";

export default function App() {
  return (
    <AuthProvider>
      <ScrollManager />
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Home />} />
          <Route path="/about" element={<About />} />
          <Route path="/about/our-story" element={<OurStory />} />
          <Route path="/process" element={<Process />} />
          {/* The ladder overview now lives on the homepage (#services) —
              redirect rather than 404 for anyone with the old URL bookmarked
              or indexed. Individual service detail pages are unaffected. */}
          <Route path="/services" element={<Navigate to="/#services" replace />} />
          <Route path="/services/:slug" element={<ServiceDetail />} />
          <Route path="/work" element={<Portfolio />} />
          <Route path="/work/:slug" element={<PortfolioDetail />} />
          <Route path="/blog" element={<Blog />} />
          <Route path="/blog/:slug" element={<BlogPost />} />
          <Route path="/contact" element={<Contact />} />
        </Route>

        <Route path="/quote/:token" element={<QuotePage />} />
        <Route path="/project/:token" element={<ProjectPage />} />

        <Route path="/admin/login" element={<Login />} />
        <Route element={<ProtectedRoute />}>
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<Dashboard />} />
            <Route path="leads" element={<LeadsAdmin />} />
            <Route path="quotes" element={<QuotesAdmin />} />
            <Route path="invoices" element={<InvoicesAdmin />} />
            <Route path="projects" element={<ProjectsAdmin />} />
            <Route path="portfolio" element={<PortfolioAdmin />} />
            <Route path="posts" element={<PostsAdmin />} />
            <Route path="testimonials" element={<TestimonialsAdmin />} />
            <Route path="clients" element={<ClientLogosAdmin />} />
          </Route>
        </Route>
      </Routes>
    </AuthProvider>
  );
}
