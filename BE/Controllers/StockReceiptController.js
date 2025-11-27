// ============================================
// IMPORT MODULES
// ============================================
// Import BaseController factory function
// BaseController cung cấp các HTTP handlers cơ bản (getAll, getById, create, update, delete, count)
const createBaseController = require('./BaseController');

// Import các models cần thiết từ Models/index.js
const { stockReceipt, product, inventoryTransaction } = require('../Models');

// ============================================
// STOCK RECEIPT CONTROLLER FACTORY FUNCTION
// ============================================
/**
 * Tạo StockReceiptController với các HTTP handlers cho quản lý stock receipts (phiếu nhập kho)
 * StockReceiptController kế thừa tất cả handlers từ BaseController và override/thêm các handlers riêng
 * 
 * @returns {Object} StockReceiptController object với các handlers:
 * - Từ BaseController: getAll, getById, create (được override), update, delete, count
 * - Riêng StockReceipt: getByReceiptNumber, getByStatus, approve, reject
 */
const createStockReceiptController = () => {
  // Tạo baseController từ BaseController với stockReceipt model
  // baseController sẽ có các handlers cơ bản: getAll, getById, create, update, delete, count
  const baseController = createBaseController(stockReceipt);

  // ============================================
  // GET BY RECEIPT NUMBER FUNCTION: Lấy stock receipt theo receipt number
  // ============================================
  /**
   * HTTP Handler: GET /stock-receipts/number/:receiptNumber
   * Lấy stock receipt theo receipt number (mã phiếu nhập kho)
   * 
   * URL Params:
   * - receiptNumber: Mã phiếu nhập kho (bắt buộc)
   * 
   * Response:
   * - 200: Success { success: true, data: {...} }
   * - 404: Not Found (không tìm thấy phiếu nhập kho)
   * - 500: Server Error
   * 
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Promise<void>} JSON response
   */
  const getByReceiptNumber = async (req, res) => {
    // ============================================
    // BƯỚC 1: Logging - Ghi log thông tin request
    // ============================================
    console.log('========================================');
    console.log('[StockReceiptController] getByReceiptNumber function called');
    console.log('[StockReceiptController] Request IP:', req.ip);
    console.log('[StockReceiptController] Params:', req.params);
    
    try {
      // ============================================
      // BƯỚC 2: Extract receiptNumber từ params
      // ============================================
      // Lấy receiptNumber từ URL params
      const { receiptNumber } = req.params;
      console.log('[StockReceiptController] 🔍 Finding stock receipt by receipt number:', receiptNumber);
      
      // ============================================
      // BƯỚC 3: Tìm stock receipt theo receipt number
      // ============================================
      // Gọi stockReceipt.findByReceiptNumber để tìm receipt theo mã
      const data = await stockReceipt.findByReceiptNumber(receiptNumber);

      // ============================================
      // BƯỚC 4: Kiểm tra kết quả
      // ============================================
      // Nếu không tìm thấy, trả về 404
      if (!data) {
        console.log('[StockReceiptController] ❌ Stock receipt not found');
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy phiếu nhập kho',
        });
      }

      console.log('[StockReceiptController] ✅ Stock receipt found:', data.receipt_id);
      console.log('========================================');

      // ============================================
      // BƯỚC 5: Trả về response thành công
      // ============================================
      // Trả về JSON response với status 200 (OK)
      return res.status(200).json({
        success: true,
        data,  // Stock receipt object
      });
    } 
    // ============================================
    // ERROR HANDLING: Xử lý lỗi
    // ============================================
    catch (error) {
      // Log lỗi chi tiết để debug
      console.error('[StockReceiptController] ❌❌❌ ERROR IN getByReceiptNumber ❌❌❌');
      console.error('[StockReceiptController] Error message:', error.message);
      console.error('[StockReceiptController] Error stack:', error.stack);
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
  // GET BY STATUS FUNCTION: Lấy stock receipts theo status
  // ============================================
  /**
   * HTTP Handler: GET /stock-receipts/status/:status
   * Lấy danh sách stock receipts theo status (pending, approved, rejected)
   * 
   * URL Params:
   * - status: Trạng thái của phiếu nhập kho (bắt buộc)
   *   - pending: Chờ duyệt
   *   - approved: Đã duyệt
   *   - rejected: Đã từ chối
   * 
   * Response:
   * - 200: Success { success: true, data: [...] }
   * - 500: Server Error
   * 
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Promise<void>} JSON response
   */
  const getByStatus = async (req, res) => {
    // ============================================
    // BƯỚC 1: Logging - Ghi log thông tin request
    // ============================================
    console.log('========================================');
    console.log('[StockReceiptController] getByStatus function called');
    console.log('[StockReceiptController] Request IP:', req.ip);
    console.log('[StockReceiptController] Params:', req.params);
    
    try {
      // ============================================
      // BƯỚC 2: Extract status từ params
      // ============================================
      // Lấy status từ URL params
      const { status } = req.params;
      console.log('[StockReceiptController] 🔍 Fetching stock receipts by status:', status);
      
      // ============================================
      // BƯỚC 3: Fetch stock receipts theo status
      // ============================================
      // Gọi stockReceipt.findByStatus để lấy tất cả receipts có status này
      const data = await stockReceipt.findByStatus(status);
      
      console.log('[StockReceiptController] ✅ Stock receipts fetched:', data?.length || 0);
      console.log('========================================');

      // ============================================
      // BƯỚC 4: Trả về response thành công
      // ============================================
      // Trả về JSON response với status 200 (OK)
      return res.status(200).json({
        success: true,
        data,  // Mảng các stock receipts
      });
    } 
    // ============================================
    // ERROR HANDLING: Xử lý lỗi
    // ============================================
    catch (error) {
      // Log lỗi chi tiết để debug
      console.error('[StockReceiptController] ❌❌❌ ERROR IN getByStatus ❌❌❌');
      console.error('[StockReceiptController] Error message:', error.message);
      console.error('[StockReceiptController] Error stack:', error.stack);
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
  // CREATE FUNCTION: Override create từ BaseController
  // ============================================
  /**
   * HTTP Handler: POST /stock-receipts
   * Override create từ BaseController để tạo stock receipt với validation và normalization
   * 
   * Request Body:
   * - receipt_number: Mã phiếu nhập kho (tùy chọn, tự động generate nếu không có)
   * - items: Mảng các sản phẩm (bắt buộc)
   *   - product_id: ID sản phẩm (bắt buộc)
   *   - quantity: Số lượng (bắt buộc, > 0)
   *   - unit_price: Giá đơn vị (tùy chọn)
   * - notes: Ghi chú (tùy chọn)
   * - receipt_date: Ngày nhập kho (tùy chọn)
   * - expected_date: Ngày dự kiến (tùy chọn)
   * - warehouse: Kho (tùy chọn)
   * - receiver_name: Tên người nhận (tùy chọn)
   * - receiver_phone: SĐT người nhận (tùy chọn)
   * - receipt_reason: Lý do nhập kho (tùy chọn)
   * - delivery_method: Phương thức giao hàng (tùy chọn)
   * - supplier_name: Tên nhà cung cấp (tùy chọn)
   * - supplier_contact: Liên hệ nhà cung cấp (tùy chọn)
   * - total_value: Tổng giá trị (tùy chọn)
   * 
   * Response:
   * - 201: Created { success: true, message: "...", data: {...} }
   * - 400: Bad Request (validation error, receipt number đã tồn tại)
   * 
   * Quy trình:
   * 1. Validate items (phải có ít nhất 1 item, mỗi item phải có product_id và quantity > 0)
   * 2. Normalize items (chuyển quantity thành integer, parse unit_price)
   * 3. Generate receipt_number nếu không có
   * 4. Kiểm tra receipt_number đã tồn tại chưa
   * 5. Tạo receipt với status 'pending'
   * 6. Lưu items và additional info dưới dạng JSON
   * 
   * Đặc biệt:
   * - Quantity được normalize thành integer (floor nếu là float)
   * - Items và additional info được lưu dưới dạng JSON string
   * - Status mặc định: 'pending' (chờ duyệt)
   * 
   * @param {Object} req - Express request object (có req.user từ JWT middleware)
   * @param {Object} res - Express response object
   * @returns {Promise<void>} JSON response
   */
  const create = async (req, res) => {
    // ============================================
    // BƯỚC 1: Logging - Ghi log thông tin request
    // ============================================
    console.log('========================================');
    console.log('[StockReceiptController] create function called');
    console.log('[StockReceiptController] Request IP:', req.ip);
    console.log('[StockReceiptController] Request body:', JSON.stringify(req.body, null, 2));
    
    try {
      // ============================================
      // BƯỚC 2: Extract data từ request body
      // ============================================
      // Lấy receipt_number, items, notes từ request body
      const { receipt_number, items, notes } = req.body;
      
      // Lấy userId từ JWT token (hỗ trợ cả userId và user_id)
      const userId = req.user?.userId || req.user?.user_id;

      // ============================================
      // BƯỚC 3: Validate input - Kiểm tra items
      // ============================================
      console.log('[StockReceiptController] 🔍 Validating input...');
      
      // Validation: items phải là array và không rỗng
      if (!items || !Array.isArray(items) || items.length === 0) {
        console.log('[StockReceiptController] ❌ Validation failed: Missing or invalid items');
        return res.status(400).json({
          success: false,
          message: 'Vui lòng chọn ít nhất một sản phẩm',
        });
      }

      // ============================================
      // BƯỚC 4: Validate items với detailed logging
      // ============================================
      console.log('[StockReceiptController] 📦 Validating items:', {
        itemsCount: items.length,
        items: items.map(item => ({
          product_id: item.product_id,
          quantity: item.quantity,
          quantityType: typeof item.quantity,
          unit_price: item.unit_price,
          unitPriceType: typeof item.unit_price
        }))
      });

      // ============================================
      // BƯỚC 4.1: Validate từng item
      // ============================================
      // Duyệt qua từng item để validate
      for (const item of items) {
        // ============================================
        // BƯỚC 4.1.1: Parse và normalize quantity thành integer
        // ============================================
        // Đảm bảo quantity là integer hợp lệ
        let quantity = null;
        
        // Nếu quantity là null, undefined, hoặc empty string
        if (item.quantity === null || item.quantity === undefined || item.quantity === '') {
          quantity = null;
        } 
        // Nếu quantity là string
        else if (typeof item.quantity === 'string') {
          // Với strings như "100.5", parse as float trước, sau đó floor
          const floatValue = parseFloat(item.quantity);
          if (!isNaN(floatValue)) {
            quantity = Math.floor(floatValue);  // Floor để đảm bảo integer
          } else {
            // Nếu không phải valid float, extract tất cả digits
            const digitsOnly = item.quantity.replace(/\D/g, '');  // Loại bỏ tất cả non-digits
            quantity = digitsOnly ? parseInt(digitsOnly, 10) : null;
          }
        } 
        // Nếu quantity là number
        else {
          // Với numbers, floor để đảm bảo integer
          const numValue = Number(item.quantity);
          quantity = isNaN(numValue) ? null : Math.floor(numValue);
        }
        
        // ============================================
        // BƯỚC 4.1.2: Log validation result
        // ============================================
        console.log('[StockReceiptController] 🔍 Validating item:', {
          product_id: item.product_id,
          originalQuantity: item.quantity,
          originalType: typeof item.quantity,
          parsedQuantity: quantity,
          isValid: quantity !== null && !isNaN(quantity) && quantity > 0
        });

        // ============================================
        // BƯỚC 4.1.3: Kiểm tra item có hợp lệ không
        // ============================================
        // Item hợp lệ phải có: product_id và quantity > 0
        if (!item.product_id || quantity === null || isNaN(quantity) || quantity <= 0) {
          console.log('[StockReceiptController] ❌ Validation failed: Invalid item:', {
            item,
            quantity,
            reason: !item.product_id ? 'Missing product_id' : 'Invalid quantity'
          });
          return res.status(400).json({
            success: false,
            message: 'Mỗi sản phẩm phải có product_id và quantity > 0',
            error: `Invalid item: product_id=${item.product_id}, quantity=${item.quantity} (parsed: ${quantity})`
          });
        }
      }

      // ============================================
      // BƯỚC 5: Normalize items để đảm bảo tất cả quantities là integers
      // ============================================
      // Normalize items: Chuyển đổi quantity thành integer và parse unit_price
      const normalizedItems = items.map(item => {
        // ============================================
        // BƯỚC 5.1: Normalize quantity thành integer
        // ============================================
        let quantity = 1;  // Mặc định: 1
        
        // Nếu quantity là null, undefined, hoặc empty string
        if (item.quantity === null || item.quantity === undefined || item.quantity === '') {
          quantity = 1;  // Mặc định: 1
        } 
        // Nếu quantity là string
        else if (typeof item.quantity === 'string') {
          // Với strings như "100.5", parse as float trước, sau đó floor
          const floatValue = parseFloat(item.quantity);
          if (!isNaN(floatValue)) {
            quantity = Math.floor(floatValue);  // Floor để đảm bảo integer
          } else {
            // Nếu không phải valid float, extract tất cả digits
            const digitsOnly = item.quantity.replace(/\D/g, '');  // Loại bỏ tất cả non-digits
            const parsed = digitsOnly ? parseInt(digitsOnly, 10) : 1;
            quantity = isNaN(parsed) || parsed < 1 ? 1 : parsed;  // Đảm bảo >= 1
          }
          quantity = quantity < 1 ? 1 : quantity;  // Đảm bảo >= 1
        } 
        // Nếu quantity là number
        else {
          // Với numbers, floor để đảm bảo integer
          const numValue = Number(item.quantity);
          quantity = isNaN(numValue) || numValue < 1 ? 1 : Math.floor(numValue);
        }
        
        // ============================================
        // BƯỚC 5.2: Normalize unit_price thành number
        // ============================================
        // Parse unit_price: Nếu là string thì parseFloat, nếu không thì Number
        const unitPrice = typeof item.unit_price === 'string'
          ? parseFloat(item.unit_price)  // Parse string thành float
          : Number(item.unit_price) || 0;  // Parse number, mặc định: 0
        
        // ============================================
        // BƯỚC 5.3: Log normalized item
        // ============================================
        console.log('[StockReceiptController] 📝 Normalized item:', {
          product_id: item.product_id,
          originalQuantity: item.quantity,
          originalQuantityType: typeof item.quantity,
          normalizedQuantity: quantity,
          originalUnitPrice: item.unit_price,
          normalizedUnitPrice: unitPrice,
          total: quantity * unitPrice  // Tổng giá trị = quantity * unit_price
        });

        // ============================================
        // BƯỚC 5.4: Trả về normalized item
        // ============================================
        return {
          product_id: item.product_id,      // ID sản phẩm
          quantity: quantity,               // Số lượng (đã normalize thành integer)
          unit_price: unitPrice,            // Giá đơn vị (đã normalize thành number)
          total_price: quantity * unitPrice // Tổng giá trị = quantity * unit_price
        };
      });

      // ============================================
      // BƯỚC 6: Log normalized items
      // ============================================
      console.log('[StockReceiptController] ✅ Items validated and normalized:', {
        originalCount: items.length,
        normalizedCount: normalizedItems.length,
        normalizedItems
      });

      // ============================================
      // BƯỚC 7: Generate receipt number nếu không có
      // ============================================
      // Nếu không có receipt_number trong request, tự động generate
      let receiptNumber = receipt_number;
      if (!receiptNumber) {
        // Generate receipt number: SR-{timestamp}
        receiptNumber = `SR-${Date.now()}`;
      }

      // ============================================
      // BƯỚC 8: Kiểm tra receipt number đã tồn tại chưa
      // ============================================
      // Kiểm tra receipt number có bị trùng không
      const existing = await stockReceipt.findByReceiptNumber(receiptNumber);
      if (existing) {
        console.log('[StockReceiptController] ❌ Validation failed: Receipt number already exists');
        return res.status(400).json({
          success: false,
          message: 'Mã phiếu nhập kho đã tồn tại',
        });
      }

      // ============================================
      // BƯỚC 9: Extract additional fields cho comprehensive receipt data
      // ============================================
      console.log('[StockReceiptController] 💾 Creating stock receipt...');
      
      // Extract các trường bổ sung từ request body
      const {
        receipt_date,        // Ngày nhập kho
        expected_date,        // Ngày dự kiến
        warehouse,            // Kho
        receiver_name,        // Tên người nhận
        receiver_phone,       // SĐT người nhận
        receipt_reason,       // Lý do nhập kho
        delivery_method,      // Phương thức giao hàng
        supplier_name,        // Tên nhà cung cấp
        supplier_contact,     // Liên hệ nhà cung cấp
        total_value,          // Tổng giá trị
      } = req.body;

      // ============================================
      // BƯỚC 10: Tạo additionalInfo object
      // ============================================
      // Lưu additional fields trong notes dưới dạng JSON (có thể migrate sang separate columns sau)
      const additionalInfo = {
        receipt_date: receipt_date || null,
        expected_date: expected_date || null,
        warehouse: warehouse || null,
        receiver_name: receiver_name || null,
        receiver_phone: receiver_phone || null,
        receipt_reason: receipt_reason || null,
        delivery_method: delivery_method || null,
        supplier_name: supplier_name || null,
        supplier_contact: supplier_contact || null,
        total_value: total_value || null,
      };

      // ============================================
      // BƯỚC 11: Combine notes với additional info
      // ============================================
      // Kết hợp notes với additional info thành một object
      const notesData = {
        notes: notes || null,              // Ghi chú từ user
        additional_info: additionalInfo,   // Additional info object
      };

      // ============================================
      // BƯỚC 12: Tạo receiptData object
      // ============================================
      // Tạo receipt data để lưu vào database
      const receiptData = {
        receipt_number: receiptNumber,                    // Mã phiếu nhập kho
        status: 'pending',                                 // Trạng thái: pending (chờ duyệt)
        items: JSON.stringify(normalizedItems),          // Items dưới dạng JSON string (sử dụng normalized items)
        notes: JSON.stringify(notesData),                 // Notes dưới dạng JSON string (bao gồm additional fields)
        created_by: userId,                                // ID người tạo
        created_at: new Date(),                           // Thời gian tạo
        updated_at: new Date(),                           // Thời gian cập nhật
      };

      // ============================================
      // BƯỚC 13: Log receipt data
      // ============================================
      console.log('[StockReceiptController] 📋 Receipt data with additional fields:', {
        receipt_number: receiptData.receipt_number,
        items_count: normalizedItems.length,
        items: normalizedItems,
        has_additional_info: !!additionalInfo.warehouse || !!additionalInfo.receiver_name,
        additional_info: additionalInfo,
        total_value: normalizedItems.reduce((sum, item) => sum + (item.total_price || 0), 0),  // Tính tổng giá trị
      });

      // ============================================
      // BƯỚC 14: Tạo stock receipt trong database
      // ============================================
      // Gọi stockReceipt.create để tạo receipt mới
      const result = await stockReceipt.create(receiptData);
      
      // Lấy insertId từ result
      const receiptId = result.insertId;
      console.log('[StockReceiptController] ✅ Stock receipt created with ID:', receiptId);
      console.log('========================================');

      // ============================================
      // BƯỚC 15: Fetch receipt vừa tạo và trả về response
      // ============================================
      // Fetch receipt vừa tạo để trả về đầy đủ thông tin
      const createdReceipt = await stockReceipt.findById(receiptId);
      
      // Trả về response thành công với status 201 (Created)
      return res.status(201).json({
        success: true,
        message: 'Tạo phiếu nhập kho thành công',
        data: createdReceipt,  // Receipt object vừa tạo
      });
    } 
    // ============================================
    // ERROR HANDLING: Xử lý lỗi
    // ============================================
    catch (error) {
      // Log lỗi chi tiết để debug
      console.error('[StockReceiptController] ❌❌❌ ERROR IN create ❌❌❌');
      console.error('[StockReceiptController] Error message:', error.message);
      console.error('[StockReceiptController] Error stack:', error.stack);
      console.log('========================================');
      
      // Trả về error response với status 400 (Bad Request)
      return res.status(400).json({
        success: false,
        message: 'Lỗi khi tạo phiếu nhập kho',
        error: error.message,
      });
    }
  };

  // ============================================
  // APPROVE FUNCTION: Duyệt phiếu nhập kho
  // ============================================
  /**
   * HTTP Handler: POST /stock-receipts/:id/approve
   * Duyệt phiếu nhập kho (approve stock receipt)
   * 
   * Khi duyệt, hệ thống sẽ:
   * 1. Cập nhật stock cho tất cả sản phẩm trong receipt
   * 2. Tạo inventory transactions để ghi lại lịch sử
   * 3. Cập nhật receipt status sang 'approved'
   * 
   * URL Params:
   * - id: ID của stock receipt (bắt buộc)
   * 
   * Response:
   * - 200: Success { success: true, message: "...", data: {...} }
   * - 400: Bad Request (validation error, receipt đã được xử lý, sản phẩm không tồn tại)
   * - 404: Not Found (không tìm thấy receipt)
   * 
   * Quy trình:
   * 1. Kiểm tra authentication (approvedBy)
   * 2. Kiểm tra receipt tồn tại và ở trạng thái 'pending'
   * 3. Parse items từ JSON string
   * 4. Batch verify tất cả products tồn tại (SQL WHERE IN)
   * 5. Batch update stock cho tất cả products (SQL UPDATE với CASE WHEN)
   * 6. Batch record inventory transactions (SQL INSERT với multiple VALUES)
   * 7. Cập nhật receipt status sang 'approved'
   * 
   * Đặc biệt:
   * - Sử dụng batch SQL queries để tối ưu (2 queries thay vì 2N queries)
   * - Chỉ duyệt được receipt ở trạng thái 'pending'
   * - Tự động cập nhật stock và ghi inventory transactions
   * 
   * @param {Object} req - Express request object (có req.user từ JWT middleware)
   * @param {Object} res - Express response object
   * @returns {Promise<void>} JSON response
   */
  const approve = async (req, res) => {
    // ============================================
    // BƯỚC 1: Logging - Ghi log thông tin request
    // ============================================
    console.log('========================================');
    console.log('[StockReceiptController] approve function called');
    console.log('[StockReceiptController] Request IP:', req.ip);
    console.log('[StockReceiptController] Params:', req.params);
    
    try {
      // ============================================
      // BƯỚC 2: Extract data từ request
      // ============================================
      // Lấy id từ URL params
      const { id } = req.params;
      
      // Lấy approvedBy từ JWT token (hỗ trợ cả userId và user_id)
      const approvedBy = req.user?.userId || req.user?.user_id;
      
      console.log('[StockReceiptController] Approving stock receipt:', { receiptId: id, approvedBy });

      // ============================================
      // BƯỚC 3: Kiểm tra authentication
      // ============================================
      // Kiểm tra approvedBy có tồn tại không
      if (!approvedBy) {
        console.log('[StockReceiptController] ❌ Validation failed: Missing approvedBy');
        return res.status(400).json({
          success: false,
          message: 'Vui lòng đăng nhập để duyệt phiếu nhập kho',
        });
      }

      // ============================================
      // BƯỚC 4: Lấy receipt từ database
      // ============================================
      // Gọi stockReceipt.findById để lấy receipt
      const receipt = await stockReceipt.findById(id);
      
      // Kiểm tra receipt có tồn tại không
      if (!receipt) {
        console.log('[StockReceiptController] ❌ Receipt not found');
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy phiếu nhập kho',
        });
      }

      // ============================================
      // BƯỚC 5: Kiểm tra receipt status phải là 'pending'
      // ============================================
      // Chỉ cho phép duyệt receipt ở trạng thái 'pending'
      if (receipt.status !== 'pending') {
        console.log('[StockReceiptController] ❌ Receipt already processed:', receipt.status);
        return res.status(400).json({
          success: false,
          message: `Phiếu nhập kho đã được xử lý (${receipt.status})`,
        });
      }

      // ============================================
      // BƯỚC 6: Parse items từ JSON string
      // ============================================
      // Items được lưu dưới dạng JSON string trong database
      let items = [];
      try {
        // Parse từ JSON string hoặc giữ nguyên nếu đã là array
        items = typeof receipt.items === 'string' 
          ? JSON.parse(receipt.items) 
          : receipt.items;
        
        // Kiểm tra items có phải là array không
        if (!Array.isArray(items)) {
          throw new Error('Items is not an array');
        }
      } catch (e) {
        console.error('[StockReceiptController] ❌ Error parsing items:', e);
        return res.status(400).json({
          success: false,
          message: 'Dữ liệu sản phẩm không hợp lệ',
        });
      }

      console.log('[StockReceiptController] 📦 Processing items for stock update...');
      console.log('[StockReceiptController] Items count:', items.length);

      // ============================================
      // BƯỚC 7: Batch verify tất cả products tồn tại
      // ============================================
      // Sử dụng SQL WHERE IN để verify tất cả products trong 1 query (thay vì N queries)
      // Extract product IDs từ items
      const productIds = items.map(item => item.product_id).filter(Boolean);
      
      // Batch fetch products bằng SQL WHERE IN
      const productMap = await product.findByProductIdsAsMap(productIds);
      console.log(`[StockReceiptController] 🔍 Batch verified ${Object.keys(productMap).length} products for ${items.length} items`);

      // ============================================
      // BƯỚC 8: Kiểm tra tất cả products tồn tại
      // ============================================
      // Tìm các products không tồn tại
      const missingProducts = productIds.filter(id => !productMap[id]);
      
      // Nếu có products không tồn tại, trả về lỗi
      if (missingProducts.length > 0) {
        console.log('[StockReceiptController] ❌ Some products not found:', missingProducts);
        return res.status(400).json({
          success: false,
          message: `Không tìm thấy sản phẩm với ID: ${missingProducts.join(', ')}`,
        });
      }

      // ============================================
      // BƯỚC 9: Prepare batch updates cho stock
      // ============================================
      // Chuẩn bị batch updates cho stock (single SQL UPDATE với CASE WHEN)
      // Mỗi item sẽ tăng stock_quantity lên quantity
      const stockUpdates = items.map(item => ({
        product_id: item.product_id,                    // ID sản phẩm
        quantity_change: parseInt(item.quantity || 0)    // Số lượng tăng (positive)
      }));

      // ============================================
      // BƯỚC 10: Prepare batch transactions cho inventory
      // ============================================
      // Chuẩn bị batch transactions cho inventory (single SQL INSERT với multiple VALUES)
      // Mỗi item sẽ tạo 1 inventory transaction để ghi lại lịch sử
      const inventoryTransactions = items.map(item => ({
        product_id: item.product_id,                              // ID sản phẩm
        quantity_change: parseInt(item.quantity || 0),           // Số lượng tăng (positive)
        change_type: 'IN',                                        // Loại thay đổi: IN (nhập kho)
        note: `Phiếu nhập kho ${receipt.receipt_number}`,        // Ghi chú
        created_by: approvedBy                                    // ID người duyệt
      }));

      // ============================================
      // BƯỚC 11: Execute batch operations
      // ============================================
      // Thực hiện batch operations (2 SQL queries thay vì 2N queries)
      
      // BƯỚC 11.1: Batch update stock cho tất cả products
      console.log('[StockReceiptController] 📈 Batch updating stock for', stockUpdates.length, 'products...');
      await product.batchUpdateStock(stockUpdates);
      console.log('[StockReceiptController] ✅ Stock updated for all products');

      // BƯỚC 11.2: Batch record inventory transactions cho tất cả items
      console.log('[StockReceiptController] 📝 Batch recording inventory transactions for', inventoryTransactions.length, 'items...');
      await inventoryTransaction.batchRecordTransactions(inventoryTransactions);
      console.log('[StockReceiptController] ✅ Inventory transactions recorded for all items');

      // ============================================
      // BƯỚC 12: Cập nhật receipt status sang 'approved'
      // ============================================
      console.log('[StockReceiptController] ✅ Approving receipt...');
      
      // Gọi stockReceipt.approve để cập nhật status
      await stockReceipt.approve(id, approvedBy);
      
      // Fetch receipt đã cập nhật
      const updated = await stockReceipt.findById(id);
      
      console.log('[StockReceiptController] ✅✅✅ STOCK RECEIPT APPROVED SUCCESSFULLY ✅✅✅');
      console.log('[StockReceiptController] Updated status:', updated?.status);
      console.log('========================================');

      // ============================================
      // BƯỚC 13: Trả về response thành công
      // ============================================
      // Trả về response thành công với status 200 (OK)
      return res.status(200).json({
        success: true,
        message: 'Duyệt phiếu nhập kho thành công. Đã cập nhật tồn kho.',
        data: updated,  // Receipt object đã được cập nhật
      });
    } 
    // ============================================
    // ERROR HANDLING: Xử lý lỗi
    // ============================================
    catch (error) {
      // Log lỗi chi tiết để debug
      console.error('[StockReceiptController] ❌❌❌ ERROR IN approve ❌❌❌');
      console.error('[StockReceiptController] Error message:', error.message);
      console.error('[StockReceiptController] Error stack:', error.stack);
      console.log('========================================');
      
      // Trả về error response với status 400 (Bad Request)
      return res.status(400).json({
        success: false,
        message: 'Lỗi khi duyệt phiếu nhập kho',
        error: error.message,
      });
    }
  };

  // ============================================
  // REJECT FUNCTION: Từ chối phiếu nhập kho
  // ============================================
  /**
   * HTTP Handler: POST /stock-receipts/:id/reject
   * Từ chối phiếu nhập kho (reject stock receipt)
   * 
   * Khi từ chối, hệ thống sẽ:
   * 1. Cập nhật receipt status sang 'rejected'
   * 2. Lưu lý do từ chối (rejectionReason)
   * 3. KHÔNG cập nhật stock (vì không nhập kho)
   * 
   * URL Params:
   * - id: ID của stock receipt (bắt buộc)
   * 
   * Request Body:
   * - rejectionReason: Lý do từ chối (bắt buộc)
   * 
   * Response:
   * - 200: Success { success: true, message: "...", data: {...} }
   * - 400: Bad Request (validation error, thiếu rejectionReason)
   * 
   * Đặc biệt:
   * - Chỉ cập nhật status, không cập nhật stock
   * - Lưu rejectionReason để tham khảo sau này
   * 
   * @param {Object} req - Express request object (có req.user từ JWT middleware)
   * @param {Object} res - Express response object
   * @returns {Promise<void>} JSON response
   */
  const reject = async (req, res) => {
    // ============================================
    // BƯỚC 1: Logging - Ghi log thông tin request
    // ============================================
    console.log('========================================');
    console.log('[StockReceiptController] reject function called');
    console.log('[StockReceiptController] Request IP:', req.ip);
    console.log('[StockReceiptController] Params:', req.params);
    // Log request body (truncate rejectionReason để tránh log quá dài)
    console.log('[StockReceiptController] Request body:', JSON.stringify({
      ...req.body,
      rejectionReason: req.body.rejectionReason ? req.body.rejectionReason.substring(0, 100) + '...' : undefined
    }, null, 2));
    
    try {
      // ============================================
      // BƯỚC 2: Extract data từ request
      // ============================================
      // Lấy id từ URL params
      const { id } = req.params;
      
      // Lấy rejectionReason từ request body
      const { rejectionReason } = req.body;
      
      // Lấy approvedBy từ JWT token (hỗ trợ cả userId và user_id)
      const approvedBy = req.user?.userId || req.user?.user_id;
      
      console.log('[StockReceiptController] Rejecting stock receipt:', {
        receiptId: id,
        approvedBy,
        hasRejectionReason: !!rejectionReason
      });

      // ============================================
      // BƯỚC 3: Validate required fields
      // ============================================
      // Kiểm tra approvedBy và rejectionReason có tồn tại không
      if (!approvedBy || !rejectionReason) {
        console.log('[StockReceiptController] ❌ Validation failed: Missing required fields');
        return res.status(400).json({
          success: false,
          message: 'Vui lòng cung cấp đầy đủ thông tin',
        });
      }

      // ============================================
      // BƯỚC 4: Từ chối receipt
      // ============================================
      console.log('[StockReceiptController] ❌ Rejecting stock receipt...');
      
      // Gọi stockReceipt.reject để cập nhật status sang 'rejected' và lưu rejectionReason
      await stockReceipt.reject(id, approvedBy, rejectionReason);
      
      // Fetch receipt đã cập nhật
      const updated = await stockReceipt.findById(id);
      
      console.log('[StockReceiptController] ✅✅✅ STOCK RECEIPT REJECTED SUCCESSFULLY ✅✅✅');
      console.log('[StockReceiptController] Updated status:', updated?.status);
      console.log('========================================');

      // ============================================
      // BƯỚC 5: Trả về response thành công
      // ============================================
      // Trả về response thành công với status 200 (OK)
      return res.status(200).json({
        success: true,
        message: 'Từ chối phiếu nhập kho thành công',
        data: updated,  // Receipt object đã được cập nhật
      });
    } 
    // ============================================
    // ERROR HANDLING: Xử lý lỗi
    // ============================================
    catch (error) {
      // Log lỗi chi tiết để debug
      console.error('[StockReceiptController] ❌❌❌ ERROR IN reject ❌❌❌');
      console.error('[StockReceiptController] Error message:', error.message);
      console.error('[StockReceiptController] Error stack:', error.stack);
      console.log('========================================');
      
      // Trả về error response với status 400 (Bad Request)
      return res.status(400).json({
        success: false,
        message: 'Lỗi khi từ chối',
        error: error.message,
      });
    }
  };

  // ============================================
  // RETURN CONTROLLER OBJECT
  // ============================================
  // Trả về object chứa tất cả HTTP handlers
  // Spread baseController để lấy các handlers cơ bản
  // Sau đó override/thêm các handlers riêng của StockReceiptController
  return {
    ...baseController,        // Spread các handlers từ BaseController (getAll, getById, create được override, update, delete, count)
    getByReceiptNumber,       // Handler riêng: Lấy stock receipt theo receipt number
    getByStatus,              // Handler riêng: Lấy stock receipts theo status
    create,                   // Override create: Tạo stock receipt với validation và normalization
    approve,                  // Handler riêng: Duyệt phiếu nhập kho (cập nhật stock và inventory transactions)
    reject,                   // Handler riêng: Từ chối phiếu nhập kho
  };
};

// ============================================
// EXPORT MODULE
// ============================================
// Export StockReceiptController đã được khởi tạo (singleton pattern)
// Cách sử dụng: const stockReceiptController = require('./StockReceiptController');
//               router.post('/:id/approve', stockReceiptController.approve);
module.exports = createStockReceiptController();

