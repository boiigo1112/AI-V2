import api from './api';

export const gameApi = {
  listUsers: (params = {}) => api.get('/game/users', { params }),
  getUser: (id) => api.get(`/game/users/${id}`),
  listCharacters: (params = {}) => api.get('/game/characters', { params }),
  getCharacter: (id) => api.get(`/game/characters/${id}`),
  listUserCharacters: (userNum) => api.get(`/game/characters/user/${userNum}`),
  updateLevel: (id, level) => api.put(`/game/characters/${id}/level`, { level }),
  updateMoney: (id, money) => api.put(`/game/characters/${id}/money`, { money }),
};
