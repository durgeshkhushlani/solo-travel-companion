import { Link } from 'react-router-dom';

export default function Navbar() {
  return (
    <nav className="flex items-center gap-4 bg-white px-6 py-3 shadow">
      <Link to="/" className="font-bold text-teal-700">STC</Link>
      <Link to="/explore">Explore</Link>
      <Link to="/plans/new">Create plan</Link>
      <Link to="/chat">Chat</Link>
      <Link to="/community">Community</Link>
      <Link to="/assistant">Assistant</Link>
      <Link to="/login" className="ml-auto">Login</Link>
    </nav>
  );
}
