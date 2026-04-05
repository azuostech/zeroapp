import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';
export function useApiQuery(key, url) {
    return useQuery({
        queryKey: [key, url],
        queryFn: async () => {
            const { data } = await api.get(url);
            return data;
        }
    });
}
