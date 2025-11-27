/**
 * Order API
 * Dựa trên routes: /api/orders
 */

import { apiCall } from './config';

/**
 * Get my orders (Protected)
 * GET /api/orders/me
 */
export const getMyOrders = (page = 1, limit = 10, filters = {}) => {
  const params = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
    ...filters,
  });
  return apiCall(`/orders/me?${params}`);
};

/**
 * Get my order by ID (Protected)
 * GET /api/orders/me/:id
 */
export const getMyOrderById = (id) => apiCall(`/orders/me/${id}`);

/**
 * Create order (Protected)
 * POST /api/orders/me/create
 */
export const createOrder = (orderData) =>
  apiCall('/orders/me/create', {
    method: 'POST',
    body: orderData,
  });

/**
 * Create order from cart (Protected)
 * POST /api/orders/me/cart/create
 */
export const createOrderFromCart = (orderData) =>
  apiCall('/orders/me/cart/create', {
    method: 'POST',
    body: orderData,
  });

/**
 * Cancel my order (Protected)
 * PUT /api/orders/me/:id/cancel
 */
export const cancelMyOrder = (id) =>
  apiCall(`/orders/me/${id}/cancel`, {
    method: 'PUT',
  });

/**
 * Return my order (Protected)
 * PUT /api/orders/me/:id/return
 */
export const returnMyOrder = (id, returnData) =>
  apiCall(`/orders/me/${id}/return`, {
    method: 'PUT',
    body: returnData,
  });

/**
 * Get order statuses (Protected)
 * GET /api/orders/statuses/list
 */
export const getOrderStatuses = () => apiCall('/orders/statuses/list');

/**
 * Get order by order number (Protected)
 * GET /api/orders/number/:orderNumber
 */
export const getOrderByNumber = (orderNumber) => apiCall(`/orders/number/${orderNumber}`);

// Admin only functions
/**
 * Get orders by user ID (Admin only)
 * GET /api/orders/user/:userId
 */
export const getOrdersByUser = (userId, page = 1, limit = 10) => {
  const params = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
  });
  return apiCall(`/orders/user/${userId}?${params}`);
};

/**
 * Get orders by status ID (Admin only)
 * GET /api/orders/status/:statusId
 */
export const getOrdersByStatus = (statusId, page = 1, limit = 10) => {
  const params = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
  });
  return apiCall(`/orders/status/${statusId}?${params}`);
};
/**
 * Get all orders (Admin only)
 * GET /api/orders
 */
export const getAllOrders = (page = 1, limit = 10, filters = {}) => {
  const params = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
    ...filters,
  });
  return apiCall(`/orders?${params}`);
};

/**
 * Get order by ID (Admin only)
 * GET /api/orders/:id
 */
export const getOrderById = (id) => apiCall(`/orders/${id}`);

/**
 * Update order status (Admin only)
 * PUT /api/orders/:id/status
 */
export const updateOrderStatus = (id, statusData) =>
  apiCall(`/orders/${id}/status`, {
    method: 'PUT',
    body: statusData,
  });

/**
 * Confirm order (Admin only)
 * PUT /api/orders/:id/confirm
 */
export const confirmOrder = (id) =>
  apiCall(`/orders/${id}/confirm`, {
    method: 'PUT',
  });

/**
 * Start shipping (Admin only)
 * PUT /api/orders/:id/shipping
 */
export const startShipping = (id) =>
  apiCall(`/orders/${id}/shipping`, {
    method: 'PUT',
  });

/**
 * Mark as delivered (Admin only)
 * PUT /api/orders/:id/delivered
 */
export const markAsDelivered = (id) =>
  apiCall(`/orders/${id}/delivered`, {
    method: 'PUT',
  });

/**
 * Shipper: Update order to shipping status (Shipper only)
 * PUT /api/orders/:id/shipper/shipping
 * @param {string} id - Order ID
 */
export const updateOrderToShipping = (id) =>
  apiCall(`/orders/${id}/shipper/shipping`, {
    method: 'PUT',
  });

/**
 * Shipper: Update order to delivered status (Shipper only)
 * PUT /api/orders/:id/shipper/delivered
 * @param {string} id - Order ID
 */
export const updateOrderToDelivered = (id) =>
  apiCall(`/orders/${id}/shipper/delivered`, {
    method: 'PUT',
  });

/**
 * Confirm payment for COD order after delivery (Admin only)
 * PUT /api/orders/:id/confirm-payment
 * @param {string} id - Order ID
 * @param {boolean} paid - Payment status (true = paid, false = pending)
 */
export const confirmPayment = (id, paid = true) =>
  apiCall(`/orders/${id}/confirm-payment`, {
    method: 'PUT',
    body: { paid },
  });

/**
 * Complete order (Admin only)
 * PUT /api/orders/:id/complete
 * @param {string} id - Order ID
 * Updates order status from DELIVERED to COMPLETED
 */
export const completeOrder = (id) =>
  apiCall(`/orders/${id}/complete`, {
    method: 'PUT',
  });

/**
 * Cancel order (Admin only)
 * PUT /api/orders/:id/cancel
 */
export const cancelOrder = (id) =>
  apiCall(`/orders/${id}/cancel`, {
    method: 'PUT',
  });

/**
 * Return order (Admin only)
 * PUT /api/orders/:id/return
 */
export const returnOrder = (id, returnData) =>
  apiCall(`/orders/${id}/return`, {
    method: 'PUT',
    body: returnData,
  });

/**
 * Get pending order products summary (Admin only)
 * GET /api/orders/pending/products-summary
 * Thống kê sản phẩm cần đặt từ đơn hàng PENDING
 */
export const getPendingOrderProductsSummary = () =>
  apiCall('/orders/pending/products-summary');

export default {
  getMyOrders,
  getMyOrderById,
  createOrder,
  createOrderFromCart,
  cancelMyOrder,
  returnMyOrder,
  getOrderStatuses,
  getOrderByNumber,
  getAllOrders,
  getOrderById,
  updateOrderStatus,
  confirmOrder,
  startShipping,
  markAsDelivered,
  updateOrderToShipping,
  updateOrderToDelivered,
  confirmPayment,
  completeOrder,
  cancelOrder,
  returnOrder,
  getOrdersByUser,
  getOrdersByStatus,
  getPendingOrderProductsSummary,
};

