import { Navigate, useLocation } from "react-router-dom";

/**
 * Wraps any route that should only be accessible to a logged-in admin.
 * If the admin token is missing, redirects to /admin/login with `?redirect=<path>`
 * so the user lands back on the originally requested page after signing in.
 */
export default function RequireAdmin({ children }) {
  const token = typeof window !== "undefined" ? localStorage.getItem("sdps_admin_token") : null;
  const location = useLocation();
  if (!token) {
    const target = encodeURIComponent((location.pathname + location.search).replace(/^\//, ""));
    return <Navigate to={`/admin/login?redirect=${target}`} replace />;
  }
  return children;
}
