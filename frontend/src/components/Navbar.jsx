import { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleSignOut = () => { signOut(); navigate('/login'); setMenuOpen(false); };
  const close = () => setMenuOpen(false);

  const isOwner = user?.role === 'owner' || user?.role === 'admin';
  const isUser  = user?.role === 'user';

  return (
    <nav className="navbar">
      <Link to="/" className="navbar-brand" onClick={close}>FoodDash</Link>

      <button className="navbar-toggle" onClick={() => setMenuOpen((o) => !o)}
        aria-label="Toggle navigation" aria-expanded={menuOpen}>
        <span>{menuOpen ? '✕' : '☰'}</span>
      </button>

      <div className={`navbar-links ${menuOpen ? 'open' : ''}`}>
        {/* Customer nav */}
        {(!user || isUser) && (
          <>
            <NavLink to="/browse"    onClick={close}>Browse</NavLink>
            {user && <NavLink to="/my-orders" onClick={close}>My Orders</NavLink>}
          </>
        )}

        {/* Owner nav */}
        {isOwner && (
          <>
            <NavLink to="/owner"       onClick={close}>Owner Portal</NavLink>
            <NavLink to="/restaurants" onClick={close}>All Restaurants</NavLink>
          </>
        )}

        {user && <NavLink to="/profile" onClick={close}>Profile</NavLink>}

        {user ? (
          <>
            <span className="navbar-user">
              {user.username}
              {isOwner && <span className="navbar-role-badge">Owner</span>}
            </span>
            <button className="btn btn-outline btn-sm" onClick={handleSignOut}>Sign Out</button>
          </>
        ) : (
          <>
            <NavLink to="/login"    onClick={close}>Login</NavLink>
            <NavLink to="/register" className="btn btn-primary btn-sm" onClick={close}>Register</NavLink>
          </>
        )}
      </div>
    </nav>
  );
}
