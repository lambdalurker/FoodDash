import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { register } from '../api/auth';
import { useAuth } from '../context/AuthContext';
import ErrorMessage from '../components/ErrorMessage';

const validate = ({ username, email, password }) => {
  const errs = [];
  if (!username) errs.push('Username is required.');
  else if (username.length < 3) errs.push('Username must be at least 3 characters.');
  else if (!/^[a-zA-Z0-9]+$/.test(username)) errs.push('Username must only contain letters and numbers.');
  if (!email) errs.push('Email is required.');
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errs.push('Please enter a valid email.');
  if (!password) errs.push('Password is required.');
  else if (password.length < 6) errs.push('Password must be at least 6 characters.');
  return errs;
};

export default function RegisterPage() {
  const { signIn } = useAuth();
  const navigate   = useNavigate();

  const [form, setForm]       = useState({ username: '', email: '', password: '' });
  const [isOwner, setIsOwner] = useState(false);
  const [errors, setErrors]   = useState([]);
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
      const res = await register({ ...form, isOwner });
      signIn(res.data.token, res.data.user);
      // Owners go straight to their portal; customers go to the browse page
      navigate(isOwner ? '/owner' : '/browse', { replace: true });
    } catch (err) {
      const detail = err.response?.data?.details || err.response?.data?.error;
      setErrors(Array.isArray(detail) ? detail : [detail || 'Registration failed.']);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1>Create Account</h1>
        <p className="auth-subtitle">Join FoodDash today</p>

        <form onSubmit={handleSubmit} noValidate>
          <ErrorMessage error={errors} />

          <div className="form-group">
            <label htmlFor="username">Username</label>
            <input id="username" type="text" name="username" value={form.username}
              onChange={handleChange} placeholder="johndoe" autoComplete="username" required />
          </div>

          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input id="email" type="email" name="email" value={form.email}
              onChange={handleChange} placeholder="you@example.com" autoComplete="email" required />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input id="password" type="password" name="password" value={form.password}
              onChange={handleChange} placeholder="Min. 6 characters" autoComplete="new-password" required />
          </div>

          <button type="submit" className="btn btn-primary btn-full" disabled={submitting}>
            {submitting ? 'Creating account…' : 'Create Account'}
          </button>
        </form>

        {/* Owner opt-in section */}
        <div className="owner-optin">
          <div className="owner-optin-divider">
            <span>Want to list your restaurant?</span>
          </div>
          <label className="checkbox-label owner-optin-check">
            <input
              type="checkbox"
              checked={isOwner}
              onChange={(e) => setIsOwner(e.target.checked)}
            />
            Register as a restaurant owner
          </label>
          {isOwner && (
            <p className="owner-optin-hint">
              As an owner you can add restaurants, manage menus, and receive orders through
              your owner portal.
            </p>
          )}
        </div>

        <p className="auth-switch">
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
