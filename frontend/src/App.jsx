import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';
import LoginPage        from './pages/LoginPage';
import RegisterPage     from './pages/RegisterPage';
import BrowsePage       from './pages/BrowsePage';
import MyOrdersPage     from './pages/MyOrdersPage';
import OwnerPortalPage  from './pages/OwnerPortalPage';
import RestaurantsPage  from './pages/RestaurantsPage';
import MenuItemsPage    from './pages/MenuItemsPage';
import ProfilePage      from './pages/ProfilePage';

// Smart default redirect based on role
function HomeRedirect() {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/browse" replace />;
  if (user.role === 'owner' || user.role === 'admin') return <Navigate to="/owner" replace />;
  return <Navigate to="/browse" replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Navbar />
        <main className="main-content">
          <Routes>
            <Route path="/"            element={<HomeRedirect />} />
            <Route path="/login"       element={<LoginPage />} />
            <Route path="/register"    element={<RegisterPage />} />
            <Route path="/browse"      element={<BrowsePage />} />
            <Route path="/restaurants" element={<RestaurantsPage />} />
            <Route path="/menu-items"  element={<MenuItemsPage />} />

            <Route path="/my-orders" element={
              <ProtectedRoute><MyOrdersPage /></ProtectedRoute>
            } />

            <Route path="/profile" element={
              <ProtectedRoute><ProfilePage /></ProtectedRoute>
            } />

            <Route path="/owner" element={
              <ProtectedRoute ownerOnly><OwnerPortalPage /></ProtectedRoute>
            } />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </BrowserRouter>
    </AuthProvider>
  );
}
