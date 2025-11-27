/**
 * Support API
 * Dựa trên routes: /api/support
 * Bao gồm: Roles, Brands, Order Statuses, Payment Methods, Payment Statuses, etc.
 */

import { apiCall } from './config';

// ============================================
// ROLES
// ============================================

/**
 * Get roles (Public)
 * GET /api/support/roles
 */
export const getRoles = () => apiCall('/support/roles');

/**
 * Get role by ID (Public)
 * GET /api/support/roles/:id
 */
export const getRoleById = (id) => apiCall(`/support/roles/${id}`);

// ============================================
// BRANDS
// ============================================

/**
 * Get brands (Public)
 * GET /api/support/brands
 */
export const getBrands = () => apiCall('/support/brands');

/**
 * Get brand by ID (Public)
 * GET /api/support/brands/:id
 */
export const getBrandById = (id) => apiCall(`/support/brands/${id}`);

// ============================================
// ORDER STATUSES
// ============================================

/**
 * Get order statuses (Public)
 * GET /api/support/order-statuses
 */
export const getOrderStatuses = () => apiCall('/support/order-statuses');

/**
 * Get order status by ID (Public)
 * GET /api/support/order-statuses/:id
 */
export const getOrderStatusById = (id) => apiCall(`/support/order-statuses/${id}`);

/**
 * Get order status by name (Public)
 * GET /api/support/order-statuses/name/:name
 */
export const getOrderStatusByName = (name) => apiCall(`/support/order-statuses/name/${name}`);

/**
 * Get ordered order statuses (Public)
 * GET /api/support/order-statuses/ordered/list
 */
export const getOrderedOrderStatuses = () => apiCall('/support/order-statuses/ordered/list');

// ============================================
// PAYMENT METHODS
// ============================================

/**
 * Get payment methods (Public)
 * GET /api/support/payment-methods
 */
export const getPaymentMethods = () => apiCall('/support/payment-methods');

/**
 * Get payment method by ID (Public)
 * GET /api/support/payment-methods/:id
 */
export const getPaymentMethodById = (id) => apiCall(`/support/payment-methods/${id}`);

/**
 * Get payment method by name (Public)
 * GET /api/support/payment-methods/name/:name
 */
export const getPaymentMethodByName = (name) => apiCall(`/support/payment-methods/name/${name}`);

// ============================================
// PAYMENT STATUSES
// ============================================

/**
 * Get payment statuses (Public)
 * GET /api/support/payment-statuses
 */
export const getPaymentStatuses = () => apiCall('/support/payment-statuses');

/**
 * Get payment status by ID (Public)
 * GET /api/support/payment-statuses/:id
 */
export const getPaymentStatusById = (id) => apiCall(`/support/payment-statuses/${id}`);

/**
 * Get payment status by name (Public)
 * GET /api/support/payment-statuses/name/:name
 */
export const getPaymentStatusByName = (name) => apiCall(`/support/payment-statuses/name/${name}`);

// ============================================
// SUPPLIERS
// ============================================

/**
 * Get suppliers (Admin only)
 * GET /api/support/suppliers
 */
export const getSuppliers = (page = 1, limit = 10) => {
  const params = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
  });
  return apiCall(`/support/suppliers?${params}`);
};

/**
 * Get supplier by ID (Admin only)
 * GET /api/support/suppliers/:id
 */
export const getSupplierById = (id) => apiCall(`/support/suppliers/${id}`);

/**
 * Search suppliers by name (Admin only)
 * GET /api/support/suppliers/search/name?name=xxx
 */
export const searchSuppliersByName = (name) => {
  const params = new URLSearchParams({ name });
  return apiCall(`/support/suppliers/search/name?${params}`);
};

/**
 * Create supplier (Admin only)
 * POST /api/support/suppliers
 */
export const createSupplier = (supplierData) =>
  apiCall('/support/suppliers', {
    method: 'POST',
    body: supplierData,
  });

