/**
 * API Configuration
 * Base URL và helper functions cho API calls
 */

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

/**
 * Get token from localStorage
 */
export const getToken = () => {
  return localStorage.getItem('token');
};

/**
 * Get refresh token from localStorage
 */
export const getRefreshToken = () => {
  return localStorage.getItem('refreshToken');
};

/**
 * Set tokens in localStorage
 */
export const setTokens = (token, refreshToken) => {
  localStorage.setItem('token', token);
  if (refreshToken) {
    localStorage.setItem('refreshToken', refreshToken);
  }
};

/**
 * Clear tokens from localStorage
 */
export const clearTokens = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('refreshToken');
};

/**
 * Refresh access token
 */
const refreshToken = async () => {
  const refreshTokenValue = getRefreshToken();
  if (!refreshTokenValue) {
    return false;
  }

  try {
    const response = await fetch(`${API_BASE_URL}/auth/refresh-token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refreshToken: refreshTokenValue }),
    });

    const data = await response.json();

    if (response.ok && data.success && data.data.token) {
      setTokens(data.data.token, data.data.refreshToken);
      return true;
    }
    return false;
  } catch (error) {
    console.error('Token refresh failed:', error);
    return false;
  }
};

/**
 * Base API call function với auto token refresh
 */
export const apiCall = async (endpoint, options = {}) => {
  const token = getToken();

  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...(options.headers || {}),
    },
    ...options,
  };

  // Convert body to JSON if it's an object
  if (config.body && typeof config.body === 'object' && !(config.body instanceof FormData)) {
    config.body = JSON.stringify(config.body);
  }

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
    
    // Check if response is JSON before parsing
    const contentType = response.headers.get('content-type');
    let data;
    
    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    } else {
      // If not JSON (e.g., HTML 404 page), read as text
      const text = await response.text();
      throw new Error(`API returned non-JSON response (${response.status}): ${text.substring(0, 100)}`);
    }

    // Handle 401 Unauthorized - Try to refresh token
    if (response.status === 401 && token) {
      const refreshed = await refreshToken();
      if (refreshed) {
        // Retry original request with new token
        config.headers.Authorization = `Bearer ${getToken()}`;
        const retryResponse = await fetch(`${API_BASE_URL}${endpoint}`, config);
        
        const retryContentType = retryResponse.headers.get('content-type');
        let retryData;
        if (retryContentType && retryContentType.includes('application/json')) {
          retryData = await retryResponse.json();
        } else {
          const retryText = await retryResponse.text();
          throw new Error(`API returned non-JSON response (${retryResponse.status}): ${retryText.substring(0, 100)}`);
        }

        if (!retryResponse.ok) {
          throw new Error(retryData.message || 'API Error');
        }
        return retryData;
      } else {
        // Refresh failed, clear tokens and open login modal
        clearTokens();
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('openLoginModal', { detail: { tab: 'login' } }));
        }
        throw new Error('Session expired. Please login again.');
      }
    }

    if (!response.ok) {
      // Try to extract error message from various possible locations
      const errorMessage = data?.message || data?.error?.message || data?.error || data?.data?.message || `API Error: ${response.status} ${response.statusText}`;
      console.error('[API Call] ❌ Error response:', {
        status: response.status,
        statusText: response.statusText,
        fullData: data,
        extractedMessage: errorMessage,
        dataKeys: data ? Object.keys(data) : 'null',
      });
      throw new Error(errorMessage);
    }

    // Log successful response for register endpoint
    if (endpoint === '/auth/register' && data) {
      console.log('[API Call] ✅ Register response received:', {
        success: data.success,
        requiresEmailVerification: data.requiresEmailVerification,
        otpSent: data.otpSent,
        email: data.email,
        hasUser: !!(data.user || data.data?.user),
        hasToken: !!(data.token || data.data?.token),
        allKeys: Object.keys(data),
      });
    }

    return data;
  } catch (error) {
    console.error('[API Call] Exception:', {
      message: error.message,
      stack: error.stack,
      error: error,
    });
    throw error;
  }
};

export default {
  API_BASE_URL,
  getToken,
  getRefreshToken,
  setTokens,
  clearTokens,
  apiCall,
};

