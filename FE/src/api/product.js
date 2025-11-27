/**
 * Product API
 * Dựa trên routes: /api/products
 */

import { apiCall } from './config';

/**
 * Get products list (Public)
 * GET /api/products
 * For admin: pass { includeDeleted: true, includeInactive: true } in filters
 */
export const getProducts = (page = 1, limit = 10, filters = {}) => {
  const params = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
  });
  
  // Add filter params
  Object.keys(filters).forEach(key => {
    if (filters[key] !== undefined && filters[key] !== null) {
      params.append(key, filters[key].toString());
    }
  });
  
  return apiCall(`/products?${params}`);
};

/**
 * Get product by ID (Public)
 * GET /api/products/:id
 */
export const getProductById = (id) => apiCall(`/products/${id}`);

/**
 * Get product by slug (Public)
 * GET /api/products/slug/:slug
 */
export const getProductBySlug = (slug) => apiCall(`/products/slug/${slug}`);

/**
 * Get product by SKU (Public)
 * GET /api/products/sku/:sku
 */
export const getProductBySku = (sku) => apiCall(`/products/sku/${sku}`);

/**
 * Get products by category (Public)
 * GET /api/products/category/:categoryId
 */
export const getProductsByCategory = (categoryId, page = 1, limit = 10) => {
  const params = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
  });
  return apiCall(`/products/category/${categoryId}?${params}`);
};

/**
 * Get active products (Public)
 * GET /api/products/active/list
 */
export const getActiveProducts = (page = 1, limit = 10) => {
  const params = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
  });
  return apiCall(`/products/active/list?${params}`);
};

/**
 * Search products (Public)
 * GET /api/products/search/query
 */
export const searchProducts = (keyword, page = 1, limit = 10, filters = {}) => {
  const params = new URLSearchParams({
    keyword,
    page: page.toString(),
    limit: limit.toString(),
    ...filters,
  });
  return apiCall(`/products/search/query?${params}`);
};

/**
 * Get primary image (Public)
 * GET /api/products/:id/images/primary
 */
export const getPrimaryImage = (id) => apiCall(`/products/${id}/images/primary`);

// Admin only functions
/**
 * Create product (Admin only)
 * POST /api/products
 */
export const createProduct = (productData) =>
  apiCall('/products', {
    method: 'POST',
    body: productData,
  });

/**
 * Update product (Admin only)
 * PUT /api/products/:id
 */
export const updateProduct = (id, productData) =>
  apiCall(`/products/${id}`, {
    method: 'PUT',
    body: productData,
  });

/**
 * Delete product (Admin only)
 * DELETE /api/products/:id
 */
export const deleteProduct = (id) =>
  apiCall(`/products/${id}`, {
    method: 'DELETE',
  });

/**
 * Get deleted products (Admin only)
 * GET /api/products/deleted/list
 */
export const getDeletedProducts = (page = 1, limit = 10) => {
  const params = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
  });
  return apiCall(`/products/deleted/list?${params}`);
};

/**
 * Restore product (Admin only)
 * POST /api/products/:id/restore
 */
export const restoreProduct = (id) =>
  apiCall(`/products/${id}/restore`, {
    method: 'POST',
  });

/**
 * Update stock (Admin only)
 * PUT /api/products/:id/stock
 */
export const updateStock = (id, stockData) =>
  apiCall(`/products/${id}/stock`, {
    method: 'PUT',
    body: stockData,
  });

/**
 * Add image (Admin only)
 * POST /api/products/:id/images
 */
export const addImage = (id, imageData) =>
  apiCall(`/products/${id}/images`, {
    method: 'POST',
    body: imageData,
  });

/**
 * Remove image (Admin only)
 * DELETE /api/products/:id/images/:imageUrl
 */
export const removeImage = (id, imageUrl) =>
  apiCall(`/products/${id}/images/${encodeURIComponent(imageUrl)}`, {
    method: 'DELETE',
  });

/**
 * Set primary image (Admin only)
 * PUT /api/products/:id/images/primary
 */
export const setPrimaryImage = (id, imageData) =>
  apiCall(`/products/${id}/images/primary`, {
    method: 'PUT',
    body: imageData,
  });

/**
 * Update images (Admin only)
 * PUT /api/products/:id/images
 * @param {string|number} id - Product ID
 * @param {Array} images - Array of image objects [{url, alt, is_primary, order}]
 */
export const updateImages = (id, images) => {
  console.log('[product API] 📤 updateImages called:', {
    productId: id,
    imagesCount: Array.isArray(images) ? images.length : 0,
    isArray: Array.isArray(images),
    images: Array.isArray(images) 
      ? images.map((img, idx) => ({
          index: idx,
          url: img.url ? (img.url.length > 50 ? img.url.substring(0, 50) + '...' : img.url) : 'no url',
          urlLength: img.url?.length || 0,
          alt: img.alt,
          is_primary: img.is_primary,
          order: img.order,
        }))
      : images,
  });
  
  // Backend expects images array directly
  const body = Array.isArray(images) ? images : { images };
  console.log('[product API] Request body:', {
    isArray: Array.isArray(body),
    bodyType: typeof body,
    bodyKeys: !Array.isArray(body) ? Object.keys(body) : 'N/A',
  });
  
  return apiCall(`/products/${id}/images`, {
    method: 'PUT',
    body,
  });
};

export default {
  getProducts,
  getProductById,
  getProductBySlug,
  getProductBySku,
  getProductsByCategory,
  getActiveProducts,
  searchProducts,
  getPrimaryImage,
  createProduct,
  updateProduct,
  deleteProduct,
  getDeletedProducts,
  restoreProduct,
  updateStock,
  addImage,
  removeImage,
  setPrimaryImage,
  updateImages,
};

