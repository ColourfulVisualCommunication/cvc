import { Routes, Route } from "react-router-dom";

import { AuthProvider } from "./admin/AuthContext.jsx";
import ProtectedRoute from "./admin/ProtectedRoute.jsx";

import ScrollManager from "./components/ScrollManager.jsx";
import Layout from "./components/layout/Layout.jsx";
import AdminLayout from "./components/layout/AdminLayout.jsx";

import Home from "./pages/public/Home.jsx";
import About from "./pages/public/About.jsx";
import OurStory from "./pages/public/OurStory.jsx";
import Process from "./pages/public/Process.jsx";
import Services from "./pages/public/Services.jsx";
import ServiceDetail from "./pages/public/ServiceDetail.jsx";
import Portfolio from "./pages/public/Portfolio.jsx";
import PortfolioDetail from "./pages/public/PortfolioDetail.jsx";
import Blog from "./pages/public/Blog.jsx";
import BlogPost from "./pages/public/BlogPost.jsx";
import Contact from "./pages/public/Contact.jsx";

import Login from "./pages/admin/Login.jsx";
import Dashboard from "./pages/admin/Dashboard.jsx";
import LeadsAdmin from "./pages/admin/Leads.jsx";
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
          <Route path="/services" element={<Services />} />
          <Route path="/services/:slug" element={<ServiceDetail />} />
          <Route path="/work" element={<Portfolio />} />
          <Route path="/work/:slug" element={<PortfolioDetail />} />
          <Route path="/blog" element={<Blog />} />
          <Route path="/blog/:slug" element={<BlogPost />} />
          <Route path="/contact" element={<Contact />} />
        </Route>

        <Route path="/admin/login" element={<Login />} />
        <Route element={<ProtectedRoute />}>
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<Dashboard />} />
            <Route path="leads" element={<LeadsAdmin />} />
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
