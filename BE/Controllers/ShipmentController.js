// ============================================
// IMPORT MODULES
// ============================================
// Import BaseController factory function
// BaseController cung cấp các HTTP handlers cơ bản (getAll, getById, create, update, delete, count)
const createBaseController = require('./BaseController');

// Import shipment model từ Models/index.js
// shipment là instance của Shipment model đã được khởi tạo
const { shipment } = require('../Models');

// ============================================
// SHIPMENT CONTROLLER FACTORY FUNCTION
// ============================================
/**
 * Tạo ShipmentController với các HTTP handlers cho quản lý shipments
 * ShipmentController kế thừa tất cả handlers từ BaseController và thêm các handlers riêng
 * 
 * @returns {Object} ShipmentController object với các handlers:
 * - Từ BaseController: getAll, getById, create, update, delete, count
 * - Riêng Shipment: getByOrder, acceptOrder, getByShipper
 */
const createShipmentController = () => {
  // Tạo baseController từ BaseController với shipment model
  // baseController sẽ có các handlers cơ bản: getAll, getById, create, update, delete, count
  const baseController = createBaseController(shipment);

  // ============================================
  // GET BY ORDER FUNCTION: Lấy shipments theo order ID
  // ============================================
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
    // ============================================
    // BƯỚC 1: Logging - Ghi log thông tin request
    // ============================================
    console.log('========================================');
    console.log('[ShipmentController] getByOrder function called');
    console.log('[ShipmentController] Request IP:', req.ip);
    console.log('[ShipmentController] Params:', req.params);
    
    try {
      // ============================================
      // BƯỚC 2: Extract orderId từ params
      // ============================================
      // Lấy orderId từ URL params
      const { orderId } = req.params;
      console.log('[ShipmentController] 🔍 Fetching shipments for orderId:', orderId);
      
      // ============================================
      // BƯỚC 3: Fetch shipments từ database
      // ============================================
      // Gọi shipment.findAll với filter order_id = orderId
      // Tìm tất cả shipments của order này
      const data = await shipment.findAll({
        filters: { order_id: orderId },  // Filter theo order_id
      });

      console.log('[ShipmentController] ✅ Shipments fetched:', data?.length || 0);
      console.log('========================================');

      // ============================================
      // BƯỚC 4: Trả về response thành công
      // ============================================
      // Trả về JSON response với status 200 (OK)
      return res.status(200).json({
        success: true,
        data,  // Mảng các shipments
      });
    } 
    // ============================================
    // ERROR HANDLING: Xử lý lỗi
    // ============================================
    catch (error) {
      // Log lỗi chi tiết để debug
      console.error('[ShipmentController] ❌❌❌ ERROR IN getByOrder ❌❌❌');
      console.error('[ShipmentController] Error message:', error.message);
      console.error('[ShipmentController] Error stack:', error.stack);
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
  // ACCEPT ORDER FUNCTION: Shipper nhận đơn hàng
  // ============================================
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
    // ============================================
    // BƯỚC 1: Logging - Ghi log thông tin request
    // ============================================
    console.log('========================================');
    console.log('[ShipmentController] acceptOrder function called');
    console.log('[ShipmentController] Request IP:', req.ip);
    console.log('[ShipmentController] User:', req.user);
    console.log('[ShipmentController] Body:', req.body);
    
    try {
      // ============================================
      // BƯỚC 2: Kiểm tra authentication
      // ============================================
      // Kiểm tra user đã đăng nhập chưa
      if (!req.user || !req.user.userId) {
        return res.status(401).json({
          success: false,
          message: 'Vui lòng đăng nhập',
        });
      }

      // ============================================
      // BƯỚC 3: Extract và validate orderId từ request body
      // ============================================
      // Lấy orderId từ request body
      const { orderId } = req.body;
      
      // Validation: orderId là bắt buộc
      if (!orderId) {
        return res.status(400).json({
          success: false,
          message: 'orderId là bắt buộc',
        });
      }

      // ============================================
      // BƯỚC 4: Tìm hoặc tạo shipper từ user_id
      // ============================================
      // Lấy userId từ JWT token
      const userId = req.user.userId;
      
      // Lấy database connection
      const db = require('../Config/database').getDatabase();
      
      // Tìm shipper_id từ user_id
      // Giả sử shipper_id được lưu trong user hoặc cần tìm từ bảng shippers
      // Tạm thời sử dụng user_id làm shipper_id (cần cập nhật nếu có bảng mapping)
      let shipperId = null;
      
      try {
        // ============================================
        // BƯỚC 4.1: Tìm shipper có name trùng với username hoặc email
        // ============================================
        // Lấy user data để lấy username/email
        const userData = await require('../Models').user.findById(userId);
        
        if (userData) {
          // Import shipper model
          const { shipper } = require('../Models');
          
          // Tìm shipper theo tên (username hoặc email)
          // Sử dụng SQL LIMIT 1 thay vì JavaScript array access (tối ưu hơn)
          const shipperData = await shipper.findFirstByName(userData.username || userData.email || '');
          
          if (shipperData) {
            // Nếu tìm thấy, sử dụng shipper_id
            shipperId = shipperData.shipper_id;
          } else {
            // ============================================
            // BƯỚC 4.2: Nếu không tìm thấy, tạo mới shipper
            // ============================================
            // Tạo shipper mới với name = username/email và contact_info = user_id
            const [insertResult] = await db.execute(
              'INSERT INTO `shippers` (`name`, `contact_info`) VALUES (?, ?)',
              [
                userData.username || userData.email || `Shipper ${userId}`,  // Name
                JSON.stringify({ user_id: userId })                           // Contact info (JSON string)
              ]
            );
            
            // Lấy insertId nếu tạo thành công
            if (insertResult && insertResult.insertId) {
              shipperId = insertResult.insertId;
            }
          }
        }
      } catch (shipperError) {
        // Nếu có lỗi khi tìm/tạo shipper, log và fallback
        console.error('[ShipmentController] Error finding/creating shipper:', shipperError);
        // Fallback: sử dụng user_id làm shipper_id (nếu database cho phép)
        shipperId = userId;
      }

      // ============================================
      // BƯỚC 5: Kiểm tra shipperId có hợp lệ không
      // ============================================
      if (!shipperId) {
        return res.status(400).json({
          success: false,
          message: 'Không tìm thấy thông tin shipper. Vui lòng liên hệ admin.',
        });
      }

      // ============================================
      // BƯỚC 6: Kiểm tra đã có shipper nhận đơn hàng này chưa
      // ============================================
      // Sử dụng SQL WHERE clause thay vì JavaScript some (tối ưu hơn)
      const hasShipper = await shipment.hasShipperForOrder(orderId);
      
      // Nếu đã có shipper nhận, trả về lỗi
      if (hasShipper) {
        return res.status(400).json({
          success: false,
          message: 'Đơn hàng này đã được shipper khác nhận',
        });
      }

      // ============================================
      // BƯỚC 7: Kiểm tra order status phải là CONFIRMED
      // ============================================
      // Import order model
      const { order } = require('../Models');
      
      // Tìm order theo orderId
      const orderData = await order.findById(orderId);
      
      // Kiểm tra order có tồn tại không
      if (!orderData) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy đơn hàng',
        });
      }

      // Kiểm tra order status phải là CONFIRMED (status_id = 2)
      // Chỉ cho phép nhận đơn hàng ở trạng thái Đã Xác Nhận
      if (orderData.status_id !== 2) {
        return res.status(400).json({
          success: false,
          message: 'Chỉ có thể nhận đơn hàng ở trạng thái Đã Xác Nhận',
        });
      }

      // ============================================
      // BƯỚC 8: Tạo shipment
      // ============================================
      // Tạo shipment data với status 'pending'
      const shipmentData = {
        order_id: orderId,           // ID của order
        shipper_id: shipperId,       // ID của shipper
        shipment_status: 'pending',   // Trạng thái shipment (pending = chờ xử lý)
      };

      console.log('[ShipmentController] 📦 Creating shipment:', shipmentData);
      
      // Gọi shipment.create để tạo shipment mới
      const result = await shipment.create(shipmentData);
      
      // ============================================
      // BƯỚC 9: Kiểm tra kết quả và trả về response
      // ============================================
      if (result && result.insertId) {
        // Fetch shipment vừa tạo để trả về
        const newShipment = await shipment.findById(result.insertId);
        console.log('[ShipmentController] ✅ Shipment created:', newShipment.shipment_id);
        
        // ============================================
        // NOTE: Không tự động cập nhật order status sang SHIPPING khi nhận đơn
        // ============================================
        // Shipper sẽ cập nhật thủ công sau khi nhận đơn:
        // 1. Nhận đơn → Order vẫn ở CONFIRMED (status_id = 2)
        // 2. Shipper cập nhật → Order chuyển sang SHIPPING (status_id = 3)
        // 3. Shipper cập nhật → Order chuyển sang DELIVERED (status_id = 4)
        // 4. Admin cập nhật → Order chuyển sang COMPLETED (status_id = 8)
        console.log('[ShipmentController] ℹ️ Order status remains CONFIRMED. Shipper will update to SHIPPING manually.');

        console.log('========================================');
        
        // Trả về response thành công với status 201 (Created)
        return res.status(201).json({
          success: true,
          message: 'Nhận đơn hàng thành công. Vui lòng cập nhật trạng thái "Đang giao hàng" khi bắt đầu giao.',
          data: newShipment,  // Shipment object vừa tạo
        });
      } else {
        // Nếu không có insertId, throw error
        throw new Error('Không thể tạo shipment');
      }
    } 
    // ============================================
    // ERROR HANDLING: Xử lý lỗi
    // ============================================
    catch (error) {
      // Log lỗi chi tiết để debug
      console.error('[ShipmentController] ❌❌❌ ERROR IN acceptOrder ❌❌❌');
      console.error('[ShipmentController] Error message:', error.message);
      console.error('[ShipmentController] Error stack:', error.stack);
      console.log('========================================');
      
      // Trả về error response với status 500 (Internal Server Error)
      return res.status(500).json({
        success: false,
        message: 'Lỗi khi nhận đơn hàng',
        error: error.message,
      });
    }
  };

  // ============================================
  // GET BY SHIPPER FUNCTION: Lấy shipments của shipper hiện tại
  // ============================================
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
    // ============================================
    // BƯỚC 1: Logging - Ghi log thông tin request
    // ============================================
    console.log('========================================');
    console.log('[ShipmentController] getByShipper function called');
    console.log('[ShipmentController] Request IP:', req.ip);
    console.log('[ShipmentController] User:', req.user);
    
    try {
      // ============================================
      // BƯỚC 2: Kiểm tra authentication
      // ============================================
      // Kiểm tra user đã đăng nhập chưa
      if (!req.user || !req.user.userId) {
        return res.status(401).json({
          success: false,
          message: 'Vui lòng đăng nhập',
        });
      }

      // ============================================
      // BƯỚC 3: Lấy userId từ JWT token
      // ============================================
      // Lấy userId từ req.user (được set bởi JWT middleware)
      const userId = req.user.userId;
      
      // Lấy database connection (không dùng trong trường hợp này, nhưng giữ lại để tương lai)
      const db = require('../Config/database').getDatabase();
      
      // ============================================
      // BƯỚC 4: Tìm shipper_id từ user_id
      // ============================================
      let shipperId = null;
      
      try {
        // Lấy user data để lấy username/email
        const userData = await require('../Models').user.findById(userId);
        
        if (userData) {
          // Import shipper model
          const { shipper } = require('../Models');
          
          // Tìm shipper theo tên (username hoặc email)
          // Sử dụng SQL LIMIT 1 thay vì JavaScript array access (tối ưu hơn)
          const shipperData = await shipper.findFirstByName(userData.username || userData.email || '');
          
          if (shipperData) {
            // Nếu tìm thấy, sử dụng shipper_id
            shipperId = shipperData.shipper_id;
          }
        }
      } catch (shipperError) {
        // Nếu có lỗi khi tìm shipper, log và tiếp tục
        console.error('[ShipmentController] Error finding shipper:', shipperError);
      }

      // ============================================
      // BƯỚC 5: Kiểm tra shipperId có tồn tại không
      // ============================================
      // Nếu không tìm thấy shipper, trả về empty array (không phải lỗi)
      if (!shipperId) {
        return res.status(200).json({
          success: true,
          data: [],  // Trả về empty array
          message: 'Chưa có đơn hàng nào',
        });
      }

      // ============================================
      // BƯỚC 6: Fetch shipments của shipper
      // ============================================
      // Gọi shipment.findByShipperId để lấy tất cả shipments của shipper này
      const data = await shipment.findByShipperId(shipperId);
      
      console.log('[ShipmentController] ✅ Shipments fetched:', data?.length || 0);
      console.log('========================================');

      // ============================================
      // BƯỚC 7: Trả về response thành công
      // ============================================
      // Trả về JSON response với status 200 (OK)
      return res.status(200).json({
        success: true,
        data,  // Mảng các shipments của shipper
      });
    } 
    // ============================================
    // ERROR HANDLING: Xử lý lỗi
    // ============================================
    catch (error) {
      // Log lỗi chi tiết để debug
      console.error('[ShipmentController] ❌❌❌ ERROR IN getByShipper ❌❌❌');
      console.error('[ShipmentController] Error message:', error.message);
      console.error('[ShipmentController] Error stack:', error.stack);
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
  // Sau đó thêm các handlers riêng của ShipmentController
  return {
    ...baseController,    // Spread các handlers từ BaseController (getAll, getById, create, update, delete, count)
    getByOrder,           // Handler riêng: Lấy shipments theo order ID
    acceptOrder,          // Handler riêng: Shipper nhận đơn hàng (tạo shipment)
    getByShipper,         // Handler riêng: Lấy shipments của shipper hiện tại (từ token)
  };
};

// ============================================
// EXPORT MODULE
// ============================================
// Export ShipmentController đã được khởi tạo (singleton pattern)
// Cách sử dụng: const shipmentController = require('./ShipmentController');
//               router.get('/order/:orderId', shipmentController.getByOrder);
module.exports = createShipmentController();