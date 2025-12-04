const createBaseController = require('./BaseController');
const { bankAccount } = require('../Models');
const createBankAccountController = () => {
  const baseController = createBaseController(bankAccount);
  const getByBank = async (req, res) => {
    console.log('========================================');
    console.log('[BankAccountController] getByBank function called');
    console.log('[BankAccountController] Request IP:', req.ip);
    console.log('[BankAccountController] Params:', req.params);
    try {
      const { bankId } = req.params;
      console.log('[BankAccountController] 🔍 Fetching bank accounts for bankId:', bankId);
      const data = await bankAccount.findByBankId(bankId);
      console.log('[BankAccountController] ✅ Bank accounts fetched:', data?.length || 0);
      console.log('========================================');
      return res.status(200).json({
        success: true,
        data,
      });
    } catch (error) {
      console.error('[BankAccountController] ❌❌❌ ERROR IN getByBank ❌❌❌');
      console.error('[BankAccountController] Error message:', error.message);
      console.error('[BankAccountController] Error stack:', error.stack);
      console.log('========================================');
      return res.status(500).json({
        success: false,
        message: 'Lỗi khi lấy dữ liệu',
        error: error.message,
      });
    }
  };
  const getByAccountNumber = async (req, res) => {
    console.log('========================================');
    console.log('[BankAccountController] getByAccountNumber function called');
    console.log('[BankAccountController] Request IP:', req.ip);
    console.log('[BankAccountController] Params:', req.params);
    console.log('[BankAccountController] Query:', req.query);
    try {
      const { accountNumber } = req.params;
      const { bankId } = req.query;
      console.log('[BankAccountController] 🔍 Finding bank account:', { accountNumber, bankId });
      const data = await bankAccount.findByAccountNumber(accountNumber, bankId);
      if (!data) {
        console.log('[BankAccountController] ❌ Bank account not found');
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy tài khoản',
        });
      }
      console.log('[BankAccountController] ✅ Bank account found:', data.bank_account_id);
      console.log('========================================');
      return res.status(200).json({
        success: true,
        data,
      });
    } catch (error) {
      console.error('[BankAccountController] ❌❌❌ ERROR IN getByAccountNumber ❌❌❌');
      console.error('[BankAccountController] Error message:', error.message);
      console.error('[BankAccountController] Error stack:', error.stack);
      console.log('========================================');
      return res.status(500).json({
        success: false,
        message: 'Lỗi khi lấy dữ liệu',
        error: error.message,
      });
    }
  };
  const getActiveAccounts = async (req, res) => {
    console.log('========================================');
    console.log('[BankAccountController] getActiveAccounts function called');
    console.log('[BankAccountController] Request IP:', req.ip);
    console.log('[BankAccountController] Query:', req.query);
    try {
      const { accountType } = req.query;
      console.log('[BankAccountController] 🔍 Fetching active accounts:', { accountType });
      const data = await bankAccount.findActiveAccounts(accountType);
      console.log('[BankAccountController] ✅ Active accounts fetched:', data?.length || 0);
      console.log('========================================');
      return res.status(200).json({
        success: true,
        data,
      });
    } catch (error) {
      console.error('[BankAccountController] ❌❌❌ ERROR IN getActiveAccounts ❌❌❌');
      console.error('[BankAccountController] Error message:', error.message);
      console.error('[BankAccountController] Error stack:', error.stack);
      console.log('========================================');
      return res.status(500).json({
        success: false,
        message: 'Lỗi khi lấy dữ liệu',
        error: error.message,
      });
    }
  };
  const updateBalance = async (req, res) => {
    console.log('========================================');
    console.log('[BankAccountController] updateBalance function called');
    console.log('[BankAccountController] Request IP:', req.ip);
    console.log('[BankAccountController] Params:', req.params);
    console.log('[BankAccountController] Request body:', JSON.stringify(req.body, null, 2));
    try {
      const { id } = req.params;
      const { amount, type = 'credit' } = req.body;
      console.log('[BankAccountController] Updating balance:', { accountId: id, amount, type });
      if (amount === undefined) {
        console.log('[BankAccountController] ❌ Validation failed: Missing amount');
        return res.status(400).json({
          success: false,
          message: 'Vui lòng cung cấp số tiền',
        });
      }
      console.log('[BankAccountController] 💰 Updating account balance...');
      await bankAccount.updateBalance(id, parseFloat(amount), type);
      const updated = await bankAccount.findById(id);
      console.log('[BankAccountController] ✅✅✅ BALANCE UPDATED SUCCESSFULLY ✅✅✅');
      console.log('[BankAccountController] New balance:', updated?.balance);
      console.log('========================================');
      return res.status(200).json({
        success: true,
        message: 'Cập nhật số dư thành công',
        data: updated,
      });
    } catch (error) {
      console.error('[BankAccountController] ❌❌❌ ERROR IN updateBalance ❌❌❌');
      console.error('[BankAccountController] Error message:', error.message);
      console.error('[BankAccountController] Error stack:', error.stack);
      console.log('========================================');
      return res.status(400).json({
        success: false,
        message: 'Lỗi khi cập nhật số dư',
        error: error.message,
      });
    }
  };
  return {
    ...baseController,
    getByBank,
    getByAccountNumber,
    getActiveAccounts,
    updateBalance,
  };
};
module.exports = createBankAccountController();
