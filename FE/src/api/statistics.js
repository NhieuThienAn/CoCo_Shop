/**
 * Statistics API
 * Dựa trên routes: /api/statistics
 * Admin only
 */

import { apiCall } from './config';

/**
 * Get overview statistics
 * GET /api/statistics/overview
 * @param {string} startDate - ISO date string
 * @param {string} endDate - ISO date string
 */
export const getOverview = (startDate = null, endDate = null) => {
  const params = new URLSearchParams();
  if (startDate) params.append('startDate', startDate);
  if (endDate) params.append('endDate', endDate);
  return apiCall(`/statistics/overview${params.toString() ? `?${params}` : ''}`);
};

/**
 * Get order statistics
 * GET /api/statistics/orders
 * @param {object} filters - { startDate, endDate, statusId, paymentMethodId }
 */
export const getOrderStatistics = (filters = {}) => {
  const params = new URLSearchParams();
  if (filters.startDate) params.append('startDate', filters.startDate);
  if (filters.endDate) params.append('endDate', filters.endDate);
  if (filters.statusId) params.append('statusId', filters.statusId);
  if (filters.paymentMethodId) params.append('paymentMethodId', filters.paymentMethodId);
  return apiCall(`/statistics/orders${params.toString() ? `?${params}` : ''}`);
};

/**
 * Get revenue statistics
 * GET /api/statistics/revenue
 * @param {object} filters - { startDate, endDate, paymentMethodId, groupBy: 'day'|'month'|'year' }
 */
export const getRevenueStatistics = (filters = {}) => {
  const params = new URLSearchParams();
  if (filters.startDate) params.append('startDate', filters.startDate);
  if (filters.endDate) params.append('endDate', filters.endDate);
  if (filters.paymentMethodId) params.append('paymentMethodId', filters.paymentMethodId);
  if (filters.groupBy) params.append('groupBy', filters.groupBy);
  return apiCall(`/statistics/revenue${params.toString() ? `?${params}` : ''}`);
};

/**
 * Get user statistics
 * GET /api/statistics/users
 * @param {object} filters - { startDate, endDate, roleId }
 */
export const getUserStatistics = (filters = {}) => {
  const params = new URLSearchParams();
  if (filters.startDate) params.append('startDate', filters.startDate);
  if (filters.endDate) params.append('endDate', filters.endDate);
  if (filters.roleId) params.append('roleId', filters.roleId);
  return apiCall(`/statistics/users${params.toString() ? `?${params}` : ''}`);
};

/**
 * Get product statistics
 * GET /api/statistics/products
 * @param {object} filters - { categoryId, brandId, limit }
 */
export const getProductStatistics = (filters = {}) => {
  const params = new URLSearchParams();
  if (filters.categoryId) params.append('categoryId', filters.categoryId);
  if (filters.brandId) params.append('brandId', filters.brandId);
  if (filters.limit) params.append('limit', filters.limit);
  return apiCall(`/statistics/products${params.toString() ? `?${params}` : ''}`);
};

export default {
  getOverview,
  getOrderStatistics,
  getRevenueStatistics,
  getUserStatistics,
  getProductStatistics,
};

