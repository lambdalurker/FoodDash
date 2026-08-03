import api from './client';

export const runSeed = () => api.post('/seed');
