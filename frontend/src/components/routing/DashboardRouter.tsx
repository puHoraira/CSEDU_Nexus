import { useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import { getDefaultDashboardRoute, getUserType } from '../../utils/dashboardRouter';
import { Spinner } from '../ui/Spinner';

/**
 * DashboardRouter component that redirects users to their appropriate dashboard
 * based on their role/user type
 */
export function DashboardRouter() {
  const { user, loading } = useAuth();

  useEffect(() => {
    if (user) {
      const userType = getUserType(user);
      console.log(`[DashboardRouter] User type detected: ${userType}`, {
        userId: user.id,
        roles: user.roles,
        designation: user.designation,
        rolesLowerCase: user.roles.map(r => r.toLowerCase()),
      });
    }
  }, [user]);

  if (loading) {
    return (
      <div className="page-screen">
        <div className="page-screen__body">
          <Spinner size="lg" label="Loading your dashboard..." />
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth/login" replace />;
  }

  const dashboardRoute = getDefaultDashboardRoute(user);
  
  console.log(`[DashboardRouter] Redirecting to: ${dashboardRoute}`);

  return <Navigate to={dashboardRoute} replace />;
}
