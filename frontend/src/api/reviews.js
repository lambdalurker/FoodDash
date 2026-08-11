import api from './client';

export const getReviews = (restaurantId) => api.get(`/restaurants/${restaurantId}/reviews`);
export const createReview = (restaurantId, data) => api.post(`/restaurants/${restaurantId}/reviews`, data);
