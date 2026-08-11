import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { getProfile, updateProfile } from '../api/auth';
import ErrorMessage from '../components/ErrorMessage';

export default function ProfilePage() {
  const { user, updateUserData } = useAuth();
  const [form, setForm] = useState({
    username: '',
    email: '',
    password: '',
    defaultAddress: ''
  });
  const [errors, setErrors] = useState([]);
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    getProfile()
      .then((res) => {
        const u = res.data.user;
        setForm({
          username: u.username || '',
          email: u.email || '',
          password: '',
          defaultAddress: u.defaultAddress || ''
        });
      })
      .catch((err) => {
        setErrors(['Failed to load profile details.']);
      })
      .finally(() => setLoading(false));
  }, []);

  const handleChange = (e) => {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
    setErrors([]);
    setSuccess('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setErrors([]);
    setSuccess('');

    try {
      const data = {
        username: form.username,
        email: form.email,
        defaultAddress: form.defaultAddress
      };
      if (form.password.trim() !== '') {
        data.password = form.password;
      }

      const res = await updateProfile(data);
      updateUserData(res.data.user);
      setSuccess('Profile updated successfully.');
      setForm((f) => ({ ...f, password: '' })); // reset password field
    } catch (err) {
      const detail = err.response?.data?.details || err.response?.data?.error;
      setErrors(Array.isArray(detail) ? detail : [detail || 'Failed to update profile.']);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="page"><p className="loading-text">Loading profile...</p></div>;
  }

  return (
    <div className="auth-page">
      <div className="auth-card" style={{ maxWidth: '500px' }}>
        <h1>My Profile</h1>
        <p className="auth-subtitle">Update your profile info and address book</p>

        <form onSubmit={handleSubmit} noValidate>
          <ErrorMessage error={errors} />
          {success && <div className="success-box" style={{ marginBottom: '1rem' }}>{success}</div>}

          <div className="form-group">
            <label htmlFor="username">Username</label>
            <input
              id="username"
              type="text"
              name="username"
              value={form.username}
              onChange={handleChange}
              placeholder="Username"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="email">Email Address</label>
            <input
              id="email"
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              placeholder="Email address"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">New Password (leave empty to keep current)</label>
            <input
              id="password"
              type="password"
              name="password"
              value={form.password}
              onChange={handleChange}
              placeholder="••••••••"
            />
          </div>

          <div className="form-group">
            <label htmlFor="defaultAddress">Default Delivery Address</label>
            <textarea
              id="defaultAddress"
              name="defaultAddress"
              value={form.defaultAddress}
              onChange={handleChange}
              rows={3}
              placeholder="e.g. 12 Pasta Lane, London, W1A 1AA"
            />
          </div>

          <button type="submit" className="btn btn-primary btn-full" disabled={submitting}>
            {submitting ? 'Saving changes...' : 'Save Profile Details'}
          </button>
        </form>
      </div>
    </div>
  );
}
