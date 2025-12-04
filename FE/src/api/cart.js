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

/**
 * Admin: Get all carts (Admin only)
 * GET /api/cart/admin/all
 */
export const getAllCarts = (page = 1, limit = 20, filters = {}) => {
  const params = new URLSearchParams({ page, limit, ...filters });
  return apiCall(`/cart/admin/all?${params.toString()}`);
};

/**
 * Admin: Get cart by user ID with details (Admin only)
 * GET /api/cart/admin/user/:userId
 */
export const getCartByUserId = (userId) =>
  apiCall(`/cart/admin/user/${userId}`);

/**
 * Admin: Update cart item (Admin only)
 * PUT /api/cart/admin/item/:id
 */
export const updateCartItemByAdmin = (id, quantity) =>
  apiCall(`/cart/admin/item/${id}`, {
    method: 'PUT',
    body: { quantity },
  });

/**
 * Admin: Delete cart item (Admin only)
 * DELETE /api/cart/admin/item/:id
 */
export const deleteCartItemByAdmin = (id) =>
  apiCall(`/cart/admin/item/${id}`, {
    method: 'DELETE',
  });

/**
 * Admin: Clear user cart (Admin only)
 * DELETE /api/cart/admin/user/:userId/clear
 */
export const clearUserCartByAdmin = (userId) =>
  apiCall(`/cart/admin/user/${userId}/clear`, {
    method: 'DELETE',
  });

/**
 * Admin: Get cart statistics (Admin only)
 * GET /api/cart/admin/statistics
 */
export const getCartStatistics = () =>
  apiCall('/cart/admin/statistics');

export default {
  getCart,
  getCartTotal,
  addToCart,
  buyNow,
  updateCartItem,
  removeFromCart,
  clearCart,
  // Admin functions
  getAllCarts,
  getCartByUserId,
  updateCartItemByAdmin,
  deleteCartItemByAdmin,
  clearUserCartByAdmin,
  getCartStatistics,
};

