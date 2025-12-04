const createBaseController = require('./BaseController');
const { shipment } = require('../Models');
/**
 * Tạo ShipmentController với các HTTP handlers cho quản lý shipments
 * ShipmentController kế thừa tất cả handlers từ BaseController và thêm các handlers riêng
 * 
 * @returns {Object} ShipmentController object với các handlers:
 * - Từ BaseController: getAll, getById, create, update, delete, count
 * - Riêng Shipment: getByOrder, acceptOrder, getByShipper
 */

const createShipmentController = () => {
  const baseController = createBaseController(shipment);
  /**
   * HTTP Handler: GET /shipments/order/:orderId
   * Lấy danh sách shipments theo order ID
   * 
   * URL Params:
   * - orderId: ID của order (bắt buộc)
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
    console.log('[ShipmentController] getByOrder function called');
    console.log('[ShipmentController] Request IP:', req.ip);
    console.log('[ShipmentController] Params:', req.params);
    try {
      const { orderId } = req.params;
      console.log('[ShipmentController] 🔍 Fetching shipments for orderId:', orderId);
      const data = await shipment.findAll({
        filters: { order_id: orderId },
      });
      console.log('[ShipmentController] ✅ Shipments fetched:', data?.length || 0);
      console.log('========================================');
      return res.status(200).json({
        success: true,
        data,  
      });
    } 
    catch (error) {
      console.error('[ShipmentController] ❌❌❌ ERROR IN getByOrder ❌❌❌');
      console.error('[ShipmentController] Error message:', error.message);
      console.error('[ShipmentController] Error stack:', error.stack);
      console.log('========================================');
      return res.status(500).json({
        success: false,
        message: 'Lỗi khi lấy dữ liệu',
        error: error.message,
      });
    }
  };
  /**
   * HTTP Handler: POST /shipments/accept
   * Shipper accept order - Tạo shipment cho shipper
   * 
   * Cho phép shipper (role 2) tạo shipment để nhận đơn hàng
   * 
   * Request Body:
   * - orderId: ID của order (bắt buộc)
   * 
   * Response:
   * - 201: Created { success: true, message: "...", data: {...} }
   * - 400: Bad Request (thiếu orderId, đã có shipper nhận, order không ở CONFIRMED)
   * - 401: Unauthorized (chưa đăng nhập)
   * - 404: Not Found (không tìm thấy order)
   * - 500: Server Error
   * 
   * Quy trình:
   * 1. Kiểm tra authentication
   * 2. Validate orderId
   * 3. Tìm hoặc tạo shipper từ user_id
   * 4. Kiểm tra đã có shipper nhận đơn hàng này chưa
   * 5. Kiểm tra order status phải là CONFIRMED (status_id = 2)
   * 6. Tạo shipment với status 'pending'
   * 
   * Đặc biệt:
   * - Tự động tìm hoặc tạo shipper từ user_id
   * - Chỉ cho phép 1 shipper nhận 1 order
   * - Order status vẫn giữ ở CONFIRMED (shipper sẽ update thủ công sau)
   * 
   * @param {Object} req - Express request object (có req.user từ JWT middleware)
   * @param {Object} res - Express response object
   * @returns {Promise<void>} JSON response
   */

  const acceptOrder = async (req, res) => {
    console.log('========================================');
    console.log('[ShipmentController] acceptOrder function called');
    console.log('[ShipmentController] Request IP:', req.ip);
    console.log('[ShipmentController] User:', req.user);
    console.log('[ShipmentController] Body:', req.body);
    try {
      if (!req.user || !req.user.userId) {
        return res.status(401).json({
          success: false,
          message: 'Vui lòng đăng nhập',
        });
      }
      const { orderId } = req.body;
      if (!orderId) {
        return res.status(400).json({
          success: false,
          message: 'orderId là bắt buộc',
        });
      }
      const userId = req.user.userId;
      const db = require('../Config/database').getDatabase();
      let shipperId = null;
      try {
        const userData = await require('../Models').user.findById(userId);
        if (userData) {
          const { shipper } = require('../Models');
          const shipperData = await shipper.findFirstByName(userData.username || userData.email || '');
          if (shipperData) {
            shipperId = shipperData.shipper_id;
          } else {
            const [insertResult] = await db.execute(
              'INSERT INTO `shippers` (`name`, `contact_info`) VALUES (?, ?)',
              [
                userData.username || userData.email || `Shipper ${userId}`,  
                JSON.stringify({ user_id: userId })
              ]
            );
            if (insertResult && insertResult.insertId) {
              shipperId = insertResult.insertId;
            }
          }
        }
      } catch (shipperError) {
        console.error('[ShipmentController] Error finding/creating shipper:', shipperError);
        shipperId = userId;
      }
      if (!shipperId) {
        return res.status(400).json({
          success: false,
          message: 'Không tìm thấy thông tin shipper. Vui lòng liên hệ admin.',
        });
      }
      const hasShipper = await shipment.hasShipperForOrder(orderId);
      if (hasShipper) {
        return res.status(400).json({
          success: false,
          message: 'Đơn hàng này đã được shipper khác nhận',
        });
      }
      const { order } = require('../Models');
      const orderData = await order.findById(orderId);
      if (!orderData) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy đơn hàng',
        });
      }
      if (orderData.status_id !== 2) {
        return res.status(400).json({
          success: false,
          message: 'Chỉ có thể nhận đơn hàng ở trạng thái Đã Xác Nhận',
        });
      }
      const shipmentData = {
        order_id: orderId,           
        shipper_id: shipperId,       
        shipment_status: 'pending',
      };
      console.log('[ShipmentController] 📦 Creating shipment:', shipmentData);
      const result = await shipment.create(shipmentData);
      if (result && result.insertId) {
        const newShipment = await shipment.findById(result.insertId);
        console.log('[ShipmentController] ✅ Shipment created:', newShipment.shipment_id);
        console.log('[ShipmentController] ℹ️ Order status remains CONFIRMED. Shipper will update to SHIPPING manually.');
        console.log('========================================');
        return res.status(201).json({
          success: true,
          message: 'Nhận đơn hàng thành công. Vui lòng cập nhật trạng thái "Đang giao hàng" khi bắt đầu giao.',
          data: newShipment,  
        });
      } else {
        throw new Error('Không thể tạo shipment');
      }
    } 
    catch (error) {
      console.error('[ShipmentController] ❌❌❌ ERROR IN acceptOrder ❌❌❌');
      console.error('[ShipmentController] Error message:', error.message);
      console.error('[ShipmentController] Error stack:', error.stack);
      console.log('========================================');
      return res.status(500).json({
        success: false,
        message: 'Lỗi khi nhận đơn hàng',
        error: error.message,
      });
    }
  };
  /**
   * HTTP Handler: GET /shipments/my-shipments
   * Get shipments by shipper (cho shipper xem các đơn hàng của họ)
   * 
   * Response:
   * - 200: Success { success: true, data: [...] }
   * - 401: Unauthorized (chưa đăng nhập)
   * - 500: Server Error
   * 
   * Đặc biệt:
   * - Tự động lấy userId từ JWT token (req.user.userId)
   * - Tự động tìm shipper_id từ user_id
   * - Trả về empty array nếu không tìm thấy shipper
   * 
   * @param {Object} req - Express request object (có req.user từ JWT middleware)
   * @param {Object} res - Express response object
   * @returns {Promise<void>} JSON response
   */

  const getByShipper = async (req, res) => {
    console.log('========================================');
    console.log('[ShipmentController] getByShipper function called');
    console.log('[ShipmentController] Request IP:', req.ip);
    console.log('[ShipmentController] User:', req.user);
    try {
      if (!req.user || !req.user.userId) {
        return res.status(401).json({
          success: false,
          message: 'Vui lòng đăng nhập',
        });
      }
      const userId = req.user.userId;
      const db = require('../Config/database').getDatabase();
      let shipperId = null;
      try {
        const userData = await require('../Models').user.findById(userId);
        if (userData) {
          const { shipper } = require('../Models');
          const shipperData = await shipper.findFirstByName(userData.username || userData.email || '');
          if (shipperData) {
            shipperId = shipperData.shipper_id;
          }
        }
      } catch (shipperError) {
        console.error('[ShipmentController] Error finding shipper:', shipperError);
      }
      if (!shipperId) {
        return res.status(200).json({
          success: true,
          data: [],  
          message: 'Chưa có đơn hàng nào',
        });
      }
      const data = await shipment.findByShipperId(shipperId);
      console.log('[ShipmentController] ✅ Shipments fetched:', data?.length || 0);
      console.log('========================================');
      return res.status(200).json({
        success: true,
        data,  
      });
    } 
    catch (error) {
      console.error('[ShipmentController] ❌❌❌ ERROR IN getByShipper ❌❌❌');
      console.error('[ShipmentController] Error message:', error.message);
      console.error('[ShipmentController] Error stack:', error.stack);
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
    acceptOrder,          
    getByShipper,         
  };
};
module.exports = createShipmentController();
