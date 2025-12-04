const createBaseController = require('./BaseController');
const { payment, order } = require('../Models');
/**
 * Tạo PaymentController với các HTTP handlers cho quản lý payments
 * PaymentController kế thừa tất cả handlers từ BaseController và thêm các handlers riêng
 * 
 * @returns {Object} PaymentController object với các handlers:
 * - Từ BaseController: getAll, getById, create, update, delete, count
 * - Riêng Payment: getByOrder, createForOrder, updateGatewayResponse, markAsPaid, refund,
 *   getByGatewayTransactionId, createMoMoPayment, momoCallback, queryMoMoStatus, getByGateway,
 *   getByStatus, capture, getMyPayments, getMyPaymentByOrder
 */

const createPaymentController = () => {
  const baseController = createBaseController(payment);
  const { paymentMethod } = require('../Models');
  let momoService = null;
  try {
    const MoMoService = require('../Services/MoMoService');
    if (typeof MoMoService === 'function') {
      momoService = new MoMoService(process.env.NODE_ENV === 'production' ? 'production' : 'test');
    }
  } catch (error) {
    console.warn('MoMoService not available:', error.message);
  }
  /**
   * HTTP Handler: GET /payments/order/:orderId
   * Lấy danh sách payments theo order ID
   * 
   * URL Params:
   * - orderId: ID của order (bắt buộc)
   * 
   * Response:
   * - 200: Success { success: true, data: [...] }
   * - 400: Bad Request (thiếu orderId)
   * - 500: Server Error
   * 
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Promise<void>} JSON response
   */

  const getByOrder = async (req, res) => {
    console.log('========================================');
    console.log('[PaymentController] getByOrder function called');
    console.log('[PaymentController] Request IP:', req.ip);
    console.log('[PaymentController] Request method:', req.method);
    console.log('[PaymentController] Request URL:', req.originalUrl);
    console.log('[PaymentController] Params:', req.params);
    const startTime = Date.now();
    try {
      const { orderId } = req.params;
      console.log('[PaymentController] Extracted orderId:', orderId);
      if (!orderId) {
        console.log('[PaymentController] ❌ Validation failed: Missing orderId');
        return res.status(400).json({
          success: false,
          message: 'orderId là bắt buộc',
        });
      }
      console.log('[PaymentController] 🔍 Fetching payments for orderId:', orderId);
      const data = await payment.findByOrderId(orderId);
      console.log('[PaymentController] ✅ Payments found:', data?.length || 0);
      const duration = Date.now() - startTime;
      console.log('[PaymentController] ✅ getByOrder completed successfully in', duration, 'ms');
      console.log('========================================');
      return res.status(200).json({
        success: true,
        data,  
      });
    } 
    catch (error) {
      console.error('[PaymentController] ❌❌❌ ERROR IN getByOrder ❌❌❌');
      console.error('[PaymentController] Error message:', error.message);
      console.error('[PaymentController] Error stack:', error.stack);
      console.error('[PaymentController] Error details:', {
        name: error.name,
        message: error.message,
        code: error.code
      });
      console.log('========================================');
      return res.status(500).json({
        success: false,
        message: 'Lỗi khi lấy dữ liệu',
        error: error.message,
      });
    }
  };
  /**
   * HTTP Handler: POST /payments/order
   * Tạo payment record cho một order
   * 
   * Request Body:
   * - orderId: ID của order (bắt buộc)
   * - paymentMethodId: ID của payment method (bắt buộc)
   * - amount: Số tiền thanh toán (tùy chọn, mặc định: total_amount của order)
   * - gateway: Payment gateway (tùy chọn, ví dụ: 'momo', 'cod', 'bank_transfer')
   * - ...paymentData: Các trường khác (gateway_transaction_id, metadata, etc.)
   * 
   * Response:
   * - 201: Created { success: true, message: "...", data: {...} }
   * - 400: Bad Request (validation error, amount không khớp)
   * - 404: Not Found (không tìm thấy order)
   * 
   * Quy trình:
   * 1. Kiểm tra order tồn tại
   * 2. Validate amount (nếu có) phải khớp với total_amount của order
   * 3. Tạo payment record với status 'Pending' (payment_status_id = 1)
   * 
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Promise<void>} JSON response
   */

  const createForOrder = async (req, res) => {
    console.log('========================================');
    console.log('[PaymentController] createForOrder function called');
    console.log('[PaymentController] Request IP:', req.ip);
    console.log('[PaymentController] Request body:', JSON.stringify(req.body, null, 2));
    try {
      const { orderId, paymentMethodId, amount, gateway, ...paymentData } = req.body;
      console.log('[PaymentController] Extracted data:', {
        orderId,
        paymentMethodId,
        amount,
        gateway,
        paymentDataKeys: Object.keys(paymentData)  
      });
      console.log('[PaymentController] 🔍 Checking if order exists...');
      const orderData = await order.findById(orderId);
      if (!orderData) {
        console.log('[PaymentController] ❌ Order not found:', orderId);
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy đơn hàng',
        });
      }
      console.log('[PaymentController] ✅ Order found:', {
        orderId: orderData.order_id,
        totalAmount: orderData.total_amount
      });
      if (amount && parseFloat(amount) !== parseFloat(orderData.total_amount)) {
        console.log('[PaymentController] ❌ Amount mismatch:', {
          provided: amount,
          expected: orderData.total_amount
        });
        return res.status(400).json({
          success: false,
          message: 'Số tiền thanh toán không khớp với tổng tiền đơn hàng',
        });
      }
      const paymentToCreate = {
        order_id: orderId,                          
        payment_method_id: paymentMethodId,         
        amount: amount || orderData.total_amount,
        gateway,
        payment_status_id: 1,
        ...paymentData,
      };
      console.log('[PaymentController] 💳 Creating payment record...');
      console.log('[PaymentController] Payment data:', paymentToCreate);
      const result = await payment.create(paymentToCreate);
      console.log('[PaymentController] ✅ Payment created with ID:', result.insertId);
      const newPayment = await payment.findById(result.insertId);
      console.log('[PaymentController] ✅✅✅ PAYMENT CREATED SUCCESSFULLY ✅✅✅');
      console.log('========================================');
      return res.status(201).json({
        success: true,
        message: 'Tạo thanh toán thành công',
        data: newPayment,  
      });
    } 
    catch (error) {
      console.error('[PaymentController] ❌❌❌ ERROR IN createForOrder ❌❌❌');
      console.error('[PaymentController] Error message:', error.message);
      console.error('[PaymentController] Error stack:', error.stack);
      console.log('========================================');
      return res.status(400).json({
        success: false,
        message: 'Lỗi khi tạo thanh toán',
        error: error.message,
      });
    }
  };
  /**
   * HTTP Handler: PUT /payments/:id/gateway-response
   * Cập nhật gateway response và gateway status cho payment
   * 
   * URL Params:
   * - id: ID của payment (bắt buộc)
   * 
   * Request Body:
   * - gatewayResponse: Response từ payment gateway (JSON object hoặc string)
   * - gatewayStatus: Status từ gateway ('success', 'failed', 'pending')
   * 
   * Response:
   * - 200: Success { success: true, message: "...", data: {...} }
   * - 400: Bad Request (validation error)
   * - 404: Not Found (không tìm thấy payment)
   * 
   * Đặc biệt:
   * - Gateway response được lưu dưới dạng JSON string
   * - Gateway status được cập nhật riêng để dễ query
   * 
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Promise<void>} JSON response
   */

  const updateGatewayResponse = async (req, res) => {
    console.log('========================================');
    console.log('[PaymentController] updateGatewayResponse function called');
    console.log('[PaymentController] Request IP:', req.ip);
    console.log('[PaymentController] Request method:', req.method);
    console.log('[PaymentController] Request URL:', req.originalUrl);
    console.log('[PaymentController] Params:', req.params);
    console.log('[PaymentController] Request body:', JSON.stringify(req.body, null, 2));
    const startTime = Date.now();
    try {
      const { id } = req.params;
      const { gatewayResponse, gatewayStatus } = req.body;
      console.log('[PaymentController] Extracted data:', {
        paymentId: id,
        gatewayStatus,
        hasGatewayResponse: !!gatewayResponse
      });
      if (!id) {
        console.log('[PaymentController] ❌ Validation failed: Missing payment ID');
        return res.status(400).json({
          success: false,
          message: 'Payment ID là bắt buộc',
        });
      }
      console.log('[PaymentController] 🔍 Checking if payment exists...');
      const existingPayment = await payment.findById(id);
      if (!existingPayment) {
        console.log('[PaymentController] ❌ Payment not found:', id);
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy thanh toán',
        });
      }
      console.log('[PaymentController] ✅ Payment found');
      console.log('[PaymentController] ✏️ Updating gateway response...');
      await payment.updateGatewayResponse(id, gatewayResponse, gatewayStatus);
      const updated = await payment.findById(id);
      console.log('[PaymentController] ✅ Gateway response updated successfully');
      const duration = Date.now() - startTime;
      console.log('[PaymentController] ✅ updateGatewayResponse completed successfully in', duration, 'ms');
      console.log('========================================');
      return res.status(200).json({
        success: true,
        message: 'Cập nhật thành công',
        data: updated,  
      });
    } 
    catch (error) {
      console.error('[PaymentController] ❌❌❌ ERROR IN updateGatewayResponse ❌❌❌');
      console.error('[PaymentController] Error message:', error.message);
      console.error('[PaymentController] Error stack:', error.stack);
      console.error('[PaymentController] Error details:', {
        name: error.name,
        message: error.message,
        code: error.code
      });
      console.log('========================================');
      return res.status(400).json({
        success: false,
        message: 'Lỗi khi cập nhật',
        error: error.message,
      });
    }
  };
  /**
   * HTTP Handler: POST /payments/:id/mark-as-paid
   * Đánh dấu payment đã thanh toán (cập nhật payment_status_id = 2 và paid_at)
   * 
   * URL Params:
   * - id: ID của payment (bắt buộc)
   * 
   * Request Body:
   * - paidAt: Thời gian thanh toán (tùy chọn, mặc định: now)
   * 
   * Response:
   * - 200: Success { success: true, message: "...", data: {...} }
   * - 400: Bad Request (validation error)
   * - 404: Not Found (không tìm thấy payment)
   * 
   * Đặc biệt:
   * - [REQUIREMENT] Không tự động cập nhật order status thành CONFIRMED
   * - Order MoMo và COD đều giữ ở trạng thái PENDING và chỉ được admin xác nhận
   * - Có thể tạo bank transaction nếu gateway là 'bank_transfer'
   * 
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Promise<void>} JSON response
   */

  const markAsPaid = async (req, res) => {
    console.log('========================================');
    console.log('[PaymentController] markAsPaid function called');
    console.log('[PaymentController] Request IP:', req.ip);
    console.log('[PaymentController] Request method:', req.method);
    console.log('[PaymentController] Request URL:', req.originalUrl);
    console.log('[PaymentController] Params:', req.params);
    console.log('[PaymentController] Request body:', JSON.stringify(req.body, null, 2));
    const startTime = Date.now();
    try {
      const { id } = req.params;
      const { paidAt } = req.body;
      console.log('[PaymentController] Extracted data:', {
        paymentId: id,
        paidAt
      });
      if (!id) {
        console.log('[PaymentController] ❌ Validation failed: Missing payment ID');
        return res.status(400).json({
          success: false,
          message: 'Payment ID là bắt buộc',
        });
      }
      console.log('[PaymentController] 🔍 Checking if payment exists...');
      const paymentData = await payment.findById(id);
      if (!paymentData) {
        console.log('[PaymentController] ❌ Payment not found:', id);
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy thanh toán',
        });
      }
      console.log('[PaymentController] ✅ Payment found:', {
        paymentId: paymentData.payment_id,
        orderId: paymentData.order_id,
        gateway: paymentData.gateway,
        currentStatus: paymentData.payment_status_id
      });
      console.log('[PaymentController] 💰 Marking payment as paid...');
      await payment.markAsPaid(id, paidAt);
      const OrderStatus = require('../Constants/OrderStatus');
      const orderData = await order.findById(paymentData.order_id);
      console.log('[PaymentController] ℹ️ [REQUIREMENT] Payment marked as paid, but order status remains unchanged:', {
        order_id: paymentData.order_id,
        current_order_status: orderData?.status_id,
        payment_gateway: paymentData.gateway,
        note: 'Order will be confirmed by admin only',
      });
      if (paymentData.gateway === 'bank_transfer' && paymentData.gateway_transaction_id) {
        console.log('[PaymentController] 💳 Bank transfer detected, transaction creation logic can be implemented here');
        const { bankTransaction, bankAccount } = require('../Models');
      }
      console.log('[PaymentController] 🔍 Fetching updated payment...');
      const updated = await payment.findById(id);
      console.log('[PaymentController] ✅ Payment marked as paid successfully');
      const duration = Date.now() - startTime;
      console.log('[PaymentController] ✅ markAsPaid completed successfully in', duration, 'ms');
      console.log('========================================');
      return res.status(200).json({
        success: true,
        message: 'Đánh dấu thanh toán thành công',
        data: updated,
      });
    } catch (error) {
      console.error('[PaymentController] ❌❌❌ ERROR IN markAsPaid ❌❌❌');
      console.error('[PaymentController] Error message:', error.message);
      console.error('[PaymentController] Error stack:', error.stack);
      console.error('[PaymentController] Error details:', {
        name: error.name,
        message: error.message,
        code: error.code
      });
      console.log('========================================');
      return res.status(400).json({
        success: false,
        message: 'Lỗi khi đánh dấu thanh toán',
        error: error.message,
      });
    }
  };
  const refund = async (req, res) => {
    console.log('========================================');
    console.log('[PaymentController] refund function called');
    console.log('[PaymentController] Request IP:', req.ip);
    console.log('[PaymentController] Request method:', req.method);
    console.log('[PaymentController] Request URL:', req.originalUrl);
    console.log('[PaymentController] Params:', req.params);
    console.log('[PaymentController] Request body:', JSON.stringify(req.body, null, 2));
    const startTime = Date.now();
    try {
      const { id } = req.params;
      const { refundAmount, reason } = req.body;
      console.log('[PaymentController] Extracted data:', {
        paymentId: id,
        refundAmount,
        hasReason: !!reason
      });
      if (!id) {
        console.log('[PaymentController] ❌ Validation failed: Missing payment ID');
        return res.status(400).json({
          success: false,
          message: 'Payment ID là bắt buộc',
        });
      }
      console.log('[PaymentController] 🔍 Checking if payment exists...');
      const paymentData = await payment.findById(id);
      if (!paymentData) {
        console.log('[PaymentController] ❌ Payment not found:', id);
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy thanh toán',
        });
      }
      console.log('[PaymentController] ✅ Payment found:', {
        paymentId: paymentData.payment_id,
        amount: paymentData.amount,
        currentRefunded: paymentData.refunded_amount || 0
      });
      const refundAmt = parseFloat(refundAmount || paymentData.amount);
      const currentRefunded = parseFloat(paymentData.refunded_amount || 0);
      const totalRefunded = currentRefunded + refundAmt;
      console.log('[PaymentController] 💰 Calculating refund:', {
        refundAmount: refundAmt,
        currentRefunded,
        totalRefunded,
        paymentAmount: parseFloat(paymentData.amount)
      });
      if (totalRefunded > parseFloat(paymentData.amount)) {
        console.log('[PaymentController] ❌ Validation failed: Refund amount exceeds payment amount');
        return res.status(400).json({
          success: false,
          message: 'Số tiền hoàn vượt quá số tiền thanh toán',
        });
      }
      const newStatusId = totalRefunded >= parseFloat(paymentData.amount) ? 3 : paymentData.payment_status_id;
      console.log('[PaymentController] 💸 Processing refund...');
      console.log('[PaymentController] New payment status:', newStatusId);
      await payment.update(id, {
        refunded_amount: totalRefunded,
        payment_status_id: newStatusId, 
      });
      console.log('[PaymentController] 🔍 Fetching updated payment...');
      const updated = await payment.findById(id);
      console.log('[PaymentController] ✅ Refund processed successfully');
      const duration = Date.now() - startTime;
      console.log('[PaymentController] ✅ refund completed successfully in', duration, 'ms');
      console.log('========================================');
      return res.status(200).json({
        success: true,
        message: 'Hoàn tiền thành công',
        data: updated,
      });
    } catch (error) {
      console.error('[PaymentController] ❌❌❌ ERROR IN refund ❌❌❌');
      console.error('[PaymentController] Error message:', error.message);
      console.error('[PaymentController] Error stack:', error.stack);
      console.error('[PaymentController] Error details:', {
        name: error.name,
        message: error.message,
        code: error.code
      });
      console.log('========================================');
      return res.status(400).json({
        success: false,
        message: 'Lỗi khi hoàn tiền',
        error: error.message,
      });
    }
  };
  const getByGatewayTransactionId = async (req, res) => {
    console.log('========================================');
    console.log('[PaymentController] getByGatewayTransactionId function called');
    console.log('[PaymentController] Request IP:', req.ip);
    console.log('[PaymentController] Request method:', req.method);
    console.log('[PaymentController] Request URL:', req.originalUrl);
    console.log('[PaymentController] Params:', req.params);
    const startTime = Date.now();
    try {
      const { gatewayTransactionId } = req.params;
      console.log('[PaymentController] Extracted gatewayTransactionId:', gatewayTransactionId);
      if (!gatewayTransactionId) {
        console.log('[PaymentController] ❌ Validation failed: Missing gatewayTransactionId');
        return res.status(400).json({
          success: false,
          message: 'Gateway Transaction ID là bắt buộc',
        });
      }
      console.log('[PaymentController] 🔍 Searching payment by gateway transaction ID...');
      const data = await payment.findByGatewayTransactionId(gatewayTransactionId);
      if (!data) {
        console.log('[PaymentController] ❌ Payment not found');
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy thanh toán',
        });
      }
      console.log('[PaymentController] ✅ Payment found:', data.payment_id);
      const duration = Date.now() - startTime;
      console.log('[PaymentController] ✅ getByGatewayTransactionId completed successfully in', duration, 'ms');
      console.log('========================================');
      return res.status(200).json({
        success: true,
        data,
      });
    } catch (error) {
      console.error('[PaymentController] ❌❌❌ ERROR IN getByGatewayTransactionId ❌❌❌');
      console.error('[PaymentController] Error message:', error.message);
      console.error('[PaymentController] Error stack:', error.stack);
      console.error('[PaymentController] Error details:', {
        name: error.name,
        message: error.message,
        code: error.code
      });
      console.log('========================================');
      return res.status(500).json({
        success: false,
        message: 'Lỗi khi lấy dữ liệu',
        error: error.message,
      });
    }
  };
  const createMoMoPayment = async (req, res) => {
    console.log('[PaymentController] 🚀 createMoMoPayment called');
    try {
      const { orderId, redirectUrl, ipnUrl, extraData } = req.body;
      console.log('[PaymentController] 📥 Request body:', { orderId, redirectUrl, ipnUrl });
      if (!orderId) {
        console.log('[PaymentController] ❌ Missing orderId');
        return res.status(400).json({
          success: false,
          message: 'orderId là bắt buộc',
        });
      }
      console.log('[PaymentController] 🔍 Looking up order:', orderId);
      const orderData = await order.findById(orderId);
      if (!orderData) {
        console.log('[PaymentController] ❌ Order not found:', orderId);
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy đơn hàng',
        });
      }
      console.log('[PaymentController] ✅ Order found');
      console.log('[PaymentController] 🔍 Looking up existing payments for order:', orderId);
      const paidStatusId = 2; 
      const paidPayment = await payment.findByOrderIdAndStatus(orderId, paidStatusId);
      if (paidPayment) {
        console.log('[PaymentController] ❌ Order already paid');
        return res.status(400).json({
          success: false,
          message: 'Đơn hàng đã được thanh toán',
        });
      }
      const existingPayments = await payment.findByOrderId(orderId);
      console.log('[PaymentController] 📊 Existing payments:', existingPayments.length);
      console.log('[PaymentController] 🔍 Starting payment method lookup...');
      let momoPaymentMethodId = null;
      try {
        const db = require('../Config/database').getDatabase();
        if (!db) {
          throw new Error('Database connection không khả dụng');
        }
        console.log('[PaymentController] ✅ Database connection obtained');
        console.log('[PaymentController] 🔍 Searching for MoMo payment method...');
        const { paymentMethod } = require('../Models');
        const existingMethod = await paymentMethod.findFirstByNameLike('momo');
        console.log('[PaymentController] 📊 Search result:', existingMethod ? 'found' : 'not found');
        if (existingMethod && existingMethod.payment_method_id) {
          momoPaymentMethodId = existingMethod.payment_method_id;
          console.log('[PaymentController] ✅ Found existing payment method:', momoPaymentMethodId);
        } else {
          console.log('[PaymentController] ⚠️ Payment method not found, attempting to create...');
          try {
            const [createResult] = await db.execute(
              'INSERT INTO `paymentmethods` (`method_name`, `description`) VALUES (?, ?)',
              ['MoMo', 'Thanh toán qua ví điện tử MoMo']
            );
            console.log('[PaymentController] 📊 Create result:', {
              insertId: createResult?.insertId,
              affectedRows: createResult?.affectedRows
            });
            if (createResult && createResult.insertId) {
              momoPaymentMethodId = createResult.insertId;
              console.log('[PaymentController] ✅ Created payment method:', momoPaymentMethodId);
            } else {
              console.log('[PaymentController] ⚠️ No insertId, trying to find...');
              const duplicateMethod = await paymentMethod.findByName('MoMo');
              if (duplicateMethod && duplicateMethod.payment_method_id) {
                momoPaymentMethodId = duplicateMethod.payment_method_id;
                console.log('[PaymentController] ✅ Found after creation:', momoPaymentMethodId);
              }
            }
          } catch (createError) {
            console.error('[PaymentController] ❌ Create error:', {
              message: createError.message,
              code: createError.code,
              errno: createError.errno
            });
            if (createError.code === 'ER_DUP_ENTRY' || createError.errno === 1062) {
              console.log('[PaymentController] 🔍 Duplicate entry, finding existing...');
              const duplicateMethod = await paymentMethod.findByName('MoMo');
              if (duplicateMethod && duplicateMethod.payment_method_id) {
                momoPaymentMethodId = duplicateMethod.payment_method_id;
                console.log('[PaymentController] ✅ Found duplicate:', momoPaymentMethodId);
              }
            }
          }
        }
        if (!momoPaymentMethodId) {
          console.error('[PaymentController] ❌ MoMo payment method not found and could not be created');
          console.error('[PaymentController] ❌ Final check - momoPaymentMethodId:', momoPaymentMethodId);
          return res.status(500).json({
            success: false,
            message: 'Phương thức thanh toán MoMo không tồn tại trong hệ thống',
          });
        }
        console.log('[PaymentController] ✅ Final payment_method_id:', momoPaymentMethodId);
      } catch (error) {
        console.error('[PaymentController] ❌ Error finding/creating payment method:', {
          message: error.message,
          stack: error.stack,
          code: error.code
        });
        return res.status(500).json({
          success: false,
          message: 'Lỗi khi tìm phương thức thanh toán',
          error: error.message,
        });
      }
      const pendingMoMoPayment = await payment.findByOrderIdStatusGatewayAndMethod(orderId, 1, 'MOMO', momoPaymentMethodId)
        || await payment.findByOrderIdStatusAndGateway(orderId, 1, 'MOMO');
      let paymentId;
      let requestId;
      let isNewPayment = false;
      if (pendingMoMoPayment) {
        paymentId = pendingMoMoPayment.payment_id;
        requestId = `MOMO${Date.now()}_${paymentId}`;
        await payment.update(paymentId, {
          gateway_transaction_id: requestId,
          gateway_status: 'pending',
        });
        console.log('[PaymentController] 🔄 Retry payment - Updated requestId:', requestId);
      } else {
        const baseOrderIdForMetadata = orderData.order_number || `ORDER_${orderId}`;
        const paymentResult = await payment.create({
          order_id: orderId,
          payment_method_id: momoPaymentMethodId, 
          gateway: 'momo',
          amount: orderData.total_amount,
          payment_status_id: 1, 
          metadata: JSON.stringify({ 
            order_number: orderData.order_number,
          }),
        });
        paymentId = paymentResult.insertId;
        requestId = `MOMO${Date.now()}_${paymentId}`;
        isNewPayment = true;
      }
      if (!momoService) {
        return res.status(503).json({
          success: false,
          message: 'MoMo service không khả dụng',
        });
      }
      let baseOrderId = orderData.order_number || `ORDER_${orderId}`;
      baseOrderId = baseOrderId.toString().replace(/[^a-zA-Z0-9_-]/g, '_');
      let momoOrderId;
      if (pendingMoMoPayment) {
        const timestamp = Date.now();
        const uniqueSuffix = `_${paymentId}_${timestamp}`;
        momoOrderId = `${baseOrderId}${uniqueSuffix}`.substring(0, 50);
        console.log('[PaymentController] 🔄 Retry payment - Using unique orderId:', momoOrderId);
      } else {
        if (baseOrderId.length < 10) {
          momoOrderId = `${baseOrderId}_${Date.now()}`.substring(0, 50);
        } else {
          momoOrderId = baseOrderId.substring(0, 50);
        }
      }
      const finalRedirectUrl = redirectUrl || momoService.config.redirectUrl;
      const finalIpnUrl = ipnUrl || momoService.config.ipnUrl;
      console.log('[PaymentController] 📋 Creating MoMo payment:', {
        orderId: momoOrderId,
        amount: orderData.total_amount,
      });
      const momoResult = await momoService.createPaymentRequest({
        orderId: momoOrderId,
        amount: orderData.total_amount,
        orderInfo: `Thanh toán đơn hàng ${orderData.order_number || orderId}`,
        extraData: extraData || JSON.stringify({ paymentId, orderId }),
        redirectUrl: finalRedirectUrl,
        ipnUrl: finalIpnUrl,
        requestId: requestId,
      });
      if (!momoResult.success) {
        console.error('[PaymentController] ❌ MoMo payment request failed:', {
          resultCode: momoResult.resultCode,
          message: momoResult.message,
        });
        return res.status(400).json({
          success: false,
          message: momoResult.message || `Lỗi từ MoMo (Code: ${momoResult.resultCode})`,
          error: `MoMo API returned error code: ${momoResult.resultCode}`,
          resultCode: momoResult.resultCode,
        });
      }
      console.log('[PaymentController] ✅ MoMo payment request created successfully');
      let existingMetadata = {};
      let paymentRecord = pendingMoMoPayment;
      if (!paymentRecord && paymentId) {
        paymentRecord = await payment.findById(paymentId);
      }
      if (paymentRecord?.metadata) {
        try {
          existingMetadata = typeof paymentRecord.metadata === 'string' 
            ? JSON.parse(paymentRecord.metadata) 
            : paymentRecord.metadata;
        } catch (e) {
        }
      }
      const updateData = {
        gateway_response: JSON.stringify(momoResult.rawResponse),
        metadata: JSON.stringify({
          ...existingMetadata,
          momoOrderId: momoOrderId,
          orderNumber: orderData.order_number,
        }),
      };
      if (isNewPayment || !pendingMoMoPayment?.gateway_transaction_id) {
        updateData.gateway_transaction_id = requestId;
        updateData.gateway_status = 'pending';
      }
      await payment.update(paymentId, updateData);
      return res.status(200).json({
        success: true,
        message: 'Tạo payment request thành công',
        data: {
          paymentId,
          payUrl: momoResult.payUrl,
          deeplink: momoResult.deeplink,
          qrCodeUrl: momoResult.qrCodeUrl,
          requestId: momoResult.requestId,
          orderId: orderData.order_number || `ORDER_${orderId}`,
          amount: momoResult.amount,
        },
      });
    } catch (error) {
      console.error('[PaymentController] Error in createMoMoPayment:', error.message);
      console.error('[PaymentController] Error stack:', error.stack);
      return res.status(400).json({
        success: false,
        message: error.error || 'Lỗi khi tạo payment request',
        error: error.rawError || error.message,
      });
    }
  };
  const momoCallback = async (req, res) => {
    console.log('========================================');
    console.log('[PaymentController] 🔔🔔🔔 MoMo CALLBACK RECEIVED 🔔🔔🔔');
    console.log('[PaymentController] Request IP:', req.ip);
    console.log('[PaymentController] Request body:', JSON.stringify(req.body, null, 2));
    console.log('========================================');
    
    try {
      const callbackData = req.body;
      if (!momoService) {
        console.error('[PaymentController] ❌ MoMo service not available');
        return res.status(503).json({
          success: false,
          message: 'MoMo service không khả dụng',
        });
      }
      const result = momoService.processCallback(callbackData);
      console.log('[PaymentController] 📋 Callback processing result:', {
        verified: result.verified,
        success: result.success,
        orderId: result.orderId,
        requestId: result.requestId,
        transId: result.transId
      });
      if (!result.verified) {
        console.error('[PaymentController] ❌ Signature verification failed for MoMo callback');
        return res.status(400).json({
          success: false,
          message: 'Invalid signature',
        });
      }
      let paymentData = null;
      if (result.requestId) {
        paymentData = await payment.findByGatewayTransactionId(result.requestId);
        if (paymentData) {
          console.log('[PaymentController] ✅ Found payment by requestId:', result.requestId);
        }
      }
      if (!paymentData && result.extraData) {
        try {
          const extraDataParsed = typeof result.extraData === 'string' 
            ? JSON.parse(result.extraData) 
            : result.extraData;
          if (extraDataParsed.paymentId) {
            paymentData = await payment.findById(extraDataParsed.paymentId);
            if (paymentData) {
              console.log('[PaymentController] ✅ Found payment by extraData.paymentId:', extraDataParsed.paymentId);
            }
          }
        } catch (e) {
        }
      }
      if (!paymentData && result.orderId) {
        let baseOrderNumber = result.orderId;
        const suffixPattern = /_(\d+)_(\d+)$/;
        if (suffixPattern.test(baseOrderNumber)) {
          baseOrderNumber = baseOrderNumber.replace(suffixPattern, '');
          console.log('[PaymentController] 🔄 Extracted base order number from retry orderId:', {
            original: result.orderId,
            extracted: baseOrderNumber
          });
        }
        let orderData = await order.findByOrderNumber(baseOrderNumber);
        if (!orderData) {
          const orderNumberMatch = baseOrderNumber.match(/ORD-(\d+)-/);
          if (orderNumberMatch) {
            const timestamp = orderNumberMatch[1];
            orderData = await order.findByOrderNumberPattern(timestamp, 10);
          }
        }
        if (orderData) {
          const [pendingMoMoPayment, anyMoMoPayment, firstPayment] = await Promise.all([
            payment.findByOrderIdStatusAndGateway(orderData.order_id, 1, 'MOMO'),
            payment.findByOrderIdAndGateway(orderData.order_id, 'MOMO'),
            payment.findFirstByOrderId(orderData.order_id)
          ]);
          paymentData = pendingMoMoPayment || anyMoMoPayment || firstPayment;
          if (paymentData) {
            console.log('[PaymentController] ✅ Found payment by orderId:', {
              originalOrderId: result.orderId,
              baseOrderNumber: baseOrderNumber,
              orderId: orderData.order_id,
              paymentId: paymentData.payment_id
            });
          }
          if (result.requestId && paymentData) {
            if (!paymentData.gateway_transaction_id || paymentData.gateway_transaction_id !== result.requestId) {
              await payment.update(paymentData.payment_id, {
                gateway_transaction_id: result.requestId,
              });
              console.log('[PaymentController] ✅ Updated gateway_transaction_id:', result.requestId);
            }
          }
        } else {
          let matchingOrder = await order.findByOrderNumber(result.orderId);
          if (!matchingOrder) {
            matchingOrder = await order.findByOrderNumber(baseOrderNumber);
          }
          if (!matchingOrder && baseOrderNumber) {
            matchingOrder = await order.findByOrderNumberPattern(baseOrderNumber, 5);
          }
          if (matchingOrder) {
            const [momoPayment, firstPayment] = await Promise.all([
              payment.findByOrderIdAndGateway(matchingOrder.order_id, 'MOMO'),
              payment.findFirstByOrderId(matchingOrder.order_id)
            ]);
            paymentData = momoPayment || firstPayment;
            if (paymentData) {
              console.log('[PaymentController] ✅ Found payment by partial order match');
            }
          }
        }
      }
      if (!paymentData) {
        console.error('[PaymentController] ❌❌❌ Payment not found for MoMo callback:', {
          orderId: result.orderId,
          requestId: result.requestId,
          extraData: result.extraData,
        });
        return res.status(404).json({
          success: false,
          message: 'Payment not found',
        });
      }
      console.log('[PaymentController] ✅ Payment found for callback:', {
        paymentId: paymentData.payment_id,
        orderId: paymentData.order_id,
        paymentStatusId: paymentData.payment_status_id,
        paymentAmount: paymentData.amount,
        gatewayTransactionId: paymentData.gateway_transaction_id,
        callbackRequestId: result.requestId,
        callbackOrderId: result.orderId,
        callbackSuccess: result.success,
      });
      const OrderStatus = require('../Constants/OrderStatus');
      const currentPaymentStatus = parseInt(paymentData.payment_status_id);
      
      console.log('[PaymentController] 💰 Processing payment callback:', {
        success: result.success,
        currentPaymentStatus,
        paymentAmount: paymentData.amount
      });
      
      if (result.success) {
        console.log('[PaymentController] ✅✅✅ Payment SUCCESS - Processing bank record ✅✅✅');
        await payment.updateGatewayResponse(
          paymentData.payment_id,
          callbackData,
          'success'
        );
        
        // Update gateway_transaction_id if needed
        if (result.transId && result.transId !== paymentData.gateway_transaction_id) {
          await payment.update(paymentData.payment_id, {
            gateway_transaction_id: result.transId,
          });
        } else if (result.requestId && !paymentData.gateway_transaction_id) {
          await payment.update(paymentData.payment_id, {
            gateway_transaction_id: result.requestId,
          });
        }
        
        const paidAt = result.responseTime ? new Date(result.responseTime) : null;
        const wasAlreadyPaid = currentPaymentStatus === 2;
        
        try {
          // Mark as paid if not already paid
          if (!wasAlreadyPaid) {
            console.log('[PaymentController] 💰 Marking payment as paid:', {
              paymentId: paymentData.payment_id,
              orderId: paymentData.order_id,
              previousStatus: currentPaymentStatus,
              paidAt: paidAt,
            });
            await payment.markAsPaid(paymentData.payment_id, paidAt);
            const updatedPayment = await payment.findById(paymentData.payment_id);
            console.log('[PaymentController] ✅ Payment marked as paid successfully:', {
              paymentId: updatedPayment.payment_id,
              paymentStatusId: updatedPayment.payment_status_id,
              paidAt: updatedPayment.paid_at,
            });
          } else {
            console.log('[PaymentController] ℹ️ Payment already marked as paid, status:', currentPaymentStatus);
          }
          
          // ALWAYS try to record payment in bank, even if already paid
          // SystemBankService will check for duplicates internally and skip if already exists
          try {
            const SystemBankService = require('../Services/SystemBankService');
            const orderData = await order.findById(paymentData.order_id);
            if (orderData) {
              console.log('[PaymentController] 💰 Attempting to record payment in system bank:', {
                amount: paymentData.amount,
                orderId: paymentData.order_id,
                paymentId: paymentData.payment_id,
                externalTxnId: result.transId || result.requestId
              });
              
              const bankTransaction = await SystemBankService.recordPayment(
                paymentData.amount,
                paymentData.order_id,
                paymentData.payment_id,
                `Thanh toán MoMo cho đơn hàng #${orderData.order_number}`,
                'MOMO',
                result.transId || result.requestId
              );
              
              if (bankTransaction) {
                console.log('[PaymentController] ✅ Payment recorded in system bank successfully:', {
                  transactionId: bankTransaction.txn_id,
                  newBalance: bankTransaction.balance_after
                });
              } else {
                console.log('[PaymentController] ⚠️ Bank transaction already exists, skipped duplicate');
              }
            } else {
              console.error('[PaymentController] ❌ Order not found for payment:', paymentData.order_id);
            }
          } catch (bankError) {
            console.error('[PaymentController] ❌❌❌ CRITICAL ERROR recording payment in bank ❌❌❌');
            console.error('[PaymentController] Error message:', bankError.message);
            console.error('[PaymentController] Error stack:', bankError.stack);
            // Don't throw - we still want to return success to MoMo
          }
        } catch (markAsPaidError) {
          console.error('[PaymentController] ❌ Error in markAsPaid:', markAsPaidError.message);
          // Continue to try recording in bank even if markAsPaid failed
          try {
            const SystemBankService = require('../Services/SystemBankService');
            const orderData = await order.findById(paymentData.order_id);
            if (orderData) {
              await SystemBankService.recordPayment(
                paymentData.amount,
                paymentData.order_id,
                paymentData.payment_id,
                `Thanh toán MoMo cho đơn hàng #${orderData.order_number}`,
                'MOMO',
                result.transId || result.requestId
              );
            }
          } catch (bankError) {
            console.error('[PaymentController] ⚠️ Error recording payment in bank after markAsPaid error:', bankError.message);
          }
        }
      } else {
        await payment.updateGatewayResponse(
          paymentData.payment_id,
          callbackData,
          'failed'
        );
      }
      if (result.transId) {
        await payment.update(paymentData.payment_id, {
          gateway_transaction_id: result.transId,
        });
      }
      return res.status(200).json({
        success: true,
        message: 'Callback processed successfully',
      });
    } catch (error) {
      console.error('[PaymentController] Error in momoCallback:', error.message);
      return res.status(500).json({
        success: false,
        message: 'Lỗi khi xử lý callback',
        error: error.message,
      });
    }
  };
  const queryMoMoStatus = async (req, res) => {
    try {
      let paymentData = null;
      const { paymentId } = req.params;
      const orderId = req.body?.orderId || req.body?.data?.orderId || req.body?.order_id;
      if (paymentId) {
        paymentData = await payment.findById(paymentId);
      } else if (orderId) {
        const orderDataForLookup = await order.findById(orderId);
        if (!orderDataForLookup) {
          return res.status(404).json({
            success: false,
            message: 'Không tìm thấy đơn hàng',
          });
        }
        const [pendingMoMoPayment, anyMoMoPayment, firstPayment] = await Promise.all([
          payment.findByOrderIdStatusAndGateway(orderId, 1, 'MOMO'),
          payment.findByOrderIdAndGateway(orderId, 'MOMO'),
          payment.findFirstByOrderId(orderId)
        ]);
        paymentData = pendingMoMoPayment || anyMoMoPayment || firstPayment;
      } else {
        return res.status(400).json({
          success: false,
          message: 'Payment ID hoặc Order ID là bắt buộc',
        });
      }
      if (!paymentData) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy thanh toán',
        });
      }
      if (paymentData.gateway !== 'momo' && paymentData.gateway !== 'MOMO') {
        return res.status(400).json({
          success: false,
          message: 'Payment không phải MoMo',
        });
      }
      const orderData = await order.findById(paymentData.order_id);
      if (!orderData) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy đơn hàng',
        });
      }
      let momoOrderId = orderData.order_number || `ORDER_${paymentData.order_id}`;
      if (paymentData.metadata) {
        try {
          const metadata = typeof paymentData.metadata === 'string' 
            ? JSON.parse(paymentData.metadata) 
            : paymentData.metadata;
          if (metadata.momoOrderId) {
            momoOrderId = metadata.momoOrderId;
            console.log('[PaymentController] 🔄 Using momoOrderId from metadata (retry payment):', momoOrderId);
          }
        } catch (e) {
          console.log('[PaymentController] ⚠️ Could not parse metadata, using default orderId');
        }
      }
      const requestId = paymentData.gateway_transaction_id;
      if (!momoService) {
        return res.status(503).json({
          success: false,
          message: 'MoMo service không khả dụng',
        });
      }
      if (!momoOrderId) {
        return res.status(400).json({
          success: false,
          message: 'Không tìm thấy order number cho đơn hàng',
        });
      }
      let queryResult;
      try {
        queryResult = await momoService.queryPaymentStatus(momoOrderId, requestId || undefined);
      } catch (momoError) {
        console.error('[PaymentController] Error calling MoMo service:', momoError.message);
        return res.status(400).json({
          success: false,
          message: `Lỗi khi query payment status: ${momoError.message}`,
          error: momoError.message,
        });
      }
      const OrderStatus = require('../Constants/OrderStatus');
      const currentPaymentStatus = parseInt(paymentData.payment_status_id);
      const resultCode = queryResult.resultCode || 0;
      const isWaitingForUser = resultCode === 1000;
      const isPaymentSuccess = queryResult.success && resultCode === 0;
      const isPaymentFailed = !queryResult.success && resultCode !== 0 && resultCode !== 1000;
      const { paymentStatus } = require('../Models');
      let paidStatusId = null;
      try {
        const paidStatus = await paymentStatus.findByName('Paid');
        if (paidStatus && paidStatus.payment_status_id) {
          paidStatusId = paidStatus.payment_status_id;
        } else {
          const statusRow = await paymentStatus.findFirstByNameLike('paid');
          if (statusRow && statusRow.payment_status_id) {
            paidStatusId = statusRow.payment_status_id;
          } else {
            const createResult = await paymentStatus.create({ status_name: 'Paid' });
            if (createResult && createResult.insertId) {
              paidStatusId = createResult.insertId;
            }
          }
        }
      } catch (statusError) {
        console.error('[PaymentController] Error finding/creating Paid status:', statusError.message);
      }
      if (isPaymentSuccess && paidStatusId && currentPaymentStatus !== paidStatusId) {
        try {
          console.log('[PaymentController] 💰 Marking payment as paid (from query):', {
            paymentId: paymentData.payment_id,
            orderId: paymentData.order_id,
            previousStatus: currentPaymentStatus,
            newStatus: paidStatusId
          });
          await payment.markAsPaid(paymentData.payment_id);
          const updatedPayment = await payment.findById(paymentData.payment_id);
          console.log('[PaymentController] ✅ Payment marked as paid successfully (from query):', {
            paymentId: updatedPayment.payment_id,
            paymentStatusId: updatedPayment.payment_status_id
          });
          
          // ALWAYS try to record payment in bank when payment is marked as paid
          try {
            const SystemBankService = require('../Services/SystemBankService');
            console.log('[PaymentController] 💰 Attempting to record payment in system bank (from query):', {
              amount: paymentData.amount,
              orderId: paymentData.order_id,
              paymentId: paymentData.payment_id,
              externalTxnId: queryResult.transId || requestId
            });
            
            const bankTransaction = await SystemBankService.recordPayment(
              paymentData.amount,
              paymentData.order_id,
              paymentData.payment_id,
              `Thanh toán MoMo cho đơn hàng #${orderData.order_number}`,
              'MOMO',
              queryResult.transId || requestId
            );
            
            if (bankTransaction) {
              console.log('[PaymentController] ✅ Payment recorded in system bank successfully (from query):', {
                transactionId: bankTransaction.txn_id,
                newBalance: bankTransaction.balance_after
              });
            } else {
              console.log('[PaymentController] ⚠️ Bank transaction already exists, skipped duplicate (from query)');
            }
          } catch (bankError) {
            console.error('[PaymentController] ❌❌❌ CRITICAL ERROR recording payment in bank (from query) ❌❌❌');
            console.error('[PaymentController] Error message:', bankError.message);
            console.error('[PaymentController] Error stack:', bankError.stack);
            // Don't throw - we still want to return success
          }
        } catch (markAsPaidError) {
          console.error('[PaymentController] Error in markAsPaid (queryMoMoStatus):', markAsPaidError.message);
          return res.status(400).json({
            success: false,
            message: `Lỗi khi cập nhật payment status: ${markAsPaidError.message}`,
            error: markAsPaidError.message,
          });
        }
      } else if (isPaymentSuccess && paidStatusId && currentPaymentStatus === paidStatusId) {
        // Payment already marked as paid, but ensure bank record exists
        console.log('[PaymentController] ℹ️ Payment already marked as paid (from query), checking bank record...');
        try {
          const SystemBankService = require('../Services/SystemBankService');
          const bankTransaction = await SystemBankService.recordPayment(
            paymentData.amount,
            paymentData.order_id,
            paymentData.payment_id,
            `Thanh toán MoMo cho đơn hàng #${orderData.order_number}`,
            'MOMO',
            queryResult.transId || requestId
          );
          
          if (bankTransaction) {
            console.log('[PaymentController] ✅ Bank record verified/created (from query):', {
              transactionId: bankTransaction.txn_id,
              balanceAfter: bankTransaction.balance_after
            });
          }
        } catch (bankError) {
          console.error('[PaymentController] ⚠️ Error checking/creating bank record (from query):', bankError.message);
          // Don't throw - payment is already paid
        }
      } else if (isWaitingForUser) {
        await payment.updateGatewayResponse(
          paymentData.payment_id,
          queryResult.rawResponse,
          'pending'
        );
      } else if (isPaymentFailed && currentPaymentStatus === 1) {
        await payment.updateGatewayResponse(
          paymentData.payment_id,
          queryResult.rawResponse,
          'failed'
        );
      }
      if (!isWaitingForUser && !isPaymentFailed) {
        await payment.updateGatewayResponse(
          paymentData.payment_id,
          queryResult.rawResponse,
          queryResult.success ? 'success' : 'pending'
        );
      }
      const finalPaymentData = await payment.findById(paymentData.payment_id);
      const finalPaymentStatusId = parseInt(finalPaymentData.payment_status_id);
      let paymentStatusName = 'pending';
      if (paidStatusId && finalPaymentStatusId === paidStatusId) {
        paymentStatusName = 'paid';
      } else if (queryResult.success && queryResult.resultCode === 0) {
        paymentStatusName = 'paid';
      } else if (!queryResult.success && queryResult.resultCode !== 0 && queryResult.resultCode !== 1000) {
        paymentStatusName = 'failed';
      }
      return res.status(200).json({
        success: true,
        data: {
          paymentId: finalPaymentData.payment_id,
          orderId: paymentData.order_id,
          orderNumber: momoOrderId,
          status: paymentStatusName,
          resultCode: queryResult.resultCode,
          message: queryResult.message,
          amount: queryResult.amount,
          transId: queryResult.transId,
          payType: queryResult.payType,
          responseTime: queryResult.responseTime,
          paymentStatusId: finalPaymentData.payment_status_id, 
        },
      });
    } catch (error) {
      console.error('[PaymentController] ❌ Error in queryMoMoStatus:', {
        message: error.message,
        stack: error.stack,
        code: error.code,
        errno: error.errno,
        sqlState: error.sqlState
      });
      return res.status(400).json({
        success: false,
        message: error.error || error.message || 'Lỗi khi query payment status',
        error: error.message,
      });
    }
  };
  const getByGateway = async (req, res) => {
    console.log('========================================');
    console.log('[PaymentController] getByGateway function called');
    console.log('[PaymentController] Request IP:', req.ip);
    console.log('[PaymentController] Request method:', req.method);
    console.log('[PaymentController] Request URL:', req.originalUrl);
    console.log('[PaymentController] Params:', req.params);
    const startTime = Date.now();
    try {
      const { gateway } = req.params;
      console.log('[PaymentController] Extracted gateway:', gateway);
      if (!gateway) {
        console.log('[PaymentController] ❌ Validation failed: Missing gateway');
        return res.status(400).json({
          success: false,
          message: 'Gateway là bắt buộc',
        });
      }
      console.log('[PaymentController] 🔍 Fetching payments by gateway:', gateway);
      const data = await payment.findAll({ filters: { gateway } });
      console.log('[PaymentController] ✅ Payments found:', data?.length || 0);
      const duration = Date.now() - startTime;
      console.log('[PaymentController] ✅ getByGateway completed successfully in', duration, 'ms');
      console.log('========================================');
      return res.status(200).json({
        success: true,
        data,
      });
    } catch (error) {
      console.error('[PaymentController] ❌❌❌ ERROR IN getByGateway ❌❌❌');
      console.error('[PaymentController] Error message:', error.message);
      console.error('[PaymentController] Error stack:', error.stack);
      console.error('[PaymentController] Error details:', {
        name: error.name,
        message: error.message,
        code: error.code
      });
      console.log('========================================');
      return res.status(500).json({
        success: false,
        message: 'Lỗi khi lấy dữ liệu',
        error: error.message,
      });
    }
  };
  const getByStatus = async (req, res) => {
    console.log('========================================');
    console.log('[PaymentController] getByStatus function called');
    console.log('[PaymentController] Request IP:', req.ip);
    console.log('[PaymentController] Request method:', req.method);
    console.log('[PaymentController] Request URL:', req.originalUrl);
    console.log('[PaymentController] Params:', req.params);
    const startTime = Date.now();
    try {
      const { statusId } = req.params;
      console.log('[PaymentController] Extracted statusId:', statusId);
      if (!statusId) {
        console.log('[PaymentController] ❌ Validation failed: Missing statusId');
        return res.status(400).json({
          success: false,
          message: 'Status ID là bắt buộc',
        });
      }
      console.log('[PaymentController] 🔍 Fetching payments by status:', statusId);
      const data = await payment.findAll({ filters: { payment_status_id: statusId } });
      console.log('[PaymentController] ✅ Payments found:', data?.length || 0);
      const duration = Date.now() - startTime;
      console.log('[PaymentController] ✅ getByStatus completed successfully in', duration, 'ms');
      console.log('========================================');
      return res.status(200).json({
        success: true,
        data,
      });
    } catch (error) {
      console.error('[PaymentController] ❌❌❌ ERROR IN getByStatus ❌❌❌');
      console.error('[PaymentController] Error message:', error.message);
      console.error('[PaymentController] Error stack:', error.stack);
      console.error('[PaymentController] Error details:', {
        name: error.name,
        message: error.message,
        code: error.code
      });
      console.log('========================================');
      return res.status(500).json({
        success: false,
        message: 'Lỗi khi lấy dữ liệu',
        error: error.message,
      });
    }
  };
  const handleMoMoIPN = momoCallback;
  const capture = async (req, res) => {
    console.log('========================================');
    console.log('[PaymentController] capture function called');
    console.log('[PaymentController] Request IP:', req.ip);
    console.log('[PaymentController] Request method:', req.method);
    console.log('[PaymentController] Request URL:', req.originalUrl);
    console.log('[PaymentController] Params:', req.params);
    const startTime = Date.now();
    try {
      const { id } = req.params;
      console.log('[PaymentController] Extracted paymentId:', id);
      if (!id) {
        console.log('[PaymentController] ❌ Validation failed: Missing payment ID');
        return res.status(400).json({
          success: false,
          message: 'Payment ID là bắt buộc',
        });
      }
      console.log('[PaymentController] 🔍 Checking if payment exists...');
      const paymentData = await payment.findById(id);
      if (!paymentData) {
        console.log('[PaymentController] ❌ Payment not found');
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy payment',
        });
      }
      console.log('[PaymentController] ✅ Payment found:', {
        paymentId: paymentData.payment_id,
        isCaptured: paymentData.is_captured
      });
      console.log('[PaymentController] 💰 Capturing payment...');
      await payment.update(id, {
        is_captured: 1,
        updated_at: new Date(),
      });
      console.log('[PaymentController] ✅ Payment captured successfully');
      const duration = Date.now() - startTime;
      console.log('[PaymentController] ✅ capture completed successfully in', duration, 'ms');
      console.log('========================================');
      return res.status(200).json({
        success: true,
        message: 'Capture payment thành công',
      });
    } catch (error) {
      console.error('[PaymentController] ❌❌❌ ERROR IN capture ❌❌❌');
      console.error('[PaymentController] Error message:', error.message);
      console.error('[PaymentController] Error stack:', error.stack);
      console.error('[PaymentController] Error details:', {
        name: error.name,
        message: error.message,
        code: error.code
      });
      console.log('========================================');
      return res.status(400).json({
        success: false,
        message: 'Lỗi khi capture payment',
        error: error.message,
      });
    }
  };
  const getMyPayments = async (req, res) => {
    console.log('========================================');
    console.log('[PaymentController] getMyPayments function called');
    console.log('[PaymentController] Request IP:', req.ip);
    console.log('[PaymentController] Request method:', req.method);
    console.log('[PaymentController] Request URL:', req.originalUrl);
    console.log('[PaymentController] User from token:', req.user ? { userId: req.user.userId, roleId: req.user.roleId } : 'No user');
    const startTime = Date.now();
    try {
      if (!req.user || !req.user.userId) {
        console.log('[PaymentController] ❌ Unauthorized: No user in token');
        return res.status(401).json({
          success: false,
          message: 'Vui lòng đăng nhập',
        });
      }
      const userId = req.user.userId;
      console.log('[PaymentController] User ID from token:', userId);
      console.log('[PaymentController] 🔍 Fetching user orders...');
      const userOrders = await order.findByUserId(userId);
      const orderIds = userOrders.map(o => o.order_id);
      console.log('[PaymentController] ✅ User orders found:', {
        orderCount: userOrders.length,
        orderIds: orderIds.length
      });
      if (orderIds.length === 0) {
        console.log('[PaymentController] ✅ No orders found, returning empty array');
        return res.status(200).json({
          success: true,
          data: [],
        });
      }
      console.log('[PaymentController] 🔍 Fetching payments for orders...');
      const allPayments = await payment.findByOrderIds(orderIds);
      console.log('[PaymentController] ✅ Payments fetched:', allPayments?.length || 0);
      const duration = Date.now() - startTime;
      console.log('[PaymentController] ✅ getMyPayments completed successfully in', duration, 'ms');
      console.log('========================================');
      return res.status(200).json({
        success: true,
        data: allPayments,
      });
    } catch (error) {
      console.error('[PaymentController] ❌❌❌ ERROR IN getMyPayments ❌❌❌');
      console.error('[PaymentController] Error message:', error.message);
      console.error('[PaymentController] Error stack:', error.stack);
      console.error('[PaymentController] Error details:', {
        name: error.name,
        message: error.message,
        code: error.code
      });
      console.log('========================================');
      return res.status(500).json({
        success: false,
        message: 'Lỗi khi lấy dữ liệu',
        error: error.message,
      });
    }
  };
  const getMyPaymentByOrder = async (req, res) => {
    console.log('========================================');
    console.log('[PaymentController] getMyPaymentByOrder function called');
    console.log('[PaymentController] Request IP:', req.ip);
    console.log('[PaymentController] Request method:', req.method);
    console.log('[PaymentController] Request URL:', req.originalUrl);
    console.log('[PaymentController] Params:', req.params);
    console.log('[PaymentController] User from token:', req.user ? { userId: req.user.userId, roleId: req.user.roleId } : 'No user');
    const startTime = Date.now();
    try {
      if (!req.user || !req.user.userId) {
        console.log('[PaymentController] ❌ Unauthorized: No user in token');
        return res.status(401).json({
          success: false,
          message: 'Vui lòng đăng nhập',
        });
      }
      const { orderId } = req.params;
      const userId = req.user.userId;
      console.log('[PaymentController] Extracted data:', { orderId, userId });
      console.log('[PaymentController] 🔍 Checking if order exists...');
      const orderData = await order.findById(orderId);
      if (!orderData) {
        console.log('[PaymentController] ❌ Order not found');
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy đơn hàng',
        });
      }
      console.log('[PaymentController] ✅ Order found:', {
        orderId: orderData.order_id,
        orderUserId: orderData.user_id
      });
      if (orderData.user_id !== userId) {
        console.log('[PaymentController] ❌ Unauthorized: Order does not belong to user');
        return res.status(403).json({
          success: false,
          message: 'Bạn không có quyền xem thanh toán này',
        });
      }
      console.log('[PaymentController] ✅ Authorization check passed');
      console.log('[PaymentController] 🔍 Fetching payments for order...');
      return getByOrder(req, res);
    } catch (error) {
      console.error('[PaymentController] ❌❌❌ ERROR IN getMyPaymentByOrder ❌❌❌');
      console.error('[PaymentController] Error message:', error.message);
      console.error('[PaymentController] Error stack:', error.stack);
      console.error('[PaymentController] Error details:', {
        name: error.name,
        message: error.message,
        code: error.code
      });
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
    getByGateway,
    getByStatus,
    createForOrder,
    updateGatewayResponse,
    markAsPaid,
    refund,
    getByGatewayTransactionId,
    createMoMoPayment,
    momoCallback,
    handleMoMoIPN,
    queryMoMoStatus,
    capture,
    getMyPayments,
    getMyPaymentByOrder,
  };
};
module.exports = createPaymentController();
