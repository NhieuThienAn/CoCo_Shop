const createBaseController = require('./BaseController');
const { paymentStatus } = require('../Models');
/**
 * Tạo PaymentStatusController với các HTTP handlers cho quản lý payment statuses
 * PaymentStatusController kế thừa tất cả handlers từ BaseController và thêm các handlers riêng
 * 
 * @returns {Object} PaymentStatusController object với các handlers:
 * - Từ BaseController: getAll, getById, create, update, delete, count
 * - Riêng PaymentStatus: getByName
 */

const createPaymentStatusController = () => {
  const baseController = createBaseController(paymentStatus);
  /**
   * HTTP Handler: GET /payment-statuses/name/:name
   * Lấy payment status theo tên (ví dụ: 'Pending', 'Paid', 'Failed')
   * 
   * URL Params:
   * - name: Tên của payment status (bắt buộc)
   * 
   * Response:
   * - 200: Success { success: true, data: {...} }
   * - 404: Not Found (không tìm thấy payment status)
   * - 500: Server Error
   * 
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Promise<void>} JSON response
   */

  const getByName = async (req, res) => {
    console.log('========================================');
    console.log('[PaymentStatusController] getByName function called');
    console.log('[PaymentStatusController] Request IP:', req.ip);
    console.log('[PaymentStatusController] Params:', req.params);
    try {
      const { name } = req.params;
      console.log('[PaymentStatusController] 🔍 Finding payment status by name:', name);
      const data = await paymentStatus.findByName(name);
      if (!data) {
        console.log('[PaymentStatusController] ❌ Payment status not found');
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy trạng thái thanh toán',
        });
      }
      console.log('[PaymentStatusController] ✅ Payment status found:', data.payment_status_id);
      console.log('========================================');
      return res.status(200).json({
        success: true,
        data,  
      });
    } 
    catch (error) {
      console.error('[PaymentStatusController] ❌❌❌ ERROR IN getByName ❌❌❌');
      console.error('[PaymentStatusController] Error message:', error.message);
      console.error('[PaymentStatusController] Error stack:', error.stack);
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
    getByName,             
  };
};
module.exports = createPaymentStatusController();
