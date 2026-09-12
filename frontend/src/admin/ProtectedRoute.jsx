import { Navigate, Outlet, useLocation } from "react-router-dom";

import { useAuth } from "./AuthContext.jsx";

export default function ProtectedRoute() {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <div className="min-h-screen" />;
  if (!user) return <Navigate to="/admin/login" state={{ from: location }} replace />;

  return <Outlet />;
}
