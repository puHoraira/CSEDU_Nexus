import { Link, Navigate, Outlet } from "react-router-dom";
import { useAuth } from "./AuthContext";

type ProtectedRouteProps = {
  requiredRoles?: string[];
  children?: React.ReactNode;
};

export function ProtectedRoute({ requiredRoles, children }: ProtectedRouteProps) {
  const { user, token, loading, logout } = useAuth();

  if (loading) {
    return <div className="page-screen"><div className="page-screen__body">Loading session...</div></div>;
  }

  if (!user) {
    return <Navigate to="/auth/login" replace />;
  }

  if (!token) {
    return (
      <div className="page-screen">
        <div className="page-screen__body">
          <section className="page-section" style={{ maxWidth: 720, marginInline: "auto" }}>
            <p className="eyebrow">Session expired</p>
            <h2 className="page-section__title" style={{ fontSize: "1.45rem" }}>
              Sign in again to proceed.
            </h2>
            <p style={{ color: "var(--muted)", lineHeight: 1.6 }}>
              Your previous session is no longer valid. Please sign in again to continue securely.
            </p>
            <div className="form-actions">
              <Link className="primary-button" to="/auth/login" onClick={logout}>
                Sign in again
              </Link>
              <Link className="secondary-button" to="/">
                Go to home
              </Link>
            </div>
          </section>
        </div>
      </div>
    );
  }

  if (requiredRoles && requiredRoles.length > 0) {
    const hasRole = user.roles.some((role) => requiredRoles.includes(role));
    if (!hasRole) {
      return <Navigate to="/dashboard/unauthorized" replace />;
    }
  }

  if (children) {
    return <>{children}</>;
  }

  return <Outlet />;
}
