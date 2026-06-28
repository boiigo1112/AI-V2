import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';

export function useGameStatus() {
  return useQuery({
    queryKey: ['game', 'status'],
    queryFn: () => api.get('/game/status').then(r => r.data),
    staleTime: 10_000,
    refetchInterval: 30_000,
  });
}

export function useGameReconnect() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) => api.post('/game/reconnect', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['game', 'status'] }),
  });
}

export function useGameDatabases() {
  return useQuery({
    queryKey: ['game', 'databases'],
    queryFn: () => api.get('/game/databases').then(r => r.data.databases || []),
    staleTime: 60_000,
  });
}

export function useGameTables(dbName) {
  return useQuery({
    queryKey: ['game', 'tables', dbName],
    queryFn: () => api.get(`/game/databases/${dbName}/tables`).then(r => r.data.tables || []),
    staleTime: 60_000,
    enabled: !!dbName,
  });
}

export function useGameAllTables(dbName) {
  return useQuery({
    queryKey: ['game', 'allTables', dbName],
    queryFn: () => api.get(`/game/databases/${dbName}/tables/all`).then(r => r.data.tables || []),
    staleTime: 60_000,
    enabled: !!dbName,
  });
}

export function useGameTableColumns(dbName, tableName) {
  return useQuery({
    queryKey: ['game', 'columns', dbName, tableName],
    queryFn: () => api.get(`/game/databases/${dbName}/tables/${tableName}/columns`).then(r => r.data.columns || []),
    staleTime: 60_000,
    enabled: !!dbName && !!tableName,
  });
}

export function useGamePlayers(params = {}) {
  const { table = 'UserInfo', search = '', limit = 50, offset = 0 } = params;
  return useQuery({
    queryKey: ['game', 'players', table, search, limit, offset],
    queryFn: () => api.get('/game/players', { params: { table, search, limit, offset } }).then(r => r.data),
    staleTime: 30_000,
  });
}

export function useGamePlayer(id, table = 'UserInfo') {
  return useQuery({
    queryKey: ['game', 'player', id, table],
    queryFn: () => api.get(`/game/players/${id}`, { params: { table } }).then(r => r.data),
    staleTime: 30_000,
    enabled: !!id,
  });
}

export function useGamePlayerCharacters(id) {
  return useQuery({
    queryKey: ['game', 'player', id, 'characters'],
    queryFn: () => api.get(`/game/players/${id}/characters`).then(r => r.data.characters || []),
    staleTime: 30_000,
    enabled: !!id,
  });
}

export function useBlockPlayer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }) => api.post(`/game/players/${id}/block`, { reason }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['game', 'players'] }),
  });
}

export function useUnblockPlayer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => api.post(`/game/players/${id}/unblock`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['game', 'players'] }),
  });
}

export function useUpdateCharacter() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, field, value }) => api.put(`/game/characters/${id}`, { field, value }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['game'] }),
  });
}

export function useGameShopItems(params = {}) {
  const { table = 'ShopItemMap', limit = 50, offset = 0 } = params;
  return useQuery({
    queryKey: ['game', 'shop', table, limit, offset],
    queryFn: () => api.get('/game/shop', { params: { table, limit, offset } }).then(r => r.data),
    staleTime: 30_000,
  });
}

export function useCreateShopItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) => api.post('/game/shop', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['game', 'shop'] }),
  });
}

export function useUpdateShopItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }) => api.put(`/game/shop/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['game', 'shop'] }),
  });
}

export function useDeleteShopItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => api.delete(`/game/shop/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['game', 'shop'] }),
  });
}

export function useGameLogs(dbName, params = {}) {
  const { table = '', limit = 100, offset = 0 } = params;
  return useQuery({
    queryKey: ['game', 'logs', dbName, table, limit, offset],
    queryFn: () => api.get(`/game/logs/${dbName}`, { params: { table, limit, offset } }).then(r => r.data),
    staleTime: 30_000,
    enabled: !!dbName,
  });
}

export function useAllCharacters(params = {}) {
  const { search = '', class: classFilter = '', level_min = '0', level_max = '999', online = '', limit = 50, offset = 0 } = params;
  return useQuery({
    queryKey: ['game', 'characters', search, classFilter, level_min, level_max, online, limit, offset],
    queryFn: () => api.get('/game/characters', { params: { search, class: classFilter, level_min, level_max, online, limit, offset } }).then(r => r.data),
    staleTime: 30_000,
  });
}

