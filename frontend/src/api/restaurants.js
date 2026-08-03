import api from './client';

export const getRestaurants = (params) => api.get('/restaurants', { params });
export const getRestaurant = (id) => api.get(`/restaurants/${id}`);
export const createRestaurant = (formData) =>
  api.post('/restaurants', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
export const updateRestaurant = (id, formData) =>
  api.put(`/restaurants/${id}`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
export const deleteRestaurant = (id) => api.delete(`/restaurants/${id}`);
