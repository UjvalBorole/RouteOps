import axios, { AxiosError, AxiosResponse } from 'axios';
import tokenService from './tokenService';

// Determine the API base URL based on environment
const getBaseURL = () => {
  // 1. PRIORITY: Environment production URL
const API_URL = import.meta.env.VITE_API_URL;

if (API_URL) {
  return API_URL;
}

  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    const protocol = window.location.protocol;
    const port = window.location.port;

    // 2. NGINX / reverse proxy mode (Netlify / Docker / same domain)
    // In this case we use relative /api and let nginx handle routing
    if (
      hostname !== 'localhost' &&
      hostname !== '127.0.0.1'
    ) {
      return ''; // nginx will proxy /api → gateway
    }

    // 3. Local development fallback
    return `${protocol}//${hostname}${port ? ':' + port : ''}`;
  }

  // SSR fallback
  return 'http://localhost:8081';
};

// Create axios instance
export const apiClient = axios.create({
  baseURL: getBaseURL(),
  headers: {
    'Content-Type': 'application/json',
  },
});

// Flag to prevent multiple token refresh requests
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (error: any) => void;
}> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token!);
    }
  });
  isRefreshing = false;
  failedQueue = [];
};

// Request interceptor to add token to headers
apiClient.interceptors.request.use(
  (config) => {
    const token = tokenService.getAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor to handle 401 and refresh token
apiClient.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as any;

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({
            resolve: (token: string) => {
              originalRequest.headers.Authorization = `Bearer ${token}`;
              resolve(apiClient(originalRequest));
            },
            reject: (error: any) => {
              reject(error);
            },
          });
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const success = await tokenService.refreshAccessToken();
      if (success) {
        const token = tokenService.getAccessToken();
        originalRequest.headers.Authorization = `Bearer ${token}`;
        processQueue(null, token);
        return apiClient(originalRequest);
      } else {
        processQueue(new Error('Token refresh failed'), null);
        // Redirect to login
        window.location.href = '/login';
        return Promise.reject(error);
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;
