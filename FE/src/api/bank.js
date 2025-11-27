/**
 * Bank API
 * Dựa trên routes: /api/bank
 * Admin only
 */

import { apiCall } from './config';

/**
 * Get system bank info (Admin only)
 * GET /api/bank/banks/system/info
 */
export const getSystemBankInfo = () => apiCall('/bank/banks/system/info');

/**
 * Get all banks (Admin only)
 * GET /api/bank/banks
 */
export const getAllBanks = (page = 1, limit = 10) => {
  const params = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
  });
  return apiCall(`/bank/banks?${params}`);
};

/**
 * Get bank by ID (Admin only)
 * GET /api/bank/banks/:id
 */
export const getBankById = (id) => apiCall(`/bank/banks/${id}`);

/**
 * Get bank accounts (Admin only)
 * GET /api/bank/accounts
 */
export const getAllBankAccounts = (page = 1, limit = 10) => {
  const params = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
  });
  return apiCall(`/bank/accounts?${params}`);
};

/**
 * Get bank account by ID (Admin only)
 * GET /api/bank/accounts/:id
 */
export const getBankAccountById = (id) => apiCall(`/bank/accounts/${id}`);

/**
 * Get bank transactions by account (Admin only)
 * GET /api/bank/transactions/account/:accountId
 */
export const getBankTransactionsByAccount = (accountId, page = 1, limit = 20) => {
  const params = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
  });
  return apiCall(`/bank/transactions/account/${accountId}?${params}`);
};

/**
 * Get bank transactions by order (Admin only)
 * GET /api/bank/transactions/order/:orderId
 */
export const getBankTransactionsByOrder = (orderId) => apiCall(`/bank/transactions/order/${orderId}`);

/**
 * Get bank transactions by payment (Admin only)
 * GET /api/bank/transactions/payment/:paymentId
 */
export const getBankTransactionsByPayment = (paymentId) => apiCall(`/bank/transactions/payment/${paymentId}`);

/**
 * Update bank account balance (Admin only)
 * PUT /api/bank/accounts/:id/balance
 */
export const updateBankAccountBalance = (id, amount, type = 'credit') =>
  apiCall(`/bank/accounts/${id}/balance`, {
    method: 'PUT',
    body: { amount, type },
  });

export default {
  getSystemBankInfo,
  getAllBanks,
  getBankById,
  getAllBankAccounts,
  getBankAccountById,
  getBankTransactionsByAccount,
  getBankTransactionsByOrder,
  getBankTransactionsByPayment,
  updateBankAccountBalance,
};