/**
 * Update supplier (Admin only)
 * PUT /api/support/suppliers/:id
 */
export const updateSupplier = (id, supplierData) =>
  apiCall(`/support/suppliers/${id}`, {
    method: 'PUT',
    body: supplierData,
  });

/**
 * Delete supplier (Admin only)
 * DELETE /api/support/suppliers/:id
 */
export const deleteSupplier = (id) =>
  apiCall(`/support/suppliers/${id}`, {
    method: 'DELETE',
  });

// ============================================
// SHIPMENTS
// ============================================

/**
 * Get shipments (Admin only)
 * GET /api/support/shipments
 */
export const getShipments = (page = 1, limit = 10) => {
  const params = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
  });
  return apiCall(`/support/shipments?${params}`);
};

/**
 * Get shipment by ID (Admin only)
 * GET /api/support/shipments/:id
 */
export const getShipmentById = (id) => apiCall(`/support/shipments/${id}`);

/**
 * Get shipments by order (Admin only)
 * GET /api/support/shipments/order/:orderId
 */
export const getShipmentsByOrder = (orderId) => apiCall(`/support/shipments/order/${orderId}`);

/**
 * Create shipment (Admin only)
 * POST /api/support/shipments
 */
export const createShipment = (shipmentData) =>
  apiCall('/support/shipments', {
    method: 'POST',
    body: shipmentData,
  });

/**
 * Shipper accept order (Shipper only)
 * POST /api/support/shipments/accept
 */
export const acceptOrder = (orderId) =>
  apiCall('/support/shipments/accept', {
    method: 'POST',
    body: { orderId },
  });

/**
 * Get shipments by shipper (Shipper only)
 * GET /api/support/shipments/shipper/me
 */
export const getMyShipments = () => apiCall('/support/shipments/shipper/me');

/**
 * Update shipment (Admin only)
 * PUT /api/support/shipments/:id
 */
export const updateShipment = (id, shipmentData) =>
  apiCall(`/support/shipments/${id}`, {
    method: 'PUT',
    body: shipmentData,
  });

/**
 * Delete shipment (Admin only)
 * DELETE /api/support/shipments/:id
 */
export const deleteShipment = (id) =>
  apiCall(`/support/shipments/${id}`, {
    method: 'DELETE',
  });

// ============================================
// SHIPPERS
// ============================================

/**
 * Get shippers (Admin only)
 * GET /api/support/shippers
 */
export const getShippers = (page = 1, limit = 10) => {
  const params = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
  });
  return apiCall(`/support/shippers?${params}`);
};

/**
 * Get shipper by ID (Admin only)
 * GET /api/support/shippers/:id
 */
export const getShipperById = (id) => apiCall(`/support/shippers/${id}`);

/**
 * Search shippers by name (Admin only)
 * GET /api/support/shippers/search/name?name=xxx
 */
export const searchShippersByName = (name) => {
  const params = new URLSearchParams({ name });
  return apiCall(`/support/shippers/search/name?${params}`);
};

/**
 * Create shipper (Admin only)
 * POST /api/support/shippers
 */
export const createShipper = (shipperData) =>
  apiCall('/support/shippers', {
    method: 'POST',
    body: shipperData,
  });

/**
 * Update shipper (Admin only)
 * PUT /api/support/shippers/:id
 */
export const updateShipper = (id, shipperData) =>
  apiCall(`/support/shippers/${id}`, {
    method: 'PUT',
    body: shipperData,
  });

/**
 * Delete shipper (Admin only)
 * DELETE /api/support/shippers/:id
 */
export const deleteShipper = (id) =>
  apiCall(`/support/shippers/${id}`, {
    method: 'DELETE',
  });

// ============================================
// PURCHASE ORDERS
// ============================================

/**
 * Get purchase orders (Admin only)
 * GET /api/support/purchase-orders
 */
