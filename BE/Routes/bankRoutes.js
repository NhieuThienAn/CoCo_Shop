const express = require('express');
const router = express.Router();
const {
  BankController,
  BankAccountController,
  BankTransactionController,
  BankTransferRequestController,
  BankApiLogController,
  BankReconciliationController,
} = require('../Controllers');
const { authenticate, authorize } = require('../Middlewares');

/**
 * Bank Routes
 * All routes: Admin only
 * IMPORTANT: Specific routes must come before parameterized routes
 */
router.get('/banks', authenticate, authorize(1), BankController.getAll);
router.get('/banks/system/info', authenticate, authorize(1), BankController.getSystemBankInfo);
router.get('/banks/internal/list', authenticate, authorize(1), BankController.getInternalBanks);
router.get('/banks/external/list', authenticate, authorize(1), BankController.getExternalBanks);
router.get('/banks/provider/:providerCode', authenticate, authorize(1), BankController.getByProviderCode);
router.get('/banks/:id', authenticate, authorize(1), BankController.getById);
router.post('/banks', authenticate, authorize(1), BankController.create);
router.put('/banks/:id', authenticate, authorize(1), BankController.update);
router.delete('/banks/:id', authenticate, authorize(1), BankController.delete);

/**
 * Bank Account Routes
 * All routes: Admin only
 */
router.get('/accounts', authenticate, authorize(1), BankAccountController.getAll);
router.get('/accounts/:id', authenticate, authorize(1), BankAccountController.getById);
router.get('/accounts/bank/:bankId', authenticate, authorize(1), BankAccountController.getByBank);
router.get('/accounts/number/:accountNumber', authenticate, authorize(1), BankAccountController.getByAccountNumber);
router.get('/accounts/active/list', authenticate, authorize(1), BankAccountController.getActiveAccounts);
router.post('/accounts', authenticate, authorize(1), BankAccountController.create);
router.put('/accounts/:id', authenticate, authorize(1), BankAccountController.update);
router.put('/accounts/:id/balance', authenticate, authorize(1), BankAccountController.updateBalance);
router.delete('/accounts/:id', authenticate, authorize(1), BankAccountController.delete);

/**
 * Bank Transaction Routes
 * All routes: Admin only
 */
router.get('/transactions', authenticate, authorize(1), BankTransactionController.getAll);
router.get('/transactions/:id', authenticate, authorize(1), BankTransactionController.getById);
router.get('/transactions/account/:accountId', authenticate, authorize(1), BankTransactionController.getByAccount);
router.get('/transactions/external/:externalTxnId', authenticate, authorize(1), BankTransactionController.getByExternalTxnId);
router.get('/transactions/order/:orderId', authenticate, authorize(1), BankTransactionController.getByOrder);
router.get('/transactions/payment/:paymentId', authenticate, authorize(1), BankTransactionController.getByPayment);
router.get('/transactions/account/:accountId/date-range', authenticate, authorize(1), BankTransactionController.getByDateRange);
router.post('/transactions', authenticate, authorize(1), BankTransactionController.create);
router.put('/transactions/:id', authenticate, authorize(1), BankTransactionController.update);
router.delete('/transactions/:id', authenticate, authorize(1), BankTransactionController.delete);

/**
 * Bank Transfer Request Routes
 * All routes: Admin only
 */
router.get('/transfer-requests', authenticate, authorize(1), BankTransferRequestController.getAll);
router.get('/transfer-requests/:id', authenticate, authorize(1), BankTransferRequestController.getById);
router.get('/transfer-requests/from/:accountFromId', authenticate, authorize(1), BankTransferRequestController.getByAccountFrom);
router.get('/transfer-requests/to/:accountToId', authenticate, authorize(1), BankTransferRequestController.getByAccountTo);
router.get('/transfer-requests/status/:status', authenticate, authorize(1), BankTransferRequestController.getByStatus);
router.post('/transfer-requests', authenticate, authorize(1), BankTransferRequestController.create);
router.put('/transfer-requests/:id', authenticate, authorize(1), BankTransferRequestController.update);
router.put('/transfer-requests/:id/status', authenticate, authorize(1), BankTransferRequestController.updateStatus);
router.delete('/transfer-requests/:id', authenticate, authorize(1), BankTransferRequestController.delete);

/**
 * Bank API Log Routes
 * All routes: Admin only
 */
router.get('/api-logs', authenticate, authorize(1), BankApiLogController.getAll);
router.get('/api-logs/:id', authenticate, authorize(1), BankApiLogController.getById);
router.get('/api-logs/bank/:bankId', authenticate, authorize(1), BankApiLogController.getByBank);
router.get('/api-logs/account/:accountId', authenticate, authorize(1), BankApiLogController.getByAccount);
router.post('/api-logs', authenticate, authorize(1), BankApiLogController.create);
router.put('/api-logs/:id', authenticate, authorize(1), BankApiLogController.update);
router.delete('/api-logs/:id', authenticate, authorize(1), BankApiLogController.delete);

/**
 * Bank Reconciliation Routes
 * All routes: Admin only
 */
router.get('/reconciliations', authenticate, authorize(1), BankReconciliationController.getAll);
router.get('/reconciliations/:id', authenticate, authorize(1), BankReconciliationController.getById);
router.get('/reconciliations/transaction/:bankTxnId', authenticate, authorize(1), BankReconciliationController.getByBankTransaction);
router.get('/reconciliations/order/:orderId', authenticate, authorize(1), BankReconciliationController.getByOrder);
router.get('/reconciliations/payment/:paymentId', authenticate, authorize(1), BankReconciliationController.getByPayment);
router.post('/reconciliations', authenticate, authorize(1), BankReconciliationController.create);
router.put('/reconciliations/:id', authenticate, authorize(1), BankReconciliationController.update);
router.delete('/reconciliations/:id', authenticate, authorize(1), BankReconciliationController.delete);

module.exports = router;

