// ============================================
// IMPORT MODULES
// ============================================
// Import BaseController factory function
// BaseController cung cấp các HTTP handlers cơ bản (getAll, getById, create, update, delete, count)
const createBaseController = require('./BaseController');

// Import các models cần thiết từ Models/index.js
const { order, orderItem, cartItem, product, inventoryTransaction } = require('../Models');

// Import OrderStatus constants
// OrderStatus chứa các constants và helper functions cho order status workflow
const OrderStatus = require('../Constants/OrderStatus');

// ============================================
// ORDER CONTROLLER FACTORY FUNCTION
// ============================================
/**
 * Tạo OrderController với các HTTP handlers cho quản lý orders
 * OrderController kế thừa tất cả handlers từ BaseController và override/thêm các handlers riêng
 * 
 * @returns {Object} OrderController object với các handlers:
 * - Từ BaseController: getAll (được override), getById (được override), create, update, delete, count
 * - Riêng Order: getByOrderNumber, getByUser, getByStatus, createFromCart, updateStatus, 
 *   confirmOrder, confirmPayment, startShipping, markAsDelivered, cancelOrder, returnOrder, etc.
 */
const createOrderController = () => {
  // Tạo baseController từ BaseController với order model
  // baseController sẽ có các handlers cơ bản: getAll, getById, create, update, delete, count
  const baseController = createBaseController(order);

  // ============================================
  // HELPER FUNCTIONS
  // ============================================
  
  // ============================================
  // GET PAID STATUS ID HELPER: Tìm payment status ID cho "Paid" dynamically
  // ============================================
  /**
   * Helper function: Tìm payment status ID cho "Paid" một cách động
   * 
   * Mục đích:
   * - Tránh hardcode ID (có thể thay đổi trong database)
   * - Tìm bằng tên "Paid" (case-sensitive hoặc case-insensitive)
   * - Fallback về ID 2 nếu không tìm thấy (backward compatibility)
   * 
   * @returns {Promise<number>} Payment status ID cho "Paid" (mặc định: 2)
   */
  const getPaidStatusId = async () => {
    try {
      // Import paymentStatus model (dynamic require để tránh circular dependency)
      const { paymentStatus } = require('../Models');
      
      // Bước 1: Tìm bằng tên chính xác "Paid" (case-sensitive)
      const paidStatus = await paymentStatus.findByName('Paid');
      if (paidStatus && paidStatus.payment_status_id) {
        return paidStatus.payment_status_id;
      }
      
      // Bước 2: Tìm bằng LIKE (case-insensitive) nếu không tìm thấy
      // Sử dụng SQL LIKE để tìm kiếm không phân biệt hoa thường
      const statusRow = await paymentStatus.findFirstByNameLike('paid');
      if (statusRow && statusRow.payment_status_id) {
        return statusRow.payment_status_id;
      }
      
      // Bước 3: Fallback về ID 2 nếu không tìm thấy (backward compatibility)
      // ID 2 thường là "Paid" trong hầu hết các hệ thống
      return 2;
    } catch (error) {
      // Nếu có lỗi, log và fallback về ID 2
      console.error('[OrderController] Error finding Paid status:', error.message);
      return 2; // Default fallback
    }
  };

  // ============================================
  // GET ORDER PAYMENT INFO HELPER: Lấy payment method và trạng thái thanh toán
  // ============================================
  /**
   * Helper function: Lấy payment method và trạng thái thanh toán của order
   * 
   * Mục đích:
   * - Lấy payment record chính của order (paid payment hoặc most recent)
   * - Xác định payment method (COD, MOMO, etc.)
   * - Xác định trạng thái thanh toán (đã thanh toán/chưa thanh toán)
   * - Sử dụng SQL WHERE clause thay vì JavaScript filter (tối ưu)
   * 
   * @param {number} orderId - ID của order
   * @returns {Promise<Object>} Object chứa:
   *   - payment: Payment record chính (paid payment hoặc most recent)
   *   - paymentMethod: Tên payment method (uppercase) hoặc null
   *   - isPaid: Boolean - đã thanh toán chưa
   *   - allPayments: Tất cả payments của order (để reference)
   */
  const getOrderPaymentInfo = async (orderId) => {
    // Import payment model (dynamic require để tránh circular dependency)
    const { payment } = require('../Models');
    
    // Lấy paid status ID (động, không hardcode)
    const paidStatusId = await getPaidStatusId();
    
    // ============================================
    // BƯỚC 1: Tìm active payment (paid payment hoặc most recent)
    // ============================================
    // Sử dụng SQL WHERE clause thay vì JavaScript filter (tối ưu hơn)
    // Ưu tiên: 1. Paid payment, 2. Most recent payment
    const activePayment = await payment.findByOrderIdAndStatus(orderId, paidStatusId) ||  // Tìm paid payment trước
                          await payment.findFirstByOrderId(orderId);                        // Nếu không có, lấy most recent
    
    // ============================================
    // BƯỚC 2: Lấy tất cả payments để reference
    // ============================================
    // Lấy tất cả payments của order (để có thể xem lịch sử thanh toán)
    const allPayments = await payment.findByOrderId(orderId);
    
    // ============================================
    // BƯỚC 3: Trả về payment info object
    // ============================================
    return {
      payment: activePayment,                                    // Payment record chính
      paymentMethod: activePayment?.gateway?.toUpperCase() || null,  // Payment method (uppercase: COD, MOMO, etc.)
      isPaid: activePayment ? parseInt(activePayment.payment_status_id) === paidStatusId : false,  // Đã thanh toán chưa
      allPayments: allPayments,                                  // Tất cả payments (để reference)
    };
  };

  // ============================================
  // BATCH FETCH PRODUCTS HELPER: Batch fetch products bằng SQL WHERE IN
  // ============================================
  /**
   * Helper function: Batch fetch products bằng SQL WHERE IN (1 query thay vì N queries)
   * 
   * Mục đích:
   * - Tối ưu performance: 1 query thay vì N queries trong loop
   * - Tránh N+1 problem
   * - Tạo product map để dễ lookup (O(1) thay vì O(N))
   * 
   * @param {Array<number>} productIds - Mảng các product IDs
   * @returns {Promise<Object>} Product map: { product_id: productObject, ... }
   * 
   * Ví dụ:
   * Input: [1, 2, 3]
   * Output: { 1: {product_id: 1, name: '...'}, 2: {...}, 3: {...} }
   */
  const batchFetchProducts = async (productIds) => {
    // ============================================
    // BƯỚC 1: Validate input
    // ============================================
    // Kiểm tra productIds có phải là array và không rỗng
    if (!Array.isArray(productIds) || productIds.length === 0) {
      return {};  // Trả về empty object nếu không có IDs
    }

    // ============================================
    // BƯỚC 2: Lấy database connection và chuẩn bị IDs
    // ============================================
    // Lấy database connection
    const db = require('../Config/database').getDatabase();
    
    // Loại bỏ duplicate và filter các ID hợp lệ (không null/undefined)
    // new Set(): Loại bỏ duplicate
    // filter(Boolean): Loại bỏ null, undefined, 0, false, '', NaN
    const uniqueProductIds = [...new Set(productIds.filter(Boolean))];
    
    // Nếu không có ID hợp lệ, trả về empty object
    if (uniqueProductIds.length === 0) {
      return {};
    }

    // ============================================
    // BƯỚC 3: Tạo SQL query với WHERE IN
    // ============================================
    // Tạo placeholders cho SQL query (?, ?, ?, ...)
    // Ví dụ: [1, 2, 3] => '?, ?, ?'
    const placeholders = uniqueProductIds.map(() => '?').join(',');
    
    try {
      // ============================================
      // BƯỚC 4: Execute batch SQL query
      // ============================================
      // Batch fetch products sử dụng SQL WHERE IN (1 query thay vì N queries)
      // Chỉ lấy products chưa bị xóa (deleted_at IS NULL)
      const [productRows] = await db.execute(
        `SELECT * FROM \`products\` WHERE \`product_id\` IN (${placeholders}) AND \`deleted_at\` IS NULL`,
        uniqueProductIds  // Bind values vào placeholders
      );
      
      // ============================================
      // BƯỚC 5: Tạo product map để dễ lookup
      // ============================================
      // Tạo map: { product_id: productObject }
      // Giúp lookup O(1) thay vì O(N) khi tìm product theo ID
      const productMap = {};
      (productRows || []).forEach(product => {
        productMap[product.product_id] = product;  // Key = product_id, Value = product object
      });
      
      return productMap;
    } catch (error) {
      // Nếu có lỗi, log và trả về empty object
      console.error('[OrderController] Error in batchFetchProducts:', error);
      return {};
    }
  };

  // ============================================
  // BATCH ENRICH ORDERS HELPER: Batch enrich orders với related data
  // ============================================
  /**
   * Helper function: Batch enrich orders với related data sử dụng SQL WHERE IN queries
   * 
   * Mục đích:
   * - Tối ưu performance: Batch fetch tất cả related data trong 1 lần
   * - Tránh N+1 problem: Không fetch từng order riêng lẻ
   * - Enrich orders với: order status, order items, payments, payment statuses, users
   * 
   * @param {Array<Object>} orders - Mảng các order objects
   * @returns {Promise<Array<Object>>} Mảng orders đã được enrich với related data
   * 
   * Enrich data bao gồm:
   * - order_status: Order status object
   * - order_items: Mảng order items
   * - order_items_count: Số lượng order items
   * - payment: Primary payment object (paid payment hoặc most recent)
   * - payments: Tất cả payments
   * - user: User object
   */
  const batchEnrichOrders = async (orders) => {
    // ============================================
    // BƯỚC 1: Validate input
    // ============================================
    // Kiểm tra orders có phải là array và không rỗng
    if (!Array.isArray(orders) || orders.length === 0) {
      return orders;  // Trả về orders như cũ nếu không có gì để enrich
    }

    // ============================================
    // BƯỚC 2: Lấy database connection và extract order IDs
    // ============================================
    // Lấy database connection
    const db = require('../Config/database').getDatabase();
    
    // Extract order IDs từ orders array
    // Hỗ trợ cả order_id và id (tùy format của order object)
    const orderIds = orders.map(o => o.order_id || o.id).filter(Boolean);
    
    // Nếu không có order IDs, trả về orders như cũ
    if (orderIds.length === 0) {
      return orders;
    }

    // Tạo placeholders cho SQL WHERE IN
    const placeholders = orderIds.map(() => '?').join(',');
    
    try {
      // ============================================
      // BƯỚC 3: Batch fetch tất cả related data
      // ============================================
      // Lấy paid status ID (động, không hardcode)
      const paidStatusId = await getPaidStatusId();
      
      // 1. Batch fetch order statuses
      const statusIds = [...new Set(orders.map(o => o.status_id).filter(Boolean))];
      const statusMap = {};
      if (statusIds.length > 0) {
        const statusPlaceholders = statusIds.map(() => '?').join(',');
        const [statusRows] = await db.execute(
          `SELECT * FROM \`orderstatus\` WHERE \`status_id\` IN (${statusPlaceholders})`,
          statusIds
        );
        (statusRows || []).forEach(status => {
          status.name = status.status_name;
          statusMap[status.status_id] = status;
        });
      }

      // 2. Batch fetch order items with counts
      const [orderItemsRows] = await db.execute(
        `SELECT 
          oi.*,
          o.order_id
        FROM \`orderitems\` oi
        INNER JOIN \`orders\` o ON oi.order_id = o.order_id
        WHERE oi.order_id IN (${placeholders})
        ORDER BY oi.order_item_id ASC`,
        orderIds
      );
      
      // Group order items by order_id
      const orderItemsMap = {};
      const orderItemsCountMap = {};
      (orderItemsRows || []).forEach(item => {
        const oid = item.order_id;
        if (!orderItemsMap[oid]) {
          orderItemsMap[oid] = [];
          orderItemsCountMap[oid] = 0;
        }
        orderItemsMap[oid].push(item);
        orderItemsCountMap[oid]++;
      });

      // 3. Batch fetch all payments (for reference)
      const [paymentsRows] = await db.execute(
        `SELECT * FROM \`payments\` WHERE \`order_id\` IN (${placeholders}) ORDER BY \`order_id\` ASC, \`created_at\` DESC`,
        orderIds
      );
      
      // Group payments by order_id
      const paymentsMap = {};
      (paymentsRows || []).forEach(payment => {
        const oid = payment.order_id;
        if (!paymentsMap[oid]) {
          paymentsMap[oid] = [];
        }
        paymentsMap[oid].push(payment);
      });

      // 3b. Batch fetch paid payments using SQL WHERE clause (instead of JavaScript find)
      const [paidPaymentsRows] = await db.execute(
        `SELECT * FROM \`payments\` WHERE \`order_id\` IN (${placeholders}) AND \`payment_status_id\` = ? ORDER BY \`created_at\` DESC`,
        [...orderIds, paidStatusId]
      );
      
      // Group paid payments by order_id (first one is primary)
      const paidPaymentsMap = {};
      (paidPaymentsRows || []).forEach(payment => {
        const oid = payment.order_id;
        if (!paidPaymentsMap[oid]) {
          paidPaymentsMap[oid] = payment; // First paid payment is primary
        }
      });

      // 3c. Batch fetch most recent payment for each order using SQL window function (instead of JavaScript array access)
      // This replaces payments[0] with SQL query
      const [mostRecentPaymentsRows] = await db.execute(
        `SELECT p.* FROM (
          SELECT *,
            ROW_NUMBER() OVER (PARTITION BY \`order_id\` ORDER BY \`created_at\` DESC) as rn
          FROM \`payments\`
          WHERE \`order_id\` IN (${placeholders})
        ) p
        WHERE p.rn = 1`,
        orderIds
      );
      
      // Group most recent payments by order_id
      const mostRecentPaymentsMap = {};
      (mostRecentPaymentsRows || []).forEach(payment => {
        const oid = payment.order_id;
        mostRecentPaymentsMap[oid] = payment;
      });

      // 4. Batch fetch payment statuses using SQL WHERE IN
      const paymentStatusIds = [...new Set((paymentsRows || []).map(p => p.payment_status_id).filter(Boolean))];
      const paymentStatusMap = {};
      if (paymentStatusIds.length > 0) {
        const paymentStatusPlaceholders = paymentStatusIds.map(() => '?').join(',');
        const [paymentStatusRows] = await db.execute(
          `SELECT * FROM \`paymentstatus\` WHERE \`payment_status_id\` IN (${paymentStatusPlaceholders})`,
          paymentStatusIds
        );
        (paymentStatusRows || []).forEach(status => {
          status.name = status.status_name;
          paymentStatusMap[status.payment_status_id] = status;
        });
      }

      // 5. Batch fetch users using SQL WHERE IN
      const userIds = [...new Set(orders.map(o => o.user_id).filter(Boolean))];
      const userMap = {};
      if (userIds.length > 0) {
        const userPlaceholders = userIds.map(() => '?').join(',');
        const [userRows] = await db.execute(
          `SELECT * FROM \`users\` WHERE \`user_id\` IN (${userPlaceholders})`,
          userIds
        );
        (userRows || []).forEach(user => {
          userMap[user.user_id] = user;
        });
      }

      // 6. For each order, find primary payment using SQL results (paid first, then most recent)
      // Use SQL results instead of JavaScript array access
      const primaryPaymentsMap = {};
      for (const orderId of orderIds) {
        // Use SQL result for paid payment first (instead of JavaScript find)
        let primaryPayment = paidPaymentsMap[orderId];
        if (!primaryPayment) {
          // Use most recent payment from SQL query (instead of payments[0])
          primaryPayment = mostRecentPaymentsMap[orderId] || null;
        }
        if (primaryPayment) {
          primaryPaymentsMap[orderId] = primaryPayment;
        }
      }

      // 7. Enrich orders with batch-fetched data
      return orders.map(orderData => {
        const orderId = orderData.order_id || orderData.id;
        
        // Enrich order status
        if (orderData.status_id && statusMap[orderData.status_id]) {
          orderData.order_status = statusMap[orderData.status_id];
          orderData.order_status_id = orderData.status_id;
        } else if (orderData.status_id) {
          orderData.order_status_id = orderData.status_id;
        }

        // Enrich order items
        orderData.order_items = orderItemsMap[orderId] || [];
        orderData.order_items_count = orderItemsCountMap[orderId] || 0;
        orderData.items = orderData.order_items;
        orderData.items_count = orderData.order_items_count;

        // Enrich payments
        const payments = paymentsMap[orderId] || [];
        const primaryPayment = primaryPaymentsMap[orderId];
        
        if (primaryPayment) {
          // Enrich payment with status
          if (primaryPayment.payment_status_id && paymentStatusMap[primaryPayment.payment_status_id]) {
            primaryPayment.payment_status = paymentStatusMap[primaryPayment.payment_status_id];
            primaryPayment.status = primaryPayment.payment_status;
          }
          orderData.payment = primaryPayment;
        } else {
          orderData.payment = null;
        }
        orderData.payments = payments;

        // Enrich user
        if (orderData.user_id && userMap[orderData.user_id]) {
          orderData.user = userMap[orderData.user_id];
        }

        return orderData;
      });
    } catch (error) {
      console.error('[OrderController] Error in batchEnrichOrders:', error);
      // Return orders without enrichment if batch fetch fails
      return orders;
    }
  };

  // ============================================
  // GET BY ORDER NUMBER FUNCTION: Lấy order theo order number
  // ============================================
  /**
   * HTTP Handler: GET /orders/number/:orderNumber
   * Lấy order theo order number (mã đơn hàng)
   * 
   * Authorization: Admin (role 1), Shipper (role 2), hoặc Order Owner có thể truy cập
   * 
   * URL Params:
   * - orderNumber: Mã đơn hàng (bắt buộc)
   * 
   * Response:
   * - 200: Success { success: true, data: {...} }
   * - 401: Unauthorized (chưa đăng nhập)
   * - 403: Forbidden (không có quyền)
   * - 404: Not Found (không tìm thấy)
   * - 500: Server Error
   * 
   * Đặc biệt:
   * - Tự động lấy order items
   * - Kiểm tra quyền truy cập (Admin, Shipper, hoặc Owner)
   * 
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Promise<void>} JSON response
   */
  const getByOrderNumber = async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Vui lòng đăng nhập để tiếp tục.',
        });
      }

      const { orderNumber } = req.params;
      
      const data = await order.findByOrderNumber(orderNumber);

      if (!data) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy đơn hàng',
        });
      }

      // Authorization check: Admin (role 1), Shipper (role 2), or Order Owner can access
      const userRoleId = req.user.roleId;
      const userId = req.user.userId;
      const orderUserId = data.user_id;

      // Allow if: Admin, Shipper, or Order Owner
      if (userRoleId !== 1 && userRoleId !== 2 && userId !== orderUserId) {
        return res.status(403).json({
          success: false,
          message: 'Bạn không có quyền truy cập đơn hàng này.',
        });
      }

      // Lấy order items
      const items = await orderItem.findByOrderId(data.order_id);

      return res.status(200).json({
        success: true,
        data: {
          ...data,
          items,
        },
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Lỗi khi lấy dữ liệu',
        error: error.message,
      });
    }
  };

  // ============================================
  // GET BY USER FUNCTION: Lấy orders theo user ID
  // ============================================
  /**
   * HTTP Handler: GET /orders/user/:userId
   * Lấy danh sách orders theo user ID
   * 
   * Query Parameters:
   * - page: Số trang (mặc định: 1)
   * - limit: Số lượng/trang (mặc định: 10)
   * 
   * URL Params:
   * - userId: ID của user (bắt buộc)
   * 
   * Response:
   * - 200: Success { success: true, data: [...] }
   * - 500: Server Error
   * 
   * Đặc biệt:
   * - Tự động enrich orders với payment và order status information
   * - Sử dụng batch SQL queries để tối ưu (tránh N+1 problem)
   * 
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Promise<void>} JSON response
   */
  const getByUser = async (req, res) => {
    console.log('\n========================================');
    console.log('[OrderController] 🟡🟡🟡 getByUser CALLED 🟡🟡🟡');
    console.log('[OrderController] Request params:', req.params);
    console.log('[OrderController] Request query:', req.query);
    console.log('[OrderController] User from token:', req.user);
    console.log('========================================\n');
    
    try {
      const { userId } = req.params;
      const { page = 1, limit = 10 } = req.query;
      const offset = (parseInt(page) - 1) * parseInt(limit);

      console.log('[OrderController] 🔍 Fetching orders for userId:', userId, 'with pagination:', { page, limit, offset });

      let data = await order.findByUserId(userId, {
        limit: parseInt(limit),
        offset,
      });

      console.log('[OrderController] 📊 Found', data?.length || 0, 'orders for user', userId);

      // Enrich orders with payment and order status information using batch SQL queries
      if (Array.isArray(data) && data.length > 0) {
        console.log('[OrderController] 🔄 Starting to batch enrich', data.length, 'orders with payment and status data...');
        data = await batchEnrichOrders(data);
        console.log('[OrderController] ✅ Orders batch enriched successfully');
      }

      return res.status(200).json({
        success: true,
        data,
      });
    } catch (error) {
      console.error('[OrderController] Error in getByUser:', error.message);
      return res.status(500).json({
        success: false,
        message: 'Lỗi khi lấy dữ liệu',
        error: error.message,
      });
    }
  };

  // ============================================
  // GET BY STATUS FUNCTION: Lấy orders theo status ID
  // ============================================
  /**
   * HTTP Handler: GET /orders/status/:statusId
   * Lấy danh sách orders theo status ID
   * 
   * Query Parameters:
   * - page: Số trang (mặc định: 1)
   * - limit: Số lượng/trang (mặc định: 10)
   * 
   * URL Params:
   * - statusId: ID của order status (bắt buộc)
   * 
   * Response:
   * - 200: Success { success: true, data: [...] }
   * - 500: Server Error
   * 
   * Đặc biệt:
   * - Tự động enrich orders với payment và order status information
   * - Sử dụng batch SQL queries để tối ưu (tránh N+1 problem)
   * 
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Promise<void>} JSON response
   */
  const getByStatus = async (req, res) => {
    console.log('========================================');
    console.log('[OrderController] getByStatus function called');
    console.log('[OrderController] Request IP:', req.ip);
    console.log('[OrderController] User:', req.user);
    console.log('[OrderController] Params:', req.params);
    console.log('[OrderController] Query:', req.query);
    
    try {
      const { statusId } = req.params;
      const { page = 1, limit = 10 } = req.query;
      const offset = (parseInt(page) - 1) * parseInt(limit);

      console.log('[OrderController] 🔍 Fetching orders by statusId:', statusId);
      console.log('[OrderController] Pagination:', { page, limit, offset });

      const data = await order.findByStatus(statusId, {
        limit: parseInt(limit),
        offset,
      });

      console.log('[OrderController] ✅ Orders fetched:', data?.length || 0);

      // [BUG FIX] Enrich orders with payment and status data using batch SQL queries
      if (Array.isArray(data) && data.length > 0) {
        console.log('[OrderController] 🔄 Starting to batch enrich', data.length, 'orders with payment and status data...');
        try {
          data = await batchEnrichOrders(data);
          console.log('[OrderController] ✅ Orders batch enriched successfully');
        } catch (enrichError) {
          console.error('[OrderController] ❌❌❌ CRITICAL ERROR IN BATCH ENRICH PROCESS ❌❌❌');
          console.error('[OrderController] Error message:', enrichError.message);
          console.error('[OrderController] Error stack:', enrichError.stack);
          // Continue without enrichment - at least return the basic data
        }
      }

      console.log('[OrderController] ✅ Orders fetched and enriched:', data?.length || 0);
      console.log('========================================');

      return res.status(200).json({
        success: true,
        data,
      });
    } catch (error) {
      console.error('[OrderController] ❌❌❌ ERROR IN getByStatus ❌❌❌');
      console.error('[OrderController] Error message:', error.message);
      console.error('[OrderController] Error stack:', error.stack);
      console.log('========================================');
      
      return res.status(500).json({
        success: false,
        message: 'Lỗi khi lấy dữ liệu',
        error: error.message,
      });
    }
  };

  // ============================================
  // CREATE FROM CART FUNCTION: Tạo order từ cart
  // ============================================
  /**
   * HTTP Handler: POST /orders/from-cart
   * Tạo order từ cart items của user
   * 
   * Request Body:
   * - userId: ID của user (bắt buộc)
   * - shippingAddressId: ID địa chỉ giao hàng (bắt buộc)
   * - billingAddressId: ID địa chỉ thanh toán (tùy chọn)
   * - couponCode: Mã giảm giá (tùy chọn)
   * - paymentMethodId: ID phương thức thanh toán (bắt buộc)
   * - shipping_fee: Phí vận chuyển (tùy chọn, mặc định: 0)
   * - tax_amount: Thuế (tùy chọn, mặc định: 0)
   * - currency: Loại tiền tệ (tùy chọn, mặc định: 'VND')
   * 
   * Response:
   * - 201: Created { success: true, message: "...", data: {...} }
   * - 400: Bad Request (validation error, cart trống, stock không đủ, etc.)
   * 
   * Quy trình:
   * 1. Validate cart items và stock
   * 2. Tính tổng tiền
   * 3. Validate coupon (nếu có)
   * 4. Tạo order với status PENDING
   * 5. Tạo order items với product snapshots
   * 6. Tạo payment record (COD hoặc MoMo)
   * 7. Xóa cart
   * 
   * Đặc biệt:
   * - Stock chỉ được validate, sẽ trừ khi order được CONFIRMED
   * - Sử dụng batch SQL queries để tối ưu (tránh N+1 problem)
   * - Product snapshots không lưu full base64 images (tránh max_allowed_packet error)
   * 
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Promise<void>} JSON response
   */
  const createFromCart = async (req, res) => {
    console.log('[OrderController] 🚀 createFromCart called');
    console.log('[OrderController] 📥 Request body:', JSON.stringify(req.body, null, 2));
    try {
      const { userId, shippingAddressId, billingAddressId, couponCode, paymentMethodId, ...orderData } = req.body;
      console.log('[OrderController] 📊 Extracted data:', {
        userId,
        shippingAddressId,
        billingAddressId,
        couponCode,
        paymentMethodId
      });

      if (!userId) {
        return res.status(400).json({
          success: false,
          message: 'Vui lòng cung cấp userId',
        });
      }

      if (!shippingAddressId) {
        return res.status(400).json({
          success: false,
          message: 'Vui lòng chọn địa chỉ giao hàng',
        });
      }

      if (!paymentMethodId) {
        return res.status(400).json({
          success: false,
          message: 'Vui lòng chọn phương thức thanh toán',
        });
      }

      // Lấy cart items
      const cartItems = await cartItem.findByUserId(userId);
      
      if (!cartItems || cartItems.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Giỏ hàng trống',
        });
      }

      // Validate stock và tính tổng tiền
      // NOTE: Stock validation here only checks availability, stock will be deducted when order is CONFIRMED
      let totalAmount = 0;
      const stockErrors = [];

      // Batch fetch all products using SQL WHERE IN instead of individual queries in loop
      const productIds = cartItems.map(item => item.product_id).filter(Boolean);
      const productMap = await batchFetchProducts(productIds);
      console.log(`[OrderController] 🔍 Batch fetched ${Object.keys(productMap).length} products for validation`);

      for (const item of cartItems) {
        console.log(`[OrderController] 🔍 Validating cart item: product_id=${item.product_id}, quantity=${item.quantity}`);
        
        // Use batch-fetched product data instead of individual query
        const productData = productMap[item.product_id];
        
        if (!productData) {
          const errorMsg = `Sản phẩm ID ${item.product_id} không tồn tại`;
          console.log(`[OrderController] ❌ ${errorMsg}`);
          stockErrors.push(errorMsg);
          continue;
        }
        
        // Verify the found product matches the cart item's product_id
        if (productData.product_id !== item.product_id) {
          console.error('[OrderController] ❌ CRITICAL: Product mismatch in validation!', {
            cartItemProductId: item.product_id,
            foundProductId: productData.product_id,
            foundProductName: productData.name,
            foundProductDbId: productData.id,
          });
          const errorMsg = `Sản phẩm ID ${item.product_id} không tồn tại hoặc không khớp`;
          console.log(`[OrderController] ❌ ${errorMsg}`);
          stockErrors.push(errorMsg);
          continue;
        }
        
        if (!productData.is_active || productData.deleted_at) {
          const errorMsg = `Sản phẩm ${productData.name || item.product_id} không tồn tại hoặc đã bị vô hiệu hóa`;
          console.log(`[OrderController] ❌ ${errorMsg}`);
          stockErrors.push(errorMsg);
          continue;
        }

        const currentStock = parseInt(productData.stock_quantity || 0);
        const requestedQuantity = parseInt(item.quantity || 0);
        
        console.log(`[OrderController] 📦 Stock check: product=${productData.name}, current=${currentStock}, requested=${requestedQuantity}`);
        
        if (currentStock < requestedQuantity) {
          const errorMsg = `Sản phẩm ${productData.name} chỉ còn ${currentStock} sản phẩm, bạn yêu cầu ${requestedQuantity}`;
          console.log(`[OrderController] ❌ ${errorMsg}`);
          stockErrors.push(errorMsg);
          continue;
        }

        const itemTotal = parseFloat(item.unit_price || 0) * requestedQuantity;
        totalAmount += itemTotal;
        console.log(`[OrderController] ✅ Item validated: ${productData.name}, total=${itemTotal}`);
      }

      if (stockErrors.length > 0) {
        console.log(`[OrderController] ❌ Validation failed with ${stockErrors.length} errors:`, stockErrors);
        return res.status(400).json({
          success: false,
          message: 'Có lỗi với một số sản phẩm trong giỏ hàng',
          errors: stockErrors,
        });
      }
      
      console.log(`[OrderController] ✅ All items validated, total amount: ${totalAmount}`);

      // Validate coupon nếu có
      let discountAmount = 0;
      let couponId = null;
      if (couponCode) {
        const { coupon } = require('../Models');
        const couponValidation = await coupon.validateCoupon(couponCode, totalAmount);
        
        if (!couponValidation.valid) {
          return res.status(400).json({
            success: false,
            message: couponValidation.message,
          });
        }
        couponId = couponValidation.coupon.coupon_id;
        if (couponValidation.coupon.discount_percent > 0) {
          discountAmount = (totalAmount * parseFloat(couponValidation.coupon.discount_percent)) / 100;
        } else {
          discountAmount = parseFloat(couponValidation.coupon.discount_amount || 0);
        }
      }

      // Tạo order number
      const orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

      // Tạo order
      // CRITICAL FIX: Convert all undefined to null for optional fields (MySQL2 doesn't accept undefined)
      const orderDataToCreate = {
        order_number: orderNumber,
        user_id: userId,
        shipping_address_id: shippingAddressId,
        billing_address_id: billingAddressId !== undefined && billingAddressId !== null ? billingAddressId : null,
        status_id: OrderStatus.PENDING.id, // Chờ xác nhận
        order_date: new Date(),
        total_amount: totalAmount - discountAmount,
        coupon_id: couponId !== undefined && couponId !== null ? couponId : null,
        discount_amount: discountAmount !== undefined && discountAmount !== null ? discountAmount : 0,
        currency: orderData.currency || 'VND',
        shipping_fee: orderData.shipping_fee !== undefined && orderData.shipping_fee !== null ? orderData.shipping_fee : 0,
        tax_amount: orderData.tax_amount !== undefined && orderData.tax_amount !== null ? orderData.tax_amount : 0,
      };
      
      // Ensure all values are not undefined (convert to null)
      Object.keys(orderDataToCreate).forEach(key => {
        if (orderDataToCreate[key] === undefined) {
          orderDataToCreate[key] = null;
        }
      });
      
      console.log('[OrderController] 📦 Order data to create:', JSON.stringify(orderDataToCreate, null, 2));
      const orderResult = await order.create(orderDataToCreate);
      const orderId = orderResult.insertId;

      // Tạo order items và cập nhật inventory
      // Batch fetch all products using SQL WHERE IN instead of individual queries in loop
      const productIdsForItems = cartItems.map(item => item.product_id).filter(Boolean);
      const productMapForItems = await batchFetchProducts(productIdsForItems);
      console.log(`[OrderController] 🔍 Batch fetched ${Object.keys(productMapForItems).length} products for order items creation`);

      for (const item of cartItems) {
        // Use batch-fetched product data instead of individual query
        const productData = productMapForItems[item.product_id];
        
        // Create cleaned product snapshot - only store essential data, not full base64 images
        // Setting images and primary_image to null prevents max_allowed_packet errors
        const productSnapshot = {
          name: productData?.name || null,
          price: productData?.price || null,
          images: null, // Don't store full base64 images - too large for MySQL
          primary_image: null, // Don't store full base64 images - too large for MySQL
        };
        
        await orderItem.createWithSnapshot(
          orderId,
          item.product_id,
          item.quantity,
          item.unit_price,
          productSnapshot
        );

        // NOTE: Stock will be deducted when order is confirmed by admin (in confirmOrder function)
        // This ensures stock is only reduced when order is actually confirmed, not just created
      }

      // Increment coupon usage nếu có
      if (couponId) {
        const { coupon } = require('../Models');
        await coupon.incrementUsage(couponId);
      }

      // Tạo payment record nếu có paymentMethodId
      // Note: For MOMO, payment record will be created/updated in createMoMoPayment
      // For COD, payment record is created here with PENDING status
      let paymentInfo = null;
      if (paymentMethodId) {
        console.log('[OrderController] 🔍 Creating payment record, paymentMethodId:', paymentMethodId);
        const { payment, paymentMethod } = require('../Models');
        const db = require('../Config/database').getDatabase();
        
        // DEBUG: List all payment methods in database
        try {
          const [allMethods] = await db.execute('SELECT * FROM `paymentmethods` ORDER BY `payment_method_id`');
          console.log('[OrderController] 📋 All payment methods in database:', JSON.stringify(allMethods, null, 2));
        } catch (debugError) {
          console.error('[OrderController] ⚠️ Could not list payment methods:', debugError.message);
        }
        
        // CRITICAL FIX: Look up payment method dynamically instead of relying on hardcoded ID
        let methodData = null;
        try {
          console.log('[OrderController] 🔍 Attempting to find payment method by ID:', paymentMethodId);
          methodData = await paymentMethod.findById(paymentMethodId);
          console.log('[OrderController] 📊 Payment method found by ID:', methodData ? {
            id: methodData.payment_method_id,
            name: methodData.method_name,
            description: methodData.description
          } : 'null');
        } catch (findError) {
          console.error('[OrderController] ❌ Error finding payment method by ID:', findError.message);
          console.error('[OrderController] ❌ Error stack:', findError.stack);
        }
        
        // If not found by ID, try to find by name (for MoMo or COD)
        if (!methodData) {
          console.log('[OrderController] ⚠️ Payment method not found by ID, trying to find by name...');
          
          // Try to find MoMo or COD based on common IDs
          if (paymentMethodId === 1) {
            // Likely MoMo - try multiple name variations using single SQL query with OR LIKE
            console.log('[OrderController] 🔍 Searching for MoMo payment method...');
            const momoSearches = ['momo', 'mo mo', 'momo wallet', 'momo e-wallet'];
            const foundMethod = await paymentMethod.findFirstByNamePatterns(momoSearches);
            if (foundMethod) {
              methodData = foundMethod;
              console.log('[OrderController] ✅ Found MoMo payment method:', {
                id: methodData.payment_method_id,
                name: methodData.method_name,
              });
            }
          } else if (paymentMethodId === 2) {
            // Likely COD - try multiple name variations using single SQL query with OR LIKE
            console.log('[OrderController] 🔍 Searching for COD payment method...');
            const codSearches = ['cod', 'cash on delivery', 'cash on', 'delivery', 'thanh toán khi nhận', 'thanh toan khi nhan'];
            const foundMethod = await paymentMethod.findFirstByNamePatterns(codSearches);
            if (foundMethod) {
              methodData = foundMethod;
              console.log('[OrderController] ✅ Found COD payment method:', {
                id: methodData.payment_method_id,
                name: methodData.method_name,
              });
            }
            
            // If still not found, try to find by ID using SQL
            if (!methodData) {
              console.log('[OrderController] ⚠️ COD not found by name, checking if payment method ID 2 exists...');
              // Use SQL LIMIT 1 instead of JavaScript array access
              const foundById = await paymentMethod.findById(2);
              if (foundById) {
                methodData = foundById;
                console.log('[OrderController] ✅ Found payment method with ID 2:', {
                  id: methodData.payment_method_id,
                  name: methodData.method_name
                });
              } else {
                console.log('[OrderController] ⚠️ Payment method ID 2 does not exist. Creating COD payment method...');
                // Create COD payment method if it doesn't exist
                try {
                  const [insertResult] = await db.execute(
                    'INSERT INTO `paymentmethods` (`method_name`, `description`) VALUES (?, ?)',
                    ['COD', 'Cash on Delivery - Thanh toán khi nhận hàng']
                  );
                  if (insertResult && insertResult.insertId) {
                    methodData = {
                      payment_method_id: insertResult.insertId,
                      method_name: 'COD',
                      description: 'Cash on Delivery - Thanh toán khi nhận hàng'
                    };
                    console.log('[OrderController] ✅ Created COD payment method with ID:', methodData.payment_method_id);
                  }
                } catch (createError) {
                  console.error('[OrderController] ❌ Error creating COD payment method:', createError.message);
                }
              }
            }
          }
        }
        
        if (methodData && methodData.payment_method_id) {
          const methodNameUpper = (methodData.method_name || '').toUpperCase();
          const isCOD = methodNameUpper.includes('COD') || 
                       methodNameUpper.includes('CASH ON DELIVERY') ||
                       methodNameUpper.includes('THANH TOAN KHI NHAN') ||
                       methodNameUpper.includes('THANH TOÁN KHI NHẬN') ||
                       paymentMethodId === 2; // Also check if the requested ID was 2
          const isMOMO = methodNameUpper.includes('MOMO') || 
                        methodNameUpper.includes('MO MO') ||
                        paymentMethodId === 1; // Also check if the requested ID was 1
          console.log('[OrderController] 📊 Payment method type:', { 
            isCOD, 
            isMOMO, 
            name: methodData.method_name,
            requestedId: paymentMethodId,
            actualId: methodData.payment_method_id
          });
          
          // Use the actual payment_method_id from database
          const actualPaymentMethodId = methodData.payment_method_id;
          
          // CRITICAL FIX: Dynamically look up payment_status_id for "Pending"
          const { paymentStatus } = require('../Models');
          let pendingStatusId = null;
          try {
            const pendingStatus = await paymentStatus.findByName('Pending');
            if (pendingStatus && pendingStatus.payment_status_id) {
              pendingStatusId = pendingStatus.payment_status_id;
              console.log('[OrderController] ✅ Found Pending payment status:', pendingStatusId);
            } else {
              // Try case-insensitive search using SQL
              const statusRow = await paymentStatus.findFirstByNameLike('pending');
              if (statusRow && statusRow.payment_status_id) {
                pendingStatusId = statusRow.payment_status_id;
                console.log('[OrderController] ✅ Found Pending payment status (case-insensitive):', pendingStatusId);
              } else {
                // Create it if not found
                console.log('[OrderController] ⚠️ Pending payment status not found, creating...');
                const [createStatusResult] = await db.execute(
                  'INSERT INTO `paymentstatus` (`status_name`) VALUES (?)',
                  ['Pending']
                );
                if (createStatusResult && createStatusResult.insertId) {
                  pendingStatusId = createStatusResult.insertId;
                  console.log('[OrderController] ✅ Created Pending payment status:', pendingStatusId);
                }
              }
            }
          } catch (statusError) {
            console.error('[OrderController] ❌ Error finding/creating payment status:', statusError.message);
          }
          
          if (!pendingStatusId) {
            console.error('[OrderController] ❌ Could not find or create Pending payment status');
            throw new Error('Không thể tìm thấy trạng thái thanh toán Pending');
          }
          
          // Only create payment record for COD here
          // For MOMO, payment will be created/updated in createMoMoPayment endpoint
          if (isCOD) {
            const paymentData = {
              order_id: orderId,
              payment_method_id: actualPaymentMethodId,
              gateway: 'COD',
              amount: totalAmount - discountAmount,
              payment_status_id: pendingStatusId, // Use dynamic ID
            };
            
            // Ensure no undefined values
            Object.keys(paymentData).forEach(key => {
              if (paymentData[key] === undefined) {
                paymentData[key] = null;
              }
            });
            
            console.log('[OrderController] 💳 Creating COD payment record...', paymentData);
            const paymentResult = await payment.create(paymentData);
            paymentInfo = await payment.findById(paymentResult.insertId);
            console.log('[OrderController] ✅ COD payment record created:', paymentInfo?.payment_id);
          } else if (isMOMO) {
            // For MOMO, create a placeholder payment record that will be updated in createMoMoPayment
            // This ensures the order has a payment record from the start
            const paymentData = {
              order_id: orderId,
              payment_method_id: actualPaymentMethodId,
              gateway: 'momo',
              amount: totalAmount - discountAmount,
              payment_status_id: pendingStatusId, // Use dynamic ID
              metadata: JSON.stringify({ order_number: orderNumber }),
            };
            
            // Ensure no undefined values
            Object.keys(paymentData).forEach(key => {
              if (paymentData[key] === undefined) {
                paymentData[key] = null;
              }
            });
            
            console.log('[OrderController] 💳 Creating MoMo payment record...', paymentData);
            const paymentResult = await payment.create(paymentData);
            paymentInfo = await payment.findById(paymentResult.insertId);
            console.log('[OrderController] ✅ MoMo payment record created:', paymentInfo?.payment_id);
          } else {
            // Other payment methods
            const paymentData = {
              order_id: orderId,
              payment_method_id: actualPaymentMethodId,
              gateway: null,
              amount: totalAmount - discountAmount,
              payment_status_id: pendingStatusId, // Use dynamic ID
            };
            
            // Ensure no undefined values
            Object.keys(paymentData).forEach(key => {
              if (paymentData[key] === undefined) {
                paymentData[key] = null;
              }
            });
            
            console.log('[OrderController] 💳 Creating payment record for other method...', paymentData);
            const paymentResult = await payment.create(paymentData);
            paymentInfo = await payment.findById(paymentResult.insertId);
            console.log('[OrderController] ✅ Payment record created:', paymentInfo?.payment_id);
          }
        } else {
          console.error('[OrderController] ❌ Payment method not found for ID:', paymentMethodId);
          console.error('[OrderController] ❌ methodData:', methodData);
          throw new Error(`Phương thức thanh toán không tồn tại (ID: ${paymentMethodId})`);
        }
      }

      // Xóa cart
      await cartItem.clearUserCart(userId);

      const newOrder = await order.findById(orderId);
      const items = await orderItem.findByOrderId(orderId);

      console.log('[OrderController] ✅ Order created successfully:', orderId);
      return res.status(201).json({
        success: true,
        message: 'Tạo đơn hàng thành công',
        data: {
          ...newOrder,
          items,
          payment: paymentInfo,
        },
      });
    } catch (error) {
      console.error('[OrderController] ❌ Error in createFromCart:', {
        message: error.message,
        stack: error.stack,
        code: error.code,
        errno: error.errno,
        sqlState: error.sqlState,
        name: error.name
      });
      
      // Return more specific error message
      let errorMessage = 'Lỗi khi tạo đơn hàng';
      if (error.message) {
        errorMessage = error.message;
      } else if (error.code === 'ER_NO_REFERENCED_ROW_2' || error.errno === 1452) {
        errorMessage = 'Dữ liệu không hợp lệ: tham chiếu đến bản ghi không tồn tại';
      } else if (error.code === 'ER_DUP_ENTRY' || error.errno === 1062) {
        errorMessage = 'Dữ liệu trùng lặp';
      }
      
      return res.status(400).json({
        success: false,
        message: errorMessage,
        error: error.message,
        code: error.code,
      });
    }
  };

  // ============================================
  // UPDATE STATUS FUNCTION: Cập nhật order status
  // ============================================
  /**
   * HTTP Handler: PUT /orders/:id/status
   * Cập nhật trạng thái đơn hàng
   * 
   * URL Params:
   * - id: ID của order (bắt buộc)
   * 
   * Request Body:
   * - statusId: ID của status mới (bắt buộc nếu không có statusCode)
   * - statusCode: Code của status mới (bắt buộc nếu không có statusId)
   * - processedBy: ID người xử lý (tùy chọn)
   * - adminPin: Mã PIN để lùi bước (bắt buộc nếu lùi bước)
   * 
   * Response:
   * - 200: Success { success: true, message: "...", data: {...} }
   * - 400: Bad Request (validation error, không thể chuyển trạng thái)
   * - 404: Not Found (không tìm thấy order)
   * 
   * Workflow validation:
   * - Không cho nhảy bước: Phải theo thứ tự tuần tự
   * - Cho phép lùi bước: Nhưng cần PIN (trừ CANCELLED và RETURNED)
   * - Validate transition: Kiểm tra có thể chuyển từ status hiện tại sang status mới không
   * 
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Promise<void>} JSON response
   */
  const updateStatus = async (req, res) => {
    console.log('========================================');
    console.log('[OrderController] updateStatus function called');
    console.log('[OrderController] Request IP:', req.ip);
    console.log('[OrderController] Params:', req.params);
    console.log('[OrderController] Request body:', JSON.stringify(req.body, null, 2));
    
    try {
      const { id } = req.params;
      const { statusId, statusCode, processedBy } = req.body;
      console.log('[OrderController] Updating order status:', {
        orderId: id,
        statusId,
        statusCode,
        processedBy
      });

      // Cho phép dùng statusCode hoặc statusId
      let targetStatusId = statusId;
      if (statusCode && !statusId) {
        const status = OrderStatus.getByCode(statusCode);
        if (!status) {
          return res.status(400).json({
            success: false,
            message: `Trạng thái không hợp lệ: ${statusCode}`,
          });
        }
        targetStatusId = status.id;
      }

      if (!targetStatusId) {
        return res.status(400).json({
          success: false,
          message: 'Vui lòng cung cấp statusId hoặc statusCode',
        });
      }

      // Kiểm tra order tồn tại
      const orderData = await order.findById(id);
      if (!orderData) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy đơn hàng',
        });
      }

      // Lấy payment method của order
      const paymentInfo = await getOrderPaymentInfo(id);

      // [NEW REQUIREMENT] Workflow validation: Không cho nhảy bước, chỉ cho phép transition tuần tự
      const currentStatusId = parseInt(orderData.status_id);
      const targetStatusIdInt = parseInt(targetStatusId);
      
      // Kiểm tra xem có phải lùi bước không (target < current, nhưng không phải CANCELLED hoặc RETURNED)
      const isBackwardStep = targetStatusIdInt < currentStatusId && 
                             targetStatusIdInt !== OrderStatus.CANCELLED.id && 
                             targetStatusIdInt !== OrderStatus.RETURNED.id;
      const isForwardStep = targetStatusIdInt > currentStatusId;
      const isSameStep = targetStatusIdInt === currentStatusId;
      
      // Nếu lùi bước, yêu cầu PIN (check trước khi validate transition)
      if (isBackwardStep) {
        const { adminPin } = req.body;
        const requiredPin = process.env.ADMIN_PIN || '1234'; // Default PIN, nên thay đổi trong production
        
        if (!adminPin) {
          return res.status(400).json({
            success: false,
            message: 'Để lùi bước trong workflow, vui lòng nhập mã PIN',
            requiresPin: true,
          });
        }
        
        if (adminPin !== requiredPin) {
          return res.status(403).json({
            success: false,
            message: 'Mã PIN không đúng',
          });
        }
        // Nếu đã có PIN đúng cho backward step, vẫn cần check một số điều kiện cơ bản
        // Không cho phép lùi về PENDING hoặc lùi từ CANCELLED/RETURNED
        if (targetStatusIdInt === OrderStatus.PENDING.id || 
            currentStatusId === OrderStatus.CANCELLED.id || 
            currentStatusId === OrderStatus.RETURNED.id) {
          const currentStatus = OrderStatus.getById(currentStatusId);
          const targetStatus = OrderStatus.getById(targetStatusIdInt);
          return res.status(400).json({
            success: false,
            message: `Không thể lùi từ "${currentStatus?.name || currentStatusId}" về "${targetStatus?.name || targetStatusIdInt}"`,
          });
        }
        // Backward step với PIN đúng được phép, bỏ qua isValidTransition check
      } else {
        // Forward step hoặc backward step không có PIN: check isValidTransition
        const isValid = OrderStatus.isValidTransition(
          orderData.status_id, 
          targetStatusId, 
          paymentInfo.paymentMethod, 
          paymentInfo.isPaid
        );
        
        if (!isValid) {
          const currentStatus = OrderStatus.getById(orderData.status_id);
          const targetStatus = OrderStatus.getById(targetStatusId);
          
          let errorMessage = `Không thể chuyển từ "${currentStatus?.name || orderData.status_id}" sang "${targetStatus?.name || targetStatusId}". Workflow bắt buộc: không được nhảy bước.`;
          
          // Thêm thông tin cụ thể cho MoMo
          if (paymentInfo.paymentMethod === 'MOMO' && orderData.status_id === 1 && targetStatusId === 2 && !paymentInfo.isPaid) {
            errorMessage += ' Đơn hàng MoMo phải được thanh toán trước khi xác nhận.';
          }
          
          return res.status(400).json({
            success: false,
            message: errorMessage,
          });
        }
      }
      
      // [NEW REQUIREMENT] Kiểm tra nhảy bước (forward step nhưng không phải next step)
      if (isForwardStep && !isSameStep && !isBackwardStep) {
        const expectedNextSteps = {
          1: [2, 5], // PENDING -> CONFIRMED, CANCELLED
          2: [3, 5], // CONFIRMED -> SHIPPING, CANCELLED
          3: [4, 6], // SHIPPING -> DELIVERED, RETURNED
          4: [6, 8], // DELIVERED -> RETURNED, COMPLETED
        };
        
        const allowedNext = expectedNextSteps[currentStatusId] || [];
        const isJumpingStep = !allowedNext.includes(targetStatusIdInt);
        
        if (isJumpingStep) {
          const currentStatus = OrderStatus.getById(currentStatusId);
          const targetStatus = OrderStatus.getById(targetStatusIdInt);
          
          return res.status(400).json({
            success: false,
            message: `Không thể nhảy bước từ "${currentStatus?.name || currentStatusId}" sang "${targetStatus?.name || targetStatusIdInt}". Workflow bắt buộc: phải theo thứ tự tuần tự.`,
          });
        }
      }
      

      await order.updateStatus(id, targetStatusId, processedBy);
      const updated = await order.findById(id);
      const statusInfo = OrderStatus.getById(targetStatusId);

      return res.status(200).json({
        success: true,
        message: `Cập nhật trạng thái thành công: ${statusInfo?.name || targetStatusId}`,
        data: {
          ...updated,
          status_name: statusInfo?.name,
          status_code: statusInfo?.code,
        },
      });
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: 'Lỗi khi cập nhật trạng thái',
        error: error.message,
      });
    }
  };

  // ============================================
  // CONFIRM ORDER FUNCTION: Xác nhận đơn hàng
  // ============================================
  /**
   * HTTP Handler: POST /orders/:id/confirm
   * Xác nhận đơn hàng (PENDING -> CONFIRMED)
   * 
   * Logic khác nhau cho COD và MoMo:
   * - COD: Có thể xác nhận ngay khi PENDING (chưa cần thanh toán)
   * - MoMo: Chỉ xác nhận khi đã thanh toán thành công
   * 
   * URL Params:
   * - id: ID của order (bắt buộc)
   * 
   * Request Body:
   * - processedBy: ID người xử lý (tùy chọn)
   * 
   * Response:
   * - 200: Success { success: true, message: "...", data: {...} }
   * - 400: Bad Request (validation error, chưa thanh toán MoMo, stock không đủ)
   * - 404: Not Found (không tìm thấy order)
   * 
   * Quy trình:
   * 1. Kiểm tra order tồn tại và ở trạng thái PENDING
   * 2. Kiểm tra có thể confirm không (COD hoặc MoMo đã thanh toán)
   * 3. Cập nhật status sang CONFIRMED
   * 4. Trừ stock cho tất cả order items (batch update)
   * 5. Ghi inventory transactions (batch insert)
   * 
   * Đặc biệt:
   * - Stock chỉ được trừ khi order được CONFIRMED (không trừ khi PENDING)
   * - Sử dụng batch SQL queries để tối ưu (tránh N+1 problem)
   * - Rollback status nếu stock không đủ
   * 
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Promise<void>} JSON response
   */
  const confirmOrder = async (req, res) => {
    console.log('========================================');
    console.log('[OrderController] confirmOrder function called');
    console.log('[OrderController] Request IP:', req.ip);
    console.log('[OrderController] Params:', req.params);
    console.log('[OrderController] Request body:', JSON.stringify(req.body, null, 2));
    
    try {
      const { id } = req.params;
      const { processedBy } = req.body;
      console.log('[OrderController] Confirming order:', { orderId: id, processedBy });

      console.log('[OrderController] 🔍 Fetching order data...');
      const orderData = await order.findById(id);
      if (!orderData) {
        console.log('[OrderController] ❌ Order not found');
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy đơn hàng',
        });
      }

      console.log('[OrderController] Order current status:', orderData.status_id);
      if (orderData.status_id !== OrderStatus.PENDING.id) {
        console.log('[OrderController] ❌ Invalid status for confirmation');
        return res.status(400).json({
          success: false,
          message: 'Chỉ có thể xác nhận đơn hàng ở trạng thái "Chờ xác nhận"',
        });
      }

      // Lấy payment method của order
      const paymentInfo = await getOrderPaymentInfo(id);

      // Kiểm tra có thể confirm không
      if (!OrderStatus.canConfirm(orderData.status_id, paymentInfo.paymentMethod, paymentInfo.isPaid)) {
        if (paymentInfo.paymentMethod === 'MOMO' && !paymentInfo.isPaid) {
          return res.status(400).json({
            success: false,
            message: 'Không thể xác nhận đơn hàng MoMo. Đơn hàng chưa được thanh toán.',
          });
        }
        return res.status(400).json({
          success: false,
          message: 'Không thể xác nhận đơn hàng ở trạng thái hiện tại',
        });
      }

      console.log('[OrderController] ✅ Confirming order...');
      await order.updateStatus(id, OrderStatus.CONFIRMED.id, processedBy);
      
      // Trừ stock khi đơn hàng được xác nhận (chỉ trừ khi CONFIRMED, không trừ khi PENDING)
      console.log('[OrderController] 📦 Deducting stock for confirmed order...');
      const { orderItem: orderItemModel } = require('../Models');
      const orderItems = await orderItemModel.findByOrderId(id);
      
      // Batch fetch all products using SQL WHERE IN instead of individual queries in loop
      const productIdsForStock = orderItems.map(item => item.product_id).filter(Boolean);
      const productMapForStock = await batchFetchProducts(productIdsForStock);
      console.log(`[OrderController] 🔍 Batch fetched ${Object.keys(productMapForStock).length} products for stock validation`);
      
      // Validate stock for all items first (before batch update)
      for (const item of orderItems) {
        // Use batch-fetched product data instead of individual query
        const productData = productMapForStock[item.product_id];
        
        if (!productData) {
          console.log(`[OrderController] ⚠️ Product ${item.product_id} not found, skipping stock update`);
          // Rollback status update
          await order.updateStatus(id, OrderStatus.PENDING.id, null);
          return res.status(400).json({
            success: false,
            message: `Sản phẩm ID ${item.product_id} không tồn tại`,
          });
        }
        
        if (productData.stock_quantity < item.quantity) {
          console.log(`[OrderController] ❌ Insufficient stock for product ${item.product_id}: need ${item.quantity}, have ${productData.stock_quantity}`);
          // Rollback status update
          await order.updateStatus(id, OrderStatus.PENDING.id, null);
          return res.status(400).json({
            success: false,
            message: `Sản phẩm ${productData.name} chỉ còn ${productData.stock_quantity} sản phẩm, không đủ để xác nhận đơn hàng`,
          });
        }
      }
      
      // All validations passed, now use batch SQL queries instead of individual queries in loop
      // 1. Batch update stock using SQL UPDATE with CASE WHEN (single query)
      const stockUpdates = orderItems.map(item => ({
        product_id: item.product_id,
        quantity_change: -item.quantity // Negative for deduction
      }));
      await product.batchUpdateStock(stockUpdates);
      console.log(`[OrderController] ✅ Batch updated stock for ${stockUpdates.length} products`);
      
      // 2. Batch insert inventory transactions using SQL INSERT with multiple VALUES (single query)
      const transactions = orderItems.map(item => ({
        product_id: item.product_id,
        quantity_change: -item.quantity, // Negative for deduction
        change_type: 'SALE',
        note: `Order ${orderData.order_number} confirmed`,
        created_by: processedBy || null
      }));
      await inventoryTransaction.batchRecordTransactions(transactions);
      console.log(`[OrderController] ✅ Batch recorded ${transactions.length} inventory transactions`);
      
      const updated = await order.findById(id);
      console.log('[OrderController] ✅ Order confirmed and stock deducted successfully');
      console.log('========================================');

      return res.status(200).json({
        success: true,
        message: 'Xác nhận đơn hàng thành công',
        data: updated,
      });
    } catch (error) {
      console.error('[OrderController] ❌❌❌ ERROR IN confirmOrder ❌❌❌');
      console.error('[OrderController] Error message:', error.message);
      console.error('[OrderController] Error stack:', error.stack);
      console.log('========================================');
      
      return res.status(400).json({
        success: false,
        message: 'Lỗi khi xác nhận đơn hàng',
        error: error.message,
      });
    }
  };

  // ============================================
  // START SHIPPING FUNCTION: Bắt đầu giao hàng
  // ============================================
  /**
   * HTTP Handler: POST /orders/:id/start-shipping
   * Bắt đầu giao hàng (CONFIRMED -> SHIPPING)
   * 
   * Logic:
   * - COD: Có thể bắt đầu giao hàng khi đã CONFIRMED
   * - MoMo: Phải đã thanh toán thành công
   * - Shipper: Chỉ có thể bắt đầu giao hàng cho đơn hàng mà họ đã nhận (có shipment với shipper_id của họ)
   * 
   * URL Params:
   * - id: ID của order (bắt buộc)
   * 
   * Request Body:
   * - processedBy: ID người xử lý (tùy chọn)
   * 
   * Response:
   * - 200: Success { success: true, message: "...", data: {...} }
   * - 400: Bad Request (validation error, chưa thanh toán MoMo)
   * - 403: Forbidden (Shipper không có quyền)
   * - 404: Not Found (không tìm thấy order)
   * 
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Promise<void>} JSON response
   */
  const startShipping = async (req, res) => {
    console.log('========================================');
    console.log('[OrderController] startShipping function called');
    console.log('[OrderController] Request IP:', req.ip);
    console.log('[OrderController] User:', req.user);
    console.log('[OrderController] Params:', req.params);
    
    try {
      const { id } = req.params;
      const { processedBy } = req.body;
      const userRoleId = req.user?.roleId;
      const userId = req.user?.userId;

      const orderData = await order.findById(id);
      if (!orderData) {
        console.log('[OrderController] ❌ Order not found');
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy đơn hàng',
        });
      }

      // Kiểm tra quyền: Shipper chỉ có thể cập nhật đơn hàng mà họ đã nhận
      if (userRoleId === 2) {
        // Tìm shipper_id từ user_id trước
        const db = require('../Config/database').getDatabase();
        let shipperId = null;
        try {
          const userData = await require('../Models').user.findById(userId);
          if (userData) {
            const { shipper } = require('../Models');
            // Use SQL LIMIT 1 instead of JavaScript array access
            const shipperData = await shipper.findFirstByName(userData.username || userData.email || '');
            if (shipperData) {
              shipperId = shipperData.shipper_id;
            }
          }
        } catch (shipperError) {
          console.error('[OrderController] Error finding shipper:', shipperError);
        }

        if (!shipperId) {
          console.log('[OrderController] ❌ Shipper cannot update order: No shipper found');
          return res.status(403).json({
            success: false,
            message: 'Bạn chỉ có thể cập nhật đơn hàng mà bạn đã nhận giao',
          });
        }

        // Shipper: Kiểm tra xem đơn hàng này có shipment với shipper_id của họ không
        // Use SQL WHERE clause instead of JavaScript filter
        const { shipment } = require('../Models');
        const myShipment = await shipment.findByOrderIdAndShipperId(id, shipperId);
        
        if (!myShipment) {
          console.log('[OrderController] ❌ Shipper cannot update order: No shipment found');
          return res.status(403).json({
            success: false,
            message: 'Bạn chỉ có thể cập nhật đơn hàng mà bạn đã nhận giao',
          });
        }
      }

      if (orderData.status_id !== OrderStatus.CONFIRMED.id) {
        console.log('[OrderController] ❌ Invalid status for shipping:', orderData.status_id);
        return res.status(400).json({
          success: false,
          message: 'Chỉ có thể bắt đầu giao hàng khi đơn hàng đã được xác nhận',
        });
      }

      // Lấy payment method của order
      const paymentInfo = await getOrderPaymentInfo(id);

      // Kiểm tra có thể bắt đầu giao hàng không
      if (!OrderStatus.canStartShipping(orderData.status_id, paymentInfo.paymentMethod, paymentInfo.isPaid)) {
        if (paymentInfo.paymentMethod === 'MOMO' && !paymentInfo.isPaid) {
          return res.status(400).json({
            success: false,
            message: 'Không thể bắt đầu giao hàng. Đơn hàng MoMo chưa được thanh toán.',
          });
        }
        return res.status(400).json({
          success: false,
          message: 'Không thể bắt đầu giao hàng ở trạng thái hiện tại',
        });
      }

      console.log('[OrderController] 🔄 Updating order status to SHIPPING...');
      await order.updateStatus(id, OrderStatus.SHIPPING.id, processedBy || userId);
      const updated = await order.findById(id);
      console.log('[OrderController] ✅ Order status updated to SHIPPING');
      console.log('========================================');

      return res.status(200).json({
        success: true,
        message: 'Bắt đầu giao hàng thành công',
        data: updated,
      });
    } catch (error) {
      console.error('[OrderController] ❌❌❌ ERROR IN startShipping ❌❌❌');
      console.error('[OrderController] Error message:', error.message);
      console.error('[OrderController] Error stack:', error.stack);
      console.log('========================================');
      
      return res.status(400).json({
        success: false,
        message: 'Lỗi khi bắt đầu giao hàng',
        error: error.message,
      });
    }
  };

  // ============================================
  // CONFIRM PAYMENT FUNCTION: Xác nhận thanh toán cho đơn COD
  // ============================================
  /**
   * HTTP Handler: POST /orders/:id/confirm-payment
   * Xác nhận thanh toán cho đơn COD sau khi đã giao hàng
   * 
   * [NEW REQUIREMENT] COD: Sau DELIVERED, admin phải confirm payment trước khi order hoàn thành
   * 
   * Logic: Admin có thể chọn trạng thái thanh toán (đã thanh toán/chưa thanh toán)
   * - Nếu chọn "đã thanh toán" (paid = true):
   *   + Cập nhật payment status = Paid
   *   + Order status = COMPLETED
   *   + Ghi vào system bank account
   * - Nếu chọn "chưa thanh toán" (paid = false):
   *   + Cập nhật payment status = Pending
   *   + Giữ order ở DELIVERED
   * 
   * URL Params:
   * - id: ID của order (bắt buộc)
   * 
   * Request Body:
   * - paid: true/false - Đã thanh toán chưa (mặc định: true)
   * - processedBy: ID người xử lý (tùy chọn)
   * 
   * Response:
   * - 200: Success { success: true, message: "...", data: {...} }
   * - 400: Bad Request (validation error, không phải COD order, không ở DELIVERED)
   * - 404: Not Found (không tìm thấy order)
   * 
   * Đặc biệt:
   * - Chỉ áp dụng cho COD orders
   * - Tự động ghi vào system bank account khi thanh toán thành công
   * 
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Promise<void>} JSON response
   */
  const confirmPayment = async (req, res) => {
    console.log('========================================');
    console.log('[OrderController] confirmPayment function called');
    console.log('[OrderController] Request IP:', req.ip);
    console.log('[OrderController] User:', req.user);
    console.log('[OrderController] Params:', req.params);
    console.log('[OrderController] Request body:', JSON.stringify(req.body, null, 2));
    
    try {
      const { id } = req.params;
      const { processedBy, paid = true } = req.body;
      const userId = req.user?.userId;
      
      console.log('[OrderController] 🔍 Confirming payment for COD order:', {
        orderId: id,
        paid,
        processedBy: processedBy || userId,
      });
      
      const orderData = await order.findById(id);
      if (!orderData) {
        console.log('[OrderController] ❌ Order not found');
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy đơn hàng',
        });
      }

      console.log('[OrderController] 🔍 Order current status:', {
        status_id: orderData.status_id,
        status_name: OrderStatus.getById(orderData.status_id)?.name || 'N/A',
      });

      // Chỉ cho phép confirm payment khi order ở trạng thái DELIVERED
      if (orderData.status_id !== OrderStatus.DELIVERED.id) {
        const currentStatus = OrderStatus.getById(orderData.status_id);
        console.log('[OrderController] ❌ Invalid status for payment confirmation:', orderData.status_id);
        return res.status(400).json({
          success: false,
          message: `Chỉ có thể xác nhận thanh toán khi đơn hàng ở trạng thái "Đã giao hàng". Đơn hàng hiện tại đang ở trạng thái "${currentStatus?.name || orderData.status_id}".`,
        });
      }

      // Lấy payment method của order
      const paymentInfo = await getOrderPaymentInfo(id);
      console.log('[OrderController] 🔍 Payment info:', {
        paymentMethod: paymentInfo.paymentMethod,
        hasPayment: !!paymentInfo.payment,
        currentPaymentStatus: paymentInfo.payment?.payment_status_id,
      });

      // Chỉ cho phép confirm payment cho COD
      if (paymentInfo.paymentMethod !== 'COD' && paymentInfo.paymentMethod !== 'cod') {
        console.log('[OrderController] ❌ Not a COD order:', paymentInfo.paymentMethod);
        return res.status(400).json({
          success: false,
          message: 'Chỉ đơn hàng COD mới cần xác nhận thanh toán sau khi giao hàng. Đơn hàng MoMo đã được thanh toán trước.',
        });
      }

      // Tìm payment status IDs
      const { paymentStatus } = require('../Models');
      let paidStatusId = null;
      let pendingStatusId = null;
      
      try {
        const paidStatus = await paymentStatus.findByName('Paid');
        if (paidStatus) {
          paidStatusId = paidStatus.payment_status_id;
        } else {
          // Tìm bằng LIKE using SQL
          const paidRow = await paymentStatus.findFirstByNameLike('paid');
          if (paidRow && paidRow.payment_status_id) {
            paidStatusId = paidRow.payment_status_id;
          }
        }
        
        const pendingStatus = await paymentStatus.findByName('Pending');
        if (pendingStatus) {
          pendingStatusId = pendingStatus.payment_status_id;
        } else {
          // Try case-insensitive search using SQL
          const pendingRow = await paymentStatus.findFirstByNameLike('pending');
          if (pendingRow && pendingRow.payment_status_id) {
            pendingStatusId = pendingRow.payment_status_id;
          }
        }
      } catch (statusError) {
        console.error('[OrderController] Error finding payment status:', statusError);
        // Fallback: sử dụng ID mặc định
        paidStatusId = paidStatusId || 2;
        pendingStatusId = pendingStatusId || 1;
      }

      const targetPaymentStatusId = paid ? paidStatusId : pendingStatusId;
      console.log('[OrderController] 🔄 Updating payment status:', {
        paid,
        targetPaymentStatusId,
        paidStatusId,
        pendingStatusId,
      });

      // Nếu chưa có payment record, tạo mới
      let updatedPayment = null;
      if (!paymentInfo.payment) {
        console.log('[OrderController] 📦 Creating new payment record...');
        const { payment } = require('../Models');
        const paymentMethod = await require('../Models').paymentMethod.findByName('COD');
        const paymentMethodId = paymentMethod?.payment_method_id || 2;
        
        const createResult = await payment.create({
          order_id: id,
          payment_method_id: paymentMethodId,
          gateway: 'COD',
          amount: orderData.total_amount,
          payment_status_id: targetPaymentStatusId,
          paid_at: paid ? new Date() : null,
          gateway_status: paid ? 'success' : 'pending',
        });
        console.log('[OrderController] ✅ Payment record created');
        
        // Reload payment data từ database
        if (createResult && createResult.insertId) {
          updatedPayment = await payment.findById(createResult.insertId);
        }
      } else {
        // Cập nhật payment status nếu đã có
        console.log('[OrderController] 🔄 Updating existing payment record...');
        const { payment } = require('../Models');
        await payment.update(paymentInfo.payment.payment_id, {
          payment_status_id: targetPaymentStatusId,
          paid_at: paid ? new Date() : null,
          gateway_status: paid ? 'success' : 'pending',
        });
        console.log('[OrderController] ✅ Payment record updated');
        
        // Reload payment data từ database để đảm bảo có dữ liệu mới nhất
        updatedPayment = await payment.findById(paymentInfo.payment.payment_id);
      }
      
      // Enrich payment với payment status data
      if (updatedPayment) {
        try {
          const { paymentStatus } = require('../Models');
          const statusId = parseInt(updatedPayment.payment_status_id);
          if (statusId) {
            const statusData = await paymentStatus.findById(statusId);
            if (statusData) {
              statusData.name = statusData.status_name;
              updatedPayment.payment_status = statusData;
              updatedPayment.status = statusData;
            }
          }
        } catch (statusError) {
          console.error('[OrderController] Error enriching payment status:', statusError);
        }
      }

      // Nếu đã thanh toán, chuyển order sang COMPLETED
      if (paid) {
        console.log('[OrderController] 🔄 Order is paid, updating to COMPLETED...');
        
        // Đảm bảo status_id 8 (COMPLETED) tồn tại
        const { orderStatus } = require('../Models');
        let completedStatusId = OrderStatus.COMPLETED.id;
        
        try {
          const completedStatus = await orderStatus.findById(completedStatusId);
          if (!completedStatus) {
            console.log('[OrderController] ⚠️ Status ID 8 (COMPLETED) not found, creating...');
            const db = require('../Config/database').getDatabase();
            try {
              const [insertResult] = await db.execute(
                'INSERT INTO `orderstatus` (`status_id`, `status_name`, `sort_order`) VALUES (?, ?, ?)',
                [completedStatusId, OrderStatus.COMPLETED.name, OrderStatus.COMPLETED.sortOrder]
              );
              if (insertResult && insertResult.insertId) {
                console.log('[OrderController] ✅ Created COMPLETED status with ID:', completedStatusId);
              }
            } catch (insertError) {
              console.log('[OrderController] ⚠️ Error creating status, trying to find by name...');
              const statusByName = await orderStatus.findByName(OrderStatus.COMPLETED.name);
              if (statusByName) {
                completedStatusId = statusByName.status_id;
                console.log('[OrderController] ✅ Found COMPLETED status with ID:', completedStatusId);
              }
            }
          }
          
          await order.updateStatus(id, completedStatusId, processedBy || userId);
        const updated = await order.findById(id);
          
          // Enrich order với payment data đã cập nhật
          if (updatedPayment) {
            updated.payment = updatedPayment;
            updated.payments = [updatedPayment];
          }
          
          // Ghi vào system bank account khi COD được xác nhận thanh toán
          // Chỉ ghi khi payment status chuyển từ chưa thanh toán sang đã thanh toán
          const previousPaymentStatus = paymentInfo.payment?.payment_status_id ? parseInt(paymentInfo.payment.payment_status_id) : null;
          const isNewlyPaid = previousPaymentStatus !== 2 && targetPaymentStatusId === paidStatusId;
          
          if (isNewlyPaid) {
            try {
              const SystemBankService = require('../Services/SystemBankService');
              await SystemBankService.recordPayment(
                updatedPayment.amount || orderData.total_amount,
                id,
                updatedPayment.payment_id,
                `Thanh toán COD cho đơn hàng #${orderData.order_number}`,
                'COD',
                null
              );
              console.log('[OrderController] ✅ COD payment recorded in system bank');
            } catch (bankError) {
              console.error('[OrderController] ⚠️ Error recording COD payment in bank (non-critical):', bankError.message);
              // Don't throw - payment status is already updated
            }
          } else {
            console.log('[OrderController] ℹ️ Payment status unchanged or already paid, skipping bank record');
          }
          
          console.log('[OrderController] ✅ Order status updated to COMPLETED');
          console.log('[OrderController] 📊 Updated payment status:', {
            payment_id: updatedPayment?.payment_id,
            payment_status_id: updatedPayment?.payment_status_id,
            payment_status_name: updatedPayment?.payment_status?.status_name || updatedPayment?.status?.status_name,
          });
          console.log('========================================');

        return res.status(200).json({
          success: true,
          message: 'Xác nhận thanh toán thành công. Đơn hàng đã hoàn thành.',
          data: updated,
        });
        } catch (statusError) {
          console.error('[OrderController] ❌ Error updating to COMPLETED status:', statusError.message);
          // Nếu lỗi, vẫn trả về thành công vì payment đã được cập nhật
          const updated = await order.findById(id);
          
          // Enrich order với payment data đã cập nhật
          if (updatedPayment) {
            updated.payment = updatedPayment;
            updated.payments = [updatedPayment];
          }
          
          console.log('[OrderController] ⚠️ Payment updated but order status remains DELIVERED');
          console.log('[OrderController] 📊 Updated payment status:', {
            payment_id: updatedPayment?.payment_id,
            payment_status_id: updatedPayment?.payment_status_id,
            payment_status_name: updatedPayment?.payment_status?.status_name || updatedPayment?.status?.status_name,
          });
          console.log('========================================');
          
          return res.status(200).json({
            success: true,
            message: 'Đã cập nhật trạng thái thanh toán thành công. Đơn hàng vẫn ở trạng thái "Đã giao hàng".',
            data: updated,
          });
        }
      } else {
        // Nếu chưa thanh toán, giữ ở DELIVERED
        console.log('[OrderController] ✅ Payment status updated to Pending, order remains DELIVERED');
        const updated = await order.findById(id);
        
        // Enrich order với payment data đã cập nhật
        if (updatedPayment) {
          updated.payment = updatedPayment;
          updated.payments = [updatedPayment];
        }
        
        console.log('[OrderController] 📊 Updated payment status:', {
          payment_id: updatedPayment?.payment_id,
          payment_status_id: updatedPayment?.payment_status_id,
          payment_status_name: updatedPayment?.payment_status?.status_name || updatedPayment?.status?.status_name,
        });
        console.log('========================================');

        return res.status(200).json({
          success: true,
          message: 'Đã cập nhật trạng thái thanh toán. Đơn hàng vẫn ở trạng thái "Đã giao hàng".',
          data: updated,
        });
      }
    } catch (error) {
      console.error('[OrderController] ❌❌❌ ERROR IN confirmPayment ❌❌❌');
      console.error('[OrderController] Error message:', error.message);
      console.error('[OrderController] Error stack:', error.stack);
      console.log('========================================');
      
      return res.status(400).json({
        success: false,
        message: 'Lỗi khi xác nhận thanh toán',
        error: error.message,
      });
    }
  };

  // ============================================
  // MARK AS DELIVERED FUNCTION: Xác nhận đã giao hàng
  // ============================================
  /**
   * HTTP Handler: POST /orders/:id/mark-delivered
   * Xác nhận đã giao hàng (SHIPPING -> DELIVERED)
   * 
   * Logic:
   * - COD: Sau DELIVERED, admin phải confirm payment trước khi order hoàn thành
   * - MoMo: Đã thanh toán trước, tự động complete sau DELIVERED
   * - Shipper: Chỉ có thể xác nhận đơn hàng mà họ đã nhận (có shipment với shipper_id của họ)
   * 
   * URL Params:
   * - id: ID của order (bắt buộc)
   * 
   * Request Body:
   * - processedBy: ID người xử lý (tùy chọn)
   * - codPaid: true/false - COD đã thanh toán chưa (deprecated, dùng confirmPayment)
   * 
   * Response:
   * - 200: Success { success: true, message: "...", data: {...} }
   * - 400: Bad Request (validation error, không ở SHIPPING)
   * - 403: Forbidden (Shipper không có quyền)
   * - 404: Not Found (không tìm thấy order)
   * 
   * Đặc biệt:
   * - MoMo orders tự động chuyển sang COMPLETED sau DELIVERED (vì đã thanh toán)
   * - COD orders giữ ở DELIVERED, chờ admin confirm payment
   * 
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Promise<void>} JSON response
   */
  const markAsDelivered = async (req, res) => {
    console.log('========================================');
    console.log('[OrderController] markAsDelivered function called');
    console.log('[OrderController] Request IP:', req.ip);
    console.log('[OrderController] User:', req.user);
    console.log('[OrderController] Params:', req.params);
    console.log('[OrderController] Request body:', JSON.stringify(req.body, null, 2));
    
    try {
      const { id } = req.params;
      const { processedBy, codPaid = false } = req.body;

      console.log('[OrderController] 🔍 Marking order as delivered:', {
        orderId: id,
        processedBy,
        userRoleId: req.user?.roleId,
        userId: req.user?.userId,
      });

      const orderData = await order.findById(id);
      if (!orderData) {
        console.log('[OrderController] ❌ [DEBUG] Order not found');
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy đơn hàng',
        });
      }

      console.log('[OrderController] 🔍 Order current status:', {
        status_id: orderData.status_id,
        status_name: orderData.status_name || 'N/A',
      });

      // Kiểm tra quyền: Shipper chỉ có thể cập nhật đơn hàng mà họ đã nhận
      const userRoleId = req.user?.roleId;
      const userId = req.user?.userId;
      
      if (userRoleId === 2) {
        // Tìm shipper_id từ user_id trước
        const db = require('../Config/database').getDatabase();
        let shipperId = null;
        try {
          const userData = await require('../Models').user.findById(userId);
          if (userData) {
            const { shipper } = require('../Models');
            // Use SQL LIMIT 1 instead of JavaScript array access
            const shipperData = await shipper.findFirstByName(userData.username || userData.email || '');
            if (shipperData) {
              shipperId = shipperData.shipper_id;
            }
          }
        } catch (shipperError) {
          console.error('[OrderController] Error finding shipper:', shipperError);
        }

        if (!shipperId) {
          console.log('[OrderController] ❌ Shipper cannot update order: No shipper found');
          return res.status(403).json({
            success: false,
            message: 'Bạn chỉ có thể cập nhật đơn hàng mà bạn đã nhận giao',
          });
        }

        // Shipper: Kiểm tra xem đơn hàng này có shipment với shipper_id của họ không
        // Use SQL WHERE clause instead of JavaScript filter
        const { shipment } = require('../Models');
        const myShipment = await shipment.findByOrderIdAndShipperId(id, shipperId);
        
        if (!myShipment) {
          console.log('[OrderController] ❌ Shipper cannot update order: No shipment found');
          return res.status(403).json({
            success: false,
            message: 'Bạn chỉ có thể cập nhật đơn hàng mà bạn đã nhận giao',
          });
        }
      }

      if (orderData.status_id !== OrderStatus.SHIPPING.id) {
        console.log('[OrderController] ❌ Invalid status for delivery:', orderData.status_id);
        return res.status(400).json({
          success: false,
          message: 'Chỉ có thể xác nhận đã giao hàng khi đơn hàng đang được giao',
        });
      }

      // Lấy payment method của order
      console.log('[OrderController] 🔍 Getting payment info...');
      const paymentInfo = await getOrderPaymentInfo(id);
      console.log('[OrderController] 🔍 Payment info:', {
        paymentMethod: paymentInfo.paymentMethod,
        isPaid: paymentInfo.isPaid,
        hasPayment: !!paymentInfo.payment,
        allPayments: paymentInfo.allPayments?.length || 0,
      });

      // Kiểm tra xem có payment MoMo đã thanh toán không
      // [NEW REQUIREMENT] Đơn hàng thanh toán bằng MoMo đã giao hàng sẽ tự động hoàn thành
      // Use SQL WHERE clause instead of JavaScript filter
      const paidStatusId = await getPaidStatusId();
      const { payment } = require('../Models');
      const momoPayments = await payment.findAllByOrderIdStatusAndGateway(id, paidStatusId, 'MOMO');
      
      const isMoMoPaid = momoPayments && momoPayments.length > 0;
      console.log('[OrderController] 🔍 MoMo payment check:', {
        isMoMoPaid,
        momoPaymentsCount: momoPayments.length,
        paymentMethod: paymentInfo.paymentMethod,
        isPaid: paymentInfo.isPaid,
        paidStatusId,
        allPaymentsCount: paymentInfo.allPayments?.length || 0,
      });

      // Logic khác nhau cho COD và MoMo sau DELIVERED
      console.log('[OrderController] 🔄 Updating order status to DELIVERED...');
      await order.updateStatus(id, OrderStatus.DELIVERED.id, processedBy || req.user?.userId);
      const updated = await order.findById(id);
      console.log('[OrderController] ✅ Order status updated to DELIVERED');
      
      // [NEW REQUIREMENT] MoMo: Tự động complete sau DELIVERED (vì đã thanh toán rồi)
      // COD: Giữ ở DELIVERED, chờ admin confirm payment
      if (isMoMoPaid || (paymentInfo.paymentMethod === 'MOMO' && paymentInfo.isPaid)) {
          console.log('[OrderController] 🔄 MoMo order is paid, auto-completing...');
          
          // Đảm bảo status_id 8 (COMPLETED) tồn tại trong database
          const { orderStatus } = require('../Models');
          let completedStatusId = OrderStatus.COMPLETED.id;
          
          try {
            // Kiểm tra xem status_id 8 có tồn tại không
            const completedStatus = await orderStatus.findById(completedStatusId);
            if (!completedStatus) {
              console.log('[OrderController] ⚠️ Status ID 8 (COMPLETED) not found, creating...');
              const db = require('../Config/database').getDatabase();
              try {
                const [insertResult] = await db.execute(
                  'INSERT INTO `orderstatus` (`status_id`, `status_name`, `sort_order`) VALUES (?, ?, ?)',
                  [completedStatusId, OrderStatus.COMPLETED.name, OrderStatus.COMPLETED.sortOrder]
                );
                if (insertResult && insertResult.insertId) {
                  console.log('[OrderController] ✅ Created COMPLETED status with ID:', completedStatusId);
                }
              } catch (insertError) {
                // Nếu insert thất bại (có thể do đã tồn tại hoặc lỗi khác), thử tìm lại
                console.log('[OrderController] ⚠️ Error creating status, trying to find by name...');
                const statusByName = await orderStatus.findByName(OrderStatus.COMPLETED.name);
                if (statusByName) {
                  completedStatusId = statusByName.status_id;
                  console.log('[OrderController] ✅ Found COMPLETED status with ID:', completedStatusId);
                } else {
                  // Nếu không tìm thấy và không tạo được, giữ ở DELIVERED
                  console.log('[OrderController] ⚠️ Cannot create or find COMPLETED status, keeping order at DELIVERED');
                  console.log('[OrderController] ✅ Order marked as delivered (MoMo paid, but COMPLETED status not available)');
                  console.log('========================================');
                  
                  return res.status(200).json({
                    success: true,
                    message: 'Xác nhận đã giao hàng thành công. Đơn hàng đã được thanh toán (MoMo).',
                    data: updated,
                  });
                }
              }
            }
            
            // Cập nhật sang COMPLETED
            await order.updateStatus(id, completedStatusId, processedBy || req.user?.userId);
          const completedOrder = await order.findById(id);
          
          console.log('[OrderController] ✅ MoMo order completed');
          console.log('========================================');
          
          return res.status(200).json({
            success: true,
            message: 'Xác nhận đã giao hàng thành công. Đơn hàng đã hoàn thành (MoMo đã thanh toán).',
            data: completedOrder,
          });
          } catch (statusError) {
            console.error('[OrderController] ❌ Error updating to COMPLETED status:', statusError.message);
            // Nếu lỗi, giữ ở DELIVERED và trả về thành công
            console.log('[OrderController] ⚠️ Keeping order at DELIVERED status due to error');
            console.log('[OrderController] ✅ Order marked as delivered (MoMo paid)');
            console.log('========================================');
            
            return res.status(200).json({
              success: true,
              message: 'Xác nhận đã giao hàng thành công. Đơn hàng đã được thanh toán (MoMo).',
              data: updated,
            });
        }
      }
      
      console.log('[OrderController] ✅ Order marked as delivered (COD or unpaid MoMo)');
      console.log('========================================');

      return res.status(200).json({
        success: true,
        message: 'Xác nhận đã giao hàng thành công',
        data: updated,
      });
    } catch (error) {
      console.error('[OrderController] ❌❌❌ ERROR IN markAsDelivered ❌❌❌');
      console.error('[OrderController] Error message:', error.message);
      console.error('[OrderController] Error stack:', error.stack);
      console.log('========================================');
      
      return res.status(400).json({
        success: false,
        message: 'Lỗi khi xác nhận đã giao hàng',
        error: error.message,
      });
    }
  };

  // ============================================
  // GET BY ID FUNCTION: Override getById từ BaseController
  // ============================================
  /**
   * HTTP Handler: GET /orders/:id
   * Override getById từ BaseController để include items và payment
   * 
   * Authorization: Admin (role 1), Shipper (role 2), hoặc Order Owner có thể truy cập
   * 
   * URL Params:
   * - id: ID của order (bắt buộc)
   * 
   * Response:
   * - 200: Success { success: true, data: {...} }
   * - 401: Unauthorized (chưa đăng nhập)
   * - 403: Forbidden (không có quyền)
   * - 404: Not Found (không tìm thấy)
   * - 500: Server Error
   * 
   * Đặc biệt:
   * - Tự động enrich order với: order status, order items, payments, payment status
   * - Sử dụng Promise.all để fetch parallel (tối ưu)
   * - Priority payment: Paid payment > Most recent payment
   * 
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Promise<void>} JSON response
   */
  const getById = async (req, res) => {
    console.log('========================================');
    console.log('[OrderController] getById function called');
    console.log('[OrderController] Request IP:', req.ip);
    console.log('[OrderController] User:', req.user);
    console.log('[OrderController] Params:', req.params);
    
    try {
      const { id } = req.params;
      
      console.log('[OrderController] 🔍 Fetching order by ID:', id);
      const data = await order.findById(id);

      if (!data) {
        console.log('[OrderController] ❌ [DEBUG] Order not found');
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy đơn hàng',
        });
      }

      // Authorization check: Admin (role 1), Shipper (role 2), or Order Owner can access
      if (req.user) {
        const userRoleId = req.user.roleId;
        const userId = req.user.userId;
        const orderUserId = data.user_id;

        console.log('[OrderController] 🔍 Authorization check:', {
          userRoleId,
          userId,
          orderUserId,
          isAdmin: userRoleId === 1,
          isShipper: userRoleId === 2,
          isOwner: userId === orderUserId,
        });

        // Allow if: Admin, Shipper, or Order Owner
        if (userRoleId !== 1 && userRoleId !== 2 && userId !== orderUserId) {
          console.log('[OrderController] ❌ Unauthorized access');
          return res.status(403).json({
            success: false,
            message: 'Bạn không có quyền truy cập đơn hàng này.',
          });
        }
      } else {
        // If not authenticated, deny access
        console.log('[OrderController] ❌ Not authenticated');
        return res.status(401).json({
          success: false,
          message: 'Vui lòng đăng nhập để tiếp tục.',
        });
      }

      // [OPTIMIZED] Enrich order with status and payment data using batch SQL queries
      // Use Promise.all for parallel execution (not N+1 problem, these are independent queries)
      console.log('[OrderController] 🔄 Enriching order with status and payment data...');
      const { payment, paymentStatus, orderStatus } = require('../Models');
      const db = require('../Config/database').getDatabase();
      const paidStatusId = await getPaidStatusId();
      
      // Execute queries in parallel using Promise.all (these are independent, not sequential)
      // This is optimal because:
      // 1. Order status query is independent
      // 2. Order items query is independent
      // 3. Payments query is independent
      // 4. Primary payment query is independent (can be derived from payments, but separate query is faster for single result)
      const [
        statusResult,
        itemsResult,
        paymentsResult,
        primaryPaymentResult,
      ] = await Promise.all([
        // 1. Fetch order status (only if status_id exists) - Single SQL query
        data.status_id ? db.execute(
          `SELECT * FROM \`orderstatus\` WHERE \`status_id\` = ? LIMIT 1`,
          [data.status_id]
        ) : Promise.resolve([[]]),
        // 2. Fetch order items - Single SQL query
        orderItem.findByOrderId(id),
        // 3. Fetch all payments - Single SQL query
        payment.findByOrderId(id),
        // 4. Fetch primary payment (paid first, then most recent) - Single SQL query with ORDER BY CASE
        db.execute(
          `SELECT * FROM \`payments\` 
           WHERE \`order_id\` = ? 
           ORDER BY 
             CASE WHEN \`payment_status_id\` = ? THEN 1 ELSE 2 END,
             \`created_at\` DESC 
           LIMIT 1`,
          [id, paidStatusId]
        ),
      ]);
      
      const [statusRows] = statusResult;
      const items = itemsResult;
      const payments = paymentsResult;
      const [primaryPaymentRows] = primaryPaymentResult;
      
      // Enrich order status
      if (statusRows && statusRows.length > 0) {
        const statusData = statusRows[0];
        statusData.name = statusData.status_name;
        data.order_status = statusData;
        data.order_status_id = data.status_id;
      } else if (data.status_id) {
        data.order_status_id = data.status_id;
      }
      
      // Enrich payment data
      // CRITICAL FIX: Ensure we select the paid payment if it exists
      // Priority: 1. Paid payment, 2. Most recent payment
      let primaryPayment = primaryPaymentRows?.[0] || null;
      
      // Double-check: If we have multiple payments, ensure we select the paid one
      if (payments && payments.length > 0) {
        // First, try to find a paid payment from all payments
        const paidPayment = payments.find(p => {
          const statusId = parseInt(p.payment_status_id);
          return statusId === paidStatusId;
        });
        
        if (paidPayment) {
          // Use the paid payment as primary
          primaryPayment = paidPayment;
          console.log('[OrderController] ✅ Found paid payment, using as primary:', {
            paymentId: primaryPayment.payment_id,
            paymentStatusId: primaryPayment.payment_status_id,
            paidStatusId: paidStatusId,
          });
        } else if (!primaryPayment) {
          // If no paid payment and no primary from query, use most recent
          primaryPayment = payments[0];
          console.log('[OrderController] ⚠️ No paid payment found, using most recent:', {
            paymentId: primaryPayment?.payment_id,
            paymentStatusId: primaryPayment?.payment_status_id,
          });
        }
      }
      
      // Fetch payment status for primary payment if exists (single SQL query)
      if (primaryPayment && primaryPayment.payment_status_id) {
        const paymentStatusId = parseInt(primaryPayment.payment_status_id);
        const statusData = await paymentStatus.findById(paymentStatusId);
        if (statusData) {
          statusData.name = statusData.status_name;
          primaryPayment.payment_status = statusData;
          primaryPayment.status = statusData;
        }
      }
      
      data.items = items || [];
      data.order_items = items || [];
      data.payment = primaryPayment;
      data.payments = payments || [];
      
      // Log payment info for debugging
      console.log('[OrderController] 💳 Payment info:', {
        hasPrimaryPayment: !!primaryPayment,
        primaryPaymentId: primaryPayment?.payment_id,
        primaryPaymentStatusId: primaryPayment?.payment_status_id,
        primaryPaymentStatusName: primaryPayment?.payment_status?.status_name || primaryPayment?.payment_status?.name,
        paidStatusId: paidStatusId,
        isPaid: primaryPayment ? parseInt(primaryPayment.payment_status_id) === paidStatusId : false,
        totalPayments: payments?.length || 0,
      });
      
      // Normalize items field
      data.items = items || [];
      data.order_items = items || [];

      console.log('[OrderController] ✅ Order enriched:', {
        order_id: data.order_id,
        status_id: data.status_id,
        hasPayment: !!data.payment,
        itemsCount: items?.length || 0,
      });
      console.log('========================================');

      return res.status(200).json({
        success: true,
        data,
      });
    } catch (error) {
      console.error('[OrderController] ❌❌❌ ERROR IN getById ❌❌❌');
      console.error('[OrderController] Error message:', error.message);
      console.error('[OrderController] Error stack:', error.stack);
      console.log('========================================');
      
      return res.status(500).json({
        success: false,
        message: 'Lỗi khi lấy dữ liệu',
        error: error.message,
      });
    }
  };

  // ============================================
  // CANCEL ORDER FUNCTION: Hủy đơn hàng
  // ============================================
  /**
   * HTTP Handler: POST /orders/:id/cancel
   * Hủy đơn hàng (chuyển sang CANCELLED)
   * 
   * URL Params:
   * - id: ID của order (bắt buộc)
   * 
   * Request Body:
   * - reason: Lý do hủy (tùy chọn)
   * 
   * Response:
   * - 200: Success { success: true, message: "...", data: {...} }
   * - 400: Bad Request (validation error, không thể hủy ở trạng thái này)
   * - 403: Forbidden (customer chỉ có thể hủy đơn hàng của mình)
   * - 404: Not Found (không tìm thấy order)
   * 
   * Quy trình:
   * 1. Kiểm tra quyền (customer chỉ có thể hủy đơn hàng của mình)
   * 2. Kiểm tra có thể hủy không (chỉ PENDING, không phải CONFIRMED)
   * 3. Kiểm tra đặc biệt: Customer không thể hủy đơn hàng MoMo đã thanh toán
   * 4. Cập nhật status sang CANCELLED
   * 5. Hoàn lại stock (chỉ nếu order đã CONFIRMED - vì chỉ khi đó mới trừ stock)
   * 
   * Đặc biệt:
   * - Order CONFIRMED không thể hủy (cả customer và admin)
   * - Customer không thể hủy đơn hàng MoMo đã thanh toán (phải liên hệ hỗ trợ)
   * - Sử dụng batch SQL queries để hoàn lại stock (tối ưu)
   * 
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Promise<void>} JSON response
   */
  const cancelOrder = async (req, res) => {
    console.log('========================================');
    console.log('[OrderController] cancelOrder function called');
    console.log('[OrderController] Request IP:', req.ip);
    console.log('[OrderController] Params:', req.params);
    console.log('[OrderController] Request body:', JSON.stringify(req.body, null, 2));
    
    try {
      const { id } = req.params;
      const { reason } = req.body;
      console.log('[OrderController] Cancelling order:', { orderId: id, reason });

      console.log('[OrderController] 🔍 Fetching order data...');
      const orderData = await order.findById(id);
      if (!orderData) {
        console.log('[OrderController] ❌ Order not found');
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy đơn hàng',
        });
      }
      console.log('[OrderController] Order current status:', orderData.status_id);

      // Kiểm tra quyền: Lấy user từ request (giả sử có middleware auth)
      // Nếu không có req.user, mặc định là customer (để đảm bảo an toàn)
      const isCustomer = !req.user || req.user.role_id !== 1; // Giả sử role_id = 1 là admin
      const userId = req.user?.user_id;
      console.log('[OrderController] User info:', { isCustomer, userId, orderUserId: orderData.user_id });

      // Kiểm tra customer chỉ có thể hủy đơn hàng của mình
      if (isCustomer) {
        if (!userId || orderData.user_id !== parseInt(userId)) {
          console.log('[OrderController] ❌ Unauthorized: Order does not belong to user');
          return res.status(403).json({
            success: false,
            message: 'Bạn không có quyền hủy đơn hàng này',
          });
        }
      }

      // [REQUIREMENT] Kiểm tra trạng thái có thể hủy không
      // Order CONFIRMED không thể hủy (cả customer và admin)
      console.log('[OrderController] 🔍 [REQUIREMENT] Checking if order can be cancelled...');
      const currentStatus = OrderStatus.getById(orderData.status_id);
      
      // [REQUIREMENT] Order đã xác nhận (CONFIRMED) không thể hủy
      if (orderData.status_id === OrderStatus.CONFIRMED.id) {
        console.log('[OrderController] ❌ [REQUIREMENT] Cannot cancel order - order is already CONFIRMED');
        return res.status(400).json({
          success: false,
          message: 'Đơn hàng đã được xác nhận, không thể hủy. Vui lòng liên hệ hỗ trợ nếu cần trả hàng.',
        });
      }
      
      if (!OrderStatus.canCancel(orderData.status_id, isCustomer)) {
        console.log('[OrderController] ❌ Cannot cancel order in current status');
        if (isCustomer) {
          return res.status(400).json({
            success: false,
            message: `Bạn chỉ có thể hủy đơn hàng khi ở trạng thái "Chờ xác nhận". Đơn hàng hiện tại đang ở trạng thái "${currentStatus?.name || orderData.status_id}".`,
          });
        } else {
          return res.status(400).json({
            success: false,
            message: `Đơn hàng không thể hủy ở trạng thái "${currentStatus?.name || orderData.status_id}". Chỉ có thể hủy khi đơn hàng ở trạng thái "Chờ xác nhận".`,
          });
        }
      }

      // [REQUIREMENT] Kiểm tra đặc biệt: Customer không thể hủy đơn hàng đã thanh toán MoMo
      // Mặc dù order vẫn ở PENDING, nhưng nếu đã thanh toán MoMo thì không thể hủy (phải liên hệ hỗ trợ)
      if (isCustomer && orderData.status_id === OrderStatus.PENDING.id) {
        console.log('[OrderController] 🔍 [REQUIREMENT] Checking MoMo payment status...');
        // Use SQL WHERE clause instead of JavaScript filter - Use dynamic status lookup
        const { payment } = require('../Models');
        const paidStatusId = await getPaidStatusId(); // Use dynamic lookup instead of hardcoded
        const paidPayment = await payment.findByOrderIdStatusAndGateway(id, paidStatusId, 'MOMO');
        if (paidPayment) {
          console.log('[OrderController] ❌ [REQUIREMENT] Cannot cancel paid MoMo order - must contact support for refund');
          return res.status(400).json({
            success: false,
            message: 'Không thể hủy đơn hàng đã thanh toán MoMo. Vui lòng liên hệ hỗ trợ để được hoàn tiền.',
          });
        }
        console.log('[OrderController] ✅ No paid MoMo payment found - order can be cancelled');
      }

      // Cập nhật status thành cancelled
      await order.updateStatus(id, OrderStatus.CANCELLED.id, null);

      // Hoàn lại stock CHỈ NẾU đơn hàng đã được CONFIRMED (vì chỉ khi đó mới trừ stock)
      // Nếu đơn hàng ở PENDING thì không cần hoàn lại stock vì chưa trừ
      if (orderData.status_id === OrderStatus.CONFIRMED.id) {
        console.log('[OrderController] 📦 Restoring stock for cancelled CONFIRMED order...');
        const items = await orderItem.findByOrderId(id);
        
        // Use batch SQL queries instead of individual queries in loop
        // 1. Batch update stock using SQL UPDATE with CASE WHEN (single query)
        const stockUpdates = items.map(item => ({
          product_id: item.product_id,
          quantity_change: item.quantity
        }));
        await product.batchUpdateStock(stockUpdates);
        console.log(`[OrderController] ✅ Batch updated stock for ${stockUpdates.length} products`);
        
        // 2. Batch insert inventory transactions using SQL INSERT with multiple VALUES (single query)
        const transactions = items.map(item => ({
          product_id: item.product_id,
          quantity_change: item.quantity,
          change_type: 'RETURN',
          note: `Order ${orderData.order_number} cancelled`,
          created_by: null
        }));
        await inventoryTransaction.batchRecordTransactions(transactions);
        console.log(`[OrderController] ✅ Batch recorded ${transactions.length} inventory transactions`);
        
        console.log('[OrderController] ✅ Stock restored for cancelled order using batch SQL queries');
      } else {
        console.log('[OrderController] ℹ️ Order was PENDING, no stock to restore');
      }

      const updated = await order.findById(id);

      return res.status(200).json({
        success: true,
        message: 'Hủy đơn hàng thành công',
        data: updated,
      });
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: 'Lỗi khi hủy đơn hàng',
        error: error.message,
      });
    }
  };

  // ============================================
  // RETURN ORDER FUNCTION: Trả hàng
  // ============================================
  /**
   * HTTP Handler: POST /orders/:id/return
   * Trả hàng (chuyển sang RETURNED)
   * 
   * URL Params:
   * - id: ID của order (bắt buộc)
   * 
   * Request Body:
   * - reason: Lý do trả hàng (tùy chọn)
   * - processedBy: ID người xử lý (tùy chọn)
   * 
   * Response:
   * - 200: Success { success: true, message: "...", data: {...} }
   * - 400: Bad Request (validation error, không thể trả hàng ở trạng thái này)
   * - 404: Not Found (không tìm thấy order)
   * 
   * Quy trình:
   * 1. Kiểm tra có thể trả hàng không (chỉ SHIPPING hoặc DELIVERED)
   * 2. Cập nhật status sang RETURNED
   * 3. Hoàn lại stock cho tất cả order items (batch update)
   * 4. Ghi inventory transactions (batch insert)
   * 5. Cập nhật notes với lý do trả hàng
   * 
   * Đặc biệt:
   * - Chỉ có thể trả hàng khi order đang SHIPPING hoặc DELIVERED
   * - Tự động hoàn lại stock
   * - Sử dụng batch SQL queries để tối ưu (tránh N+1 problem)
   * 
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Promise<void>} JSON response
   */
  const returnOrder = async (req, res) => {
    console.log('========================================');
    console.log('[OrderController] returnOrder function called');
    console.log('[OrderController] Request IP:', req.ip);
    console.log('[OrderController] Params:', req.params);
    console.log('[OrderController] Request body:', JSON.stringify(req.body, null, 2));
    
    try {
      const { id } = req.params;
      const { reason, processedBy } = req.body;
      console.log('[OrderController] Returning order:', {
        orderId: id,
        reason,
        processedBy
      });

      console.log('[OrderController] 🔍 Fetching order data...');
      const orderData = await order.findById(id);
      if (!orderData) {
        console.log('[OrderController] ❌ Order not found');
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy đơn hàng',
        });
      }

      console.log('[OrderController] Order current status:', orderData.status_id);
      // Kiểm tra trạng thái có thể trả hàng không
      if (!OrderStatus.canReturn(orderData.status_id)) {
        const currentStatus = OrderStatus.getById(orderData.status_id);
        console.log('[OrderController] ❌ Cannot return order in current status');
        return res.status(400).json({
          success: false,
          message: `Đơn hàng không thể trả hàng ở trạng thái "${currentStatus?.name || orderData.status_id}". Chỉ có thể trả hàng khi đơn hàng đang được giao hoặc đã giao.`,
        });
      }

      console.log('[OrderController] 🔄 Updating order status to RETURNED...');
      // Cập nhật status thành returned
      await order.updateStatus(id, OrderStatus.RETURNED.id, processedBy);

      // Hoàn lại stock
      console.log('[OrderController] 📦 Restoring stock for order items...');
      const items = await orderItem.findByOrderId(id);
      
      // Use batch SQL queries instead of individual queries in loop
      // 1. Batch update stock using SQL UPDATE with CASE WHEN (single query)
      const stockUpdates = items.map(item => ({
        product_id: item.product_id,
        quantity_change: item.quantity
      }));
      await product.batchUpdateStock(stockUpdates);
      console.log(`[OrderController] ✅ Batch updated stock for ${stockUpdates.length} products`);
      
      // 2. Batch insert inventory transactions using SQL INSERT with multiple VALUES (single query)
      const transactions = items.map(item => ({
        product_id: item.product_id,
        quantity_change: item.quantity,
        change_type: 'RETURN',
        note: `Order ${orderData.order_number} returned${reason ? `: ${reason}` : ''}`,
        created_by: processedBy
      }));
      await inventoryTransaction.batchRecordTransactions(transactions);
      console.log(`[OrderController] ✅ Batch recorded ${transactions.length} inventory transactions`);
      
      console.log('[OrderController] ✅ Stock restored for', items.length, 'items using batch SQL queries');

      // Cập nhật notes nếu có reason
      if (reason) {
        console.log('[OrderController] 📝 Updating order notes with return reason...');
        const currentNotes = orderData.notes || '';
        await order.update(id, {
          notes: currentNotes ? `${currentNotes}\n[Trả hàng]: ${reason}` : `[Trả hàng]: ${reason}`,
        });
      }

      const updated = await order.findById(id);
      console.log('[OrderController] ✅✅✅ ORDER RETURNED SUCCESSFULLY ✅✅✅');
      console.log('========================================');

      return res.status(200).json({
        success: true,
        message: 'Trả hàng thành công',
        data: updated,
      });
    } catch (error) {
      console.error('[OrderController] ❌❌❌ ERROR IN returnOrder ❌❌❌');
      console.error('[OrderController] Error message:', error.message);
      console.error('[OrderController] Error stack:', error.stack);
      console.log('========================================');
      
      return res.status(400).json({
        success: false,
        message: 'Lỗi khi trả hàng',
        error: error.message,
      });
    }
  };

  // ============================================
  // GET ORDER STATUSES FUNCTION: Lấy danh sách trạng thái đơn hàng
  // ============================================
  /**
   * HTTP Handler: GET /orders/statuses
   * Lấy danh sách tất cả order statuses
   * 
   * Response:
   * - 200: Success { success: true, data: [...] }
   * - 500: Server Error
   * 
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Promise<void>} JSON response
   */
  const getOrderStatuses = async (req, res) => {
    console.log('========================================');
    console.log('[OrderController] getOrderStatuses function called');
    console.log('[OrderController] Request IP:', req.ip);
    
    try {
      console.log('[OrderController] 🔍 Fetching all order statuses...');
      const statuses = OrderStatus.getAll();
      console.log('[OrderController] ✅ Order statuses fetched:', statuses?.length || 0);
      console.log('========================================');
      
      return res.status(200).json({
        success: true,
        data: statuses,
      });
    } catch (error) {
      console.error('[OrderController] ❌❌❌ ERROR IN getOrderStatuses ❌❌❌');
      console.error('[OrderController] Error message:', error.message);
      console.error('[OrderController] Error stack:', error.stack);
      console.log('========================================');
      
      return res.status(500).json({
        success: false,
        message: 'Lỗi khi lấy danh sách trạng thái',
        error: error.message,
      });
    }
  };

  // ============================================
  // GET MY ORDERS FUNCTION: Lấy orders của user hiện tại
  // ============================================
  /**
   * HTTP Handler: GET /orders/my-orders
   * Lấy danh sách orders của user hiện tại (từ JWT token)
   * 
   * Query Parameters:
   * - page: Số trang (mặc định: 1)
   * - limit: Số lượng/trang (mặc định: 10)
   * 
   * Response:
   * - 200: Success { success: true, data: [...] }
   * - 401: Unauthorized (chưa đăng nhập)
   * - 500: Server Error
   * 
   * Đặc biệt:
   * - Tự động lấy userId từ JWT token (req.user.userId)
   * - Delegate đến getByUser function
   * 
   * @param {Object} req - Express request object (có req.user từ JWT middleware)
   * @param {Object} res - Express response object
   * @returns {Promise<void>} JSON response
   */
  const getMyOrders = async (req, res) => {
    console.log('========================================');
    console.log('[OrderController] getMyOrders function called');
    console.log('[OrderController] Request IP:', req.ip);
    console.log('[OrderController] User:', req.user?.userId);
    console.log('[OrderController] Query:', req.query);
    
    if (!req.user || !req.user.userId) {
      console.log('[OrderController] ❌ User not authenticated');
      return res.status(401).json({
        success: false,
        message: 'Vui lòng đăng nhập',
      });
    }
    console.log('[OrderController] Setting userId from token:', req.user.userId);
    req.params.userId = req.user.userId;
    console.log('[OrderController] Delegating to getByUser...');
    return getByUser(req, res);
  };

  // ============================================
  // GET MY ORDER BY ID FUNCTION: Lấy order của user hiện tại theo ID
  // ============================================
  /**
   * HTTP Handler: GET /orders/my-orders/:id
   * Lấy order của user hiện tại theo ID (từ JWT token)
   * 
   * URL Params:
   * - id: ID của order (bắt buộc)
   * 
   * Response:
   * - 200: Success { success: true, data: {...} }
   * - 401: Unauthorized (chưa đăng nhập)
   * - 403: Forbidden (order không thuộc về user)
   * - 404: Not Found (không tìm thấy order)
   * - 500: Server Error
   * 
   * Đặc biệt:
   * - Tự động lấy userId từ JWT token (req.user.userId)
   * - Kiểm tra order thuộc về user hiện tại
   * - Enrich order với product data (batch fetch)
   * - Parse product snapshots và merge với product data hiện tại
   * 
   * @param {Object} req - Express request object (có req.user từ JWT middleware)
   * @param {Object} res - Express response object
   * @returns {Promise<void>} JSON response
   */
  const getMyOrderById = async (req, res) => {
    try {
      if (!req.user || !req.user.userId) {
        return res.status(401).json({
          success: false,
          message: 'Vui lòng đăng nhập',
        });
      }

      const { id } = req.params;
      const orderData = await order.findById(id);

      if (!orderData) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy đơn hàng',
        });
      }

      // Kiểm tra order thuộc về user hiện tại
      if (orderData.user_id !== req.user.userId) {
        return res.status(403).json({
          success: false,
          message: 'Bạn không có quyền xem đơn hàng này',
        });
      }

      // Lấy order items
      const items = await orderItem.findByOrderId(orderData.order_id);

      // Populate order items with product data (including images)
      // Use batch SQL query with WHERE IN instead of individual queries in loop
      const { product } = require('../Models');
      
      // Batch fetch all products using SQL WHERE IN (single query instead of N queries)
      const productIds = (items || []).map(item => item.product_id).filter(Boolean);
      const productMap = await product.findByProductIdsAsMap(productIds);
      console.log(`[OrderController] 🔍 Batch fetched ${Object.keys(productMap).length} products for ${items?.length || 0} order items`);
      
      // Process each order item with batch-fetched product data
      const itemsWithProduct = (items || []).map((item) => {
        try {
          // Use batch-fetched product data instead of individual query
          const productData = productMap[item.product_id];
            
            // Parse product_snapshot if exists
            let productSnapshot = null;
            if (item.product_snapshot) {
              try {
                productSnapshot = typeof item.product_snapshot === 'string' 
                  ? JSON.parse(item.product_snapshot) 
                  : item.product_snapshot;
              } catch (e) {
                console.warn('[OrderController] Failed to parse product_snapshot:', e);
              }
            }
            
            // Merge product data with snapshot (snapshot takes precedence only if it has valid values)
            // Only use snapshot values if they are valid (not null/undefined)
            const mergedProduct = productData ? {
              ...productData,
              name: (productSnapshot?.name && productSnapshot.name.trim() !== '') ? productSnapshot.name : productData.name,
              price: (productSnapshot?.price !== undefined && productSnapshot.price !== null) ? productSnapshot.price : productData.price,
              // Only use snapshot images if they are valid (not null/undefined/empty)
              images: (productSnapshot?.images !== undefined && 
                       productSnapshot?.images !== null && 
                       (Array.isArray(productSnapshot.images) || 
                        typeof productSnapshot.images === 'string' ||
                        (typeof productSnapshot.images === 'object' && Object.keys(productSnapshot.images).length > 0))
                      ) ? productSnapshot.images : productData.images,
              // Only use snapshot primary_image if it's a valid string (not null/undefined/empty)
              primary_image: (productSnapshot?.primary_image && 
                             typeof productSnapshot.primary_image === 'string' && 
                             productSnapshot.primary_image.trim() !== '') 
                            ? productSnapshot.primary_image 
                            : productData.primary_image,
            } : (productSnapshot || {});
            
            // Process images if product has images
            if (mergedProduct && mergedProduct.images) {
              try {
                const parsedImages = product.parseImages(mergedProduct.images);
                mergedProduct.images = parsedImages;
                
                // Validate and set primary_image
                const existingPrimaryImageValid = mergedProduct.primary_image && 
                  typeof mergedProduct.primary_image === 'string' && 
                  mergedProduct.primary_image.trim() !== '' && 
                  mergedProduct.primary_image !== '/placeholder.jpg';
                
                if (!existingPrimaryImageValid && parsedImages.length > 0) {
                  // Find primary image from array
                  const primaryImg = parsedImages.find(img => img.is_primary) || parsedImages[0];
                  
                  // Use url field, fallback to image_url if url doesn't exist
                  const newPrimaryImage = primaryImg?.url || primaryImg?.image_url || null;
                  
                  if (newPrimaryImage && newPrimaryImage.trim() !== '') {
                    mergedProduct.primary_image = newPrimaryImage;
                  }
                }
              } catch (parseError) {
                console.error('[OrderController] Error parsing images for product:', item.product_id, parseError.message);
                mergedProduct.images = [];
              }
            }
            
            return {
              ...item,
              product: mergedProduct
            };
          } catch (error) {
            console.error('[OrderController] Error processing order item:', {
              order_item_id: item.order_item_id,
              product_id: item.product_id,
              error: error.message,
            });
            // Return item without product data if there's an error
            return {
              ...item,
              product: null
            };
          }
      });

      // Enrich order status
      const { payment, paymentStatus, orderStatus } = require('../Models');
      if (orderData.status_id) {
        try {
          const statusId = parseInt(orderData.status_id);
          const statusData = await orderStatus.findById(statusId);
          if (statusData) {
            // Map status_name to name for frontend compatibility
            statusData.name = statusData.status_name;
            orderData.order_status = statusData;
            // Also add order_status_id alias for frontend compatibility
            orderData.order_status_id = orderData.status_id;
          } else {
            orderData.order_status_id = orderData.status_id;
          }
        } catch (e) {
          console.error('[OrderController] Error fetching order status:', e);
          orderData.order_status_id = orderData.status_id;
        }
      }

      // Get payment information
      const payments = await payment.findByOrderId(orderData.order_id);
      
      if (payments && payments.length > 0) {
        // Get the primary payment (paid payment first, or first payment)
        // Use SQL WHERE clause instead of JavaScript filter
        const paidStatusId = await getPaidStatusId();
        let primaryPayment = await payment.findByOrderIdAndStatus(orderData.order_id, paidStatusId);
        
        if (!primaryPayment) {
          // Use SQL LIMIT 1 instead of JavaScript array access
          primaryPayment = await payment.findFirstByOrderId(orderData.order_id);
        }
        
        // Enrich payment with status information
        if (primaryPayment && primaryPayment.payment_status_id) {
          try {
            const statusId = parseInt(primaryPayment.payment_status_id);
            const statusData = await paymentStatus.findById(statusId);
            if (statusData) {
              // Map status_name to name for frontend compatibility
              statusData.name = statusData.status_name;
              primaryPayment.payment_status = statusData;
              primaryPayment.status = statusData; // Alias for compatibility
            }
          } catch (e) {
            console.error('[OrderController] Error fetching payment status:', e);
          }
        }
        
        orderData.payment = primaryPayment;
        orderData.payments = payments; // Include all payments for reference
      } else {
        orderData.payment = null;
        orderData.payments = [];
      }

      return res.status(200).json({
        success: true,
        data: {
          ...orderData,
          items: itemsWithProduct,
          order_items: itemsWithProduct, // Alias for frontend compatibility
        },
      });
    } catch (error) {
      console.error('[OrderController] Error in getMyOrderById:', error.message);
      return res.status(500).json({
        success: false,
        message: 'Lỗi khi lấy dữ liệu',
        error: error.message,
      });
    }
  };

  // ============================================
  // CREATE MY ORDER FUNCTION: Tạo order cho user hiện tại
  // ============================================
  /**
   * HTTP Handler: POST /orders/my-orders
   * Tạo order cho user hiện tại (từ JWT token)
   * 
   * Request Body:
   * - Các trường giống như create order thông thường (trừ userId - tự động lấy từ token)
   * 
   * Response:
   * - 201: Created { success: true, message: "...", data: {...} }
   * - 401: Unauthorized (chưa đăng nhập)
   * - 400: Bad Request (validation error)
   * 
   * Đặc biệt:
   * - Tự động set userId từ JWT token (req.user.userId)
   * - Delegate đến baseController.create
   * 
   * @param {Object} req - Express request object (có req.user từ JWT middleware)
   * @param {Object} res - Express response object
   * @returns {Promise<void>} JSON response
   */
  const createMyOrder = async (req, res) => {
    if (!req.user || !req.user.userId) {
      return res.status(401).json({
        success: false,
        message: 'Vui lòng đăng nhập',
      });
    }
    req.body.user_id = req.user.userId;
    return baseController.create(req, res);
  };

  // ============================================
  // CREATE FROM MY CART FUNCTION: Tạo order từ cart của user hiện tại
  // ============================================
  /**
   * HTTP Handler: POST /orders/my-orders/from-cart
   * Tạo order từ cart của user hiện tại (từ JWT token)
   * 
   * Request Body:
   * - shippingAddressId: ID địa chỉ giao hàng (bắt buộc)
   * - billingAddressId: ID địa chỉ thanh toán (tùy chọn)
   * - couponCode: Mã giảm giá (tùy chọn)
   * - paymentMethodId: ID phương thức thanh toán (bắt buộc)
   * - shipping_fee: Phí vận chuyển (tùy chọn)
   * - tax_amount: Thuế (tùy chọn)
   * - currency: Loại tiền tệ (tùy chọn)
   * 
   * Response:
   * - 201: Created { success: true, message: "...", data: {...} }
   * - 401: Unauthorized (chưa đăng nhập)
   * - 400: Bad Request (validation error, cart trống, stock không đủ)
   * 
   * Đặc biệt:
   * - Tự động set userId từ JWT token (req.user.userId)
   * - Delegate đến createFromCart function
   * 
   * @param {Object} req - Express request object (có req.user từ JWT middleware)
   * @param {Object} res - Express response object
   * @returns {Promise<void>} JSON response
   */
  const createFromMyCart = async (req, res) => {
    console.log('========================================');
    console.log('[OrderController] createFromMyCart function called');
    console.log('[OrderController] Request IP:', req.ip);
    console.log('[OrderController] User:', req.user?.userId);
    
    if (!req.user || !req.user.userId) {
      console.log('[OrderController] ❌ User not authenticated');
      return res.status(401).json({
        success: false,
        message: 'Vui lòng đăng nhập',
      });
    }
    console.log('[OrderController] Setting userId from token:', req.user.userId);
    req.body.userId = req.user.userId;
    console.log('[OrderController] Delegating to createFromCart...');
    return createFromCart(req, res);
  };

  // ============================================
  // CANCEL MY ORDER FUNCTION: Hủy order của user hiện tại
  // ============================================
  /**
   * HTTP Handler: POST /orders/my-orders/:id/cancel
   * Hủy order của user hiện tại (từ JWT token)
   * 
   * URL Params:
   * - id: ID của order (bắt buộc)
   * 
   * Request Body:
   * - reason: Lý do hủy (tùy chọn)
   * 
   * Response:
   * - 200: Success { success: true, message: "...", data: {...} }
   * - 401: Unauthorized (chưa đăng nhập)
   * - 403: Forbidden (order không thuộc về user)
   * - 404: Not Found (không tìm thấy order)
   * - 400: Bad Request (validation error, không thể hủy)
   * 
   * Đặc biệt:
   * - Tự động kiểm tra order thuộc về user hiện tại
   * - Delegate đến cancelOrder function
   * 
   * @param {Object} req - Express request object (có req.user từ JWT middleware)
   * @param {Object} res - Express response object
   * @returns {Promise<void>} JSON response
   */
  const cancelMyOrder = async (req, res) => {
    try {
      if (!req.user || !req.user.userId) {
        return res.status(401).json({
          success: false,
          message: 'Vui lòng đăng nhập',
        });
      }

      const { id } = req.params;
      const orderData = await order.findById(id);

      if (!orderData) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy đơn hàng',
        });
      }

      // Kiểm tra order thuộc về user hiện tại
      if (orderData.user_id !== req.user.userId) {
        return res.status(403).json({
          success: false,
          message: 'Bạn không có quyền hủy đơn hàng này',
        });
      }

      req.params.id = id;
      return cancelOrder(req, res);
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Lỗi khi hủy đơn hàng',
        error: error.message,
      });
    }
  };

  // ============================================
  // RETURN MY ORDER FUNCTION: Trả hàng order của user hiện tại
  // ============================================
  /**
   * HTTP Handler: POST /orders/my-orders/:id/return
   * Trả hàng order của user hiện tại (từ JWT token)
   * 
   * URL Params:
   * - id: ID của order (bắt buộc)
   * 
   * Request Body:
   * - reason: Lý do trả hàng (tùy chọn)
   * 
   * Response:
   * - 200: Success { success: true, message: "...", data: {...} }
   * - 401: Unauthorized (chưa đăng nhập)
   * - 403: Forbidden (order không thuộc về user)
   * - 404: Not Found (không tìm thấy order)
   * - 400: Bad Request (validation error, không thể trả hàng)
   * 
   * Đặc biệt:
   * - Tự động kiểm tra order thuộc về user hiện tại
   * - Delegate đến returnOrder function
   * 
   * @param {Object} req - Express request object (có req.user từ JWT middleware)
   * @param {Object} res - Express response object
   * @returns {Promise<void>} JSON response
   */
  const returnMyOrder = async (req, res) => {
    try {
      if (!req.user || !req.user.userId) {
        return res.status(401).json({
          success: false,
          message: 'Vui lòng đăng nhập',
        });
      }

      const { id } = req.params;
      const orderData = await order.findById(id);

      if (!orderData) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy đơn hàng',
        });
      }

      // Kiểm tra order thuộc về user hiện tại
      if (orderData.user_id !== req.user.userId) {
        return res.status(403).json({
          success: false,
          message: 'Bạn không có quyền trả đơn hàng này',
        });
      }

      req.params.id = id;
      return returnOrder(req, res);
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Lỗi khi trả đơn hàng',
        error: error.message,
      });
    }
  };

  // ============================================
  // GET ALL FUNCTION: Override getAll từ BaseController
  // ============================================
  /**
   * HTTP Handler: GET /orders
   * Override getAll từ BaseController để include user và order status info
   * 
   * Query Parameters:
   * - page: Số trang (mặc định: 1)
   * - limit: Số lượng/trang (mặc định: 10, max: 100)
   * - orderBy: Câu lệnh ORDER BY (mặc định: 'created_at DESC')
   * - ...filters: Các filter khác (user_id, status_id, etc.)
   * 
   * Response:
   * - 200: Success { success: true, data: [...], pagination: {...} }
   * - 500: Server Error
   * 
   * Đặc biệt:
   * - Sử dụng window function COUNT(*) OVER() để tối ưu (1 query thay vì 2)
   * - Tự động enrich orders với: order status, order items, payments, users
   * - Sử dụng batch SQL queries để tối ưu (tránh N+1 problem)
   * 
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Promise<void>} JSON response
   */
  const getAll = async (req, res) => {
    console.log('========================================');
    console.log('[OrderController] getAll function called (override)');
    console.log('[OrderController] Request IP:', req.ip);
    console.log('[OrderController] Query params:', JSON.stringify(req.query, null, 2));
    
    try {
      const { page = 1, limit = 10, ...filters } = req.query;
      const offset = (parseInt(page) - 1) * parseInt(limit);

      // Validate pagination params
      const pageNum = Math.max(1, parseInt(page) || 1);
      const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 10));

      console.log('[OrderController] Pagination:', { pageNum, limitNum, offset });
      console.log('[OrderController] Filters:', filters);

      console.log('[OrderController] 🔍 Fetching orders from database...');
      // Use single SQL query with window function COUNT(*) OVER() to get data and total count
      // This replaces Promise.all with 2 separate queries (findAll + count)
      const { data, total } = await order.findAllWithCount({
        filters,
        limit: limitNum,
        offset: (pageNum - 1) * limitNum,
        orderBy: req.query.orderBy || 'created_at DESC',
      });

      console.log('[OrderController] ✅ Orders fetched:', {
        count: data?.length || 0,
        total,
        pageNum,
        limitNum
      });

      // Enrich orders with user and status info using batch SQL queries
      if (Array.isArray(data) && data.length > 0) {
        console.log('[OrderController] Enriching orders with user and status info using batch queries...');
        try {
          data = await batchEnrichOrders(data);
          console.log('[OrderController] ✅ Orders batch enriched successfully');
        } catch (e) {
          console.error('[OrderController] Error in batch enrich:', e);
          // Continue without enrichment
        }
      }

      console.log('========================================');

      return res.status(200).json({
        success: true,
        data,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum),
        },
      });
    } catch (error) {
      console.error('[OrderController] ❌❌❌ ERROR IN getAll ❌❌❌');
      console.error('[OrderController] Error message:', error.message);
      console.error('[OrderController] Error stack:', error.stack);
      console.log('========================================');
      
      return res.status(500).json({
        success: false,
        message: 'Lỗi khi lấy dữ liệu',
        error: error.message,
      });
    }
  };

  // ============================================
  // GET PENDING ORDER PRODUCTS SUMMARY FUNCTION: Thống kê sản phẩm cần đặt
  // ============================================
  /**
   * HTTP Handler: GET /orders/pending/products-summary
   * Thống kê sản phẩm cần đặt từ đơn hàng PENDING
   * 
   * Admin only
   * 
   * Response:
   * - 200: Success { success: true, data: [...], total_products: N, total_pending_orders: N }
   * - 500: Server Error
   * 
   * Đặc biệt:
   * - Sử dụng SQL JOIN và GROUP BY để aggregate trực tiếp trong database
   * - Thay thế JavaScript loops và object aggregation (tối ưu hơn)
   * - Trả về: product_id, name, current_stock, price, total_quantity_needed, orders_count, order_numbers
   * 
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Promise<void>} JSON response
   */
  const getPendingOrderProductsSummary = async (req, res) => {
    try {
      console.log('========================================');
      console.log('[OrderController] 📊 getPendingOrderProductsSummary called');
      
      const db = require('../Config/database').getDatabase();
      
      // Use SQL JOIN and GROUP BY to aggregate data directly in database
      // This replaces JavaScript loops and object aggregation
      const summaryQuery = `
        SELECT 
          p.product_id,
          p.name,
          COALESCE(p.stock_quantity, 0) as current_stock,
          COALESCE(p.price, 0) as price,
          COALESCE(SUM(oi.quantity), 0) as total_quantity_needed,
          COUNT(DISTINCT o.order_id) as orders_count,
          GROUP_CONCAT(DISTINCT o.order_number ORDER BY o.order_number SEPARATOR ', ') as order_numbers
        FROM \`products\` p
        INNER JOIN \`orderitems\` oi ON p.product_id = oi.product_id
        INNER JOIN \`orders\` o ON oi.order_id = o.order_id
        WHERE o.status_id = 1
          AND p.deleted_at IS NULL
        GROUP BY p.product_id, p.name, p.stock_quantity, p.price
        ORDER BY total_quantity_needed DESC
      `;
      
      console.log('[OrderController] 🔍 Executing SQL aggregation query...');
      const [summaryRows] = await db.execute(summaryQuery, []);
      
      // Get total pending orders count using SQL COUNT
      const countQuery = `SELECT COUNT(*) as total FROM \`orders\` WHERE \`status_id\` = 1`;
      const [countRows] = await db.execute(countQuery, []);
      const totalPendingOrders = parseInt(countRows?.[0]?.total || 0);
      
      // Transform SQL results: convert order_numbers from comma-separated string to array
      const summaryArray = (summaryRows || []).map(row => ({
        product_id: row.product_id,
        name: row.name || `Sản phẩm #${row.product_id}`,
        current_stock: parseInt(row.current_stock || 0),
        price: parseFloat(row.price || 0),
        total_quantity_needed: parseInt(row.total_quantity_needed || 0),
        orders_count: parseInt(row.orders_count || 0),
        order_numbers: row.order_numbers ? row.order_numbers.split(', ') : [],
      }));

      console.log(`[OrderController] ✅ Summary generated using SQL: ${summaryArray.length} products need restocking`);
      console.log(`[OrderController] 📊 Total pending orders: ${totalPendingOrders}`);

      return res.status(200).json({
        success: true,
        data: summaryArray,
        total_products: summaryArray.length,
        total_pending_orders: totalPendingOrders,
      });
    } catch (error) {
      console.error('[OrderController] ❌ Error in getPendingOrderProductsSummary:', error);
      return res.status(500).json({
        success: false,
        message: 'Lỗi khi lấy thống kê sản phẩm cần đặt',
        error: error.message,
      });
    }
  };

  // ============================================
  // UPDATE ORDER TO SHIPPING FUNCTION: Shipper cập nhật trạng thái sang SHIPPING
  // ============================================
  /**
   * HTTP Handler: PUT /orders/:id/shipping
   * Shipper cập nhật trạng thái đơn hàng sang "Đang giao hàng" (SHIPPING)
   * 
   * Chỉ cho phép shipper đã nhận đơn hàng (có shipment) cập nhật
   * Workflow: CONFIRMED -> SHIPPING
   * 
   * URL Params:
   * - id: ID của order (bắt buộc)
   * 
   * Response:
   * - 200: Success { success: true, message: "...", data: {...} }
   * - 401: Unauthorized (chưa đăng nhập)
   * - 400: Bad Request (validation error, không ở CONFIRMED)
   * - 403: Forbidden (không có quyền, chưa nhận đơn hàng)
   * - 404: Not Found (không tìm thấy order)
   * 
   * Đặc biệt:
   * - Tự động cập nhật shipment status sang 'shipping'
   * - Chỉ shipper đã nhận đơn hàng (có shipment) mới có quyền
   * 
   * @param {Object} req - Express request object (có req.user từ JWT middleware)
   * @param {Object} res - Express response object
   * @returns {Promise<void>} JSON response
   */
  const updateOrderToShipping = async (req, res) => {
    console.log('========================================');
    console.log('[OrderController] updateOrderToShipping function called (Shipper)');
    console.log('[OrderController] Request IP:', req.ip);
    console.log('[OrderController] User:', req.user);
    console.log('[OrderController] Params:', req.params);
    
    try {
      if (!req.user || !req.user.userId) {
        return res.status(401).json({
          success: false,
          message: 'Vui lòng đăng nhập',
        });
      }

      const { id } = req.params;
      const userId = req.user.userId;

      // Kiểm tra order tồn tại
      const orderData = await order.findById(id);
      if (!orderData) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy đơn hàng',
        });
      }

      // Kiểm tra trạng thái hiện tại phải là CONFIRMED
      if (orderData.status_id !== OrderStatus.CONFIRMED.id) {
        const currentStatus = OrderStatus.getById(orderData.status_id);
        return res.status(400).json({
          success: false,
          message: `Chỉ có thể cập nhật sang "Đang giao hàng" khi đơn hàng ở trạng thái "Đã xác nhận". Đơn hàng hiện tại đang ở trạng thái "${currentStatus?.name || orderData.status_id}".`,
        });
      }

      // Kiểm tra shipper có quyền cập nhật đơn hàng này (phải có shipment với shipper_id của họ)
      const { shipment } = require('../Models');
      const db = require('../Config/database').getDatabase();
      
      // Tìm shipper_id từ user_id
      let shipperId = null;
      try {
        const userData = await require('../Models').user.findById(userId);
        if (userData) {
          const { shipper: shipperModel } = require('../Models');
          // Use SQL LIMIT 1 instead of JavaScript array access
          const shipperData = await shipperModel.findFirstByName(userData.username || userData.email || '');
          if (shipperData) {
            shipperId = shipperData.shipper_id;
          }
        }
      } catch (shipperError) {
        console.error('[OrderController] Error finding shipper:', shipperError);
      }

      if (!shipperId) {
        return res.status(403).json({
          success: false,
          message: 'Bạn không phải là shipper hoặc chưa được đăng ký làm shipper',
        });
      }

      // Kiểm tra shipment có tồn tại và thuộc về shipper này không
      // Use SQL WHERE clause instead of JavaScript filter
      const myShipment = await shipment.findByOrderIdAndShipperId(id, shipperId);
      if (!myShipment) {
        return res.status(403).json({
          success: false,
          message: 'Bạn không có quyền cập nhật đơn hàng này. Vui lòng nhận đơn hàng trước.',
        });
      }

      // Cập nhật trạng thái đơn hàng sang SHIPPING
      console.log('[OrderController] 🔄 Updating order status to SHIPPING...');
      await order.updateStatus(id, OrderStatus.SHIPPING.id, userId);
      
      // Cập nhật shipment status
      await shipment.update(myShipment.shipment_id, {
        shipment_status: 'shipping',
        shipped_date: new Date(),
      });

      const updated = await order.findById(id);
      console.log('[OrderController] ✅ Order status updated to SHIPPING');
      console.log('========================================');

      return res.status(200).json({
        success: true,
        message: 'Cập nhật trạng thái "Đang giao hàng" thành công',
        data: updated,
      });
    } catch (error) {
      console.error('[OrderController] ❌❌❌ ERROR IN updateOrderToShipping ❌❌❌');
      console.error('[OrderController] Error message:', error.message);
      console.error('[OrderController] Error stack:', error.stack);
      console.log('========================================');
      
      return res.status(400).json({
        success: false,
        message: 'Lỗi khi cập nhật trạng thái đơn hàng',
        error: error.message,
      });
    }
  };

  // ============================================
  // UPDATE ORDER TO DELIVERED FUNCTION: Shipper cập nhật trạng thái sang DELIVERED
  // ============================================
  /**
   * HTTP Handler: PUT /orders/:id/delivered
   * Shipper cập nhật trạng thái đơn hàng sang "Đã giao hàng" (DELIVERED)
   * 
   * Chỉ cho phép shipper đã nhận đơn hàng (có shipment) cập nhật
   * Workflow: SHIPPING -> DELIVERED
   * 
   * URL Params:
   * - id: ID của order (bắt buộc)
   * 
   * Response:
   * - 200: Success { success: true, message: "...", data: {...} }
   * - 401: Unauthorized (chưa đăng nhập)
   * - 400: Bad Request (validation error, không ở SHIPPING)
   * - 403: Forbidden (không có quyền, chưa nhận đơn hàng)
   * - 404: Not Found (không tìm thấy order)
   * 
   * Đặc biệt:
   * - Tự động cập nhật shipment status sang 'delivered'
   * - Chỉ shipper đã nhận đơn hàng (có shipment) mới có quyền
   * 
   * @param {Object} req - Express request object (có req.user từ JWT middleware)
   * @param {Object} res - Express response object
   * @returns {Promise<void>} JSON response
   */
  const updateOrderToDelivered = async (req, res) => {
    console.log('========================================');
    console.log('[OrderController] updateOrderToDelivered function called (Shipper)');
    console.log('[OrderController] Request IP:', req.ip);
    console.log('[OrderController] User:', req.user);
    console.log('[OrderController] Params:', req.params);
    
    try {
      if (!req.user || !req.user.userId) {
        return res.status(401).json({
          success: false,
          message: 'Vui lòng đăng nhập',
        });
      }

      const { id } = req.params;
      const userId = req.user.userId;

      // Kiểm tra order tồn tại
      const orderData = await order.findById(id);
      if (!orderData) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy đơn hàng',
        });
      }

      // Kiểm tra trạng thái hiện tại phải là SHIPPING
      if (orderData.status_id !== OrderStatus.SHIPPING.id) {
        const currentStatus = OrderStatus.getById(orderData.status_id);
        return res.status(400).json({
          success: false,
          message: `Chỉ có thể cập nhật sang "Đã giao hàng" khi đơn hàng ở trạng thái "Đang giao hàng". Đơn hàng hiện tại đang ở trạng thái "${currentStatus?.name || orderData.status_id}".`,
        });
      }

      // Kiểm tra shipper có quyền cập nhật đơn hàng này (phải có shipment với shipper_id của họ)
      const { shipment } = require('../Models');
      
      // Tìm shipper_id từ user_id
      let shipperId = null;
      try {
        const userData = await require('../Models').user.findById(userId);
        if (userData) {
          const { shipper: shipperModel } = require('../Models');
          // Use SQL LIMIT 1 instead of JavaScript array access
          const shipperData = await shipperModel.findFirstByName(userData.username || userData.email || '');
          if (shipperData) {
            shipperId = shipperData.shipper_id;
          }
        }
      } catch (shipperError) {
        console.error('[OrderController] Error finding shipper:', shipperError);
      }

      if (!shipperId) {
        return res.status(403).json({
          success: false,
          message: 'Bạn không phải là shipper hoặc chưa được đăng ký làm shipper',
        });
      }

      // Kiểm tra shipment có tồn tại và thuộc về shipper này không
      // Use SQL WHERE clause instead of JavaScript filter
      const myShipment = await shipment.findByOrderIdAndShipperId(id, shipperId);
      if (!myShipment) {
        return res.status(403).json({
          success: false,
          message: 'Bạn không có quyền cập nhật đơn hàng này. Vui lòng nhận đơn hàng trước.',
        });
      }

      // Cập nhật trạng thái đơn hàng sang DELIVERED
      console.log('[OrderController] 🔄 Updating order status to DELIVERED...');
      await order.updateStatus(id, OrderStatus.DELIVERED.id, userId);
      
      // Cập nhật shipment status
      await shipment.update(myShipment.shipment_id, {
        shipment_status: 'delivered',
        delivered_date: new Date(),
      });

      const updated = await order.findById(id);
      console.log('[OrderController] ✅ Order status updated to DELIVERED');
      console.log('========================================');

      return res.status(200).json({
        success: true,
        message: 'Cập nhật trạng thái "Đã giao hàng" thành công',
        data: updated,
      });
    } catch (error) {
      console.error('[OrderController] ❌❌❌ ERROR IN updateOrderToDelivered ❌❌❌');
      console.error('[OrderController] Error message:', error.message);
      console.error('[OrderController] Error stack:', error.stack);
      console.log('========================================');
      
      return res.status(400).json({
        success: false,
        message: 'Lỗi khi cập nhật trạng thái đơn hàng',
        error: error.message,
      });
    }
  };

  // ============================================
  // COMPLETE ORDER FUNCTION: Admin hoàn thành đơn hàng
  // ============================================
  /**
   * HTTP Handler: POST /orders/:id/complete
   * Admin hoàn thành đơn hàng (DELIVERED -> COMPLETED)
   * 
   * Chỉ cho phép admin cập nhật đơn hàng từ trạng thái DELIVERED sang COMPLETED
   * Workflow: DELIVERED -> COMPLETED
   * 
   * URL Params:
   * - id: ID của order (bắt buộc)
   * 
   * Response:
   * - 200: Success { success: true, message: "...", data: {...} }
   * - 401: Unauthorized (chưa đăng nhập)
   * - 400: Bad Request (validation error, không ở DELIVERED)
   * - 404: Not Found (không tìm thấy order)
   * - 500: Server Error (không thể tạo/find COMPLETED status)
   * 
   * Đặc biệt:
   * - Tự động tạo COMPLETED status nếu chưa tồn tại trong database
   * - Chỉ admin mới có quyền (không check trong function này, check ở route middleware)
   * 
   * @param {Object} req - Express request object (có req.user từ JWT middleware)
   * @param {Object} res - Express response object
   * @returns {Promise<void>} JSON response
   */
  const completeOrder = async (req, res) => {
    console.log('========================================');
    console.log('[OrderController] completeOrder function called (Admin)');
    console.log('[OrderController] Request IP:', req.ip);
    console.log('[OrderController] User:', req.user);
    console.log('[OrderController] Params:', req.params);
    
    try {
      if (!req.user || !req.user.userId) {
        return res.status(401).json({
          success: false,
          message: 'Vui lòng đăng nhập',
        });
      }

      const { id } = req.params;
      const userId = req.user.userId;

      // Kiểm tra order tồn tại
      const orderData = await order.findById(id);
      if (!orderData) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy đơn hàng',
        });
      }

      // Kiểm tra trạng thái hiện tại phải là DELIVERED
      if (orderData.status_id !== OrderStatus.DELIVERED.id) {
        const currentStatus = OrderStatus.getById(orderData.status_id);
        return res.status(400).json({
          success: false,
          message: `Chỉ có thể hoàn thành đơn hàng khi đơn hàng ở trạng thái "Đã giao hàng". Đơn hàng hiện tại đang ở trạng thái "${currentStatus?.name || orderData.status_id}".`,
        });
      }

      // Đảm bảo status_id 8 (COMPLETED) tồn tại
      const { orderStatus } = require('../Models');
      let completedStatusId = OrderStatus.COMPLETED.id;
      
      try {
        const completedStatus = await orderStatus.findById(completedStatusId);
        if (!completedStatus) {
          console.log('[OrderController] ⚠️ Status ID 8 (COMPLETED) not found, creating...');
          const db = require('../Config/database').getDatabase();
          try {
            const [insertResult] = await db.execute(
              'INSERT INTO `orderstatus` (`status_id`, `status_name`, `sort_order`) VALUES (?, ?, ?)',
              [completedStatusId, OrderStatus.COMPLETED.name, OrderStatus.COMPLETED.sortOrder]
            );
            if (insertResult && insertResult.insertId) {
              console.log('[OrderController] ✅ Created COMPLETED status with ID:', completedStatusId);
            }
          } catch (insertError) {
            console.log('[OrderController] ⚠️ Error creating status, trying to find by name...');
            const statusByName = await orderStatus.findByName(OrderStatus.COMPLETED.name);
            if (statusByName) {
              completedStatusId = statusByName.status_id;
              console.log('[OrderController] ✅ Found COMPLETED status with ID:', completedStatusId);
            } else {
              return res.status(500).json({
                success: false,
                message: 'Không thể tạo hoặc tìm thấy trạng thái "Hoàn thành". Vui lòng liên hệ quản trị viên hệ thống.',
              });
            }
          }
        }
      } catch (statusError) {
        console.error('[OrderController] Error checking/creating COMPLETED status:', statusError);
        return res.status(500).json({
          success: false,
          message: 'Lỗi khi kiểm tra trạng thái đơn hàng',
          error: statusError.message,
        });
      }

      // Cập nhật trạng thái đơn hàng sang COMPLETED
      console.log('[OrderController] 🔄 Updating order status to COMPLETED...');
      await order.updateStatus(id, completedStatusId, userId);
      
      const updated = await order.findById(id);
      console.log('[OrderController] ✅ Order status updated to COMPLETED');
      console.log('========================================');

      return res.status(200).json({
        success: true,
        message: 'Hoàn thành đơn hàng thành công',
        data: updated,
      });
    } catch (error) {
      console.error('[OrderController] ❌❌❌ ERROR IN completeOrder ❌❌❌');
      console.error('[OrderController] Error message:', error.message);
      console.error('[OrderController] Error stack:', error.stack);
      console.log('========================================');
      
      return res.status(400).json({
        success: false,
        message: 'Lỗi khi hoàn thành đơn hàng',
        error: error.message,
      });
    }
  };

  // ============================================
  // RETURN CONTROLLER OBJECT
  // ============================================
  // Trả về object chứa tất cả HTTP handlers
  // Spread baseController để lấy các handlers cơ bản (nếu không được override)
  // Sau đó override/thêm các handlers riêng của OrderController
  return {
    ...baseController,                    // Spread các handlers từ BaseController (getAll, getById được override, create, update, delete, count)
    getAll,                                // Override getAll để include user và order status info
    getByOrderNumber,                      // Handler riêng: Lấy order theo order number
    getByUser,                             // Handler riêng: Lấy orders theo user ID
    getByStatus,                           // Handler riêng: Lấy orders theo status ID
    createFromCart,                        // Handler riêng: Tạo order từ cart
    updateStatus,                          // Handler riêng: Cập nhật order status
    confirmOrder,                          // Handler riêng: Xác nhận đơn hàng (PENDING -> CONFIRMED)
    confirmPayment,                        // Handler riêng: Xác nhận thanh toán cho COD (DELIVERED -> COMPLETED)
    startShipping,                         // Handler riêng: Bắt đầu giao hàng (CONFIRMED -> SHIPPING)
    markAsDelivered,                       // Handler riêng: Xác nhận đã giao hàng (SHIPPING -> DELIVERED)
    getById,                               // Override getById để include items và payment
    cancelOrder,                           // Handler riêng: Hủy đơn hàng
    returnOrder,                           // Handler riêng: Trả hàng
    getOrderStatuses,                      // Handler riêng: Lấy danh sách order statuses
    getMyOrders,                           // Handler riêng: Lấy orders của user hiện tại (từ token)
    getMyOrderById,                        // Handler riêng: Lấy order của user hiện tại theo ID (từ token)
    createMyOrder,                         // Handler riêng: Tạo order cho user hiện tại (từ token)
    createFromMyCart,                      // Handler riêng: Tạo order từ cart của user hiện tại (từ token)
    cancelMyOrder,                         // Handler riêng: Hủy order của user hiện tại (từ token)
    returnMyOrder,                         // Handler riêng: Trả hàng order của user hiện tại (từ token)
    getPendingOrderProductsSummary,        // Handler riêng: Thống kê sản phẩm cần đặt từ đơn hàng PENDING
    updateOrderToShipping,                 // Handler riêng: Shipper cập nhật trạng thái sang Đang giao hàng
    updateOrderToDelivered,                // Handler riêng: Shipper cập nhật trạng thái sang Đã giao hàng
    completeOrder,                         // Handler riêng: Admin hoàn thành đơn hàng (DELIVERED -> COMPLETED)
  };
};

// ============================================
// EXPORT MODULE
// ============================================
// Export OrderController đã được khởi tạo (singleton pattern)
// Cách sử dụng: const orderController = require('./OrderController');
//               router.get('/', orderController.getAll);
module.exports = createOrderController();
