/**
 * User API
 * Dựa trên routes: /api/users
 */

import { apiCall } from './config';

/**
 * Get current user profile
 * GET /api/users/me
 */
export const getCurrentUser = () => apiCall('/users/me');

/**
 * Update current user profile
 * PUT /api/users/me
 */
export const updateCurrentUser = (userData) =>
  apiCall('/users/me', {
    method: 'PUT',
    body: userData,
  });

/**
 * Update current user profile (alternative endpoint)
 * PUT /api/users/me/profile
 */
export const updateProfile = (profileData) =>
  apiCall('/users/me/profile', {
    method: 'PUT',
    body: profileData,
  });

/**
 * Check if email exists (Public)
 * GET /api/users/email/:email
 */
export const checkEmail = (email) => apiCall(`/users/email/${email}`);

/**
 * Check if username exists (Public)
 * GET /api/users/username/:username
 */
export const checkUsername = (username) => apiCall(`/users/username/${username}`);

/**
 * Get user by ID (Public/Protected)
 * GET /api/users/:id
 */
export const getUserById = (id) => apiCall(`/users/${id}`);

// Admin only functions (cần admin role)
/**
 * Get all users (Admin only)
 * GET /api/users
 */
export const getAllUsers = (page = 1, limit = 10, filters = {}) => {
  const params = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
    ...filters,
  });
  return apiCall(`/users?${params}`);
};

/**
 * Update user (Admin only)
 * PUT /api/users/:id
 */
export const updateUser = (id, userData) =>
  apiCall(`/users/${id}`, {
    method: 'PUT',
    body: userData,
  });

/**
 * Delete user (Admin only)
 * DELETE /api/users/:id
 */
export const deleteUser = (id) =>
  apiCall(`/users/${id}`, {
    method: 'DELETE',
  });

/**
 * Get users by role (Admin only)
 * GET /api/users/role/:roleId
 */
export const getUsersByRole = (roleId) => apiCall(`/users/role/${roleId}`);

/**
 * Update user profile by ID (Admin only)
 * PUT /api/users/:id/profile
 */
export const updateUserProfile = (id, profileData) =>
  apiCall(`/users/${id}/profile`, {
    method: 'PUT',
    body: profileData,
  });

/**
 * Update user last login (Admin only)
 * PUT /api/users/:id/last-login
 */
export const updateUserLastLogin = (id) =>
  apiCall(`/users/${id}/last-login`, {
    method: 'PUT',
  });

/**
 * Increment failed login attempts (Admin only)
 * PUT /api/users/:id/increment-attempts
 */
export const incrementFailedAttempts = (id) =>
  apiCall(`/users/${id}/increment-attempts`, {
    method: 'PUT',
  });

/**
 * Reset failed login attempts (Admin only)
 * PUT /api/users/:id/reset-attempts
 */
export const resetFailedAttempts = (id) =>
  apiCall(`/users/${id}/reset-attempts`, {
    method: 'PUT',
  });

export default {
  getCurrentUser,
  updateCurrentUser,
  updateProfile,
  checkEmail,
  checkUsername,
  getUserById,
  getAllUsers,
  updateUser,
  deleteUser,
  getUsersByRole,
  updateUserProfile,
  updateUserLastLogin,
  incrementFailedAttempts,
  resetFailedAttempts,
};

