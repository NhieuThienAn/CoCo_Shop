// ============================================
// IMPORT MODULES
// ============================================
// Import BaseController factory function
// BaseController cung cấp các HTTP handlers cơ bản (getAll, getById, create, update, delete, count)
const createBaseController = require('./BaseController');

// Import orderItem model từ Models/index.js
// orderItem là instance của OrderItem model đã được khởi tạo
const { orderItem } = require('../Models');

// ============================================
// ORDER ITEM CONTROLLER FACTORY FUNCTION
// ============================================
/**
 * Tạo OrderItemController với các HTTP handlers cho quản lý order items
 * OrderItemController kế thừa tất cả handlers từ BaseController và thêm các handlers riêng
 * 
 * @returns {Object} OrderItemController object với các handlers:
 * - Từ BaseController: getAll, getById, create, update, delete, count
 * - Riêng OrderItem: getByOrder, getByProduct
 */
const createOrderItemController = () => {
  // Tạo baseController từ BaseController với orderItem model
  // baseController sẽ có các handlers cơ bản: getAll, getById, create, update, delete, count
  const baseController = createBaseController(orderItem);

  // ============================================
  // GET BY ORDER FUNCTION: Lấy order items theo order ID
  // ============================================
  /**
   * HTTP Handler: GET /order-items/order/:orderId
   * Lấy danh sách order items theo order ID
   * 
   * URL Params:
   * - orderId: ID của order (bắt buộc)
   * 
   * Query Parameters:
   * - includeDetails: true/false - Có bao gồm product và order details không (mặc định: false)
   *   - true: Sử dụng SQL JOIN để lấy thêm thông tin product và order (1 query)
   *   - false: Chỉ lấy order items (nhanh hơn)
   * 
   * Response:
   * - 200: Success { success: true, data: [...] }
   * - 500: Server Error
   * 
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Promise<void>} JSON response
   */
  const getByOrder = async (req, res) => {
    // ============================================
    // BƯỚC 1: Logging - Ghi log thông tin request
    // ============================================
    console.log('========================================');
    console.log('[OrderItemController] getByOrder function called');
    console.log('[OrderItemController] Request IP:', req.ip);
    console.log('[OrderItemController] Params:', req.params);
    
    try {
      // ============================================
      // BƯỚC 2: Extract data từ request
      // ============================================
      // Lấy orderId từ URL params
      const { orderId } = req.params;
      
      // Lấy includeDetails từ query params (mặc định: 'false')
      // includeDetails: Có bao gồm product và order details không
      // - 'true': Sử dụng SQL JOIN để lấy thêm thông tin (1 query)
      // - 'false': Chỉ lấy order items (nhanh hơn)
      const { includeDetails = 'false' } = req.query;
      
      console.log('[OrderItemController] 🔍 Fetching order items for orderId:', orderId);
      console.log('[OrderItemController] Include details:', includeDetails === 'true');
      
      // ============================================
      // BƯỚC 3: Fetch order items từ database
      // ============================================
      // Sử dụng SQL JOIN query để fetch order items với product và order details trong 1 query
      // Tối ưu hơn so với fetch riêng từng phần (tránh N+1 problem)
      const data = includeDetails === 'true' 
        ? await orderItem.findByOrderIdWithDetails(orderId)  // Với JOIN (có thêm product và order info)
        : await orderItem.findByOrderId(orderId);             // Không JOIN (chỉ order items)
      
      console.log('[OrderItemController] ✅ Order items fetched:', data?.length || 0);
      console.log('========================================');

      // ============================================
      // BƯỚC 4: Trả về response thành công
      // ============================================
      // Trả về JSON response với status 200 (OK)
      return res.status(200).json({
        success: true,
        data,  // Mảng các order items
      });
    } 
    // ============================================
    // ERROR HANDLING: Xử lý lỗi
    // ============================================
    catch (error) {
      // Log lỗi chi tiết để debug
      console.error('[OrderItemController] ❌❌❌ ERROR IN getByOrder ❌❌❌');
      console.error('[OrderItemController] Error message:', error.message);
      console.error('[OrderItemController] Error stack:', error.stack);
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
  // GET BY PRODUCT FUNCTION: Lấy order items theo product ID
  // ============================================
  /**
   * HTTP Handler: GET /order-items/product/:productId
   * Lấy danh sách order items theo product ID
   * 
   * URL Params:
   * - productId: ID của product (bắt buộc)
   * 
   * Query Parameters:
   * - includeDetails: true/false - Có bao gồm product và order details không (mặc định: false)
   *   - true: Sử dụng SQL JOIN để lấy thêm thông tin product và order (1 query)
   *   - false: Chỉ lấy order items (nhanh hơn)
   * 
   * Response:
   * - 200: Success { success: true, data: [...] }
   * - 500: Server Error
   * 
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Promise<void>} JSON response
   */
  const getByProduct = async (req, res) => {
    // ============================================
    // BƯỚC 1: Logging - Ghi log thông tin request
    // ============================================
    console.log('========================================');
    console.log('[OrderItemController] getByProduct function called');
    console.log('[OrderItemController] Request IP:', req.ip);
    console.log('[OrderItemController] Params:', req.params);
    
    try {
      // ============================================
      // BƯỚC 2: Extract data từ request
      // ============================================
      // Lấy productId từ URL params
      const { productId } = req.params;
      
      // Lấy includeDetails từ query params (mặc định: 'false')
      const { includeDetails = 'false' } = req.query;
      
      console.log('[OrderItemController] 🔍 Fetching order items for productId:', productId);
      console.log('[OrderItemController] Include details:', includeDetails === 'true');
      
      // ============================================
      // BƯỚC 3: Fetch order items từ database
      // ============================================
      // Sử dụng SQL JOIN query để fetch order items với product và order details trong 1 query
      const data = includeDetails === 'true'
        ? await orderItem.findByProductIdWithDetails(productId)  // Với JOIN (có thêm product và order info)
        : await orderItem.findByProductId(productId);            // Không JOIN (chỉ order items)
      
      console.log('[OrderItemController] ✅ Order items fetched:', data?.length || 0);
      console.log('========================================');

      // ============================================
      // BƯỚC 4: Trả về response thành công
      // ============================================
      // Trả về JSON response với status 200 (OK)
      return res.status(200).json({
        success: true,
        data,  // Mảng các order items
      });
    } 
    // ============================================
    // ERROR HANDLING: Xử lý lỗi
    // ============================================
    catch (error) {
      // Log lỗi chi tiết để debug
      console.error('[OrderItemController] ❌❌❌ ERROR IN getByProduct ❌❌❌');
      console.error('[OrderItemController] Error message:', error.message);
      console.error('[OrderItemController] Error stack:', error.stack);
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
  // Sau đó thêm các handlers riêng của OrderItemController
  return {
    ...baseController,  // Spread các handlers từ BaseController (getAll, getById, create, update, delete, count)
    getByOrder,         // Handler riêng: Lấy order items theo order ID
    getByProduct,       // Handler riêng: Lấy order items theo product ID
  };
};

// ============================================
// EXPORT MODULE
// ============================================
// Export OrderItemController đã được khởi tạo (singleton pattern)
// Cách sử dụng: const orderItemController = require('./OrderItemController');
//               router.get('/order/:orderId', orderItemController.getByOrder);
module.exports = createOrderItemController();