export const getPurchaseOrders = (page = 1, limit = 10, filters = {}) => {
  const params = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
    ...Object.fromEntries(
      Object.entries(filters).map(([key, value]) => [key, value?.toString() || ''])
    ),
  });
  return apiCall(`/support/purchase-orders?${params}`);
};

/**
 * Get purchase order by ID (Admin only)
 * GET /api/support/purchase-orders/:id
 */
export const getPurchaseOrderById = (id) => apiCall(`/support/purchase-orders/${id}`);

/**
 * Get purchase order by PO number (Admin only)
 * GET /api/support/purchase-orders/po/:poNumber
 */
export const getPurchaseOrderByPoNumber = (poNumber) => apiCall(`/support/purchase-orders/po/${poNumber}`);

/**
 * Get purchase orders by supplier (Admin only)
 * GET /api/support/purchase-orders/supplier/:supplierId
 */
export const getPurchaseOrdersBySupplier = (supplierId) => apiCall(`/support/purchase-orders/supplier/${supplierId}`);

/**
 * Get purchase orders by approval status (Admin only)
 * GET /api/support/purchase-orders/approval/:status
 */
export const getPurchaseOrdersByApprovalStatus = (status, filters = {}) => {
  const params = new URLSearchParams(
    Object.fromEntries(
      Object.entries(filters).map(([key, value]) => [key, value?.toString() || ''])
    )
  );
  const queryString = params.toString();
  return apiCall(`/support/purchase-orders/approval/${status}${queryString ? '?' + queryString : ''}`);
};

/**
 * Create purchase order (Admin only)
 * POST /api/support/purchase-orders
 */
export const createPurchaseOrder = (poData) =>
  apiCall('/support/purchase-orders', {
    method: 'POST',
    body: poData,
  });

/**
 * Update purchase order (Admin only)
 * PUT /api/support/purchase-orders/:id
 */
export const updatePurchaseOrder = (id, poData) =>
  apiCall(`/support/purchase-orders/${id}`, {
    method: 'PUT',
    body: poData,
  });

/**
 * Delete purchase order (Admin only)
 * DELETE /api/support/purchase-orders/:id
 */
export const deletePurchaseOrder = (id) =>
  apiCall(`/support/purchase-orders/${id}`, {
    method: 'DELETE',
  });

/**
 * Approve purchase order (Admin only)
 * PUT /api/support/purchase-orders/:id/approve
 */
export const approvePurchaseOrder = (id) =>
  apiCall(`/support/purchase-orders/${id}/approve`, {
    method: 'PUT',
  });

/**
 * Reject purchase order (Admin only)
 * PUT /api/support/purchase-orders/:id/reject
 */
export const rejectPurchaseOrder = (id, rejectionReason, approvedBy) =>
  apiCall(`/support/purchase-orders/${id}/reject`, {
    method: 'PUT',
    body: { rejectionReason, approvedBy },
  });

// ============================================
// RETURN REQUESTS
// ============================================

/**
 * Get return requests (Admin only)
 * GET /api/support/return-requests
 */
export const getReturnRequests = (page = 1, limit = 10) => {
  const params = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
  });
  return apiCall(`/support/return-requests?${params}`);
};

/**
 * Get return request by ID (Admin only)
 * GET /api/support/return-requests/:id
 */
export const getReturnRequestById = (id) => apiCall(`/support/return-requests/${id}`);

/**
 * Get return requests by order (Admin only)
 * GET /api/support/return-requests/order/:orderId
 */
export const getReturnRequestsByOrder = (orderId) => apiCall(`/support/return-requests/order/${orderId}`);

/**
 * Get return requests by user (Admin only)
 * GET /api/support/return-requests/user/:userId
 */
export const getReturnRequestsByUser = (userId) => apiCall(`/support/return-requests/user/${userId}`);

/**
 * Get return requests by status (Admin only)
 * GET /api/support/return-requests/status/:status
 */
