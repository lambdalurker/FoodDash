import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ children, ownerOnly = false }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <div className="loading-screen">Loading…</div>;
  if (!user)   return <Navigate to="/login" state={{ from: location }} replace />;
  if (ownerOnly && user.role !== 'owner' && user.role !== 'admin')
    return <Navigate to="/browse" replace />;

  return children;
}
