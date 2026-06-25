import api from './api';

export const installApi = {
  status: () => api.get('/install/status'),

  connect: (data) => api.post('/install/connect', data),

  saveMappings: (mappings) => api.post('/install/mappings', { mappings }),

  complete: (data) => api.post('/install/complete', data),

  reset: () => api.post('/install/reset'),
};