export const getReturnRequestsByStatus = (status) => apiCall(`/support/return-requests/status/${status}`);

/**
 * Create return request (Admin only)
 * POST /api/support/return-requests
 */
export const createReturnRequest = (returnData) =>
  apiCall('/support/return-requests', {
    method: 'POST',
    body: returnData,
  });

/**
 * Update return request (Admin only)
 * PUT /api/support/return-requests/:id
 */
export const updateReturnRequest = (id, returnData) =>
  apiCall(`/support/return-requests/${id}`, {
    method: 'PUT',
    body: returnData,
  });

/**
 * Delete return request (Admin only)
 * DELETE /api/support/return-requests/:id
 */
export const deleteReturnRequest = (id) =>
  apiCall(`/support/return-requests/${id}`, {
    method: 'DELETE',
  });

/**
 * Process return request (Admin only)
 * PUT /api/support/return-requests/:id/process
 */
export const processReturnRequest = (id, processData) =>
  apiCall(`/support/return-requests/${id}/process`, {
    method: 'PUT',
    body: processData,
  });

// ============================================
// INVENTORY TRANSACTIONS
// ============================================

/**
 * Get inventory transactions (Admin only)
 * GET /api/support/inventory-transactions
 */
export const getInventoryTransactions = (page = 1, limit = 10) => {
  const params = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
  });
  return apiCall(`/support/inventory-transactions?${params}`);
};

/**
 * Get inventory transaction by ID (Admin only)
 * GET /api/support/inventory-transactions/:id
 */
export const getInventoryTransactionById = (id) => apiCall(`/support/inventory-transactions/${id}`);

/**
 * Get inventory transactions by product (Admin only)
 * GET /api/support/inventory-transactions/product/:productId
 */
export const getInventoryTransactionsByProduct = (productId) => apiCall(`/support/inventory-transactions/product/${productId}`);

/**
 * Get inventory transactions by change type (Admin only)
 * GET /api/support/inventory-transactions/type/:changeType
 */
export const getInventoryTransactionsByType = (changeType) => apiCall(`/support/inventory-transactions/type/${changeType}`);

/**
 * Create inventory transaction (Admin only)
 * POST /api/support/inventory-transactions
 */
export const createInventoryTransaction = (transactionData) =>
  apiCall('/support/inventory-transactions', {
    method: 'POST',
    body: transactionData,
  });

/**
 * Record inventory transaction (Admin only)
 * POST /api/support/inventory-transactions/record
 */
export const recordInventoryTransaction = (transactionData) =>
  apiCall('/support/inventory-transactions/record', {
    method: 'POST',
    body: transactionData,
  });

/**
 * Update inventory transaction (Admin only)
 * PUT /api/support/inventory-transactions/:id
 */
export const updateInventoryTransaction = (id, transactionData) =>
  apiCall(`/support/inventory-transactions/${id}`, {
    method: 'PUT',
    body: transactionData,
  });

/**
 * Delete inventory transaction (Admin only)
 * DELETE /api/support/inventory-transactions/:id
 */
export const deleteInventoryTransaction = (id) =>
  apiCall(`/support/inventory-transactions/${id}`, {
    method: 'DELETE',
  });

// ============================================
// STOCK RECEIPTS
// ============================================

/**
 * Get stock receipts (Admin only)
 * GET /api/support/stock-receipts
 */
export const getStockReceipts = (page = 1, limit = 10) => {
  const params = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
  });
  return apiCall(`/support/stock-receipts?${params}`);
};

/**
 * Get stock receipt by ID (Admin only)
 * GET /api/support/stock-receipts/:id
 */
export const getStockReceiptById = (id) => apiCall(`/support/stock-receipts/${id}`);

/**
 * Get stock receipt by receipt number (Admin only)
 * GET /api/support/stock-receipts/receipt/:receiptNumber
 */
export const getStockReceiptByReceiptNumber = (receiptNumber) => apiCall(`/support/stock-receipts/receipt/${receiptNumber}`);

