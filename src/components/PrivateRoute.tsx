import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface PrivateRouteProps {
  requiredRole?: string;
  children: React.ReactNode;
}

export default function PrivateRoute({ requiredRole, children }: PrivateRouteProps) {
  const { isAuthenticated, userRole } = useAuth();

  console.log('PrivateRoute:', { isAuthenticated, userRole, requiredRole }); // Add debugging

  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  if (requiredRole && userRole) {
    const requiredRoles = requiredRole.split(',').map(role => role.trim());
    if (!requiredRoles.includes(userRole)) {
      return <Navigate to="/dashboard" replace />;
    }
  }

  return children;
}