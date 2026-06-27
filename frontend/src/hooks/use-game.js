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
