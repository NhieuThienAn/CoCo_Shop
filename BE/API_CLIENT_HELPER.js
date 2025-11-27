/**
 * CoCo Backend API Client Helper
 * 
 * Usage in Frontend:
 * 1. Copy this file to your frontend project
 * 2. Configure API_BASE_URL
 * 3. Import and use the functions
 * 
 * Example:
 *   import { login, getProducts, addToCart } from './apiClient';
 *   
 *   const user = await login('user@example.com', 'password');
 *   const products = await getProducts(1, 20);
 *   await addToCart(1, 2);
 */

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000/api';

/**
 * Get token from storage
 */
const getToken = () => {
  return localStorage.getItem('token');
};

/**
 * Get refresh token from storage
 */
const getRefreshToken = () => {
  return localStorage.getItem('refreshToken');
};

/**
 * Set tokens in storage
 */
const setTokens = (token, refreshToken) => {
  localStorage.setItem('token', token);
  if (refreshToken) {
    localStorage.setItem('refreshToken', refreshToken);
  }
};

/**
 * Clear tokens from storage
 */
const clearTokens = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('refreshToken');
};

/**
 * Base API call function
 */
async function apiCall(endpoint, options = {}) {
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
    const data = await response.json();

    // Handle 401 Unauthorized - Try to refresh token
    if (response.status === 401 && token) {
      const refreshed = await refreshToken();
      if (refreshed) {
        // Retry original request with new token
        config.headers.Authorization = `Bearer ${getToken()}`;
        const retryResponse = await fetch(`${API_BASE_URL}${endpoint}`, config);
        const retryData = await retryResponse.json();
        
        if (!retryResponse.ok) {
          throw new Error(retryData.message || 'API Error');
        }
        return retryData;
      } else {
        // Refresh failed, clear tokens and redirect to login
        clearTokens();
        if (typeof window !== 'undefined') {
          window.location.href = '/login';
        }
        throw new Error('Session expired. Please login again.');
      }
    }

    if (!response.ok) {
      throw new Error(data.message || 'API Error');
    }

    return data;
  } catch (error) {
    console.error('API Call Error:', error);
    throw error;
  }
}

/**
 * Refresh access token
 */
async function refreshToken() {
  const refreshTokenValue = getRefreshToken();
  if (!refreshTokenValue) {
    return false;
  }

  try {
    const response = await apiCall('/auth/refresh-token', {
      method: 'POST',
      body: { refreshToken: refreshTokenValue },
      headers: {
        Authorization: undefined, // Don't send expired token
      },
    });

    if (response.success && response.data.token) {
      setTokens(response.data.token, response.data.refreshToken);
      return true;
    }
    return false;
  } catch (error) {
    console.error('Token refresh failed:', error);
    return false;
  }
}

// ============================================
// AUTHENTICATION
// ============================================

export const auth = {
  /**
   * Login
   */
  login: async (email, password) => {
    const response = await apiCall('/auth/login', {
      method: 'POST',
      body: { email, password },
    });
    
    if (response.success && response.data.token) {
      setTokens(response.data.token, response.data.refreshToken);
    }
    
    return response.data;
  },

  /**
   * Register
   */
  register: async (userData) => {
    const response = await apiCall('/auth/register', {
      method: 'POST',
      body: userData,
    });
    
    if (response.success && response.data.token) {
      setTokens(response.data.token, response.data.refreshToken);
    }
    
    return response.data;
  },

  /**
   * Logout
   */
  logout: async () => {
    try {
      await apiCall('/auth/logout', {
        method: 'POST',
      });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      clearTokens();
    }
  },

  /**
   * Refresh token
   */
  refreshToken,
};

// ============================================
// USERS
// ============================================

export const users = {
  /**
   * Get current user
   */
  getCurrentUser: () => apiCall('/users/me'),

  /**
   * Update current user
   */
  updateCurrentUser: (userData) => apiCall('/users/me', {
    method: 'PUT',
    body: userData,
  }),

  /**
   * Check email exists
   */
  checkEmail: (email) => apiCall(`/users/email/${email}`),

  /**
   * Check username exists
   */
  checkUsername: (username) => apiCall(`/users/username/${username}`),
};

