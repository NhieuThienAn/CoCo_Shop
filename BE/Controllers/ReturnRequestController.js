const createBaseController = require('./BaseController');
const { returnRequest } = require('../Models');
const createReturnRequestController = () => {
  const baseController = createBaseController(returnRequest);
  const getByOrder = async (req, res) => {
    console.log('========================================');
    console.log('[ReturnRequestController] getByOrder function called');
    console.log('[ReturnRequestController] Request IP:', req.ip);
    console.log('[ReturnRequestController] Params:', req.params);
    try {
      const { orderId } = req.params;
      console.log('[ReturnRequestController] 🔍 Fetching return requests for orderId:', orderId);
      const data = await returnRequest.findByOrderId(orderId);
      console.log('[ReturnRequestController] ✅ Return requests fetched:', data?.length || 0);
      console.log('========================================');
      return res.status(200).json({
        success: true,
        data,
      });
    } catch (error) {
      console.error('[ReturnRequestController] ❌❌❌ ERROR IN getByOrder ❌❌❌');
      console.error('[ReturnRequestController] Error message:', error.message);
      console.error('[ReturnRequestController] Error stack:', error.stack);
      console.log('========================================');
      return res.status(500).json({
        success: false,
        message: 'Lỗi khi lấy dữ liệu',
        error: error.message,
      });
    }
  };
  const getByUser = async (req, res) => {
    console.log('========================================');
    console.log('[ReturnRequestController] getByUser function called');
    console.log('[ReturnRequestController] Request IP:', req.ip);
    console.log('[ReturnRequestController] Params:', req.params);
    try {
      const { userId } = req.params;
      console.log('[ReturnRequestController] 🔍 Fetching return requests for userId:', userId);
      const data = await returnRequest.findByUserId(userId);
      console.log('[ReturnRequestController] ✅ Return requests fetched:', data?.length || 0);
      console.log('========================================');
      return res.status(200).json({
        success: true,
        data,
      });
    } catch (error) {
      console.error('[ReturnRequestController] ❌❌❌ ERROR IN getByUser ❌❌❌');
      console.error('[ReturnRequestController] Error message:', error.message);
      console.error('[ReturnRequestController] Error stack:', error.stack);
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
    console.log('[ReturnRequestController] getByStatus function called');
    console.log('[ReturnRequestController] Request IP:', req.ip);
    console.log('[ReturnRequestController] Params:', req.params);
    try {
      const { status } = req.params;
      console.log('[ReturnRequestController] 🔍 Fetching return requests by status:', status);
      const data = await returnRequest.findByStatus(status);
      console.log('[ReturnRequestController] ✅ Return requests fetched:', data?.length || 0);
      console.log('========================================');
      return res.status(200).json({
        success: true,
        data,
      });
    } catch (error) {
      console.error('[ReturnRequestController] ❌❌❌ ERROR IN getByStatus ❌❌❌');
      console.error('[ReturnRequestController] Error message:', error.message);
      console.error('[ReturnRequestController] Error stack:', error.stack);
      console.log('========================================');
      return res.status(500).json({
        success: false,
        message: 'Lỗi khi lấy dữ liệu',
        error: error.message,
      });
    }
  };
  const processReturn = async (req, res) => {
    console.log('========================================');
    console.log('[ReturnRequestController] processReturn function called');
    console.log('[ReturnRequestController] Request IP:', req.ip);
    console.log('[ReturnRequestController] Params:', req.params);
    console.log('[ReturnRequestController] Request body:', JSON.stringify(req.body, null, 2));
    try {
      const { id } = req.params;
      const { processedBy, status } = req.body;
      console.log('[ReturnRequestController] Processing return request:', {
        returnRequestId: id,
        processedBy,
        status
      });
      if (!processedBy || !status) {
        console.log('[ReturnRequestController] ❌ Validation failed: Missing required fields');
        return res.status(400).json({
          success: false,
          message: 'Vui lòng cung cấp đầy đủ thông tin',
        });
      }
      console.log('[ReturnRequestController] 🔄 Processing return request...');
      await returnRequest.processReturn(id, processedBy, status);
      const updated = await returnRequest.findById(id);
      console.log('[ReturnRequestController] ✅✅✅ RETURN REQUEST PROCESSED SUCCESSFULLY ✅✅✅');
      console.log('[ReturnRequestController] Updated status:', updated?.status);
      console.log('========================================');
      return res.status(200).json({
        success: true,
        message: 'Xử lý yêu cầu trả hàng thành công',
        data: updated,
      });
    } catch (error) {
      console.error('[ReturnRequestController] ❌❌❌ ERROR IN processReturn ❌❌❌');
      console.error('[ReturnRequestController] Error message:', error.message);
      console.error('[ReturnRequestController] Error stack:', error.stack);
      console.log('========================================');
      return res.status(400).json({
        success: false,
        message: 'Lỗi khi xử lý',
        error: error.message,
      });
    }
  };
  return {
    ...baseController,
    getByOrder,
    getByUser,
    getByStatus,
    processReturn,
  };
};
module.exports = createReturnRequestController();
