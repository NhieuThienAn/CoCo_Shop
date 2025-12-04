const createBaseController = require('./BaseController');
const { bankTransferRequest } = require('../Models');
const createBankTransferRequestController = () => {
  const baseController = createBaseController(bankTransferRequest);
  const getByAccountFrom = async (req, res) => {
    console.log('========================================');
    console.log('[BankTransferRequestController] getByAccountFrom function called');
    console.log('[BankTransferRequestController] Request IP:', req.ip);
    console.log('[BankTransferRequestController] Params:', req.params);
    try {
      const { accountFromId } = req.params;
      console.log('[BankTransferRequestController] 🔍 Fetching transfer requests from accountId:', accountFromId);
      const data = await bankTransferRequest.findByAccountFrom(accountFromId);
      console.log('[BankTransferRequestController] ✅ Transfer requests fetched:', data?.length || 0);
      console.log('========================================');
      return res.status(200).json({
        success: true,
        data,
      });
    } catch (error) {
      console.error('[BankTransferRequestController] ❌❌❌ ERROR IN getByAccountFrom ❌❌❌');
      console.error('[BankTransferRequestController] Error message:', error.message);
      console.error('[BankTransferRequestController] Error stack:', error.stack);
      console.log('========================================');
      return res.status(500).json({
        success: false,
        message: 'Lỗi khi lấy dữ liệu',
        error: error.message,
      });
    }
  };
  const getByAccountTo = async (req, res) => {
    console.log('========================================');
    console.log('[BankTransferRequestController] getByAccountTo function called');
    console.log('[BankTransferRequestController] Request IP:', req.ip);
    console.log('[BankTransferRequestController] Params:', req.params);
    try {
      const { accountToId } = req.params;
      console.log('[BankTransferRequestController] 🔍 Fetching transfer requests to accountId:', accountToId);
      const data = await bankTransferRequest.findByAccountTo(accountToId);
      console.log('[BankTransferRequestController] ✅ Transfer requests fetched:', data?.length || 0);
      console.log('========================================');
      return res.status(200).json({
        success: true,
        data,
      });
    } catch (error) {
      console.error('[BankTransferRequestController] ❌❌❌ ERROR IN getByAccountTo ❌❌❌');
      console.error('[BankTransferRequestController] Error message:', error.message);
      console.error('[BankTransferRequestController] Error stack:', error.stack);
      console.log('========================================');
      return res.status(500).json({
        success: false,
        message: 'Lỗi khi lấy dữ liệu',
        error: error.message,
      });
    }
  };
  const getByStatus = async (req, res) => {
    console.log('========================================');
    console.log('[BankTransferRequestController] getByStatus function called');
    console.log('[BankTransferRequestController] Request IP:', req.ip);
    console.log('[BankTransferRequestController] Params:', req.params);
    try {
      const { status } = req.params;
      console.log('[BankTransferRequestController] 🔍 Fetching transfer requests by status:', status);
      const data = await bankTransferRequest.findByStatus(status);
      console.log('[BankTransferRequestController] ✅ Transfer requests fetched:', data?.length || 0);
      console.log('========================================');
      return res.status(200).json({
        success: true,
        data,
      });
    } catch (error) {
      console.error('[BankTransferRequestController] ❌❌❌ ERROR IN getByStatus ❌❌❌');
      console.error('[BankTransferRequestController] Error message:', error.message);
      console.error('[BankTransferRequestController] Error stack:', error.stack);
      console.log('========================================');
      return res.status(500).json({
        success: false,
        message: 'Lỗi khi lấy dữ liệu',
        error: error.message,
      });
    }
  };
  const updateStatus = async (req, res) => {
    console.log('========================================');
    console.log('[BankTransferRequestController] updateStatus function called');
    console.log('[BankTransferRequestController] Request IP:', req.ip);
    console.log('[BankTransferRequestController] Params:', req.params);
    console.log('[BankTransferRequestController] Request body:', JSON.stringify(req.body, null, 2));
    try {
      const { id } = req.params;
      const { status, processedAt } = req.body;
      console.log('[BankTransferRequestController] Updating transfer request status:', {
        transferRequestId: id,
        status,
        processedAt
      });
      if (!status) {
        console.log('[BankTransferRequestController] ❌ Validation failed: Missing status');
        return res.status(400).json({
          success: false,
          message: 'Vui lòng cung cấp trạng thái',
        });
      }
      console.log('[BankTransferRequestController] 🔄 Updating status...');
      await bankTransferRequest.updateStatus(id, status, processedAt);
      const updated = await bankTransferRequest.findById(id);
      console.log('[BankTransferRequestController] ✅✅✅ STATUS UPDATED SUCCESSFULLY ✅✅✅');
      console.log('[BankTransferRequestController] Updated status:', updated?.status);
      console.log('========================================');
      return res.status(200).json({
        success: true,
        message: 'Cập nhật trạng thái thành công',
        data: updated,
      });
    } catch (error) {
      console.error('[BankTransferRequestController] ❌❌❌ ERROR IN updateStatus ❌❌❌');
      console.error('[BankTransferRequestController] Error message:', error.message);
      console.error('[BankTransferRequestController] Error stack:', error.stack);
      console.log('========================================');
      return res.status(400).json({
        success: false,
        message: 'Lỗi khi cập nhật',
        error: error.message,
      });
    }
  };
  return {
    ...baseController,
    getByAccountFrom,
    getByAccountTo,
    getByStatus,
    updateStatus,
  };
};
module.exports = createBankTransferRequestController();
