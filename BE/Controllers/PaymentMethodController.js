// ============================================
// IMPORT MODULES
// ============================================
// Import BaseController factory function
// BaseController cung cấp các HTTP handlers cơ bản (getAll, getById, create, update, delete, count)
const createBaseController = require('./BaseController');

// Import paymentMethod model từ Models/index.js
// paymentMethod là instance của PaymentMethod model đã được khởi tạo
const { paymentMethod } = require('../Models');

// ============================================
// PAYMENT METHOD CONTROLLER FACTORY FUNCTION
// ============================================
/**
 * Tạo PaymentMethodController với các HTTP handlers cho quản lý payment methods
 * PaymentMethodController kế thừa tất cả handlers từ BaseController và override/thêm các handlers riêng
 * 
 * @returns {Object} PaymentMethodController object với các handlers:
 * - Từ BaseController: getAll (được override), getById, create, update, delete, count
 * - Riêng PaymentMethod: getByName
 */
const createPaymentMethodController = () => {
  // Tạo baseController từ BaseController với paymentMethod model
  // baseController sẽ có các handlers cơ bản: getAll, getById, create, update, delete, count
  const baseController = createBaseController(paymentMethod);

  // ============================================
  // GET BY NAME FUNCTION: Lấy payment method theo tên
  // ============================================
  /**
   * HTTP Handler: GET /payment-methods/name/:name
   * Lấy payment method theo tên (ví dụ: 'COD', 'MoMo', 'Bank Transfer')
   * 
   * URL Params:
   * - name: Tên của payment method (bắt buộc)
   * 
   * Response:
   * - 200: Success { success: true, data: {...} }
   * - 404: Not Found (không tìm thấy payment method)
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
    console.log('[PaymentMethodController] getByName function called');
    console.log('[PaymentMethodController] Request IP:', req.ip);
    console.log('[PaymentMethodController] Params:', req.params);
    
    try {
      // ============================================
      // BƯỚC 2: Extract name từ params
      // ============================================
      // Lấy name từ URL params
      const { name } = req.params;
      console.log('[PaymentMethodController] 🔍 Finding payment method by name:', name);
      
      // ============================================
      // BƯỚC 3: Tìm payment method theo tên
      // ============================================
      // Gọi paymentMethod.findByName để tìm method theo tên
      const data = await paymentMethod.findByName(name);

      // ============================================
      // BƯỚC 4: Kiểm tra kết quả
      // ============================================
      // Nếu không tìm thấy, trả về 404
      if (!data) {
        console.log('[PaymentMethodController] ❌ Payment method not found');
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy phương thức thanh toán',
        });
      }

      console.log('[PaymentMethodController] ✅ Payment method found:', data.payment_method_id);
      console.log('========================================');

      // ============================================
      // BƯỚC 5: Trả về response thành công
      // ============================================
      // Trả về JSON response với status 200 (OK)
      return res.status(200).json({
        success: true,
        data,  // Payment method object
      });
    } 
    // ============================================
    // ERROR HANDLING: Xử lý lỗi
    // ============================================
    catch (error) {
      // Log lỗi chi tiết để debug
      console.error('[PaymentMethodController] ❌❌❌ ERROR IN getByName ❌❌❌');
      console.error('[PaymentMethodController] Error message:', error.message);
      console.error('[PaymentMethodController] Error stack:', error.stack);
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
  // GET ALL FUNCTION: Override getAll từ BaseController
  // ============================================
  /**
   * HTTP Handler: GET /payment-methods
   * Override getAll từ BaseController để sử dụng orderBy phù hợp (không có created_at)
   * 
   * Query Parameters:
   * - page: Số trang (mặc định: 1)
   * - limit: Số lượng items mỗi trang (mặc định: 10, tối đa: 100)
   * - orderBy: Thứ tự sắp xếp (mặc định: 'payment_method_id ASC')
   * - ...filters: Các filters khác (sẽ được truyền vào findAllWithCount)
   * 
   * Response:
   * - 200: Success { success: true, data: [...], pagination: {...} }
   * - 500: Server Error
   * 
   * Đặc biệt:
   * - Sử dụng single SQL query với window function COUNT(*) OVER() để lấy data và total count
   * - Thay thế Promise.all với 2 queries riêng biệt (findAll + count)
   * - OrderBy mặc định: 'payment_method_id ASC' (vì không có created_at)
   * 
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Promise<void>} JSON response
   */
  const getAll = async (req, res) => {
    // ============================================
    // BƯỚC 1: Logging - Ghi log thông tin request
    // ============================================
    console.log('========================================');
    console.log('[PaymentMethodController] getAll function called (override)');
    console.log('[PaymentMethodController] Request IP:', req.ip);
    console.log('[PaymentMethodController] Request URL:', req.originalUrl);
    console.log('[PaymentMethodController] Query params:', JSON.stringify(req.query, null, 2));
    
    try {
      // ============================================
      // BƯỚC 2: Extract và parse query parameters
      // ============================================
      // Destructure page, limit và các filters khác từ req.query
      const { page = 1, limit = 10, ...filters } = req.query;
      
      // Parse và validate page: đảm bảo >= 1
      const pageNum = Math.max(1, parseInt(page) || 1);
      
      // Parse và validate limit: đảm bảo >= 1 và <= 100
      const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 10));

      console.log('[PaymentMethodController] Pagination:', { pageNum, limitNum });
      console.log('[PaymentMethodController] Filters:', filters);

      // ============================================
      // BƯỚC 3: Fetch data với pagination và filters
      // ============================================
      // Sử dụng single SQL query với window function COUNT(*) OVER() để lấy data và total count
      // Thay thế Promise.all với 2 queries riêng biệt (findAll + count)
      const { data, total } = await paymentMethod.findAllWithCount({
        filters,                                    // Các filters từ query params
        limit: limitNum,                            // Số lượng items mỗi trang
        offset: (pageNum - 1) * limitNum,          // Offset = (page - 1) * limit
        orderBy: req.query.orderBy || 'payment_method_id ASC',  // OrderBy mặc định (vì không có created_at)
      });

      console.log('[PaymentMethodController] ✅ Data fetched:', {
        count: data?.length || 0,
        total,
        pageNum,
        limitNum
      });
      console.log('========================================');

      // ============================================
      // BƯỚC 4: Trả về response thành công với pagination
      // ============================================
      // Trả về JSON response với status 200 (OK)
      return res.status(200).json({
        success: true,
        data,  // Mảng các payment methods
        pagination: {
          page: pageNum,                    // Trang hiện tại
          limit: limitNum,                  // Số lượng items mỗi trang
          total,                            // Tổng số items
          pages: Math.ceil(total / limitNum),  // Tổng số trang
        },
      });
    } 
    // ============================================
    // ERROR HANDLING: Xử lý lỗi
    // ============================================
    catch (error) {
      // Log lỗi chi tiết để debug
      console.error('[PaymentMethodController] ❌❌❌ ERROR IN getAll ❌❌❌');
      console.error('[PaymentMethodController] Error message:', error.message);
      console.error('[PaymentMethodController] Error stack:', error.stack);
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
  // Sau đó override/thêm các handlers riêng của PaymentMethodController
  return {
    ...baseController,    // Spread các handlers từ BaseController (getAll được override, getById, create, update, delete, count)
    getAll,               // Override getAll: Lấy tất cả payment methods với pagination và orderBy phù hợp
    getByName,            // Handler riêng: Lấy payment method theo tên
  };
};

// ============================================
// EXPORT MODULE
// ============================================
// Export PaymentMethodController đã được khởi tạo (singleton pattern)
// Cách sử dụng: const paymentMethodController = require('./PaymentMethodController');
//               router.get('/name/:name', paymentMethodController.getByName);
module.exports = createPaymentMethodController();