/**
 * Get stock receipts by status (Admin only)
 * GET /api/support/stock-receipts/status/:status
 */
export const getStockReceiptsByStatus = (status) => apiCall(`/support/stock-receipts/status/${status}`);

/**
 * Create stock receipt (Admin only)
 * POST /api/support/stock-receipts
 */
export const createStockReceipt = (receiptData) =>
  apiCall('/support/stock-receipts', {
    method: 'POST',
    body: receiptData,
  });

/**
 * Update stock receipt (Admin only)
 * PUT /api/support/stock-receipts/:id
 */
export const updateStockReceipt = (id, receiptData) =>
  apiCall(`/support/stock-receipts/${id}`, {
    method: 'PUT',
    body: receiptData,
  });

/**
 * Delete stock receipt (Admin only)
 * DELETE /api/support/stock-receipts/:id
 */
export const deleteStockReceipt = (id) =>
  apiCall(`/support/stock-receipts/${id}`, {
    method: 'DELETE',
  });

/**
 * Approve stock receipt (Admin only)
 * PUT /api/support/stock-receipts/:id/approve
 */
export const approveStockReceipt = (id) =>
  apiCall(`/support/stock-receipts/${id}/approve`, {
    method: 'PUT',
  });

/**
 * Reject stock receipt (Admin only)
 * PUT /api/support/stock-receipts/:id/reject
 */
export const rejectStockReceipt = (id, rejectionReason) =>
  apiCall(`/support/stock-receipts/${id}/reject`, {
    method: 'PUT',
    body: { rejectionReason },
  });

export default {
  // Roles
  getRoles,
  getRoleById,
  // Brands
  getBrands,
  getBrandById,
  // Order Statuses
  getOrderStatuses,
  getOrderStatusById,
  getOrderStatusByName,
  getOrderedOrderStatuses,
  // Payment Methods
  getPaymentMethods,
  getPaymentMethodById,
  getPaymentMethodByName,
  // Payment Statuses
  getPaymentStatuses,
  getPaymentStatusById,
  getPaymentStatusByName,
  // Suppliers
  getSuppliers,
  getSupplierById,
  searchSuppliersByName,
  createSupplier,
  updateSupplier,
  deleteSupplier,
  // Shipments
  getShipments,
  getShipmentById,
  getShipmentsByOrder,
  createShipment,
  acceptOrder,
  getMyShipments,
  updateShipment,
  deleteShipment,
  // Shippers
  getShippers,
  getShipperById,
  searchShippersByName,
  createShipper,
  updateShipper,
  deleteShipper,
  // Purchase Orders
  getPurchaseOrders,
  getPurchaseOrderById,
  getPurchaseOrderByPoNumber,
  getPurchaseOrdersBySupplier,
  getPurchaseOrdersByApprovalStatus,
  createPurchaseOrder,
  updatePurchaseOrder,
  deletePurchaseOrder,
  approvePurchaseOrder,
  rejectPurchaseOrder,
  // Return Requests
  getReturnRequests,
  getReturnRequestById,
  getReturnRequestsByOrder,
  getReturnRequestsByUser,
  getReturnRequestsByStatus,
  createReturnRequest,
  updateReturnRequest,
  deleteReturnRequest,
  processReturnRequest,
  // Inventory Transactions
  getInventoryTransactions,
  getInventoryTransactionById,
  getInventoryTransactionsByProduct,
  getInventoryTransactionsByType,
  createInventoryTransaction,
  recordInventoryTransaction,
  updateInventoryTransaction,
  deleteInventoryTransaction,
  // Stock Receipts
  getStockReceipts,
  getStockReceiptById,
  getStockReceiptByReceiptNumber,
  getStockReceiptsByStatus,
  createStockReceipt,
  updateStockReceipt,
  deleteStockReceipt,
  approveStockReceipt,
  rejectStockReceipt,
};

