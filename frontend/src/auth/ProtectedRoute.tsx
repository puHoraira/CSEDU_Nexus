import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "./AuthContext";

type ProtectedRouteProps = {
  requiredRoles?: string[];
  children?: React.ReactNode;
};

export function ProtectedRoute({ requiredRoles, children }: ProtectedRouteProps) {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="page-screen"><div className="page-screen__body">Loading session...</div></div>;
  }

  if (!user) {
    return <Navigate to="/auth/login" replace />;
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
