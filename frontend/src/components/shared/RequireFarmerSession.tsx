import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../../lib/AuthContext.js";

/** Redirects to /login when there's no session. Plain component, no wagmi import. */
export function RequireFarmerSession({ children }: { children: ReactNode }) {
  const { session, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="farmer-page" style={{ paddingTop: "var(--sp-16)" }}>
        <p className="mono-label">Loading…</p>
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  return <>{children}</>;
}
