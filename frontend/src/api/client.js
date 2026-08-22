import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
});

// Helper to construct full URL for images/uploads
export const getImageUrl = (path) => {
  if (!path) return '';
  if (path.startsWith('http') || path.startsWith('blob:') || path.startsWith('data:')) return path;
  
  const baseUrl = import.meta.env.VITE_API_BASE_URL || '';
  // Remove trailing /api or /api/ if present
  const base = baseUrl.replace(/\/api\/?$/, '');
  return `${base}${path}`;
};

// Attach JWT token to every request if present
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Global response error handler
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid — clear and redirect
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
