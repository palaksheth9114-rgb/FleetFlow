import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5002/api';

const api = axios.create({
  baseURL: API_URL,
  timeout: 10000, // 10 second timeout for requests
});

api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

export interface ApiExtendedError extends Error {
  isNetworkError?: boolean;
  response?: any;
  code?: string;
  customMessage?: string;
}

api.interceptors.response.use(
  (response) => response,
  (error: ApiExtendedError) => {
    // Only redirect to login on 401 (Unauthorized token missing/expired)
    if (error.response && error.response.status === 401) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        if (window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
      }
    }

    // Annotate network errors cleanly
    if (!error.response || error.code === 'ERR_NETWORK' || error.message === 'Network Error') {
      error.isNetworkError = true;
      error.customMessage = 'Unable to connect to FleetFlow backend server (http://localhost:5002). Please ensure backend server is running.';
    }

    return Promise.reject(error);
  }
);

export function getErrorMessage(err: any, fallback: string = 'An unexpected error occurred.'): string {
  if (!err) return fallback;
  if (err.isNetworkError || !err.response || err.code === 'ERR_NETWORK' || err.message === 'Network Error') {
    return 'Backend server unreachable. Please ensure server is running on port 5002.';
  }
  return err.response?.data?.message || err.response?.data?.error || err.message || fallback;
}

export function handleApiError(err: any, contextDescription?: string): string {
  const message = getErrorMessage(err);
  if (err?.isNetworkError || !err?.response || err?.code === 'ERR_NETWORK' || err?.message === 'Network Error') {
    console.warn(`[FleetFlow Network Warning] ${contextDescription || 'API call failed'}: Backend server is offline or unreachable.`);
  } else {
    console.warn(`[FleetFlow API Warning] ${contextDescription || 'API call failed'}:`, message);
  }
  return message;
}

export default api;

