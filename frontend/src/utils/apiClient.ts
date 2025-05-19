/**
 * API Client for making HTTP requests
 */
import axios, { AxiosInstance } from 'axios';
import { API_URL } from '@/config';

const apiClient: AxiosInstance = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor to inject authentication token if available
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('authToken');
  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`;
  }
  
  // Add custom header to identify authority requests if needed
  const authorityId = localStorage.getItem('authorityId');
  if (authorityId) {
    config.headers['X-Authority-ID'] = authorityId;
  }
  
  return config;
}, (error) => {
  return Promise.reject(error);
});

// Add response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // Handle common errors like 401 Unauthorized
    if (error.response?.status === 401) {
      // Clear auth token and redirect to login if needed
      localStorage.removeItem('authToken');
      
      // Only redirect if not already on login page
      const currentPath = window.location.pathname;
      if (!currentPath.includes('/login') && !currentPath.includes('/auth')) {
        window.location.href = '/login';
      }
    }
    
    return Promise.reject(error);
  }
);

export default apiClient;
