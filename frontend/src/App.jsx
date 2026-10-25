import { Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import Home from './pages/Home.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import Explore from './pages/Explore.jsx';
import Profile from './pages/Profile.jsx';
import Chat from './pages/Chat.jsx';
import Community from './pages/Community.jsx';
import Assistant from './pages/Assistant.jsx';
import NotFound from './pages/NotFound.jsx';
import PlanForm from './pages/travel/PlanForm.jsx';
import PlanDetail from './pages/travel/PlanDetail.jsx';
import AdminDashboard from './pages/admin/AdminDashboard.jsx';

export default function App() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <Navbar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/explore" element={<Explore />} />
        <Route path="/plans/new" element={<ProtectedRoute><PlanForm /></ProtectedRoute>} />
        <Route path="/plans/:id" element={<PlanDetail />} />
        <Route path="/plans/:id/edit" element={<ProtectedRoute><PlanForm /></ProtectedRoute>} />
        <Route path="/profile/:id" element={<Profile />} />
        <Route path="/chat" element={<ProtectedRoute><Chat /></ProtectedRoute>} />
        <Route path="/community" element={<ProtectedRoute><Community /></ProtectedRoute>} />
        <Route path="/assistant" element={<ProtectedRoute><Assistant /></ProtectedRoute>} />
        <Route path="/admin" element={<ProtectedRoute role="ADMIN"><AdminDashboard /></ProtectedRoute>} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </div>
  );
}
