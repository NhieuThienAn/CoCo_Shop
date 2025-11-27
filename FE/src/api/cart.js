/**
 * Cart API
 * Dựa trên routes: /api/cart
 */

import { apiCall } from './config';

/**
 * Get my cart (Protected)
 * GET /api/cart/me
 */
export const getCart = () => apiCall('/cart/me');

/**
 * Get cart total (Protected)
 * GET /api/cart/me/total
 */
export const getCartTotal = () => apiCall('/cart/me/total');

/**
 * Add to cart (Protected)
 * POST /api/cart/me/add
 */
export const addToCart = (productId, quantity) =>
  apiCall('/cart/me/add', {
    method: 'POST',
    body: { productId, quantity },
  });

/**
 * Buy now - Clear cart and add single product (Protected)
 * POST /api/cart/me/buy-now
 */
export const buyNow = (productId, quantity) =>
  apiCall('/cart/me/buy-now', {
    method: 'POST',
    body: { productId, quantity },
  });

/**
 * Update cart item quantity (Protected)
 * PUT /api/cart/me/product/:productId
 */
export const updateCartItem = (productId, quantity) =>
  apiCall(`/cart/me/product/${productId}`, {
    method: 'PUT',
    body: { quantity },
  });

/**
 * Remove from cart (Protected)
 * DELETE /api/cart/me/product/:productId
 */
export const removeFromCart = (productId) =>
  apiCall(`/cart/me/product/${productId}`, {
    method: 'DELETE',
  });

/**
 * Clear cart (Protected)
 * DELETE /api/cart/me/clear
 */
export const clearCart = () =>
  apiCall('/cart/me/clear', {
    method: 'DELETE',
  });

export default {
  getCart,
  getCartTotal,
  addToCart,
  buyNow,
  updateCartItem,
  removeFromCart,
  clearCart,
};

