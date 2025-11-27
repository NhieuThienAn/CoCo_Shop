/**
 * Address API
 * Dựa trên routes: /api/addresses
 */

import { apiCall } from './config';

/**
 * Get my addresses (Protected)
 * GET /api/addresses/me
 */
export const getMyAddresses = () => apiCall('/addresses/me');

/**
 * Get default address (Protected)
 * GET /api/addresses/me/default
 */
export const getDefaultAddress = () => apiCall('/addresses/me/default');

/**
 * Create address (Protected)
 * POST /api/addresses/me
 */
export const createAddress = (addressData) =>
  apiCall('/addresses/me', {
    method: 'POST',
    body: addressData,
  });

/**
 * Update address (Protected)
 * PUT /api/addresses/me/:id
 */
export const updateAddress = (id, addressData) =>
  apiCall(`/addresses/me/${id}`, {
    method: 'PUT',
    body: addressData,
  });

/**
 * Delete address (Protected)
 * DELETE /api/addresses/me/:id
 */
export const deleteAddress = (id) =>
  apiCall(`/addresses/me/${id}`, {
    method: 'DELETE',
  });

/**
 * Set default address (Protected)
 * PUT /api/addresses/me/:id/default
 */
export const setDefaultAddress = (id) =>
  apiCall(`/addresses/me/${id}/default`, {
    method: 'PUT',
  });

/**
 * Get address by ID (Admin only)
 * GET /api/addresses/:id
 */
export const getAddressById = (id) => apiCall(`/addresses/${id}`);

export default {
  getMyAddresses,
  getDefaultAddress,
  createAddress,
  updateAddress,
  deleteAddress,
  setDefaultAddress,
  getAddressById,
};

