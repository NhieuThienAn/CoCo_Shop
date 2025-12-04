const createBaseController = require('./BaseController');

const { order, orderItem, cartItem, product, inventoryTransaction } = require('../Models');

const OrderStatus = require('../Constants/OrderStatus');

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

  const baseController = createBaseController(order);

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

      const { paymentStatus } = require('../Models');

      const paidStatus = await paymentStatus.findByName('Paid');
      if (paidStatus && paidStatus.payment_status_id) {
        return paidStatus.payment_status_id;
      }

      const statusRow = await paymentStatus.findFirstByNameLike('paid');
      if (statusRow && statusRow.payment_status_id) {
        return statusRow.payment_status_id;
      }

      return 2;
    } catch (error) {

      console.error('[OrderController] Error finding Paid status:', error.message);
      return 2; 
    }
  };

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

    const { payment } = require('../Models');

    const paidStatusId = await getPaidStatusId();

    const activePayment = await payment.findByOrderIdAndStatus(orderId, paidStatusId) ||  
                          await payment.findFirstByOrderId(orderId);                        

    const allPayments = await payment.findByOrderId(orderId);

    return {
      payment: activePayment,                                    
      paymentMethod: activePayment?.gateway?.toUpperCase() || null,
      isPaid: activePayment ? parseInt(activePayment.payment_status_id) === paidStatusId : false,  
      allPayments: allPayments,
    };
  };

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

    if (!Array.isArray(productIds) || productIds.length === 0) {
      return {};  
    }

    const db = require('../Config/database').getDatabase();

    const uniqueProductIds = [...new Set(productIds.filter(Boolean))];

    if (uniqueProductIds.length === 0) {
      return {};
    }

    const placeholders = uniqueProductIds.map(() => '?').join(',');

    try {

      const [productRows] = await db.execute(
        `SELECT * FROM \`products\` WHERE \`product_id\` IN (${placeholders}) AND \`deleted_at\` IS NULL`,
        uniqueProductIds  
      );

      const productMap = {};
      (productRows || []).forEach(product => {
        productMap[product.product_id] = product;
      });

      return productMap;
    } catch (error) {

      console.error('[OrderController] Error in batchFetchProducts:', error);
      return {};
    }
  };

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

    if (!Array.isArray(orders) || orders.length === 0) {
      return orders;  
    }

    const db = require('../Config/database').getDatabase();

    const orderIds = orders.map(o => o.order_id || o.id).filter(Boolean);

    if (orderIds.length === 0) {
      return orders;
    }

    const placeholders = orderIds.map(() => '?').join(',');

    try {

      const paidStatusId = await getPaidStatusId();

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

      const [paymentsRows] = await db.execute(
        `SELECT * FROM \`payments\` WHERE \`order_id\` IN (${placeholders}) ORDER BY \`order_id\` ASC, \`created_at\` DESC`,
        orderIds
      );

      const paymentsMap = {};
      (paymentsRows || []).forEach(payment => {
        const oid = payment.order_id;
        if (!paymentsMap[oid]) {
          paymentsMap[oid] = [];
        }
        paymentsMap[oid].push(payment);
      });

      const [paidPaymentsRows] = await db.execute(
        `SELECT * FROM \`payments\` WHERE \`order_id\` IN (${placeholders}) AND \`payment_status_id\` = ? ORDER BY \`created_at\` DESC`,
        [...orderIds, paidStatusId]
      );

      const paidPaymentsMap = {};
      (paidPaymentsRows || []).forEach(payment => {
        const oid = payment.order_id;
        if (!paidPaymentsMap[oid]) {
          paidPaymentsMap[oid] = payment; 
        }
      });

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

      const mostRecentPaymentsMap = {};
      (mostRecentPaymentsRows || []).forEach(payment => {
        const oid = payment.order_id;
        mostRecentPaymentsMap[oid] = payment;
      });

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

      const primaryPaymentsMap = {};
      for (const orderId of orderIds) {
        let primaryPayment = paidPaymentsMap[orderId];
        if (!primaryPayment) {
          primaryPayment = mostRecentPaymentsMap[orderId] || null;
        }
        if (primaryPayment) {
          primaryPaymentsMap[orderId] = primaryPayment;
        }
      }

      return orders.map(orderData => {
        const orderId = orderData.order_id || orderData.id;

        if (orderData.status_id && statusMap[orderData.status_id]) {
          orderData.order_status = statusMap[orderData.status_id];
          orderData.order_status_id = orderData.status_id;
        } else if (orderData.status_id) {
          orderData.order_status_id = orderData.status_id;
        }

        orderData.order_items = orderItemsMap[orderId] || [];
        orderData.order_items_count = orderItemsCountMap[orderId] || 0;
        orderData.items = orderData.order_items;
        orderData.items_count = orderData.order_items_count;

        const payments = paymentsMap[orderId] || [];
        const primaryPayment = primaryPaymentsMap[orderId];

        if (primaryPayment) {

          if (primaryPayment.payment_status_id && paymentStatusMap[primaryPayment.payment_status_id]) {
            primaryPayment.payment_status = paymentStatusMap[primaryPayment.payment_status_id];
            primaryPayment.status = primaryPayment.payment_status;
          }
          orderData.payment = primaryPayment;
        } else {
          orderData.payment = null;
        }
        orderData.payments = payments;

        if (orderData.user_id && userMap[orderData.user_id]) {
          orderData.user = userMap[orderData.user_id];
        }

        return orderData;
      });
    } catch (error) {
      console.error('[OrderController] Error in batchEnrichOrders:', error);

      return orders;
    }
  };

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

      const userRoleId = req.user.roleId;
      const userId = req.user.userId;
      const orderUserId = data.user_id;

      if (userRoleId !== 1 && userRoleId !== 2 && userId !== orderUserId) {
        return res.status(403).json({
          success: false,
          message: 'Bạn không có quyền truy cập đơn hàng này.',
        });
      }

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

      if (Array.isArray(data) && data.length > 0) {
        console.log('[OrderController] 🔄 Starting to batch enrich', data.length, 'orders with payment and status data...');
        try {
          data = await batchEnrichOrders(data);
          console.log('[OrderController] ✅ Orders batch enriched successfully');
        } catch (enrichError) {
          console.error('[OrderController] ❌❌❌ CRITICAL ERROR IN BATCH ENRICH PROCESS ❌❌❌');
          console.error('[OrderController] Error message:', enrichError.message);
          console.error('[OrderController] Error stack:', enrichError.stack);

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

      const cartItems = await cartItem.findByUserId(userId);

      if (!cartItems || cartItems.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Giỏ hàng trống',
        });
      }

      let totalAmount = 0;
      const stockErrors = [];

      const productIds = cartItems.map(item => item.product_id).filter(Boolean);
      const productMap = await batchFetchProducts(productIds);
      console.log(`[OrderController] 🔍 Batch fetched ${Object.keys(productMap).length} products for validation`);

      for (const item of cartItems) {
        console.log(`[OrderController] 🔍 Validating cart item: product_id=${item.product_id}, quantity=${item.quantity}`);

        const productData = productMap[item.product_id];

        if (!productData) {
          const errorMsg = `Sản phẩm ID ${item.product_id} không tồn tại`;
          console.log(`[OrderController] ❌ ${errorMsg}`);
          stockErrors.push(errorMsg);
          continue;
        }

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

      const orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

      const orderDataToCreate = {
        order_number: orderNumber,
        user_id: userId,
        shipping_address_id: shippingAddressId,
        billing_address_id: billingAddressId !== undefined && billingAddressId !== null ? billingAddressId : null,
        status_id: OrderStatus.PENDING.id, 
        order_date: new Date(),
        total_amount: totalAmount - discountAmount,
        coupon_id: couponId !== undefined && couponId !== null ? couponId : null,
        discount_amount: discountAmount !== undefined && discountAmount !== null ? discountAmount : 0,
        currency: orderData.currency || 'VND',
        shipping_fee: orderData.shipping_fee !== undefined && orderData.shipping_fee !== null ? orderData.shipping_fee : 0,
        tax_amount: orderData.tax_amount !== undefined && orderData.tax_amount !== null ? orderData.tax_amount : 0,
      };

      Object.keys(orderDataToCreate).forEach(key => {
        if (orderDataToCreate[key] === undefined) {
          orderDataToCreate[key] = null;
        }
      });

      console.log('[OrderController] 📦 Order data to create:', JSON.stringify(orderDataToCreate, null, 2));
      const orderResult = await order.create(orderDataToCreate);
      const orderId = orderResult.insertId;

      const productIdsForItems = cartItems.map(item => item.product_id).filter(Boolean);
      const productMapForItems = await batchFetchProducts(productIdsForItems);
      console.log(`[OrderController] 🔍 Batch fetched ${Object.keys(productMapForItems).length} products for order items creation`);

      for (const item of cartItems) {

        const productData = productMapForItems[item.product_id];

        const productSnapshot = {
          name: productData?.name || null,
          price: productData?.price || null,
          images: null,
          primary_image: null,
        };

        await orderItem.createWithSnapshot(
          orderId,
          item.product_id,
          item.quantity,
          item.unit_price,
          productSnapshot
        );

      }

      if (couponId) {
        const { coupon } = require('../Models');
        await coupon.incrementUsage(couponId);
      }

      let paymentInfo = null;
      if (paymentMethodId) {
        console.log('[OrderController] 🔍 Creating payment record, paymentMethodId:', paymentMethodId);
        const { payment, paymentMethod } = require('../Models');
        const db = require('../Config/database').getDatabase();

        try {
          const [allMethods] = await db.execute('SELECT * FROM `paymentmethods` ORDER BY `payment_method_id`');
          console.log('[OrderController] 📋 All payment methods in database:', JSON.stringify(allMethods, null, 2));
        } catch (debugError) {
          console.error('[OrderController] ⚠️ Could not list payment methods:', debugError.message);
        }

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

        if (!methodData) {
          console.log('[OrderController] ⚠️ Payment method not found by ID, trying to find by name...');

          if (paymentMethodId === 1) {

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

            if (!methodData) {
              console.log('[OrderController] ⚠️ COD not found by name, checking if payment method ID 2 exists...');
              const foundById = await paymentMethod.findById(2);
              if (foundById) {
                methodData = foundById;
                console.log('[OrderController] ✅ Found payment method with ID 2:', {
                  id: methodData.payment_method_id,
                  name: methodData.method_name
                });
              } else {
                console.log('[OrderController] ⚠️ Payment method ID 2 does not exist. Creating COD payment method...');

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
                       paymentMethodId === 2;
          const isMOMO = methodNameUpper.includes('MOMO') || 
                        methodNameUpper.includes('MO MO') ||
                        paymentMethodId === 1;
          console.log('[OrderController] 📊 Payment method type:', { 
            isCOD, 
            isMOMO, 
            name: methodData.method_name,
            requestedId: paymentMethodId,
            actualId: methodData.payment_method_id
          });

          const actualPaymentMethodId = methodData.payment_method_id;

          const { paymentStatus } = require('../Models');
          let pendingStatusId = null;
          try {
            const pendingStatus = await paymentStatus.findByName('Pending');
            if (pendingStatus && pendingStatus.payment_status_id) {
              pendingStatusId = pendingStatus.payment_status_id;
              console.log('[OrderController] ✅ Found Pending payment status:', pendingStatusId);
            } else {

              const statusRow = await paymentStatus.findFirstByNameLike('pending');
              if (statusRow && statusRow.payment_status_id) {
                pendingStatusId = statusRow.payment_status_id;
                console.log('[OrderController] ✅ Found Pending payment status (case-insensitive):', pendingStatusId);
              } else {

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

          if (isCOD) {
            const paymentData = {
              order_id: orderId,
              payment_method_id: actualPaymentMethodId,
              gateway: 'COD',
              amount: totalAmount - discountAmount,
              payment_status_id: pendingStatusId, 
            };

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

            const paymentData = {
              order_id: orderId,
              payment_method_id: actualPaymentMethodId,
              gateway: 'momo',
              amount: totalAmount - discountAmount,
              payment_status_id: pendingStatusId, 
              metadata: JSON.stringify({ order_number: orderNumber }),
            };

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

            const paymentData = {
              order_id: orderId,
              payment_method_id: actualPaymentMethodId,
              gateway: null,
              amount: totalAmount - discountAmount,
              payment_status_id: pendingStatusId, 
            };

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

      const orderData = await order.findById(id);
      if (!orderData) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy đơn hàng',
        });
      }

      const paymentInfo = await getOrderPaymentInfo(id);

      const currentStatusId = parseInt(orderData.status_id);
      const targetStatusIdInt = parseInt(targetStatusId);

      const isBackwardStep = targetStatusIdInt < currentStatusId && 
                             targetStatusIdInt !== OrderStatus.CANCELLED.id && 
                             targetStatusIdInt !== OrderStatus.RETURNED.id;
      const isForwardStep = targetStatusIdInt > currentStatusId;
      const isSameStep = targetStatusIdInt === currentStatusId;

      if (isBackwardStep) {
        const { adminPin } = req.body;
        const requiredPin = process.env.ADMIN_PIN || '1234'; 
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

      } else {

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

          if (paymentInfo.paymentMethod === 'MOMO' && orderData.status_id === 1 && targetStatusId === 2 && !paymentInfo.isPaid) {
            errorMessage += ' Đơn hàng MoMo phải được thanh toán trước khi xác nhận.';
          }

          return res.status(400).json({
            success: false,
            message: errorMessage,
          });
        }
      }

      if (isForwardStep && !isSameStep && !isBackwardStep) {
        const expectedNextSteps = {
          1: [2, 5],
          2: [3, 5],
          3: [4, 6],
          4: [6, 8],
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

      const paymentInfo = await getOrderPaymentInfo(id);

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

      console.log('[OrderController] 📦 Deducting stock for confirmed order...');
      const { orderItem: orderItemModel } = require('../Models');
      const orderItems = await orderItemModel.findByOrderId(id);

      const productIdsForStock = orderItems.map(item => item.product_id).filter(Boolean);
      const productMapForStock = await batchFetchProducts(productIdsForStock);
      console.log(`[OrderController] 🔍 Batch fetched ${Object.keys(productMapForStock).length} products for stock validation`);

      for (const item of orderItems) {

        const productData = productMapForStock[item.product_id];

        if (!productData) {
          console.log(`[OrderController] ⚠️ Product ${item.product_id} not found, skipping stock update`);

          await order.updateStatus(id, OrderStatus.PENDING.id, null);
          return res.status(400).json({
            success: false,
            message: `Sản phẩm ID ${item.product_id} không tồn tại`,
          });
        }

        if (productData.stock_quantity < item.quantity) {
          console.log(`[OrderController] ❌ Insufficient stock for product ${item.product_id}: need ${item.quantity}, have ${productData.stock_quantity}`);

          await order.updateStatus(id, OrderStatus.PENDING.id, null);
          return res.status(400).json({
            success: false,
            message: `Sản phẩm ${productData.name} chỉ còn ${productData.stock_quantity} sản phẩm, không đủ để xác nhận đơn hàng`,
          });
        }
      }

      const stockUpdates = orderItems.map(item => ({
        product_id: item.product_id,
        quantity_change: -item.quantity 
      }));
      await product.batchUpdateStock(stockUpdates);
      console.log(`[OrderController] ✅ Batch updated stock for ${stockUpdates.length} products`);

      const transactions = orderItems.map(item => ({
        product_id: item.product_id,
        quantity_change: -item.quantity, 
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

      if (userRoleId === 2) {

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
          console.error('[OrderController] Error finding shipper:', shipperError);
        }

        if (!shipperId) {
          console.log('[OrderController] ❌ Shipper cannot update order: No shipper found');
          return res.status(403).json({
            success: false,
            message: 'Bạn chỉ có thể cập nhật đơn hàng mà bạn đã nhận giao',
          });
        }

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

      const paymentInfo = await getOrderPaymentInfo(id);

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

      if (orderData.status_id !== OrderStatus.DELIVERED.id) {
        const currentStatus = OrderStatus.getById(orderData.status_id);
        console.log('[OrderController] ❌ Invalid status for payment confirmation:', orderData.status_id);
        return res.status(400).json({
          success: false,
          message: `Chỉ có thể xác nhận thanh toán khi đơn hàng ở trạng thái "Đã giao hàng". Đơn hàng hiện tại đang ở trạng thái "${currentStatus?.name || orderData.status_id}".`,
        });
      }

      const paymentInfo = await getOrderPaymentInfo(id);
      console.log('[OrderController] 🔍 Payment info:', {
        paymentMethod: paymentInfo.paymentMethod,
        hasPayment: !!paymentInfo.payment,
        currentPaymentStatus: paymentInfo.payment?.payment_status_id,
      });

      if (paymentInfo.paymentMethod !== 'COD' && paymentInfo.paymentMethod !== 'cod') {
        console.log('[OrderController] ❌ Not a COD order:', paymentInfo.paymentMethod);
        return res.status(400).json({
          success: false,
          message: 'Chỉ đơn hàng COD mới cần xác nhận thanh toán sau khi giao hàng. Đơn hàng MoMo đã được thanh toán trước.',
        });
      }

      const { paymentStatus } = require('../Models');
      let paidStatusId = null;
      let pendingStatusId = null;

      try {
        const paidStatus = await paymentStatus.findByName('Paid');
        if (paidStatus) {
          paidStatusId = paidStatus.payment_status_id;
        } else {

          const paidRow = await paymentStatus.findFirstByNameLike('paid');
          if (paidRow && paidRow.payment_status_id) {
            paidStatusId = paidRow.payment_status_id;
          }
        }

        const pendingStatus = await paymentStatus.findByName('Pending');
        if (pendingStatus) {
          pendingStatusId = pendingStatus.payment_status_id;
        } else {

          const pendingRow = await paymentStatus.findFirstByNameLike('pending');
          if (pendingRow && pendingRow.payment_status_id) {
            pendingStatusId = pendingRow.payment_status_id;
          }
        }
      } catch (statusError) {
        console.error('[OrderController] Error finding payment status:', statusError);

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

        if (createResult && createResult.insertId) {
          updatedPayment = await payment.findById(createResult.insertId);
        }
      } else {

        console.log('[OrderController] 🔄 Updating existing payment record...');
        const { payment } = require('../Models');
        await payment.update(paymentInfo.payment.payment_id, {
          payment_status_id: targetPaymentStatusId,
          paid_at: paid ? new Date() : null,
          gateway_status: paid ? 'success' : 'pending',
        });
        console.log('[OrderController] ✅ Payment record updated');

        updatedPayment = await payment.findById(paymentInfo.payment.payment_id);
      }

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

      if (paid) {
        console.log('[OrderController] 🔄 Order is paid, updating to COMPLETED...');

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

          if (updatedPayment) {
            updated.payment = updatedPayment;
            updated.payments = [updatedPayment];
          }

          // Always try to record payment in bank if paid
          // SystemBankService will check for duplicates internally
          if (paid && targetPaymentStatusId === paidStatusId) {
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
            }
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

          const updated = await order.findById(id);

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

        console.log('[OrderController] ✅ Payment status updated to Pending, order remains DELIVERED');
        const updated = await order.findById(id);

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

  /**
   * HTTP Handler: PUT /orders/:id/delivered
   * Xác nhận đã giao hàng (SHIPPING -> DELIVERED)
   * 
   * Logic:
   * - Chỉ chuyển trạng thái từ SHIPPING sang DELIVERED
   * - Không tự động chuyển sang COMPLETED
   * - Admin/Shipper phải cập nhật thủ công sang COMPLETED sau khi xác nhận thanh toán
   * - Shipper: Chỉ có thể xác nhận đơn hàng mà họ đã nhận (có shipment với shipper_id của họ)
   * 
   * URL Params:
   * - id: ID của order (bắt buộc)
   * 
   * Request Body:
   * - processedBy: ID người xử lý (tùy chọn)
   * 
   * Response:
   * - 200: Success { success: true, message: "...", data: {...} }
   * - 400: Bad Request (validation error, không ở SHIPPING)
   * - 403: Forbidden (Shipper không có quyền)
   * - 404: Not Found (không tìm thấy order)
   * 
   * Đặc biệt:
   * - Tất cả orders (COD và MoMo) đều chỉ chuyển sang DELIVERED
   * - Admin phải cập nhật thủ công sang COMPLETED sau khi xác nhận thanh toán
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

      const userRoleId = req.user?.roleId;
      const userId = req.user?.userId;

      if (userRoleId === 2) {

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
          console.error('[OrderController] Error finding shipper:', shipperError);
        }

        if (!shipperId) {
          console.log('[OrderController] ❌ Shipper cannot update order: No shipper found');
          return res.status(403).json({
            success: false,
            message: 'Bạn chỉ có thể cập nhật đơn hàng mà bạn đã nhận giao',
          });
        }

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

      console.log('[OrderController] 🔄 Updating order status to DELIVERED...');
      await order.updateStatus(id, OrderStatus.DELIVERED.id, processedBy || req.user?.userId);
      const updated = await order.findById(id);
      console.log('[OrderController] ✅ Order status updated to DELIVERED');
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

        if (userRoleId !== 1 && userRoleId !== 2 && userId !== orderUserId) {
          console.log('[OrderController] ❌ Unauthorized access');
          return res.status(403).json({
            success: false,
            message: 'Bạn không có quyền truy cập đơn hàng này.',
          });
        }
      } else {

        console.log('[OrderController] ❌ Not authenticated');
        return res.status(401).json({
          success: false,
          message: 'Vui lòng đăng nhập để tiếp tục.',
        });
      }

      console.log('[OrderController] 🔄 Enriching order with status and payment data...');
      const { payment, paymentStatus, orderStatus } = require('../Models');
      const db = require('../Config/database').getDatabase();
      const paidStatusId = await getPaidStatusId();

      const [
        statusResult,
        itemsResult,
        paymentsResult,
        primaryPaymentResult,
      ] = await Promise.all([
        data.status_id ? db.execute(
          `SELECT * FROM \`orderstatus\` WHERE \`status_id\` = ? LIMIT 1`,
          [data.status_id]
        ) : Promise.resolve([[]]),
        orderItem.findByOrderId(id),
        payment.findByOrderId(id),
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

      if (statusRows && statusRows.length > 0) {
        const statusData = statusRows[0];
        statusData.name = statusData.status_name;
        data.order_status = statusData;
        data.order_status_id = data.status_id;
      } else if (data.status_id) {
        data.order_status_id = data.status_id;
      }

      let primaryPayment = primaryPaymentRows?.[0] || null;

      if (payments && payments.length > 0) {

        const paidPayment = payments.find(p => {
          const statusId = parseInt(p.payment_status_id);
          return statusId === paidStatusId;
        });

        if (paidPayment) {

          primaryPayment = paidPayment;
          console.log('[OrderController] ✅ Found paid payment, using as primary:', {
            paymentId: primaryPayment.payment_id,
            paymentStatusId: primaryPayment.payment_status_id,
            paidStatusId: paidStatusId,
          });
        } else if (!primaryPayment) {

          primaryPayment = payments[0];
          console.log('[OrderController] ⚠️ No paid payment found, using most recent:', {
            paymentId: primaryPayment?.payment_id,
            paymentStatusId: primaryPayment?.payment_status_id,
          });
        }
      }

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

      console.log('[OrderController] 💳 Payment info:', {
        hasPrimaryPayment: !!primaryPayment,
        primaryPaymentId: primaryPayment?.payment_id,
        primaryPaymentStatusId: primaryPayment?.payment_status_id,
        primaryPaymentStatusName: primaryPayment?.payment_status?.status_name || primaryPayment?.payment_status?.name,
        paidStatusId: paidStatusId,
        isPaid: primaryPayment ? parseInt(primaryPayment.payment_status_id) === paidStatusId : false,
        totalPayments: payments?.length || 0,
      });

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

      const isCustomer = !req.user || req.user.role_id !== 1;
      const userId = req.user?.user_id;
      console.log('[OrderController] User info:', { isCustomer, userId, orderUserId: orderData.user_id });

      if (isCustomer) {
        if (!userId || orderData.user_id !== parseInt(userId)) {
          console.log('[OrderController] ❌ Unauthorized: Order does not belong to user');
          return res.status(403).json({
            success: false,
            message: 'Bạn không có quyền hủy đơn hàng này',
          });
        }
      }

      console.log('[OrderController] 🔍 [REQUIREMENT] Checking if order can be cancelled...');
      const currentStatus = OrderStatus.getById(orderData.status_id);

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

      if (isCustomer && orderData.status_id === OrderStatus.PENDING.id) {
        console.log('[OrderController] 🔍 [REQUIREMENT] Checking MoMo payment status...');

        const { payment } = require('../Models');
        const paidStatusId = await getPaidStatusId(); 
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

      await order.updateStatus(id, OrderStatus.CANCELLED.id, null);

      if (orderData.status_id === OrderStatus.CONFIRMED.id) {
        console.log('[OrderController] 📦 Restoring stock for cancelled CONFIRMED order...');
        const items = await orderItem.findByOrderId(id);

        const stockUpdates = items.map(item => ({
          product_id: item.product_id,
          quantity_change: item.quantity
        }));
        await product.batchUpdateStock(stockUpdates);
        console.log(`[OrderController] ✅ Batch updated stock for ${stockUpdates.length} products`);

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

      if (!OrderStatus.canReturn(orderData.status_id)) {
        const currentStatus = OrderStatus.getById(orderData.status_id);
        console.log('[OrderController] ❌ Cannot return order in current status');
        return res.status(400).json({
          success: false,
          message: `Đơn hàng không thể trả hàng ở trạng thái "${currentStatus?.name || orderData.status_id}". Chỉ có thể trả hàng khi đơn hàng đang được giao hoặc đã giao.`,
        });
      }

      console.log('[OrderController] 🔄 Updating order status to RETURNED...');

      await order.updateStatus(id, OrderStatus.RETURNED.id, processedBy);

      console.log('[OrderController] 📦 Restoring stock for order items...');
      const items = await orderItem.findByOrderId(id);

      const stockUpdates = items.map(item => ({
        product_id: item.product_id,
        quantity_change: item.quantity
      }));
      await product.batchUpdateStock(stockUpdates);
      console.log(`[OrderController] ✅ Batch updated stock for ${stockUpdates.length} products`);

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

      if (orderData.user_id !== req.user.userId) {
        return res.status(403).json({
          success: false,
          message: 'Bạn không có quyền xem đơn hàng này',
        });
      }

      const items = await orderItem.findByOrderId(orderData.order_id);

      const { product } = require('../Models');

      const productIds = (items || []).map(item => item.product_id).filter(Boolean);
      const productMap = await product.findByProductIdsAsMap(productIds);
      console.log(`[OrderController] 🔍 Batch fetched ${Object.keys(productMap).length} products for ${items?.length || 0} order items`);

      const itemsWithProduct = (items || []).map((item) => {
        try {

          const productData = productMap[item.product_id];

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

            const mergedProduct = productData ? {
              ...productData,
              name: (productSnapshot?.name && productSnapshot.name.trim() !== '') ? productSnapshot.name : productData.name,
              price: (productSnapshot?.price !== undefined && productSnapshot.price !== null) ? productSnapshot.price : productData.price,
              images: (productSnapshot?.images !== undefined && 
                       productSnapshot?.images !== null && 
                       (Array.isArray(productSnapshot.images) || 
                        typeof productSnapshot.images === 'string' ||
                        (typeof productSnapshot.images === 'object' && Object.keys(productSnapshot.images).length > 0))
                      ) ? productSnapshot.images : productData.images,
              primary_image: (productSnapshot?.primary_image && 
                             typeof productSnapshot.primary_image === 'string' && 
                             productSnapshot.primary_image.trim() !== '') 
                            ? productSnapshot.primary_image 
                            : productData.primary_image,
            } : (productSnapshot || {});

            if (mergedProduct && mergedProduct.images) {
              try {
                const parsedImages = product.parseImages(mergedProduct.images);
                mergedProduct.images = parsedImages;

                const existingPrimaryImageValid = mergedProduct.primary_image && 
                  typeof mergedProduct.primary_image === 'string' && 
                  mergedProduct.primary_image.trim() !== '' && 
                  mergedProduct.primary_image !== '/placeholder.jpg';

                if (!existingPrimaryImageValid && parsedImages.length > 0) {

                  const primaryImg = parsedImages.find(img => img.is_primary) || parsedImages[0];

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
            return {
              ...item,
              product: null
            };
          }
      });

      const { payment, paymentStatus, orderStatus } = require('../Models');
      if (orderData.status_id) {
        try {
          const statusId = parseInt(orderData.status_id);
          const statusData = await orderStatus.findById(statusId);
          if (statusData) {

            statusData.name = statusData.status_name;
            orderData.order_status = statusData;
            orderData.order_status_id = orderData.status_id;
          } else {
            orderData.order_status_id = orderData.status_id;
          }
        } catch (e) {
          console.error('[OrderController] Error fetching order status:', e);
          orderData.order_status_id = orderData.status_id;
        }
      }

      const payments = await payment.findByOrderId(orderData.order_id);

      if (payments && payments.length > 0) {

        const paidStatusId = await getPaidStatusId();
        let primaryPayment = await payment.findByOrderIdAndStatus(orderData.order_id, paidStatusId);

        if (!primaryPayment) {
          primaryPayment = await payment.findFirstByOrderId(orderData.order_id);
        }

        if (primaryPayment && primaryPayment.payment_status_id) {
          try {
            const statusId = parseInt(primaryPayment.payment_status_id);
            const statusData = await paymentStatus.findById(statusId);
            if (statusData) {

              statusData.name = statusData.status_name;
              primaryPayment.payment_status = statusData;
              primaryPayment.status = statusData; 
            }
          } catch (e) {
            console.error('[OrderController] Error fetching payment status:', e);
          }
        }

        orderData.payment = primaryPayment;
        orderData.payments = payments; 
      } else {
        orderData.payment = null;
        orderData.payments = [];
      }

      // Populate shipping address if shipping_address_id exists
      if (orderData.shipping_address_id) {
        try {
          const { address } = require('../Models');
          const shippingAddress = await address.findById(orderData.shipping_address_id);
          if (shippingAddress) {
            orderData.shipping_address = shippingAddress;
          }
        } catch (addressError) {
          console.error('[OrderController] Error fetching shipping address:', addressError.message);
          // Don't fail the request if address fetch fails
        }
      }

      return res.status(200).json({
        success: true,
        data: {
          ...orderData,
          items: itemsWithProduct,
          order_items: itemsWithProduct, 
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

      const pageNum = Math.max(1, parseInt(page) || 1);
      const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 10));

      console.log('[OrderController] Pagination:', { pageNum, limitNum, offset });
      console.log('[OrderController] Filters:', filters);

      console.log('[OrderController] 🔍 Fetching orders from database...');
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

      if (Array.isArray(data) && data.length > 0) {
        console.log('[OrderController] Enriching orders with user and status info using batch queries...');
        try {
          data = await batchEnrichOrders(data);
          console.log('[OrderController] ✅ Orders batch enriched successfully');
        } catch (e) {
          console.error('[OrderController] Error in batch enrich:', e);

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

      const countQuery = `SELECT COUNT(*) as total FROM \`orders\` WHERE \`status_id\` = 1`;
      const [countRows] = await db.execute(countQuery, []);
      const totalPendingOrders = parseInt(countRows?.[0]?.total || 0);

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

      const orderData = await order.findById(id);
      if (!orderData) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy đơn hàng',
        });
      }

      if (orderData.status_id !== OrderStatus.CONFIRMED.id) {
        const currentStatus = OrderStatus.getById(orderData.status_id);
        return res.status(400).json({
          success: false,
          message: `Chỉ có thể cập nhật sang "Đang giao hàng" khi đơn hàng ở trạng thái "Đã xác nhận". Đơn hàng hiện tại đang ở trạng thái "${currentStatus?.name || orderData.status_id}".`,
        });
      }

      const { shipment } = require('../Models');
      const db = require('../Config/database').getDatabase();

      let shipperId = null;
      try {
        const userData = await require('../Models').user.findById(userId);
        if (userData) {
          const { shipper: shipperModel } = require('../Models');
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

      const myShipment = await shipment.findByOrderIdAndShipperId(id, shipperId);
      if (!myShipment) {
        return res.status(403).json({
          success: false,
          message: 'Bạn không có quyền cập nhật đơn hàng này. Vui lòng nhận đơn hàng trước.',
        });
      }

      console.log('[OrderController] 🔄 Updating order status to SHIPPING...');
      await order.updateStatus(id, OrderStatus.SHIPPING.id, userId);

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

      const orderData = await order.findById(id);
      if (!orderData) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy đơn hàng',
        });
      }

      if (orderData.status_id !== OrderStatus.SHIPPING.id) {
        const currentStatus = OrderStatus.getById(orderData.status_id);
        return res.status(400).json({
          success: false,
          message: `Chỉ có thể cập nhật sang "Đã giao hàng" khi đơn hàng ở trạng thái "Đang giao hàng". Đơn hàng hiện tại đang ở trạng thái "${currentStatus?.name || orderData.status_id}".`,
        });
      }

      const { shipment } = require('../Models');

      let shipperId = null;
      try {
        const userData = await require('../Models').user.findById(userId);
        if (userData) {
          const { shipper: shipperModel } = require('../Models');
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

      const myShipment = await shipment.findByOrderIdAndShipperId(id, shipperId);
      if (!myShipment) {
        return res.status(403).json({
          success: false,
          message: 'Bạn không có quyền cập nhật đơn hàng này. Vui lòng nhận đơn hàng trước.',
        });
      }

      console.log('[OrderController] 🔄 Updating order status to DELIVERED...');
      await order.updateStatus(id, OrderStatus.DELIVERED.id, userId);

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

      const orderData = await order.findById(id);
      if (!orderData) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy đơn hàng',
        });
      }

      if (orderData.status_id !== OrderStatus.DELIVERED.id) {
        const currentStatus = OrderStatus.getById(orderData.status_id);
        return res.status(400).json({
          success: false,
          message: `Chỉ có thể hoàn thành đơn hàng khi đơn hàng ở trạng thái "Đã giao hàng". Đơn hàng hiện tại đang ở trạng thái "${currentStatus?.name || orderData.status_id}".`,
        });
      }

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

  return {
    ...baseController,
    getAll,                                
    getByOrderNumber,                      
    getByUser,                             
    getByStatus,                           
    createFromCart,                        
    updateStatus,                          
    confirmOrder,                          
    confirmPayment,                        
    startShipping,                         
    markAsDelivered,                       
    getById,                               
    cancelOrder,                           
    returnOrder,                           
    getOrderStatuses,                      
    getMyOrders,                           
    getMyOrderById,                        
    createMyOrder,                         
    createFromMyCart,                      
    cancelMyOrder,                         
    returnMyOrder,                         
    getPendingOrderProductsSummary,        
    updateOrderToShipping,                 
    updateOrderToDelivered,                
    completeOrder,                         
  };
};

module.exports = createOrderController();
