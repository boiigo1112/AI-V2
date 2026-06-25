import { useQuery } from '@tanstack/react-query';
import api from '../services/api';

export function useDashboardStats(timeRange = '7d') {
  return useQuery({
    queryKey: ['dashboard', 'stats', timeRange],
    queryFn: () => api.get('/dashboard/stats', { params: { time_range: timeRange } }).then(r => r.data),
    staleTime: 30_000,
  });
}

export function useUsers() {
  return useQuery({
    queryKey: ['users'],
    queryFn: () => api.get('/users').then(r => r.data.users || []),
    staleTime: 30_000,
  });
}
