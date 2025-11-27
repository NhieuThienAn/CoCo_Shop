// ============================================
// IMPORT MODULES
// ============================================
// Import BaseController factory function
// BaseController cung cấp các HTTP handlers cơ bản (getAll, getById, create, update, delete, count)
const createBaseController = require('./BaseController');

// Import paymentStatus model từ Models/index.js
// paymentStatus là instance của PaymentStatus model đã được khởi tạo
const { paymentStatus } = require('../Models');

// ============================================
// PAYMENT STATUS CONTROLLER FACTORY FUNCTION
// ============================================
/**
 * Tạo PaymentStatusController với các HTTP handlers cho quản lý payment statuses
 * PaymentStatusController kế thừa tất cả handlers từ BaseController và thêm các handlers riêng
 * 
 * @returns {Object} PaymentStatusController object với các handlers:
 * - Từ BaseController: getAll, getById, create, update, delete, count
 * - Riêng PaymentStatus: getByName
 */
const createPaymentStatusController = () => {
  // Tạo baseController từ BaseController với paymentStatus model
  // baseController sẽ có các handlers cơ bản: getAll, getById, create, update, delete, count
  const baseController = createBaseController(paymentStatus);

  // ============================================
  // GET BY NAME FUNCTION: Lấy payment status theo tên
  // ============================================
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
    // ============================================
    // BƯỚC 1: Logging - Ghi log thông tin request
    // ============================================
    console.log('========================================');
    console.log('[PaymentStatusController] getByName function called');
    console.log('[PaymentStatusController] Request IP:', req.ip);
    console.log('[PaymentStatusController] Params:', req.params);
    
    try {
      // ============================================
      // BƯỚC 2: Extract name từ params
      // ============================================
      // Lấy name từ URL params
      const { name } = req.params;
      console.log('[PaymentStatusController] 🔍 Finding payment status by name:', name);
      
      // ============================================
      // BƯỚC 3: Tìm payment status theo tên
      // ============================================
      // Gọi paymentStatus.findByName để tìm status theo tên
      const data = await paymentStatus.findByName(name);

      // ============================================
      // BƯỚC 4: Kiểm tra kết quả
      // ============================================
      // Nếu không tìm thấy, trả về 404
      if (!data) {
        console.log('[PaymentStatusController] ❌ Payment status not found');
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy trạng thái thanh toán',
        });
      }

      console.log('[PaymentStatusController] ✅ Payment status found:', data.payment_status_id);
      console.log('========================================');

      // ============================================
      // BƯỚC 5: Trả về response thành công
      // ============================================
      // Trả về JSON response với status 200 (OK)
      return res.status(200).json({
        success: true,
        data,  // Payment status object
      });
    } 
    // ============================================
    // ERROR HANDLING: Xử lý lỗi
    // ============================================
    catch (error) {
      // Log lỗi chi tiết để debug
      console.error('[PaymentStatusController] ❌❌❌ ERROR IN getByName ❌❌❌');
      console.error('[PaymentStatusController] Error message:', error.message);
      console.error('[PaymentStatusController] Error stack:', error.stack);
      console.log('========================================');
      
      // Trả về error response với status 500 (Internal Server Error)
      return res.status(500).json({
        success: false,
        message: 'Lỗi khi lấy dữ liệu',
        error: error.message,
      });
    }
  };

  // ============================================
  // RETURN CONTROLLER OBJECT
  // ============================================
  // Trả về object chứa tất cả HTTP handlers
  // Spread baseController để lấy các handlers cơ bản
  // Sau đó thêm các handlers riêng của PaymentStatusController
  return {
    ...baseController,    // Spread các handlers từ BaseController (getAll, getById, create, update, delete, count)
    getByName,             // Handler riêng: Lấy payment status theo tên
  };
};

// ============================================
// EXPORT MODULE
// ============================================
// Export PaymentStatusController đã được khởi tạo (singleton pattern)
// Cách sử dụng: const paymentStatusController = require('./PaymentStatusController');
//               router.get('/name/:name', paymentStatusController.getByName);
module.exports = createPaymentStatusController();
