const createBaseController = require('./BaseController');
const { orderItem } = require('../Models');
/**
 * Tạo OrderItemController với các HTTP handlers cho quản lý order items
 * OrderItemController kế thừa tất cả handlers từ BaseController và thêm các handlers riêng
 * 
 * @returns {Object} OrderItemController object với các handlers:
 * - Từ BaseController: getAll, getById, create, update, delete, count
 * - Riêng OrderItem: getByOrder, getByProduct
 */

const createOrderItemController = () => {
  const baseController = createBaseController(orderItem);
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
    console.log('========================================');
    console.log('[OrderItemController] getByOrder function called');
    console.log('[OrderItemController] Request IP:', req.ip);
    console.log('[OrderItemController] Params:', req.params);
    try {
      const { orderId } = req.params;
      const { includeDetails = 'false' } = req.query;
      console.log('[OrderItemController] 🔍 Fetching order items for orderId:', orderId);
      console.log('[OrderItemController] Include details:', includeDetails === 'true');
      const data = includeDetails === 'true' 
        ? await orderItem.findByOrderIdWithDetails(orderId)
        : await orderItem.findByOrderId(orderId);
      console.log('[OrderItemController] ✅ Order items fetched:', data?.length || 0);
      console.log('========================================');
      return res.status(200).json({
        success: true,
        data,  
      });
    } 
    catch (error) {
      console.error('[OrderItemController] ❌❌❌ ERROR IN getByOrder ❌❌❌');
      console.error('[OrderItemController] Error message:', error.message);
      console.error('[OrderItemController] Error stack:', error.stack);
      console.log('========================================');
      return res.status(500).json({
        success: false,
        message: 'Lỗi khi lấy dữ liệu',
        error: error.message,
      });
    }
  };
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
    console.log('========================================');
    console.log('[OrderItemController] getByProduct function called');
    console.log('[OrderItemController] Request IP:', req.ip);
    console.log('[OrderItemController] Params:', req.params);
    try {
      const { productId } = req.params;
      const { includeDetails = 'false' } = req.query;
      console.log('[OrderItemController] 🔍 Fetching order items for productId:', productId);
      console.log('[OrderItemController] Include details:', includeDetails === 'true');
      const data = includeDetails === 'true'
        ? await orderItem.findByProductIdWithDetails(productId)
        : await orderItem.findByProductId(productId);
      console.log('[OrderItemController] ✅ Order items fetched:', data?.length || 0);
      console.log('========================================');
      return res.status(200).json({
        success: true,
        data,  
      });
    } 
    catch (error) {
      console.error('[OrderItemController] ❌❌❌ ERROR IN getByProduct ❌❌❌');
      console.error('[OrderItemController] Error message:', error.message);
      console.error('[OrderItemController] Error stack:', error.stack);
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
    getByOrder,         
    getByProduct,       
  };
};
module.exports = createOrderItemController();
