/**
 * Review API
 * Dựa trên routes: /api/reviews
 */

import { apiCall } from './config';

/**
 * Get reviews by product (Public)
 * GET /api/reviews/product/:productId
 */
export const getReviewsByProduct = (productId, page = 1, limit = 10) => {
  const params = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
  });
  return apiCall(`/reviews/product/${productId}?${params}`);
};

/**
 * Get product rating (Public)
 * GET /api/reviews/product/:productId/rating
 */
export const getProductRating = (productId) => apiCall(`/reviews/product/${productId}/rating`);

/**
 * Get my reviews (Protected)
 * GET /api/reviews/me
 */
export const getMyReviews = () => apiCall('/reviews/me');

/**
 * Create review (Protected)
 * POST /api/reviews/me
 */
export const createReview = (reviewData) =>
  apiCall('/reviews/me', {
    method: 'POST',
    body: reviewData,
  });

/**
 * Update review (Protected)
 * PUT /api/reviews/me/:id
 */
export const updateReview = (id, reviewData) =>
  apiCall(`/reviews/me/${id}`, {
    method: 'PUT',
    body: reviewData,
  });

/**
 * Delete review (Protected)
 * DELETE /api/reviews/me/:id
 */
export const deleteReview = (id) =>
  apiCall(`/reviews/me/${id}`, {
    method: 'DELETE',
  });

/**
 * Create or update review (Protected)
 * POST /api/reviews/me/create-or-update
 */
export const createOrUpdateReview = (reviewData) =>
  apiCall('/reviews/me/create-or-update', {
    method: 'POST',
    body: reviewData,
  });

// Admin only functions
/**
 * Get all reviews (Admin only)
 * GET /api/reviews
 */
export const getAllReviews = (page = 1, limit = 20) => {
  const params = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
  });
  return apiCall(`/reviews?${params}`);
};

/**
 * Get review by ID (Admin only)
 * GET /api/reviews/:id
 */
export const getReviewById = (id) => apiCall(`/reviews/${id}`);

/**
 * Create review (Admin only)
 * POST /api/reviews
 */
export const createReviewAdmin = (reviewData) =>
  apiCall('/reviews', {
    method: 'POST',
    body: reviewData,
  });

/**
 * Update review (Admin only)
 * PUT /api/reviews/:id
 */
export const updateReviewAdmin = (id, reviewData) =>
  apiCall(`/reviews/${id}`, {
    method: 'PUT',
    body: reviewData,
  });

/**
 * Delete review (Admin only)
 * DELETE /api/reviews/:id
 */
export const deleteReviewAdmin = (id) =>
  apiCall(`/reviews/${id}`, {
    method: 'DELETE',
  });

/**
 * Get reviews by user (Admin only)
 * GET /api/reviews/user/:userId
 */
export const getReviewsByUser = (userId, page = 1, limit = 20) => {
  const params = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
  });
  return apiCall(`/reviews/user/${userId}?${params}`);
};

export default {
  getReviewsByProduct,
  getProductRating,
  getMyReviews,
  createReview,
  updateReview,
  deleteReview,
  createOrUpdateReview,
  getAllReviews,
  getReviewById,
  createReviewAdmin,
  updateReviewAdmin,
  deleteReviewAdmin,
  getReviewsByUser,
};