// ============================================
// PRODUCTS
// ============================================

export const products = {
  /**
   * Get products list
   */
  getList: (page = 1, limit = 10, filters = {}) => {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      ...filters,
    });
    return apiCall(`/products?${params}`);
  },

  /**
   * Get product by ID
   */
  getById: (id) => apiCall(`/products/${id}`),

  /**
   * Get product by slug
   */
  getBySlug: (slug) => apiCall(`/products/slug/${slug}`),

  /**
   * Get active products
   */
  getActive: (page = 1, limit = 10) => {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });
    return apiCall(`/products/active/list?${params}`);
  },

  /**
   * Search products
   */
  search: (keyword, page = 1, limit = 10) => {
    const params = new URLSearchParams({
      keyword,
      page: page.toString(),
      limit: limit.toString(),
    });
    return apiCall(`/products/search/query?${params}`);
  },

  /**
   * Get products by category
   */
  getByCategory: (categoryId, page = 1, limit = 10) => {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });
    return apiCall(`/products/category/${categoryId}?${params}`);
  },
};

// ============================================
// CATEGORIES
// ============================================

export const categories = {
  /**
   * Get categories list
   */
  getList: () => apiCall('/categories'),

  /**
   * Get category by ID
   */
  getById: (id) => apiCall(`/categories/${id}`),

  /**
   * Get category tree
   */
  getTree: () => apiCall('/categories/tree/list'),

  /**
   * Get category by slug
   */
  getBySlug: (slug) => apiCall(`/categories/slug/${slug}`),
};

// ============================================
// CART
// ============================================

export const cart = {
  /**
   * Get cart
   */
  getCart: () => apiCall('/cart/me'),

  /**
   * Get cart total
   */
  getTotal: () => apiCall('/cart/me/total'),

  /**
   * Add to cart
   */
  add: (productId, quantity) => apiCall('/cart/me/add', {
    method: 'POST',
    body: { productId, quantity },
  }),

  /**
   * Update cart item quantity
   */
  updateQuantity: (productId, quantity) => apiCall(`/cart/me/product/${productId}`, {
    method: 'PUT',
    body: { quantity },
  }),

  /**
   * Remove from cart
   */
  remove: (productId) => apiCall(`/cart/me/product/${productId}`, {
    method: 'DELETE',
  }),

  /**
   * Clear cart
   */
  clear: () => apiCall('/cart/me/clear', {
    method: 'DELETE',
  }),
};

// ============================================
// ORDERS
// ============================================

export const orders = {
  /**
   * Get my orders
   */
  getMyOrders: (page = 1, limit = 10) => {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });
    return apiCall(`/orders/me?${params}`);
  },

  /**
   * Get order by ID
   */
  getMyOrderById: (id) => apiCall(`/orders/me/${id}`),

  /**
   * Create order
   */
  create: (orderData) => apiCall('/orders/me/create', {
    method: 'POST',
    body: orderData,
  }),

  /**
   * Create order from cart
   */
  createFromCart: (orderData) => apiCall('/orders/me/cart/create', {
    method: 'POST',
    body: orderData,
  }),

  /**
   * Cancel order
   */
  cancel: (id) => apiCall(`/orders/me/${id}/cancel`, {
    method: 'PUT',
  }),

  /**
   * Return order
   */
  returnOrder: (id, returnData) => apiCall(`/orders/me/${id}/return`, {
    method: 'PUT',
    body: returnData,
  }),
};

// ============================================
// PAYMENTS
// ============================================

export const payments = {
  /**
   * Get my payments
   */
  getMyPayments: () => apiCall('/payments/me'),

  /**
   * Get payment by order
   */
  getByOrder: (orderId) => apiCall(`/payments/me/order/${orderId}`),

  /**
   * Create MoMo payment
   */
  createMoMo: (paymentData) => apiCall('/payments/momo/create', {
    method: 'POST',
    body: paymentData,
  }),

  /**
   * Query MoMo status
   */
  queryMoMoStatus: (orderId) => apiCall('/payments/momo/query', {
    method: 'POST',
    body: { orderId },
  }),
};

