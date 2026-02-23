import axios from 'axios'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'

export const api = axios.create({
  baseURL: `${API_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    if (typeof window !== 'undefined') {
      // Skip token validation for auth endpoints (login, register, google)
      const isAuthEndpoint = config.url?.includes('/auth/login') || 
                            config.url?.includes('/auth/register') ||
                            config.url?.includes('/auth/google');
      
      if (isAuthEndpoint) {
        // Allow auth requests to proceed without token
        return config;
      }
      
      // Try both 'token' and 'authToken' for backwards compatibility
      const token = localStorage.getItem('token') || localStorage.getItem('authToken')
      
      // STRICT VALIDATION: Block request if token is invalid
      // This prevents "jwt malformed" errors on backend
      if (!token || 
          token === 'undefined' || 
          token === 'null' || 
          token.trim() === '' ||
          token === 'Bearer undefined' ||
          token === 'Bearer null') {
        console.error('[Axios] ⚠️ Invalid or missing token detected');
        
        // Clear ALL invalid tokens
        localStorage.removeItem('token');
        localStorage.removeItem('authToken');
        localStorage.removeItem('userId');
        localStorage.removeItem('userName');
        localStorage.removeItem('userEmail');
        
        // Only redirect if not already on login/register page
        const currentPath = window.location.pathname;
        if (!currentPath.includes('/login') && !currentPath.includes('/register')) {
          window.location.href = '/login';
        }
        
        // Reject the request immediately
        return Promise.reject(new Error('No valid authentication token'));
      }
      
      // Add valid token to headers
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config
  },
  (error) => {
    console.error('[Axios] Request error:', error);
    return Promise.reject(error)
  }
)

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Handle 401 Unauthorized errors
    if (error.response?.status === 401) {
      console.error('[Axios] Auth error, logging out');
      
      // Clear all auth data from localStorage
      if (typeof window !== 'undefined') {
        localStorage.removeItem('token');
        localStorage.removeItem('authToken');
        localStorage.removeItem('userId');
        localStorage.removeItem('userName');
        localStorage.removeItem('userEmail');
        
        // Redirect to login page (only if not already there)
        const currentPath = window.location.pathname;
        if (!currentPath.includes('/login') && !currentPath.includes('/register')) {
          window.location.href = '/login';
        }
      }
      
      // DO NOT retry the request - reject immediately
      return Promise.reject(error);
    }
    
    // For other errors, log and reject without retrying
    console.error('[Axios] Response error:', error.response?.status, error.response?.data?.message || error.message);
    
    // DO NOT retry on 4xx errors (client errors)
    if (error.response?.status >= 400 && error.response?.status < 500) {
      return Promise.reject(error);
    }
    
    return Promise.reject(error);
  }
)
