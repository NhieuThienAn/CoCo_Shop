const createBaseController = require('./BaseController');
const { bankReconciliation } = require('../Models');

const createBankReconciliationController = () => {
  const baseController = createBaseController(bankReconciliation);

  const getByBankTransaction = async (req, res) => {
    console.log('========================================');
    console.log('[BankReconciliationController] getByBankTransaction function called');
    console.log('[BankReconciliationController] Request IP:', req.ip);
    console.log('[BankReconciliationController] Params:', req.params);
    
    try {
      const { bankTxnId } = req.params;
      console.log('[BankReconciliationController] 🔍 Finding reconciliation by bank transaction ID:', bankTxnId);
      
      const data = await bankReconciliation.findByBankTransaction(bankTxnId);

      if (!data) {
        console.log('[BankReconciliationController] ❌ Reconciliation not found');
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy đối soát',
        });
      }

      console.log('[BankReconciliationController] ✅ Reconciliation found:', data.reconciliation_id);
      console.log('========================================');

      return res.status(200).json({
        success: true,
        data,
      });
    } catch (error) {
      console.error('[BankReconciliationController] ❌❌❌ ERROR IN getByBankTransaction ❌❌❌');
      console.error('[BankReconciliationController] Error message:', error.message);
      console.error('[BankReconciliationController] Error stack:', error.stack);
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
    console.log('[BankReconciliationController] getByOrder function called');
    console.log('[BankReconciliationController] Request IP:', req.ip);
    console.log('[BankReconciliationController] Params:', req.params);
    
    try {
      const { orderId } = req.params;
      console.log('[BankReconciliationController] 🔍 Fetching reconciliations for orderId:', orderId);
      
      const data = await bankReconciliation.findByOrderId(orderId);
      console.log('[BankReconciliationController] ✅ Reconciliations fetched:', data?.length || 0);
      console.log('========================================');

      return res.status(200).json({
        success: true,
        data,
      });
    } catch (error) {
      console.error('[BankReconciliationController] ❌❌❌ ERROR IN getByOrder ❌❌❌');
      console.error('[BankReconciliationController] Error message:', error.message);
      console.error('[BankReconciliationController] Error stack:', error.stack);
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
    console.log('[BankReconciliationController] getByPayment function called');
    console.log('[BankReconciliationController] Request IP:', req.ip);
    console.log('[BankReconciliationController] Params:', req.params);
    
    try {
      const { paymentId } = req.params;
      console.log('[BankReconciliationController] 🔍 Fetching reconciliations for paymentId:', paymentId);
      
      const data = await bankReconciliation.findByPaymentId(paymentId);
      console.log('[BankReconciliationController] ✅ Reconciliations fetched:', data?.length || 0);
      console.log('========================================');

      return res.status(200).json({
        success: true,
        data,
      });
    } catch (error) {
      console.error('[BankReconciliationController] ❌❌❌ ERROR IN getByPayment ❌❌❌');
      console.error('[BankReconciliationController] Error message:', error.message);
      console.error('[BankReconciliationController] Error stack:', error.stack);
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
    getByBankTransaction,
    getByOrder,
    getByPayment,
  };
};

module.exports = createBankReconciliationController();