// ============================================
// ADDRESSES
// ============================================

export const addresses = {
  /**
   * Get my addresses
   */
  getMyAddresses: () => apiCall('/addresses/me'),

  /**
   * Get default address
   */
  getDefault: () => apiCall('/addresses/me/default'),

  /**
   * Create address
   */
  create: (addressData) => apiCall('/addresses/me', {
    method: 'POST',
    body: addressData,
  }),

  /**
   * Update address
   */
  update: (id, addressData) => apiCall(`/addresses/me/${id}`, {
    method: 'PUT',
    body: addressData,
  }),

  /**
   * Delete address
   */
  delete: (id) => apiCall(`/addresses/me/${id}`, {
    method: 'DELETE',
  }),

  /**
   * Set default address
   */
  setDefault: (id) => apiCall(`/addresses/me/${id}/default`, {
    method: 'PUT',
  }),
};

// ============================================
// WISHLIST
// ============================================

export const wishlist = {
  /**
   * Get wishlist
   */
  getWishlist: () => apiCall('/wishlist/me'),

  /**
   * Add to wishlist
   */
  add: (productId) => apiCall('/wishlist/me/add', {
    method: 'POST',
    body: { productId },
  }),

  /**
   * Remove from wishlist
   */
  remove: (productId) => apiCall(`/wishlist/me/product/${productId}`, {
    method: 'DELETE',
  }),

  /**
   * Check if product in wishlist
   */
  check: (productId) => apiCall(`/wishlist/me/product/${productId}/check`),
};

// ============================================
// REVIEWS
// ============================================

export const reviews = {
  /**
   * Get reviews by product
   */
  getByProduct: (productId, page = 1, limit = 10) => {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });
    return apiCall(`/reviews/product/${productId}?${params}`);
  },

  /**
   * Get product rating
   */
  getProductRating: (productId) => apiCall(`/reviews/product/${productId}/rating`),

  /**
   * Get my reviews
   */
  getMyReviews: () => apiCall('/reviews/me'),

  /**
   * Create review
   */
  create: (reviewData) => apiCall('/reviews/me', {
    method: 'POST',
    body: reviewData,
  }),

  /**
   * Update review
   */
  update: (id, reviewData) => apiCall(`/reviews/me/${id}`, {
    method: 'PUT',
    body: reviewData,
  }),

  /**
   * Delete review
   */
  delete: (id) => apiCall(`/reviews/me/${id}`, {
    method: 'DELETE',
  }),

  /**
   * Create or update review
   */
  createOrUpdate: (reviewData) => apiCall('/reviews/me/create-or-update', {
    method: 'POST',
    body: reviewData,
  }),
};

// ============================================
// COUPONS
// ============================================

export const coupons = {
  /**
   * Get active coupons
   */
  getActive: () => apiCall('/coupons/active/list'),

  /**
   * Get coupon by code
   */
  getByCode: (code) => apiCall(`/coupons/code/${code}`),

  /**
   * Validate coupon
   */
  validate: (code, cartValue) => apiCall('/coupons/validate', {
    method: 'POST',
    body: { code, cartValue },
  }),
};

// ============================================
// SUPPORT (Public)
// ============================================

export const support = {
  /**
   * Get roles
   */
  getRoles: () => apiCall('/support/roles'),

  /**
   * Get brands
   */
  getBrands: () => apiCall('/support/brands'),

  /**
   * Get order statuses
   */
  getOrderStatuses: () => apiCall('/support/order-statuses'),

  /**
   * Get payment methods
   */
  getPaymentMethods: () => apiCall('/support/payment-methods'),

  /**
   * Get payment statuses
   */
  getPaymentStatuses: () => apiCall('/support/payment-statuses'),
};

// ============================================
// EXPORT ALL
// ============================================

export default {
  auth,
  users,
  products,
  categories,
  cart,
  orders,
  payments,
  addresses,
  wishlist,
  reviews,
  coupons,
  support,
  // Utility functions
  getToken,
  clearTokens,
  apiCall,
};

