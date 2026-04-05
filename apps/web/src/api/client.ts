import axios from 'axios';

const explicitApiUrl = import.meta.env.VITE_API_URL;
const baseURL = explicitApiUrl ? `${explicitApiUrl}/api` : '/api';

export const api = axios.create({
  baseURL
});

export const setAuthToken = (token?: string) => {
  if (!token) {
    delete api.defaults.headers.common.Authorization;
    return;
  }

  api.defaults.headers.common.Authorization = `Bearer ${token}`;
};
