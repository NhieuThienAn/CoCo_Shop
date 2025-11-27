// ============================================
// IMPORT MODULES
// ============================================
// Import BaseController factory function
// BaseController cung cấp các HTTP handlers cơ bản (getAll, getById, create, update, delete, count)
const createBaseController = require('./BaseController');

// Import payment và order models từ Models/index.js
const { payment, order } = require('../Models');

// ============================================
// PAYMENT CONTROLLER FACTORY FUNCTION
// ============================================
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
  // Tạo baseController từ BaseController với payment model
  // baseController sẽ có các handlers cơ bản: getAll, getById, create, update, delete, count
  const baseController = createBaseController(payment);
  
  // Import paymentMethod model (cần dùng trong các functions)
  const { paymentMethod } = require('../Models');
  
  // ============================================
  // INITIALIZE MOMO SERVICE
  // ============================================
  // Khởi tạo MoMoService nếu có sẵn (optional dependency)
  let momoService = null;
  try {
    // Import MoMoService từ Services/MoMoService
    const MoMoService = require('../Services/MoMoService');
    
    // Kiểm tra MoMoService có phải là function (constructor) không
    if (typeof MoMoService === 'function') {
      // Khởi tạo MoMoService với environment (production hoặc test)
      momoService = new MoMoService(process.env.NODE_ENV === 'production' ? 'production' : 'test');
    }
  } catch (error) {
    // Nếu không thể khởi tạo MoMoService, log warning và tiếp tục (không throw error)
    console.warn('MoMoService not available:', error.message);
  }

  // ============================================
  // GET BY ORDER FUNCTION: Lấy payments theo order
  // ============================================
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
    // ============================================
    // BƯỚC 1: Logging - Ghi log thông tin request
    // ============================================
    console.log('========================================');
    console.log('[PaymentController] getByOrder function called');
    console.log('[PaymentController] Request IP:', req.ip);
    console.log('[PaymentController] Request method:', req.method);
    console.log('[PaymentController] Request URL:', req.originalUrl);
    console.log('[PaymentController] Params:', req.params);
    
    // Ghi lại thời gian bắt đầu để tính duration
    const startTime = Date.now();
    
    try {
      // ============================================
      // BƯỚC 2: Extract orderId từ params
      // ============================================
      // Lấy orderId từ URL params
      const { orderId } = req.params;
      console.log('[PaymentController] Extracted orderId:', orderId);
      
      // ============================================
      // BƯỚC 3: Validate orderId
      // ============================================
      // Kiểm tra orderId có tồn tại không
      if (!orderId) {
        console.log('[PaymentController] ❌ Validation failed: Missing orderId');
        return res.status(400).json({
          success: false,
          message: 'orderId là bắt buộc',
        });
      }

      // ============================================
      // BƯỚC 4: Fetch payments từ database
      // ============================================
      console.log('[PaymentController] 🔍 Fetching payments for orderId:', orderId);
      // Gọi payment.findByOrderId để lấy tất cả payments của order này
      const data = await payment.findByOrderId(orderId);
      console.log('[PaymentController] ✅ Payments found:', data?.length || 0);
      
      // ============================================
      // BƯỚC 5: Tính duration và trả về response
      // ============================================
      // Tính thời gian thực thi
      const duration = Date.now() - startTime;
      console.log('[PaymentController] ✅ getByOrder completed successfully in', duration, 'ms');
      console.log('========================================');

      // Trả về JSON response với status 200 (OK)
      return res.status(200).json({
        success: true,
        data,  // Mảng các payments
      });
    } 
    // ============================================
    // ERROR HANDLING: Xử lý lỗi
    // ============================================
    catch (error) {
      // Log lỗi chi tiết để debug
      console.error('[PaymentController] ❌❌❌ ERROR IN getByOrder ❌❌❌');
      console.error('[PaymentController] Error message:', error.message);
      console.error('[PaymentController] Error stack:', error.stack);
      console.error('[PaymentController] Error details:', {
        name: error.name,
        message: error.message,
        code: error.code
      });
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
  // CREATE FOR ORDER FUNCTION: Tạo payment cho order
  // ============================================
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
    // ============================================
    // BƯỚC 1: Logging - Ghi log thông tin request
    // ============================================
    console.log('========================================');
    console.log('[PaymentController] createForOrder function called');
    console.log('[PaymentController] Request IP:', req.ip);
    console.log('[PaymentController] Request body:', JSON.stringify(req.body, null, 2));
    
    try {
      // ============================================
      // BƯỚC 2: Extract data từ request body
      // ============================================
      // Destructure orderId, paymentMethodId, amount, gateway và các trường khác
      const { orderId, paymentMethodId, amount, gateway, ...paymentData } = req.body;
      console.log('[PaymentController] Extracted data:', {
        orderId,
        paymentMethodId,
        amount,
        gateway,
        paymentDataKeys: Object.keys(paymentData)  // Log các trường bổ sung
      });

      // ============================================
      // BƯỚC 3: Kiểm tra order tồn tại
      // ============================================
      console.log('[PaymentController] 🔍 Checking if order exists...');
      // Gọi order.findById để kiểm tra order có tồn tại không
      const orderData = await order.findById(orderId);
      
      // Nếu không tìm thấy order, trả về 404
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

      // ============================================
      // BƯỚC 4: Validate amount
      // ============================================
      // Nếu có amount trong request, kiểm tra phải khớp với total_amount của order
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

      // ============================================
      // BƯỚC 5: Tạo payment data object
      // ============================================
      // Tạo payment object với các thông tin cần thiết
      const paymentToCreate = {
        order_id: orderId,                          // ID của order
        payment_method_id: paymentMethodId,         // ID của payment method
        amount: amount || orderData.total_amount,   // Số tiền (mặc định: total_amount của order)
        gateway,                                    // Payment gateway (momo, cod, etc.)
        payment_status_id: 1,                       // Status: Pending (1)
        ...paymentData,                             // Các trường bổ sung (gateway_transaction_id, metadata, etc.)
      };
      
      console.log('[PaymentController] 💳 Creating payment record...');
      console.log('[PaymentController] Payment data:', paymentToCreate);
      
      // ============================================
      // BƯỚC 6: Tạo payment trong database
      // ============================================
      // Gọi payment.create để tạo payment record
      const result = await payment.create(paymentToCreate);
      console.log('[PaymentController] ✅ Payment created with ID:', result.insertId);

      // ============================================
      // BƯỚC 7: Fetch payment vừa tạo và trả về response
      // ============================================
      // Fetch payment vừa tạo để trả về đầy đủ thông tin
      const newPayment = await payment.findById(result.insertId);
      console.log('[PaymentController] ✅✅✅ PAYMENT CREATED SUCCESSFULLY ✅✅✅');
      console.log('========================================');

      // Trả về response thành công với status 201 (Created)
      return res.status(201).json({
        success: true,
        message: 'Tạo thanh toán thành công',
        data: newPayment,  // Payment object vừa tạo
      });
    } 
    // ============================================
    // ERROR HANDLING: Xử lý lỗi
    // ============================================
    catch (error) {
      // Log lỗi chi tiết để debug
      console.error('[PaymentController] ❌❌❌ ERROR IN createForOrder ❌❌❌');
      console.error('[PaymentController] Error message:', error.message);
      console.error('[PaymentController] Error stack:', error.stack);
      console.log('========================================');
      
      // Trả về error response với status 400 (Bad Request)
      return res.status(400).json({
        success: false,
        message: 'Lỗi khi tạo thanh toán',
        error: error.message,
      });
    }
  };

  // ============================================
  // UPDATE GATEWAY RESPONSE FUNCTION: Cập nhật gateway response
  // ============================================
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
    // ============================================
    // BƯỚC 1: Logging - Ghi log thông tin request
    // ============================================
    console.log('========================================');
    console.log('[PaymentController] updateGatewayResponse function called');
    console.log('[PaymentController] Request IP:', req.ip);
    console.log('[PaymentController] Request method:', req.method);
    console.log('[PaymentController] Request URL:', req.originalUrl);
    console.log('[PaymentController] Params:', req.params);
    console.log('[PaymentController] Request body:', JSON.stringify(req.body, null, 2));
    
    // Ghi lại thời gian bắt đầu để tính duration
    const startTime = Date.now();
    
    try {
      // ============================================
      // BƯỚC 2: Extract data từ request
      // ============================================
      // Lấy id từ URL params
      const { id } = req.params;
      
      // Lấy gatewayResponse và gatewayStatus từ request body
      const { gatewayResponse, gatewayStatus } = req.body;
      
      console.log('[PaymentController] Extracted data:', {
        paymentId: id,
        gatewayStatus,
        hasGatewayResponse: !!gatewayResponse
      });

      // ============================================
      // BƯỚC 3: Validate payment ID
      // ============================================
      // Kiểm tra id có tồn tại không
      if (!id) {
        console.log('[PaymentController] ❌ Validation failed: Missing payment ID');
        return res.status(400).json({
          success: false,
          message: 'Payment ID là bắt buộc',
        });
      }

      // ============================================
      // BƯỚC 4: Kiểm tra payment tồn tại
      // ============================================
      console.log('[PaymentController] 🔍 Checking if payment exists...');
      // Gọi payment.findById để kiểm tra payment có tồn tại không
      const existingPayment = await payment.findById(id);
      
      // Nếu không tìm thấy payment, trả về 404
      if (!existingPayment) {
        console.log('[PaymentController] ❌ Payment not found:', id);
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy thanh toán',
        });
      }
      console.log('[PaymentController] ✅ Payment found');

      // ============================================
      // BƯỚC 5: Cập nhật gateway response
      // ============================================
      console.log('[PaymentController] ✏️ Updating gateway response...');
      // Gọi payment.updateGatewayResponse để cập nhật gateway_response và gateway_status
      await payment.updateGatewayResponse(id, gatewayResponse, gatewayStatus);
      
      // Fetch payment đã cập nhật
      const updated = await payment.findById(id);
      console.log('[PaymentController] ✅ Gateway response updated successfully');
      
      // ============================================
      // BƯỚC 6: Tính duration và trả về response
      // ============================================
      // Tính thời gian thực thi
      const duration = Date.now() - startTime;
      console.log('[PaymentController] ✅ updateGatewayResponse completed successfully in', duration, 'ms');
      console.log('========================================');

      // Trả về response thành công với status 200 (OK)
      return res.status(200).json({
        success: true,
        message: 'Cập nhật thành công',
        data: updated,  // Payment object đã được cập nhật
      });
    } 
    // ============================================
    // ERROR HANDLING: Xử lý lỗi
    // ============================================
    catch (error) {
      // Log lỗi chi tiết để debug
      console.error('[PaymentController] ❌❌❌ ERROR IN updateGatewayResponse ❌❌❌');
      console.error('[PaymentController] Error message:', error.message);
      console.error('[PaymentController] Error stack:', error.stack);
      console.error('[PaymentController] Error details:', {
        name: error.name,
        message: error.message,
        code: error.code
      });
      console.log('========================================');
      
      // Trả về error response với status 400 (Bad Request)
      return res.status(400).json({
        success: false,
        message: 'Lỗi khi cập nhật',
        error: error.message,
      });
    }
  };

  // ============================================
  // MARK AS PAID FUNCTION: Đánh dấu payment đã thanh toán
  // ============================================
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
      
      // [REQUIREMENT] Không tự động cập nhật order status thành CONFIRMED
      // Order MoMo và COD đều giữ ở trạng thái PENDING và chỉ được admin xác nhận
      const OrderStatus = require('../Constants/OrderStatus');
      const orderData = await order.findById(paymentData.order_id);
      
      console.log('[PaymentController] ℹ️ [REQUIREMENT] Payment marked as paid, but order status remains unchanged:', {
        order_id: paymentData.order_id,
        current_order_status: orderData?.status_id,
        payment_gateway: paymentData.gateway,
        note: 'Order will be confirmed by admin only',
      });
      
      // Không tự động confirm order - admin sẽ xác nhận sau

      // Tạo bank transaction nếu cần
      if (paymentData.gateway === 'bank_transfer' && paymentData.gateway_transaction_id) {
        console.log('[PaymentController] 💳 Bank transfer detected, transaction creation logic can be implemented here');
        const { bankTransaction, bankAccount } = require('../Models');
        // Logic tạo bank transaction từ payment
        // Có thể implement sau
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

  /**
   * Hoàn tiền
   */
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
        payment_status_id: newStatusId, // Fully refunded
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

  /**
   * Lấy payment theo gateway transaction ID
   */
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

  /**
   * Tạo payment request với MoMo
   */
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
      // Use SQL WHERE clause instead of JavaScript filter
      const paidStatusId = 2; // Paid status
      const paidPayment = await payment.findByOrderIdAndStatus(orderId, paidStatusId);
      if (paidPayment) {
        console.log('[PaymentController] ❌ Order already paid');
        return res.status(400).json({
          success: false,
          message: 'Đơn hàng đã được thanh toán',
        });
      }
      
      // Get all payments for logging
      const existingPayments = await payment.findByOrderId(orderId);
      console.log('[PaymentController] 📊 Existing payments:', existingPayments.length);
      
      // CRITICAL FIX: Get payment_method_id from database instead of hardcoding
      // Simplified approach: Use direct SQL for reliability
      console.log('[PaymentController] 🔍 Starting payment method lookup...');
      let momoPaymentMethodId = null;
      try {
        const db = require('../Config/database').getDatabase();
        if (!db) {
          throw new Error('Database connection không khả dụng');
        }
        console.log('[PaymentController] ✅ Database connection obtained');
        
        // First, try to find existing payment method using SQL (most reliable)
        console.log('[PaymentController] 🔍 Searching for MoMo payment method...');
        const { paymentMethod } = require('../Models');
        const existingMethod = await paymentMethod.findFirstByNameLike('momo');
        console.log('[PaymentController] 📊 Search result:', existingMethod ? 'found' : 'not found');
        
        if (existingMethod && existingMethod.payment_method_id) {
          momoPaymentMethodId = existingMethod.payment_method_id;
          console.log('[PaymentController] ✅ Found existing payment method:', momoPaymentMethodId);
        } else {
          // Not found, try to create it
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
              // Creation might have failed due to duplicate, try to find again
              // Use SQL LIMIT 1 instead of JavaScript array access
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
            // If creation fails (likely duplicate), find the existing one
            if (createError.code === 'ER_DUP_ENTRY' || createError.errno === 1062) {
              console.log('[PaymentController] 🔍 Duplicate entry, finding existing...');
              // Use SQL LIMIT 1 instead of JavaScript array access
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
      
      // Check if there's already a pending MOMO payment record (created during order creation)
      // Use SQL WHERE clause instead of JavaScript filter
      const pendingMoMoPayment = await payment.findByOrderIdStatusGatewayAndMethod(orderId, 1, 'MOMO', momoPaymentMethodId)
        || await payment.findByOrderIdStatusAndGateway(orderId, 1, 'MOMO');
      
      let paymentId;
      let requestId;
      let isNewPayment = false;
      
      if (pendingMoMoPayment) {
        // Use existing payment record instead of creating a new one
        paymentId = pendingMoMoPayment.payment_id;
        // IMPORTANT: For retry, always create a NEW requestId to ensure MoMo accepts it
        // The old requestId might have been used already
        requestId = `MOMO${Date.now()}_${paymentId}`;
        
        // Update payment record with new requestId BEFORE calling MoMo API
        // This ensures callback can find the payment by requestId
        await payment.update(paymentId, {
          gateway_transaction_id: requestId,
          gateway_status: 'pending',
        });
        console.log('[PaymentController] 🔄 Retry payment - Updated requestId:', requestId);
      } else {
        // Create new payment record only if one doesn't exist
        // Determine momoOrderId before creating payment (will be set after)
        const baseOrderIdForMetadata = orderData.order_number || `ORDER_${orderId}`;
        const paymentResult = await payment.create({
          order_id: orderId,
          payment_method_id: momoPaymentMethodId, // Use dynamic ID from database
          gateway: 'momo',
          amount: orderData.total_amount,
          payment_status_id: 1, // Pending
          metadata: JSON.stringify({ 
            order_number: orderData.order_number,
            // momoOrderId will be updated after we determine it (below)
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

      // CRITICAL FIX: MoMo requires orderId to be unique and valid format
      // orderId should be max 50 characters, alphanumeric and some special chars only
      // Use order_number if available, otherwise create a safe orderId
      let baseOrderId = orderData.order_number || `ORDER_${orderId}`;
      
      // Validate and sanitize base orderId for MoMo
      // MoMo orderId requirements: max 50 chars, alphanumeric + underscore/hyphen
      baseOrderId = baseOrderId.toString().replace(/[^a-zA-Z0-9_-]/g, '_');
      
      // IMPORTANT: If there's an existing pending payment, create a unique orderId for retry
      // This prevents MoMo error "Yêu cầu bị từ chối vì trùng orderId"
      let momoOrderId;
      if (pendingMoMoPayment) {
        // For retry: Create unique orderId by appending payment_id and timestamp
        // This ensures MoMo accepts the new payment request
        const timestamp = Date.now();
        const uniqueSuffix = `_${paymentId}_${timestamp}`;
        momoOrderId = `${baseOrderId}${uniqueSuffix}`.substring(0, 50);
        console.log('[PaymentController] 🔄 Retry payment - Using unique orderId:', momoOrderId);
      } else {
        // For new payment: Use base orderId or append timestamp if too short
        if (baseOrderId.length < 10) {
          momoOrderId = `${baseOrderId}_${Date.now()}`.substring(0, 50);
        } else {
          momoOrderId = baseOrderId.substring(0, 50);
        }
      }
      
      // Validate URLs
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
      
      // CRITICAL: Check if MoMo returned an error
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

      // Get existing metadata from payment record
      // For retry payments, use pendingMoMoPayment.metadata
      // For new payments, fetch from database
      let existingMetadata = {};
      let paymentRecord = pendingMoMoPayment;
      if (!paymentRecord && paymentId) {
        // Fetch payment record to get existing metadata
        paymentRecord = await payment.findById(paymentId);
      }
      
      if (paymentRecord?.metadata) {
        try {
          existingMetadata = typeof paymentRecord.metadata === 'string' 
            ? JSON.parse(paymentRecord.metadata) 
            : paymentRecord.metadata;
        } catch (e) {
          // Ignore parse errors
        }
      }

      const updateData = {
        gateway_response: JSON.stringify(momoResult.rawResponse),
        // IMPORTANT: Save momoOrderId to metadata so we can query by it later
        // This is especially important for retry payments where orderId has suffix
        metadata: JSON.stringify({
          ...existingMetadata,
          momoOrderId: momoOrderId, // Save the actual orderId used with MoMo (may have suffix)
          orderNumber: orderData.order_number, // Also save original order_number for reference
        }),
      };
      
      // Only update gateway_transaction_id and gateway_status if this is a new payment
      // or if the existing payment doesn't have these fields set
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

  /**
   * MoMo Callback/IPN Handler
   */
  const momoCallback = async (req, res) => {
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

      if (!result.verified) {
        console.error('[PaymentController] ❌ Signature verification failed for MoMo callback');
        return res.status(400).json({
          success: false,
          message: 'Invalid signature',
        });
      }

      // Tìm payment theo orderId hoặc requestId
      let paymentData = null;
      
      // Step 1: Try to find by gateway_transaction_id (requestId) - Most reliable
      if (result.requestId) {
        paymentData = await payment.findByGatewayTransactionId(result.requestId);
        if (paymentData) {
          console.log('[PaymentController] ✅ Found payment by requestId:', result.requestId);
        }
      }

      // Step 2: Try to find by extraData (contains paymentId and orderId)
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
          // Ignore parse errors
        }
      }

      // Step 3: Try to find by orderId (may have suffix for retry payments)
      if (!paymentData && result.orderId) {
        // Extract base order number (remove suffix like _paymentId_timestamp)
        // Example: ORD-1764130532542-63YK4KX18_123_1764130532611 -> ORD-1764130532542-63YK4KX18
        let baseOrderNumber = result.orderId;
        
        // Remove suffix pattern: _number_number (payment_id and timestamp)
        const suffixPattern = /_(\d+)_(\d+)$/;
        if (suffixPattern.test(baseOrderNumber)) {
          baseOrderNumber = baseOrderNumber.replace(suffixPattern, '');
          console.log('[PaymentController] 🔄 Extracted base order number from retry orderId:', {
            original: result.orderId,
            extracted: baseOrderNumber
          });
        }
        
        // Try exact match first
        let orderData = await order.findByOrderNumber(baseOrderNumber);
        
        // If not found, try to find by partial match (in case of formatting differences)
        if (!orderData) {
          const orderNumberMatch = baseOrderNumber.match(/ORD-(\d+)-/);
          if (orderNumberMatch) {
            const timestamp = orderNumberMatch[1];
            // Use SQL LIKE instead of JavaScript find()
            // Use SQL query - findByOrderNumberPattern returns first match or null
            orderData = await order.findByOrderNumberPattern(timestamp, 10);
          }
        }
        
        if (orderData) {
          // Prioritize: 
          // 1. MoMo payments with status 1 (Pending) - these need to be updated
          // 2. Any MoMo payment (even if already paid, we should verify/update)
          // 3. Most recent payment
          // Use SQL WHERE clause instead of JavaScript filter
          // Execute queries in parallel using Promise.all (these are independent, not sequential)
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
          
          // Update gateway_transaction_id if it's missing or different and we have requestId from callback
          if (result.requestId && paymentData) {
            if (!paymentData.gateway_transaction_id || paymentData.gateway_transaction_id !== result.requestId) {
              await payment.update(paymentData.payment_id, {
                gateway_transaction_id: result.requestId,
              });
              console.log('[PaymentController] ✅ Updated gateway_transaction_id:', result.requestId);
            }
          }
        } else {
          // Last resort: search all recent orders by partial match using SQL LIKE
          // Try exact match first
          let matchingOrder = await order.findByOrderNumber(result.orderId);
          if (!matchingOrder) {
            matchingOrder = await order.findByOrderNumber(baseOrderNumber);
          }
          // If still not found, try pattern match
          if (!matchingOrder && baseOrderNumber) {
            // Use SQL query - findByOrderNumberPattern returns first match or null
            matchingOrder = await order.findByOrderNumberPattern(baseOrderNumber, 5);
          }
          
          if (matchingOrder) {
            // Use SQL WHERE clause instead of JavaScript filter
            // Execute queries in parallel using Promise.all (these are independent, not sequential)
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
        gatewayTransactionId: paymentData.gateway_transaction_id,
        callbackRequestId: result.requestId,
        callbackOrderId: result.orderId,
        callbackSuccess: result.success,
      });

      const OrderStatus = require('../Constants/OrderStatus');

      // Check if payment is already paid - if so, just verify and return success
      const currentPaymentStatus = parseInt(paymentData.payment_status_id);
      if (currentPaymentStatus === 2 && result.success) {
        // Still update gateway_transaction_id and gateway_response if needed
        if (result.requestId && !paymentData.gateway_transaction_id) {
          await payment.update(paymentData.payment_id, {
            gateway_transaction_id: result.requestId,
          });
        }
        
        // Update gateway response to latest callback data
        await payment.updateGatewayResponse(
          paymentData.payment_id,
          callbackData,
          'success'
        );
        
        return res.status(200).json({
          success: true,
          message: 'Payment already processed',
        });
      }
      
      // Cập nhật payment status
      if (result.success) {
        // Payment thành công
        await payment.updateGatewayResponse(
          paymentData.payment_id,
          callbackData,
          'success'
        );
        
        const paidAt = result.responseTime ? new Date(result.responseTime) : null;
        const wasAlreadyPaid = currentPaymentStatus === 2;
        
        try {
          if (!wasAlreadyPaid) {
            // Chỉ mark as paid nếu chưa paid
            console.log('[PaymentController] 💰 Marking payment as paid:', {
              paymentId: paymentData.payment_id,
              orderId: paymentData.order_id,
              previousStatus: currentPaymentStatus,
              paidAt: paidAt,
            });
            await payment.markAsPaid(paymentData.payment_id, paidAt);
            
            // Verify payment was updated correctly
            const updatedPayment = await payment.findById(paymentData.payment_id);
            console.log('[PaymentController] ✅ Payment marked as paid successfully:', {
              paymentId: updatedPayment.payment_id,
              paymentStatusId: updatedPayment.payment_status_id,
              paidAt: updatedPayment.paid_at,
            });
            
            // Ghi vào system bank account (chỉ khi payment mới được đánh dấu là paid)
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
                console.log('[PaymentController] ✅ Payment recorded in system bank');
              }
            } catch (bankError) {
              console.error('[PaymentController] ⚠️ Error recording payment in bank (non-critical):', bankError.message);
              // Don't throw - payment is already marked as paid
            }
          } else {
            console.log('[PaymentController] ℹ️ Payment already paid, skipping bank record');
          }
        } catch (markAsPaidError) {
          console.error('[PaymentController] Error in markAsPaid:', markAsPaidError.message);
          // Don't throw - log error but continue
          // Payment gateway status is already updated to 'success'
        }
        
        // [REQUIREMENT] MoMo orders must remain in PENDING status until admin confirms
        // Do NOT auto-confirm order - admin must manually confirm
      } else {
        // Payment thất bại
        // Note: Cannot update payment_status_id to 3 because it doesn't exist in database
        // Only update gateway_status to indicate failure, payment_status_id remains Pending (1)
        await payment.updateGatewayResponse(
          paymentData.payment_id,
          callbackData,
          'failed'
        );
      }

      // Cập nhật gateway_transaction_id nếu có
      if (result.transId) {
        await payment.update(paymentData.payment_id, {
          gateway_transaction_id: result.transId,
        });
      }
      
      // MoMo yêu cầu trả về JSON response
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

  /**
   * Query MoMo payment status
   */
  const queryMoMoStatus = async (req, res) => {
    try {
      // Support both paymentId from params and orderId from body
      let paymentData = null;
      const { paymentId } = req.params;
      // Try to get orderId from body - handle both direct and nested
      const orderId = req.body?.orderId || req.body?.data?.orderId || req.body?.order_id;

      if (paymentId) {
        // Query by paymentId
        paymentData = await payment.findById(paymentId);
      } else if (orderId) {
        // Query by orderId - find MoMo payment for this order
        const orderDataForLookup = await order.findById(orderId);
        if (!orderDataForLookup) {
          return res.status(404).json({
            success: false,
            message: 'Không tìm thấy đơn hàng',
          });
        }
        // Use SQL WHERE clause instead of JavaScript filter
        // Find MoMo payment, prefer Pending status
        // Execute queries in parallel using Promise.all (these are independent, not sequential)
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

      // IMPORTANT: Try to get momoOrderId from metadata first (for retry payments with suffix)
      // If not found, use order_number from order data
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
          // Ignore parse errors, use default
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

      // If requestId is missing, we can still query by orderId only
      // MoMo allows querying without requestId
      let queryResult;
      try {
        // Pass requestId only if it exists, otherwise let MoMoService generate it
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

      // Cập nhật payment status nếu có thay đổi
      // Payment status: 1 = Pending, 2 = Paid
      // Note: Database only has payment_status_id 1 (Pending) and 2 (Paid), no Failed status
      const currentPaymentStatus = parseInt(paymentData.payment_status_id);
      const resultCode = queryResult.resultCode || 0;
      
      // resultCode 1000 = "Transaction is initiated, waiting for user confirmation"
      // This is NOT an error - it means user is still on MoMo payment page
      const isWaitingForUser = resultCode === 1000;
      const isPaymentSuccess = queryResult.success && resultCode === 0;
      const isPaymentFailed = !queryResult.success && resultCode !== 0 && resultCode !== 1000;
      
      // Get Paid status ID dynamically for comparison
      const { paymentStatus } = require('../Models');
      let paidStatusId = null;
      try {
        const paidStatus = await paymentStatus.findByName('Paid');
        if (paidStatus && paidStatus.payment_status_id) {
          paidStatusId = paidStatus.payment_status_id;
        } else {
          // Try case-insensitive search using SQL
          const statusRow = await paymentStatus.findFirstByNameLike('paid');
          if (statusRow && statusRow.payment_status_id) {
            paidStatusId = statusRow.payment_status_id;
          } else {
            // Create it if not found using model method (SQL query)
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
          await payment.markAsPaid(paymentData.payment_id);
        } catch (markAsPaidError) {
          console.error('[PaymentController] Error in markAsPaid (queryMoMoStatus):', markAsPaidError.message);
          // Don't throw - return error response instead
          return res.status(400).json({
            success: false,
            message: `Lỗi khi cập nhật payment status: ${markAsPaidError.message}`,
            error: markAsPaidError.message,
          });
        }
        
        // [REQUIREMENT] MoMo orders must remain in PENDING status until admin confirms
        // Do NOT auto-confirm order - admin must manually confirm
        
      } else if (isWaitingForUser) {
        // resultCode 1000: User is still on MoMo payment page, keep status as Pending
        // Only update gateway_status, not payment_status_id
        // IMPORTANT: Do NOT update payment_status_id to 3 (Failed) because:
        // 1. resultCode 1000 is NOT an error
        // 2. payment_status_id = 3 doesn't exist in database
        await payment.updateGatewayResponse(
          paymentData.payment_id,
          queryResult.rawResponse,
          'pending'
        );
      } else if (isPaymentFailed && currentPaymentStatus === 1) {
        // Actual payment failure (not resultCode 1000)
        // Note: Cannot update payment_status_id to 3 because it doesn't exist in database
        // Only update gateway_status to indicate failure, payment_status_id stays as 1 (Pending)
        await payment.updateGatewayResponse(
          paymentData.payment_id,
          queryResult.rawResponse,
          'failed'
        );
      }

      // Update gateway response if not already updated above
      if (!isWaitingForUser && !isPaymentFailed) {
        await payment.updateGatewayResponse(
          paymentData.payment_id,
          queryResult.rawResponse,
          queryResult.success ? 'success' : 'pending'
        );
      }

      // Get updated payment status after potential update
      const finalPaymentData = await payment.findById(paymentData.payment_id);
      
      // Determine status based on actual payment_status_id, not queryResult.success
      // This ensures frontend shows correct status even if query fails but payment was already paid
      const finalPaymentStatusId = parseInt(finalPaymentData.payment_status_id);
      let paymentStatusName = 'pending';
      if (paidStatusId && finalPaymentStatusId === paidStatusId) {
        paymentStatusName = 'paid';
      } else if (queryResult.success && queryResult.resultCode === 0) {
        // Query says success but payment status not updated yet - still return 'paid' from query
        paymentStatusName = 'paid';
      } else if (!queryResult.success && queryResult.resultCode !== 0 && queryResult.resultCode !== 1000) {
        paymentStatusName = 'failed';
      }
      
      return res.status(200).json({
        success: true,
        data: {
          paymentId: finalPaymentData.payment_id,
          orderId: paymentData.order_id, // Return actual order_id, not order_number
          orderNumber: momoOrderId, // Also include order_number for reference
          status: paymentStatusName, // Use determined status based on actual payment_status_id
          resultCode: queryResult.resultCode,
          message: queryResult.message,
          amount: queryResult.amount,
          transId: queryResult.transId,
          payType: queryResult.payType,
          responseTime: queryResult.responseTime,
          paymentStatusId: finalPaymentData.payment_status_id, // Include current payment status
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

  /**
   * Lấy payments theo gateway
   */
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

  /**
   * Lấy payments theo status
   */
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

  /**
   * Alias cho momoCallback
   */
  const handleMoMoIPN = momoCallback;

  /**
   * Capture payment
   */
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

  /**
   * Get current user's payments (from token)
   */
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
      // Use batch SQL query with WHERE IN instead of individual queries in loop
      // This replaces N queries with 1 query
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

  /**
   * Get current user's payment by order (from token)
   */
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

      // Kiểm tra order thuộc về user hiện tại
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
