import api from './client';

export const placeOrder      = (data)   => api.post('/orders', data);
export const getMyOrders     = ()       => api.get('/orders/my');
export const getOwnerOrders  = (params) => api.get('/orders/owner', { params });
export const updateOrderStatus = (id, status) => api.patch(`/orders/${id}/status`, { status });
