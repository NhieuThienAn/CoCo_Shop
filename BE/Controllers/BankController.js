const createBaseController = require('./BaseController');
const { bank } = require('../Models');
const createBankController = () => {
  const baseController = createBaseController(bank);
  const getByProviderCode = async (req, res) => {
    console.log('========================================');
    console.log('[BankController] getByProviderCode function called');
    console.log('[BankController] Request IP:', req.ip);
    console.log('[BankController] Params:', req.params);
    try {
      const { providerCode } = req.params;
      console.log('[BankController] 🔍 Finding bank by provider code:', providerCode);
      const data = await bank.findByProviderCode(providerCode);
      if (!data) {
        console.log('[BankController] ❌ Bank not found');
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy ngân hàng',
        });
      }
      console.log('[BankController] ✅ Bank found:', data.bank_id);
      console.log('========================================');
      return res.status(200).json({
        success: true,
        data,
      });
    } catch (error) {
      console.error('[BankController] ❌❌❌ ERROR IN getByProviderCode ❌❌❌');
      console.error('[BankController] Error message:', error.message);
      console.error('[BankController] Error stack:', error.stack);
      console.log('========================================');
      return res.status(500).json({
        success: false,
        message: 'Lỗi khi lấy dữ liệu',
        error: error.message,
      });
    }
  };
  const getInternalBanks = async (req, res) => {
    console.log('========================================');
    console.log('[BankController] getInternalBanks function called');
    console.log('[BankController] Request IP:', req.ip);
    try {
      console.log('[BankController] 🔍 Fetching internal banks...');
      const data = await bank.findInternalBanks();
      console.log('[BankController] ✅ Internal banks fetched:', data?.length || 0);
      console.log('========================================');
      return res.status(200).json({
        success: true,
        data,
      });
    } catch (error) {
      console.error('[BankController] ❌❌❌ ERROR IN getInternalBanks ❌❌❌');
      console.error('[BankController] Error message:', error.message);
      console.error('[BankController] Error stack:', error.stack);
      console.log('========================================');
      return res.status(500).json({
        success: false,
        message: 'Lỗi khi lấy dữ liệu',
        error: error.message,
      });
    }
  };
  const getExternalBanks = async (req, res) => {
    console.log('========================================');
    console.log('[BankController] getExternalBanks function called');
    console.log('[BankController] Request IP:', req.ip);
    try {
      console.log('[BankController] 🔍 Fetching external banks...');
      const data = await bank.findExternalBanks();
      console.log('[BankController] ✅ External banks fetched:', data?.length || 0);
      console.log('========================================');
      return res.status(200).json({
        success: true,
        data,
      });
    } catch (error) {
      console.error('[BankController] ❌❌❌ ERROR IN getExternalBanks ❌❌❌');
      console.error('[BankController] Error message:', error.message);
      console.error('[BankController] Error stack:', error.stack);
      console.log('========================================');
      return res.status(500).json({
        success: false,
        message: 'Lỗi khi lấy dữ liệu',
        error: error.message,
      });
    }
  };
  const getSystemBankInfo = async (req, res) => {
    console.log('========================================');
    console.log('[BankController] getSystemBankInfo function called');
    console.log('[BankController] Request IP:', req.ip);
    try {
      const SystemBankService = require('../Services/SystemBankService');
      const systemInfo = await SystemBankService.getSystemBankInfo();
      const { bankTransaction } = require('../Models');
      const recentTransactions = await bankTransaction.findByAccountId(systemInfo.account.account_id, {
        limit: 20,
        orderBy: 'posted_at DESC'
      });
      console.log('[BankController] ✅ System bank info fetched');
      console.log('========================================');
      return res.status(200).json({
        success: true,
        data: {
          ...systemInfo,
          recentTransactions: recentTransactions || []
        },
      });
    } catch (error) {
      console.error('[BankController] ❌❌❌ ERROR IN getSystemBankInfo ❌❌❌');
      console.error('[BankController] Error message:', error.message);
      console.error('[BankController] Error stack:', error.stack);
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
    getByProviderCode,
    getInternalBanks,
    getExternalBanks,
    getSystemBankInfo,
  };
};
module.exports = createBankController();
