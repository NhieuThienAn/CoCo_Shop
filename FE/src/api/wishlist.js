/**
 * Wishlist API
 * Dựa trên routes: /api/wishlist
 */

import { apiCall } from './config';

/**
 * Get my wishlist (Protected)
 * GET /api/wishlist/me
 */
export const getWishlist = () => apiCall('/wishlist/me');

/**
 * Add to wishlist (Protected)
 * POST /api/wishlist/me/add
 */
export const addToWishlist = (productId) =>
  apiCall('/wishlist/me/add', {
    method: 'POST',
    body: { productId },
  });

/**
 * Remove from wishlist (Protected)
 * DELETE /api/wishlist/me/product/:productId
 */
export const removeFromWishlist = (productId) =>
  apiCall(`/wishlist/me/product/${productId}`, {
    method: 'DELETE',
  });

/**
 * Check if product in wishlist (Protected)
 * GET /api/wishlist/me/product/:productId/check
 */
export const checkWishlist = (productId) => apiCall(`/wishlist/me/product/${productId}/check`);

export default {
  getWishlist,
  addToWishlist,
  removeFromWishlist,
  checkWishlist,
};

