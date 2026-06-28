import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';

export function useCoupons(params = {}) {
  const { search = '', limit = 50, offset = 0 } = params;
  return useQuery({
    queryKey: ['coupons', search, limit, offset],
    queryFn: () => api.get('/coupons', { params: { search, limit, offset } }).then(r => r.data),
    staleTime: 30_000,
  });
}

export function useCoupon(id) {
  return useQuery({
    queryKey: ['coupons', id],
    queryFn: () => api.get(`/coupons/${id}`).then(r => r.data),
    enabled: !!id,
    staleTime: 30_000,
  });
}

export function useCreateCoupon() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) => api.post('/coupons', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['coupons'] }),
  });
}

export function useUpdateCoupon() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }) => api.put(`/coupons/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['coupons'] }),
  });
}

export function useDeleteCoupon() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => api.delete(`/coupons/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['coupons'] }),
  });
}

export function useCouponUsage(id, params = {}) {
  const { limit = 50, offset = 0 } = params;
  return useQuery({
    queryKey: ['coupons', id, 'usage', limit, offset],
    queryFn: () => api.get(`/coupons/${id}/usage`, { params: { limit, offset } }).then(r => r.data),
    enabled: !!id,
    staleTime: 30_000,
  });
}

export function useRedeemCoupon() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) => api.post('/coupons/redeem', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['coupons'] }),
  });
}
