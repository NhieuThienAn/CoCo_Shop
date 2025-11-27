/**
 * Coupon API
 * Dựa trên routes: /api/coupons
 */

import { apiCall } from './config';

/**
 * Get active coupons (Public)
 * GET /api/coupons/active/list
 */
export const getActiveCoupons = () => apiCall('/coupons/active/list');

/**
 * Get coupon by code (Public)
 * GET /api/coupons/code/:code
 */
export const getCouponByCode = (code) => apiCall(`/coupons/code/${code}`);

/**
 * Validate coupon (Public)
 * POST /api/coupons/validate
 */
export const validateCoupon = (code, cartValue) =>
  apiCall('/coupons/validate', {
    method: 'POST',
    body: { code, cartValue: parseFloat(cartValue) || 0 },
  });

// Admin only functions
/**
 * Get all coupons (Admin only)
 * GET /api/coupons
 */
export const getAllCoupons = (page = 1, limit = 20) => {
  const params = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
  });
  return apiCall(`/coupons?${params}`);
};

/**
 * Get coupon by ID (Admin only)
 * GET /api/coupons/:id
 */
export const getCouponById = (id) => apiCall(`/coupons/${id}`);

/**
 * Create coupon (Admin only)
 * POST /api/coupons
 */
export const createCoupon = (couponData) =>
  apiCall('/coupons', {
    method: 'POST',
    body: couponData,
  });

/**
 * Update coupon (Admin only)
 * PUT /api/coupons/:id
 */
export const updateCoupon = (id, couponData) =>
  apiCall(`/coupons/${id}`, {
    method: 'PUT',
    body: couponData,
  });

/**
 * Delete coupon (Admin only)
 * DELETE /api/coupons/:id
 */
export const deleteCoupon = (id) =>
  apiCall(`/coupons/${id}`, {
    method: 'DELETE',
  });

export default {
  getActiveCoupons,
  getCouponByCode,
  validateCoupon,
  getAllCoupons,
  getCouponById,
  createCoupon,
  updateCoupon,
  deleteCoupon,
};

