const createBaseController = require('./BaseController');
const { bankTransaction } = require('../Models');

const createBankTransactionController = () => {
  const baseController = createBaseController(bankTransaction);

  const getByAccount = async (req, res) => {
    console.log('========================================');
    console.log('[BankTransactionController] getByAccount function called');
    console.log('[BankTransactionController] Request IP:', req.ip);
    console.log('[BankTransactionController] Params:', req.params);
    console.log('[BankTransactionController] Query:', req.query);
    
    try {
      const { accountId } = req.params;
      const { page = 1, limit = 10 } = req.query;
      const offset = (parseInt(page) - 1) * parseInt(limit);

      console.log('[BankTransactionController] 🔍 Fetching transactions for accountId:', accountId);
      console.log('[BankTransactionController] Pagination:', { page, limit, offset });

      const data = await bankTransaction.findByAccountId(accountId, {
        limit: parseInt(limit),
        offset,
      });

      console.log('[BankTransactionController] ✅ Transactions fetched:', data?.length || 0);
      console.log('========================================');

      return res.status(200).json({
        success: true,
        data,
      });
    } catch (error) {
      console.error('[BankTransactionController] ❌❌❌ ERROR IN getByAccount ❌❌❌');
      console.error('[BankTransactionController] Error message:', error.message);
      console.error('[BankTransactionController] Error stack:', error.stack);
      console.log('========================================');
      
      return res.status(500).json({
        success: false,
        message: 'Lỗi khi lấy dữ liệu',
        error: error.message,
      });
    }
  };

  const getByExternalTxnId = async (req, res) => {
    console.log('========================================');
    console.log('[BankTransactionController] getByExternalTxnId function called');
    console.log('[BankTransactionController] Request IP:', req.ip);
    console.log('[BankTransactionController] Params:', req.params);
    
    try {
      const { externalTxnId } = req.params;
      console.log('[BankTransactionController] 🔍 Finding transaction by external transaction ID:', externalTxnId);
      
      const data = await bankTransaction.findByExternalTxnId(externalTxnId);

      if (!data) {
        console.log('[BankTransactionController] ❌ Transaction not found');
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy giao dịch',
        });
      }

      console.log('[BankTransactionController] ✅ Transaction found:', data.bank_transaction_id);
      console.log('========================================');

      return res.status(200).json({
        success: true,
        data,
      });
    } catch (error) {
      console.error('[BankTransactionController] ❌❌❌ ERROR IN getByExternalTxnId ❌❌❌');
      console.error('[BankTransactionController] Error message:', error.message);
      console.error('[BankTransactionController] Error stack:', error.stack);
      console.log('========================================');
      
      return res.status(500).json({
        success: false,
        message: 'Lỗi khi lấy dữ liệu',
        error: error.message,
      });
    }
  };

  const getByOrder = async (req, res) => {
    console.log('========================================');
    console.log('[BankTransactionController] getByOrder function called');
    console.log('[BankTransactionController] Request IP:', req.ip);
    console.log('[BankTransactionController] Params:', req.params);
    
    try {
      const { orderId } = req.params;
      console.log('[BankTransactionController] 🔍 Fetching transactions for orderId:', orderId);
      
      const data = await bankTransaction.findByOrderId(orderId);
      console.log('[BankTransactionController] ✅ Transactions fetched:', data?.length || 0);
      console.log('========================================');

      return res.status(200).json({
        success: true,
        data,
      });
    } catch (error) {
      console.error('[BankTransactionController] ❌❌❌ ERROR IN getByOrder ❌❌❌');
      console.error('[BankTransactionController] Error message:', error.message);
      console.error('[BankTransactionController] Error stack:', error.stack);
      console.log('========================================');
      
      return res.status(500).json({
        success: false,
        message: 'Lỗi khi lấy dữ liệu',
        error: error.message,
      });
    }
  };

  const getByPayment = async (req, res) => {
    console.log('========================================');
    console.log('[BankTransactionController] getByPayment function called');
    console.log('[BankTransactionController] Request IP:', req.ip);
    console.log('[BankTransactionController] Params:', req.params);
    
    try {
      const { paymentId } = req.params;
      console.log('[BankTransactionController] 🔍 Fetching transactions for paymentId:', paymentId);
      
      const data = await bankTransaction.findByPaymentId(paymentId);
      console.log('[BankTransactionController] ✅ Transactions fetched:', data?.length || 0);
      console.log('========================================');

      return res.status(200).json({
        success: true,
        data,
      });
    } catch (error) {
      console.error('[BankTransactionController] ❌❌❌ ERROR IN getByPayment ❌❌❌');
      console.error('[BankTransactionController] Error message:', error.message);
      console.error('[BankTransactionController] Error stack:', error.stack);
      console.log('========================================');
      
      return res.status(500).json({
        success: false,
        message: 'Lỗi khi lấy dữ liệu',
        error: error.message,
      });
    }
  };

  const getByDateRange = async (req, res) => {
    console.log('========================================');
    console.log('[BankTransactionController] getByDateRange function called');
    console.log('[BankTransactionController] Request IP:', req.ip);
    console.log('[BankTransactionController] Params:', req.params);
    console.log('[BankTransactionController] Query:', req.query);
    
    try {
      const { accountId } = req.params;
      const { startDate, endDate } = req.query;
      console.log('[BankTransactionController] Fetching transactions by date range:', {
        accountId,
        startDate,
        endDate
      });

      if (!startDate || !endDate) {
        console.log('[BankTransactionController] ❌ Validation failed: Missing date range');
        return res.status(400).json({
          success: false,
          message: 'Vui lòng cung cấp startDate và endDate',
        });
      }

      console.log('[BankTransactionController] 🔍 Fetching transactions...');
      const data = await bankTransaction.findByDateRange(accountId, startDate, endDate);
      console.log('[BankTransactionController] ✅ Transactions fetched:', data?.length || 0);
      console.log('========================================');

      return res.status(200).json({
        success: true,
        data,
      });
    } catch (error) {
      console.error('[BankTransactionController] ❌❌❌ ERROR IN getByDateRange ❌❌❌');
      console.error('[BankTransactionController] Error message:', error.message);
      console.error('[BankTransactionController] Error stack:', error.stack);
      console.log('========================================');
      
      return res.status(500).json({
        success: false,
        message: 'Lỗi khi lấy dữ liệu',
        error: error.message,
      });
    }
  };

  return {
    ...baseController,
    getByAccount,
    getByExternalTxnId,
    getByOrder,
    getByPayment,
    getByDateRange,
  };
};

module.exports = createBankTransactionController();
