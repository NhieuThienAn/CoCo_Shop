/**
 * Payment API
 * Dựa trên routes: /api/payments
 */

import { apiCall } from './config';

/**
 * Get my payments (Protected)
 * GET /api/payments/me
 */
export const getMyPayments = (page = 1, limit = 10) => {
  const params = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
  });
  return apiCall(`/payments/me?${params}`);
};

/**
 * Get payment by order (Protected)
 * GET /api/payments/me/order/:orderId
 */
export const getPaymentByOrder = (orderId) => apiCall(`/payments/me/order/${orderId}`);

/**
 * Create MoMo payment (Protected)
 * POST /api/payments/momo/create
 * Backend expects: { orderId, redirectUrl, ipnUrl, extraData }
 */
export const createMoMoPayment = (paymentData) => {
  const { orderId, returnUrl, notifyUrl, extraData } = paymentData;
  return apiCall('/payments/momo/create', {
    method: 'POST',
    body: {
      orderId,
      redirectUrl: returnUrl, // Map returnUrl to redirectUrl
      ipnUrl: notifyUrl, // Map notifyUrl to ipnUrl
      extraData: extraData || JSON.stringify({ orderId }),
    },
  });
};

/**
 * Query MoMo payment status (Protected)
 * POST /api/payments/momo/query
 */
export const queryMoMoStatus = (orderId) => {
  console.log('[Payment API] queryMoMoStatus called with orderId:', orderId, 'type:', typeof orderId);
  return apiCall('/payments/momo/query', {
    method: 'POST',
    body: { orderId: orderId }, // Explicitly set orderId
  });
};

// Admin only functions
/**
 * Get all payments (Admin only)
 * GET /api/payments
 */
export const getAllPayments = (page = 1, limit = 10, filters = {}) => {
  const params = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
    ...filters,
  });
  return apiCall(`/payments?${params}`);
};

/**
 * Get payment by ID (Admin only)
 * GET /api/payments/:id
 */
export const getPaymentById = (id) => apiCall(`/payments/${id}`);

/**
 * Capture payment (Admin only)
 * POST /api/payments/:id/capture
 */
export const capturePayment = (id) =>
  apiCall(`/payments/${id}/capture`, {
    method: 'POST',
  });

/**
 * Refund payment (Admin only)
 * POST /api/payments/:id/refund
 */
export const refundPayment = (id, refundData) =>
  apiCall(`/payments/${id}/refund`, {
    method: 'POST',
    body: refundData,
  });

/**
 * Get payments by order (Admin only)
 * GET /api/payments/order/:orderId
 */
export const getPaymentsByOrder = (orderId) => apiCall(`/payments/order/${orderId}`);

/**
 * Get payments by gateway (Admin only)
 * GET /api/payments/gateway/:gateway
 */
export const getPaymentsByGateway = (gateway, page = 1, limit = 10) => {
  const params = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
  });
  return apiCall(`/payments/gateway/${gateway}?${params}`);
};

/**
 * Get payments by status (Admin only)
 * GET /api/payments/status/:statusId
 */
export const getPaymentsByStatus = (statusId, page = 1, limit = 10) => {
  const params = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
  });
  return apiCall(`/payments/status/${statusId}?${params}`);
};

export default {
  getMyPayments,
  getPaymentByOrder,
  createMoMoPayment,
  queryMoMoStatus,
  getAllPayments,
  getPaymentById,
  capturePayment,
  refundPayment,
  getPaymentsByOrder,
  getPaymentsByGateway,
  getPaymentsByStatus,
};

