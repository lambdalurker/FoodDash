import api from './client';

export const getMenuItems = (params) => api.get('/menu-items', { params });
export const getMenuItem = (id) => api.get(`/menu-items/${id}`);
export const createMenuItem = (formData) =>
  api.post('/menu-items', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
export const updateMenuItem = (id, formData) =>
  api.put(`/menu-items/${id}`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
export const deleteMenuItem = (id) => api.delete(`/menu-items/${id}`);
