import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { login } from '../api/auth';
import { useAuth } from '../context/AuthContext';
import ErrorMessage from '../components/ErrorMessage';

const validate = ({ email, password }) => {
  const errs = [];
  if (!email) errs.push('Email is required.');
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errs.push('Please enter a valid email.');
  if (!password) errs.push('Password is required.');
  return errs;
};

export default function LoginPage() {
  const { signIn } = useAuth();
  const navigate   = useNavigate();
  const location   = useLocation();

  const [form, setForm]   = useState({ email: '', password: '' });
  const [errors, setErrors] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (e) => {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
    setErrors([]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const clientErrors = validate(form);
    if (clientErrors.length) { setErrors(clientErrors); return; }

    setSubmitting(true);
    try {
      const res  = await login(form);
      const user = res.data.user;
      signIn(res.data.token, user);

      // Redirect: owners → owner portal, everyone else → browse page
      const from = location.state?.from?.pathname;
      if (from && from !== '/login' && from !== '/register') {
        navigate(from, { replace: true });
      } else {
        navigate(user.role === 'owner' ? '/owner' : '/browse', { replace: true });
      }
    } catch (err) {
      const detail = err.response?.data?.details || err.response?.data?.error;
      setErrors(Array.isArray(detail) ? detail : [detail || 'Login failed.']);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1>Sign In</h1>
        <p className="auth-subtitle">Welcome back to FoodDash</p>

        <form onSubmit={handleSubmit} noValidate>
          <ErrorMessage error={errors} />

          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input id="email" type="email" name="email" value={form.email}
              onChange={handleChange} placeholder="you@example.com" autoComplete="email" required />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input id="password" type="password" name="password" value={form.password}
              onChange={handleChange} placeholder="••••••••" autoComplete="current-password" required />
          </div>

          <button type="submit" className="btn btn-primary btn-full" disabled={submitting}>
            {submitting ? 'Signing in…' : 'Sign In'}
          </button>
        </form>

        <p className="auth-switch">
          Don't have an account? <Link to="/register">Register</Link>
        </p>
      </div>
    </div>
  );
}
