/**
 * Category API
 * Dựa trên routes: /api/categories
 */

import { apiCall } from './config';

/**
 * Get categories list (Public)
 * GET /api/categories
 */
export const getCategories = (page = 1, limit = 10) => {
  const params = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
  });
  return apiCall(`/categories?${params}`);
};

/**
 * Get category by ID (Public)
 * GET /api/categories/:id
 */
export const getCategoryById = (id) => apiCall(`/categories/${id}`);

/**
 * Get category by slug (Public)
 * GET /api/categories/slug/:slug
 */
export const getCategoryBySlug = (slug) => apiCall(`/categories/slug/${slug}`);

/**
 * Get categories by parent (Public)
 * GET /api/categories/parent/:parentId
 */
export const getCategoriesByParent = (parentId) => apiCall(`/categories/parent/${parentId}`);

/**
 * Get category tree (Public)
 * GET /api/categories/tree/list
 */
export const getCategoryTree = () => apiCall('/categories/tree/list');

// Admin only functions
/**
 * Create category (Admin only)
 * POST /api/categories
 */
export const createCategory = (categoryData) =>
  apiCall('/categories', {
    method: 'POST',
    body: categoryData,
  });

/**
 * Update category (Admin only)
 * PUT /api/categories/:id
 */
export const updateCategory = (id, categoryData) =>
  apiCall(`/categories/${id}`, {
    method: 'PUT',
    body: categoryData,
  });

/**
 * Delete category (Admin only)
 * DELETE /api/categories/:id
 */
export const deleteCategory = (id) =>
  apiCall(`/categories/${id}`, {
    method: 'DELETE',
  });

export default {
  getCategories,
  getCategoryById,
  getCategoryBySlug,
  getCategoriesByParent,
  getCategoryTree,
  createCategory,
  updateCategory,
  deleteCategory,
};

