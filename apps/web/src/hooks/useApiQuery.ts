import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';

export function useApiQuery<T>(key: string, url: string) {
  return useQuery({
    queryKey: [key, url],
    queryFn: async () => {
      const { data } = await api.get<T>(url);
      return data;
    }
  });
}
