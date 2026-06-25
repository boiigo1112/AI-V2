import { useQuery } from '@tanstack/react-query';
import api from '../services/api';

export function useGameStatus() {
  return useQuery({
    queryKey: ['game', 'status'],
    queryFn: () => api.get('/game/status').then(r => r.data),
    staleTime: 10_000,
    refetchInterval: 30_000,
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

export function useGameLogs(dbName, params = {}) {
  const { table = '', limit = 100, offset = 0 } = params;
  return useQuery({
    queryKey: ['game', 'logs', dbName, table, limit, offset],
    queryFn: () => api.get(`/game/logs/${dbName}`, { params: { table, limit, offset } }).then(r => r.data),
    staleTime: 30_000,
    enabled: !!dbName,
  });
}
