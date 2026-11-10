import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

// Waits for the Session check, sends guests to /login and non-admins away from admin pages.
export default function ProtectedRoute({ children, role }) {
  const { user, loading } = useAuth();
  if (loading) return <p className="p-6 text-slate-500">Loading...</p>;
  if (!user) return <Navigate to="/login" replace />;
  if (role && user.role !== role) return <Navigate to="/" replace />;
  return children;
}
