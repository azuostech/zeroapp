import axios from 'axios';
export const api = axios.create({
    baseURL: `${import.meta.env.VITE_API_URL ?? 'http://localhost:3001'}/api`
});
export const setAuthToken = (token) => {
    if (!token) {
        delete api.defaults.headers.common.Authorization;
        return;
    }
    api.defaults.headers.common.Authorization = `Bearer ${token}`;
};
