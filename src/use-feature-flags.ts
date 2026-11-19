import { useQuery } from '@tanstack/react-query';
import { featureAPI } from './api/features';

export function useFeatureFlags() {
  return useQuery({
    queryKey: ['feature-flags'],
    queryFn: featureAPI.list,
    staleTime: 15_000,
  });
}

