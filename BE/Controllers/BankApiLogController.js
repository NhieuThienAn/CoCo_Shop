const createBaseController = require('./BaseController');
const { bankApiLog } = require('../Models');
const createBankApiLogController = () => {
  const baseController = createBaseController(bankApiLog);
  const getByBank = async (req, res) => {
    console.log('========================================');
    console.log('[BankApiLogController] getByBank function called');
    console.log('[BankApiLogController] Request IP:', req.ip);
    console.log('[BankApiLogController] Params:', req.params);
    console.log('[BankApiLogController] Query:', req.query);
    try {
      const { bankId } = req.params;
      const { page = 1, limit = 10 } = req.query;
      const offset = (parseInt(page) - 1) * parseInt(limit);
      console.log('[BankApiLogController] 🔍 Fetching API logs for bankId:', bankId);
      console.log('[BankApiLogController] Pagination:', { page, limit, offset });
      const data = await bankApiLog.findByBankId(bankId, {
        limit: parseInt(limit),
        offset,
      });
      console.log('[BankApiLogController] ✅ API logs fetched:', data?.length || 0);
      console.log('========================================');
      return res.status(200).json({
        success: true,
        data,
      });
    } catch (error) {
      console.error('[BankApiLogController] ❌❌❌ ERROR IN getByBank ❌❌❌');
      console.error('[BankApiLogController] Error message:', error.message);
      console.error('[BankApiLogController] Error stack:', error.stack);
      console.log('========================================');
      return res.status(500).json({
        success: false,
        message: 'Lỗi khi lấy dữ liệu',
        error: error.message,
      });
    }
  };
  const getByAccount = async (req, res) => {
    console.log('========================================');
    console.log('[BankApiLogController] getByAccount function called');
    console.log('[BankApiLogController] Request IP:', req.ip);
    console.log('[BankApiLogController] Params:', req.params);
    console.log('[BankApiLogController] Query:', req.query);
    try {
      const { accountId } = req.params;
      const { page = 1, limit = 10 } = req.query;
      const offset = (parseInt(page) - 1) * parseInt(limit);
      console.log('[BankApiLogController] 🔍 Fetching API logs for accountId:', accountId);
      console.log('[BankApiLogController] Pagination:', { page, limit, offset });
      const data = await bankApiLog.findByAccountId(accountId, {
        limit: parseInt(limit),
        offset,
      });
      console.log('[BankApiLogController] ✅ API logs fetched:', data?.length || 0);
      console.log('========================================');
      return res.status(200).json({
        success: true,
        data,
      });
    } catch (error) {
      console.error('[BankApiLogController] ❌❌❌ ERROR IN getByAccount ❌❌❌');
      console.error('[BankApiLogController] Error message:', error.message);
      console.error('[BankApiLogController] Error stack:', error.stack);
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
    getByBank,
    getByAccount,
  };
};
module.exports = createBankApiLogController();
