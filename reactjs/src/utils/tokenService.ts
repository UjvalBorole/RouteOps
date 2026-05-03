import axios from 'axios';

const TOKEN_KEY = 'token';
const REFRESH_TOKEN_KEY = 'refreshToken';

const getBaseURL = () => {
  // Determine the API base URL based on environment
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    
    // If accessing from localhost, use localhost:8081
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return 'http://localhost:8081';
    }
    
    // If accessing from a different hostname (Docker), use relative path
    if (hostname !== 'localhost') {
      return ''; // Use relative URLs
    }
  }
  
  return 'http://localhost:8081';
};

export const tokenService = {
  // Save both tokens
  setTokens(accessToken: string, refreshToken: string) {
    localStorage.setItem(TOKEN_KEY, accessToken);
    localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  },

  // Get access token
  getAccessToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  },

  // Get refresh token
  getRefreshToken(): string | null {
    return localStorage.getItem(REFRESH_TOKEN_KEY);
  },

  // Clear tokens
  clearTokens() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  },

  // Refresh access token using refresh token
  async refreshAccessToken(): Promise<boolean> {
    try {
      const refreshToken = this.getRefreshToken();

      if (!refreshToken) {
        this.clearTokens();
        return false;
      }

      const baseURL = getBaseURL();
      const tokenEndpoint = baseURL ? `${baseURL}/api/auth/token` : '/api/auth/token';

      const response = await axios.post(tokenEndpoint, {
        refreshToken,
      });

      const { accessToken: newAccessToken, refreshToken: newRefreshToken } = response.data;
      if (!newAccessToken) {
        this.clearTokens();
        return false;
      }
      this.setTokens(newAccessToken, newRefreshToken ?? refreshToken);
      return true;
    } catch (error) {
      console.error('Token refresh failed:', error);
      this.clearTokens();
      return false;
    }
  },

  // Check if token exists
  hasToken(): boolean {
    return !!this.getAccessToken();
  },
};

export default tokenService;
