import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface PrivateRouteProps {
  requiredRole?: string;
}

export default function PrivateRoute({ requiredRole }: PrivateRouteProps) {
  const { isAuthenticated, userRole } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  if (requiredRole && userRole) {
    const requiredRoles = requiredRole.split(',').map(role => role.trim());
    if (!requiredRoles.includes(userRole)) {
      return <Navigate to="/dashboard" replace />;
    }
  }

  return <Outlet />;
}