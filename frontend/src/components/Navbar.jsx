import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate('/login');
  }

  return (
    <nav className="flex flex-wrap items-center gap-4 bg-white px-6 py-3 shadow">
      <Link to="/" className="font-bold text-teal-700">STC</Link>
      <Link to="/explore">Explore</Link>
      {user && (
        <>
          <Link to="/plans/new">Create Travel Plan</Link>
          <Link to="/friends">Friends</Link>
          <Link to="/chat">Private Chat</Link>
          <Link to="/assistant">Travel Assistant</Link>
          {user.role === 'ADMIN' && <Link to="/admin">Admin Panel</Link>}
        </>
      )}
      <span className="ml-auto flex items-center gap-4">
        {user ? (
          <>
            <Link to={`/profile/${user.id}`}>{user.name}</Link>
            <button type="button" onClick={handleLogout} className="text-teal-700 underline">
              Log out
            </button>
          </>
        ) : (
          <>
            <Link to="/login">Log in</Link>
            <Link to="/register">Register</Link>
          </>
        )}
      </span>
    </nav>
  );
}
