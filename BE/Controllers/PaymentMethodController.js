const createBaseController = require('./BaseController');
const { paymentMethod } = require('../Models');
/**
 * Tạo PaymentMethodController với các HTTP handlers cho quản lý payment methods
 * PaymentMethodController kế thừa tất cả handlers từ BaseController và override/thêm các handlers riêng
 * 
 * @returns {Object} PaymentMethodController object với các handlers:
 * - Từ BaseController: getAll (được override), getById, create, update, delete, count
 * - Riêng PaymentMethod: getByName
 */

const createPaymentMethodController = () => {
  const baseController = createBaseController(paymentMethod);
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
    console.log('========================================');
    console.log('[PaymentMethodController] getByName function called');
    console.log('[PaymentMethodController] Request IP:', req.ip);
    console.log('[PaymentMethodController] Params:', req.params);
    try {
      const { name } = req.params;
      console.log('[PaymentMethodController] 🔍 Finding payment method by name:', name);
      const data = await paymentMethod.findByName(name);
      if (!data) {
        console.log('[PaymentMethodController] ❌ Payment method not found');
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy phương thức thanh toán',
        });
      }
      console.log('[PaymentMethodController] ✅ Payment method found:', data.payment_method_id);
      console.log('========================================');
      return res.status(200).json({
        success: true,
        data,  
      });
    } 
    catch (error) {
      console.error('[PaymentMethodController] ❌❌❌ ERROR IN getByName ❌❌❌');
      console.error('[PaymentMethodController] Error message:', error.message);
      console.error('[PaymentMethodController] Error stack:', error.stack);
      console.log('========================================');
      return res.status(500).json({
        success: false,
        message: 'Lỗi khi lấy dữ liệu',
        error: error.message,
      });
    }
  };
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
    console.log('========================================');
    console.log('[PaymentMethodController] getAll function called (override)');
    console.log('[PaymentMethodController] Request IP:', req.ip);
    console.log('[PaymentMethodController] Request URL:', req.originalUrl);
    console.log('[PaymentMethodController] Query params:', JSON.stringify(req.query, null, 2));
    try {
      const { page = 1, limit = 10, ...filters } = req.query;
      const pageNum = Math.max(1, parseInt(page) || 1);
      const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 10));
      console.log('[PaymentMethodController] Pagination:', { pageNum, limitNum });
      console.log('[PaymentMethodController] Filters:', filters);
      const { data, total } = await paymentMethod.findAllWithCount({
        filters,                                    
        limit: limitNum,                            
        offset: (pageNum - 1) * limitNum,
        orderBy: req.query.orderBy || 'payment_method_id ASC',
      });
      console.log('[PaymentMethodController] ✅ Data fetched:', {
        count: data?.length || 0,
        total,
        pageNum,
        limitNum
      });
      console.log('========================================');
      return res.status(200).json({
        success: true,
        data,  
        pagination: {
          page: pageNum,                    
          limit: limitNum,                  
          total,                            
          pages: Math.ceil(total / limitNum),  
        },
      });
    } 
    catch (error) {
      console.error('[PaymentMethodController] ❌❌❌ ERROR IN getAll ❌❌❌');
      console.error('[PaymentMethodController] Error message:', error.message);
      console.error('[PaymentMethodController] Error stack:', error.stack);
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
    getAll,               
    getByName,            
  };
};
module.exports = createPaymentMethodController();