export function useCharacterDetail(id) {
  return useQuery({
    queryKey: ['game', 'character', id],
    queryFn: () => api.get(`/game/characters/${id}`).then(r => r.data),
    staleTime: 30_000,
    enabled: !!id,
  });
}

export function useCharacterStats() {
  return useQuery({
    queryKey: ['game', 'characterStats'],
    queryFn: () => api.get('/game/characters/stats').then(r => r.data),
    staleTime: 60_000,
  });
}

export function useBanCharacter() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }) => api.post(`/game/characters/${id}/ban`, { reason }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['game'] }),
  });
}

export function useUnbanCharacter() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => api.post(`/game/characters/${id}/unban`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['game'] }),
  });
}

// GMC hooks
export function useGmcLookup(q) {
  return useQuery({
    queryKey: ['game', 'gmc', 'lookup', q],
    queryFn: () => api.get('/game/gmc/lookup', { params: { q } }).then(r => r.data),
    enabled: !!q && q.length > 0,
    staleTime: 30_000,
  });
}

export function useGmcSendItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) => api.post('/game/gmc/send-item', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['game', 'gmc'] }),
  });
}

export function useGmcUpdatePoint() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) => api.post('/game/gmc/update-point', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['game', 'gmc'] }),
  });
}

export function useGmcPlayerHistory(id, type) {
  return useQuery({
    queryKey: ['game', 'gmc', 'history', id, type],
    queryFn: () => api.get(`/game/gmc/history/${id}`, { params: { type } }).then(r => r.data.history || []),
    enabled: !!id,
    staleTime: 30_000,
  });
}

export function useGmcLogs(params = {}) {
  const { limit = 50, offset = 0 } = params;
  return useQuery({
    queryKey: ['game', 'gmc', 'logs', limit, offset],
    queryFn: () => api.get('/game/gmc/logs', { params: { limit, offset } }).then(r => r.data),
    staleTime: 30_000,
  });
}

export function useGmcNotice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) => api.post('/game/gmc/notice', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['game', 'gmc'] }),
  });
}

export function useGmcItemTracking(uid) {
  return useQuery({
    queryKey: ['game', 'gmc', 'tracking', uid],
    queryFn: () => api.get('/game/gmc/item-tracking', { params: { uid } }).then(r => r.data),
    enabled: !!uid,
    staleTime: 30_000,
  });
}

export function useGuilds(params = {}) {
  const { search = '', limit = 50, offset = 0 } = params;
  return useQuery({
    queryKey: ['game', 'guilds', search, limit, offset],
    queryFn: () => api.get('/game/guilds', { params: { search, limit, offset } }).then(r => r.data),
    staleTime: 60_000,
  });
}

export function useGuildDetail(id) {
  return useQuery({
    queryKey: ['game', 'guild', id],
    queryFn: () => api.get(`/game/guilds/${id}`).then(r => r.data),
    staleTime: 60_000,
    enabled: !!id,
  });
}

export function useGuildStats() {
  return useQuery({
    queryKey: ['game', 'guildStats'],
    queryFn: () => api.get('/game/guilds/stats').then(r => r.data),
    staleTime: 60_000,
  });
}

export function useUpdateGuild() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, fields }) => api.put(`/game/guilds/${id}`, { fields }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['game'] }),
  });
}

export function usePets(params = {}) {
  const { search = '', limit = 50, offset = 0 } = params;
  return useQuery({
    queryKey: ['game', 'pets', search, limit, offset],
    queryFn: () => api.get('/game/pets', { params: { search, limit, offset } }).then(r => r.data),
    staleTime: 60_000,
  });
}

export function usePetDetail(id) {
  return useQuery({
    queryKey: ['game', 'pet', id],
    queryFn: () => api.get(`/game/pets/${id}`).then(r => r.data),
    staleTime: 60_000,
    enabled: !!id,
  });
}

export function usePetStats() {
  return useQuery({
    queryKey: ['game', 'petStats'],
    queryFn: () => api.get('/game/pets/stats').then(r => r.data),
    staleTime: 60_000,
  });
}

export function useUpdatePet() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, fields }) => api.put(`/game/pets/${id}`, { fields }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['game'] }),
  });
}
