const { getDatabase } = require('../Config/database');

/**
 * Tạo StockReceiptController với các HTTP handlers cho quản lý stock receipts (phiếu nhập kho)
 * StockReceiptController kế thừa tất cả handlers từ BaseController và override/thêm các handlers riêng
 * 
 * @returns {Object} StockReceiptController object với các handlers:
 * - Từ BaseController: getAll, getById, create (được override), update, delete, count
 * - Riêng StockReceipt: getByReceiptNumber, getByStatus, approve, reject
 */

const createStockReceiptController = () => {

  /**
   * HTTP Handler: GET /stock-receipts
   * Lấy tất cả phiếu nhập kho với pagination
   * 
   * Query Parameters:
   * - page: Số trang (mặc định: 1)
   * - limit: Số lượng/trang (mặc định: 10, max: 100)
   * - orderBy: Câu lệnh ORDER BY (mặc định: 'created_at DESC')
   * 
   * Response:
   * - 200: Success { success: true, data: [...], pagination: {...} }
   * - 500: Server Error
   * 
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Promise<void>} JSON response
   */
  const getAll = async (req, res) => {
    console.log('========================================');
    console.log('[StockReceiptController] getAll function called');
    console.log('[StockReceiptController] Request IP:', req.ip);
    console.log('[StockReceiptController] Query params:', JSON.stringify(req.query, null, 2));
    
    try {
      const { page = 1, limit = 10, orderBy = 'created_at DESC' } = req.query;
      const pageNum = Math.max(1, parseInt(page) || 1);
      const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 10));
      const offset = (pageNum - 1) * limitNum;

      console.log('[StockReceiptController] Pagination:', { pageNum, limitNum, offset });

      const db = getDatabase();
      
      const countSql = `SELECT COUNT(*) as total FROM \`stockreceipts\``;
      const [countRows] = await db.execute(countSql);
      const total = countRows && countRows.length > 0 ? countRows[0].total : 0;

      const dataSql = `SELECT * FROM \`stockreceipts\` ORDER BY ${orderBy} LIMIT ? OFFSET ?`;
      const [dataRows] = await db.execute(dataSql, [limitNum, offset]);
      const data = dataRows || [];

      console.log('[StockReceiptController] ✅ Data fetched:', {
        count: data.length,
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
          totalPages: Math.ceil(total / limitNum),
        },
      });
    } catch (error) {
      console.error('[StockReceiptController] ❌❌❌ ERROR IN getAll ❌❌❌');
      console.error('[StockReceiptController] Error message:', error.message);
      console.error('[StockReceiptController] Error stack:', error.stack);
      console.log('========================================');

      return res.status(500).json({
        success: false,
        message: 'Lỗi khi lấy dữ liệu',
        error: error.message,
      });
    }
  };

  /**
   * HTTP Handler: GET /stock-receipts/:id
   * Lấy phiếu nhập kho theo ID
   * 
   * URL Params:
   * - id: ID của phiếu nhập kho (bắt buộc)
   * 
   * Response:
   * - 200: Success { success: true, data: {...} }
   * - 400: Bad Request (thiếu ID)
   * - 404: Not Found (không tìm thấy)
   * - 500: Server Error
   * 
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Promise<void>} JSON response
   */
  const getById = async (req, res) => {
    console.log('========================================');
    console.log('[StockReceiptController] getById function called');
    console.log('[StockReceiptController] Request IP:', req.ip);
    console.log('[StockReceiptController] Params:', req.params);

    try {
      const { id } = req.params;
      
      if (!id) {
        console.log('[StockReceiptController] ❌ Validation failed: Missing ID');
        return res.status(400).json({
          success: false,
          message: 'ID là bắt buộc',
        });
      }

      console.log('[StockReceiptController] 🔍 Finding stock receipt with ID:', id);

      const db = getDatabase();
      const sql = `SELECT * FROM \`stockreceipts\` WHERE \`receipt_id\` = ? LIMIT 1`;
      const [rows] = await db.execute(sql, [id]);
      const data = rows && rows.length > 0 ? rows[0] : null;

      if (!data) {
        console.log('[StockReceiptController] ❌ Stock receipt not found with ID:', id);
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy phiếu nhập kho',
        });
      }

      console.log('[StockReceiptController] ✅ Stock receipt found');
      console.log('========================================');

      return res.status(200).json({
        success: true,
        data,
      });
    } catch (error) {
      console.error('[StockReceiptController] ❌❌❌ ERROR IN getById ❌❌❌');
      console.error('[StockReceiptController] Error message:', error.message);
      console.error('[StockReceiptController] Error stack:', error.stack);
      console.log('========================================');

      return res.status(500).json({
        success: false,
        message: 'Lỗi khi lấy dữ liệu',
        error: error.message,
      });
    }
  };

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

    console.log('========================================');
    console.log('[StockReceiptController] getByReceiptNumber function called');
    console.log('[StockReceiptController] Request IP:', req.ip);
    console.log('[StockReceiptController] Params:', req.params);

    try {

      const { receiptNumber } = req.params;
      console.log('[StockReceiptController] 🔍 Finding stock receipt by receipt number:', receiptNumber);

      const db = getDatabase();
      const sql = `SELECT * FROM \`stockreceipts\` WHERE \`receipt_number\` = ? LIMIT 1`;
      const [rows] = await db.execute(sql, [receiptNumber]);
      const data = rows && rows.length > 0 ? rows[0] : null;

      if (!data) {
        console.log('[StockReceiptController] ❌ Stock receipt not found');
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy phiếu nhập kho',
        });
      }

      console.log('[StockReceiptController] ✅ Stock receipt found:', data.receipt_id);
      console.log('========================================');

      return res.status(200).json({
        success: true,
        data,  
      });
    } 

    catch (error) {

      console.error('[StockReceiptController] ❌❌❌ ERROR IN getByReceiptNumber ❌❌❌');
      console.error('[StockReceiptController] Error message:', error.message);
      console.error('[StockReceiptController] Error stack:', error.stack);
      console.log('========================================');

      return res.status(500).json({
        success: false,
        message: 'Lỗi khi lấy dữ liệu',
        error: error.message,
      });
    }
  };

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

    console.log('========================================');
    console.log('[StockReceiptController] getByStatus function called');
    console.log('[StockReceiptController] Request IP:', req.ip);
    console.log('[StockReceiptController] Params:', req.params);

    try {

      const { status } = req.params;
      console.log('[StockReceiptController] 🔍 Fetching stock receipts by status:', status);

      const db = getDatabase();
      const sql = `SELECT * FROM \`stockreceipts\` WHERE \`status\` = ? ORDER BY \`created_at\` DESC`;
      const [rows] = await db.execute(sql, [status]);
      const data = rows || [];

      console.log('[StockReceiptController] ✅ Stock receipts fetched:', data?.length || 0);
      console.log('========================================');

      return res.status(200).json({
        success: true,
        data,  
      });
    } 

    catch (error) {

      console.error('[StockReceiptController] ❌❌❌ ERROR IN getByStatus ❌❌❌');
      console.error('[StockReceiptController] Error message:', error.message);
      console.error('[StockReceiptController] Error stack:', error.stack);
      console.log('========================================');

      return res.status(500).json({
        success: false,
        message: 'Lỗi khi lấy dữ liệu',
        error: error.message,
      });
    }
  };

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

    console.log('========================================');
    console.log('[StockReceiptController] create function called');
    console.log('[StockReceiptController] Request IP:', req.ip);
    console.log('[StockReceiptController] Request body:', JSON.stringify(req.body, null, 2));

    try {

      const { receipt_number, items, notes } = req.body;

      const userId = req.user?.userId || req.user?.user_id;

      console.log('[StockReceiptController] 🔍 Validating input...');

      if (!items || !Array.isArray(items) || items.length === 0) {
        console.log('[StockReceiptController] ❌ Validation failed: Missing or invalid items');
        return res.status(400).json({
          success: false,
          message: 'Vui lòng chọn ít nhất một sản phẩm',
        });
      }

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

      for (const item of items) {

        let quantity = null;

        if (item.quantity === null || item.quantity === undefined || item.quantity === '') {
          quantity = null;
        } 

        else if (typeof item.quantity === 'string') {
          const floatValue = parseFloat(item.quantity);
          if (!isNaN(floatValue)) {
            quantity = Math.floor(floatValue);  
          } else {

            const digitsOnly = item.quantity.replace(/\D/g, '');  
            quantity = digitsOnly ? parseInt(digitsOnly, 10) : null;
          }
        } 

        else {

          const numValue = Number(item.quantity);
          quantity = isNaN(numValue) ? null : Math.floor(numValue);
        }

        console.log('[StockReceiptController] 🔍 Validating item:', {
          product_id: item.product_id,
          originalQuantity: item.quantity,
          originalType: typeof item.quantity,
          parsedQuantity: quantity,
          isValid: quantity !== null && !isNaN(quantity) && quantity > 0
        });

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

      const normalizedItems = items.map(item => {

        let quantity = 1;

        if (item.quantity === null || item.quantity === undefined || item.quantity === '') {
          quantity = 1;
        } 

        else if (typeof item.quantity === 'string') {
          const floatValue = parseFloat(item.quantity);
          if (!isNaN(floatValue)) {
            quantity = Math.floor(floatValue);  
          } else {

            const digitsOnly = item.quantity.replace(/\D/g, '');  
            const parsed = digitsOnly ? parseInt(digitsOnly, 10) : 1;
            quantity = isNaN(parsed) || parsed < 1 ? 1 : parsed;
          }
          quantity = quantity < 1 ? 1 : quantity;
        } 

        else {

          const numValue = Number(item.quantity);
          quantity = isNaN(numValue) || numValue < 1 ? 1 : Math.floor(numValue);
        }

        const unitPrice = typeof item.unit_price === 'string'
          ? parseFloat(item.unit_price)  
          : Number(item.unit_price) || 0;  

        console.log('[StockReceiptController] 📝 Normalized item:', {
          product_id: item.product_id,
          originalQuantity: item.quantity,
          originalQuantityType: typeof item.quantity,
          normalizedQuantity: quantity,
          originalUnitPrice: item.unit_price,
          normalizedUnitPrice: unitPrice,
          total: quantity * unitPrice
        });

        return {
          product_id: item.product_id,      
          quantity: quantity,
          unit_price: unitPrice,
          total_price: quantity * unitPrice
        };
      });

      console.log('[StockReceiptController] ✅ Items validated and normalized:', {
        originalCount: items.length,
        normalizedCount: normalizedItems.length,
        normalizedItems
      });

      let receiptNumber = receipt_number;
      if (!receiptNumber) {
        receiptNumber = `SR-${Date.now()}`;
      }

      const db = getDatabase();
      const checkSql = `SELECT * FROM \`stockreceipts\` WHERE \`receipt_number\` = ? LIMIT 1`;
      const [existingRows] = await db.execute(checkSql, [receiptNumber]);
      if (existingRows && existingRows.length > 0) {
        console.log('[StockReceiptController] ❌ Validation failed: Receipt number already exists');
        return res.status(400).json({
          success: false,
          message: 'Mã phiếu nhập kho đã tồn tại',
        });
      }

      console.log('[StockReceiptController] 💾 Creating stock receipt...');

      const {
        receipt_date,        
        expected_date,        
        warehouse,            
        receiver_name,        
        receiver_phone,       
        receipt_reason,       
        delivery_method,      
        supplier_name,        
        supplier_contact,     
        total_value,          
      } = req.body;

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

      const notesData = {
        notes: notes || null,              
        additional_info: additionalInfo,   
      };

      const itemsJson = JSON.stringify(normalizedItems);
      const notesJson = JSON.stringify(notesData);
      const now = new Date();

      console.log('[StockReceiptController] 📋 Receipt data with additional fields:', {
        receipt_number: receiptNumber,
        items_count: normalizedItems.length,
        items: normalizedItems,
        has_additional_info: !!additionalInfo.warehouse || !!additionalInfo.receiver_name,
        additional_info: additionalInfo,
        total_value: normalizedItems.reduce((sum, item) => sum + (item.total_price || 0), 0),  
      });

      const insertSql = `INSERT INTO \`stockreceipts\` 
        (\`receipt_number\`, \`status\`, \`items\`, \`notes\`, \`created_by\`, \`created_at\`, \`updated_at\`) 
        VALUES (?, ?, ?, ?, ?, ?, ?)`;
      const [result] = await db.execute(insertSql, [
        receiptNumber,
        'pending',
        itemsJson,
        notesJson,
        userId,
        now,
        now
      ]);

      const receiptId = result.insertId;
      console.log('[StockReceiptController] ✅ Stock receipt created with ID:', receiptId);
      console.log('========================================');

      const selectSql = `SELECT * FROM \`stockreceipts\` WHERE \`receipt_id\` = ? LIMIT 1`;
      const [createdRows] = await db.execute(selectSql, [receiptId]);
      const createdReceipt = createdRows && createdRows.length > 0 ? createdRows[0] : null;

      return res.status(201).json({
        success: true,
        message: 'Tạo phiếu nhập kho thành công',
        data: createdReceipt,  
      });
    } 

    catch (error) {

      console.error('[StockReceiptController] ❌❌❌ ERROR IN create ❌❌❌');
      console.error('[StockReceiptController] Error message:', error.message);
      console.error('[StockReceiptController] Error stack:', error.stack);
      console.log('========================================');

      return res.status(400).json({
        success: false,
        message: 'Lỗi khi tạo phiếu nhập kho',
        error: error.message,
      });
    }
  };

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

    console.log('========================================');
    console.log('[StockReceiptController] approve function called');
    console.log('[StockReceiptController] Request IP:', req.ip);
    console.log('[StockReceiptController] Params:', req.params);

    try {

      const { id } = req.params;

      const approvedBy = req.user?.userId || req.user?.user_id;

      console.log('[StockReceiptController] Approving stock receipt:', { receiptId: id, approvedBy });

      if (!approvedBy) {
        console.log('[StockReceiptController] ❌ Validation failed: Missing approvedBy');
        return res.status(400).json({
          success: false,
          message: 'Vui lòng đăng nhập để duyệt phiếu nhập kho',
        });
      }

      const db = getDatabase();
      const selectSql = `SELECT * FROM \`stockreceipts\` WHERE \`receipt_id\` = ? LIMIT 1`;
      const [receiptRows] = await db.execute(selectSql, [id]);
      const receipt = receiptRows && receiptRows.length > 0 ? receiptRows[0] : null;

      if (!receipt) {
        console.log('[StockReceiptController] ❌ Receipt not found');
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy phiếu nhập kho',
        });
      }

      if (receipt.status !== 'pending') {
        console.log('[StockReceiptController] ❌ Receipt already processed:', receipt.status);
        return res.status(400).json({
          success: false,
          message: `Phiếu nhập kho đã được xử lý (${receipt.status})`,
        });
      }

      let items = [];
      try {

        items = typeof receipt.items === 'string' 
          ? JSON.parse(receipt.items) 
          : receipt.items;

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

      const productIds = items.map(item => item.product_id).filter(Boolean);
      const uniqueProductIds = [...new Set(productIds)];

      if (uniqueProductIds.length === 0) {
        console.log('[StockReceiptController] ❌ No valid product IDs found');
        return res.status(400).json({
          success: false,
          message: 'Không có sản phẩm hợp lệ trong phiếu nhập kho',
        });
      }

      const productPlaceholders = uniqueProductIds.map(() => '?').join(',');
      const productSql = `SELECT \`id\`, \`product_id\`, \`stock_quantity\` FROM \`products\` WHERE \`id\` IN (${productPlaceholders}) AND \`deleted_at\` IS NULL`;
      const [productRows] = await db.execute(productSql, uniqueProductIds);
      
      const productMap = {};
      (productRows || []).forEach(row => {
        productMap[row.id] = row;
      });

      console.log(`[StockReceiptController] 🔍 Batch verified ${Object.keys(productMap).length} products for ${items.length} items`);

      const missingProducts = productIds.filter(pid => {
        return !productRows.some(p => p.id === pid);
      });

      if (missingProducts.length > 0) {
        console.log('[StockReceiptController] ❌ Some products not found:', missingProducts);
        return res.status(400).json({
          success: false,
          message: `Không tìm thấy sản phẩm với ID: ${missingProducts.join(', ')}`,
        });
      }

      const stockUpdates = items.map(item => ({
        product_id: item.product_id,                    
        quantity_change: parseInt(item.quantity || 0)
      }));

      const inventoryTransactions = items.map(item => ({
        product_id: item.product_id,                              
        quantity_change: parseInt(item.quantity || 0),
        change_type: 'IN',
        note: `Phiếu nhập kho ${receipt.receipt_number}`,        
        created_by: approvedBy                                    
      }));

      console.log('[StockReceiptController] 📈 Batch updating stock for', stockUpdates.length, 'products...');
      
      const stockMap = {};
      (productRows || []).forEach(row => {
        stockMap[row.id] = parseInt(row.stock_quantity || 0);
      });

      const caseClauses = [];
      const updateParams = [];
      stockUpdates.forEach(update => {
        const productId = update.product_id;
        const quantityChange = update.quantity_change;
        const currentStock = stockMap[productId] || 0;
        const newStock = Math.max(0, currentStock + quantityChange);
        caseClauses.push(`WHEN \`id\` = ? THEN ?`);
        updateParams.push(productId, newStock);
      });

      if (caseClauses.length > 0) {
        const caseClause = caseClauses.join(' ');
        const wherePlaceholders = uniqueProductIds.map(() => '?').join(',');
        const updateStockSql = `
          UPDATE \`products\`
          SET \`stock_quantity\` = CASE ${caseClause} ELSE \`stock_quantity\` END
          WHERE \`id\` IN (${wherePlaceholders})
        `;
        await db.execute(updateStockSql, [...updateParams, ...uniqueProductIds]);
      }
      console.log('[StockReceiptController] ✅ Stock updated for all products');

      console.log('[StockReceiptController] 📝 Batch recording inventory transactions for', inventoryTransactions.length, 'items...');
      
      if (inventoryTransactions.length > 0) {
        const transactionValues = inventoryTransactions.map(() => '(?, ?, ?, ?, ?, ?)').join(', ');
        const transactionParams = inventoryTransactions.flatMap(t => [
          t.product_id,
          t.quantity_change,
          t.change_type,
          t.note || null,
          t.created_by || null,
          new Date()
        ]);
        const insertTransactionSql = `
          INSERT INTO \`inventorytransactions\` 
          (\`product_id\`, \`quantity_change\`, \`change_type\`, \`note\`, \`created_by\`, \`changed_at\`)
          VALUES ${transactionValues}
        `;
        await db.execute(insertTransactionSql, transactionParams);
      }
      console.log('[StockReceiptController] ✅ Inventory transactions recorded for all items');

      console.log('[StockReceiptController] ✅ Approving receipt...');

      const now = new Date();
      const approveSql = `UPDATE \`stockreceipts\` 
        SET \`status\` = ?, \`approved_by\` = ?, \`approved_at\` = ?, \`updated_at\` = ? 
        WHERE \`receipt_id\` = ?`;
      await db.execute(approveSql, ['approved', approvedBy, now, now, id]);

      const [updatedRows] = await db.execute(selectSql, [id]);
      const updated = updatedRows && updatedRows.length > 0 ? updatedRows[0] : null;

      console.log('[StockReceiptController] ✅✅✅ STOCK RECEIPT APPROVED SUCCESSFULLY ✅✅✅');
      console.log('[StockReceiptController] Updated status:', updated?.status);
      console.log('========================================');

      return res.status(200).json({
        success: true,
        message: 'Duyệt phiếu nhập kho thành công. Đã cập nhật tồn kho.',
        data: updated,  
      });
    } 

    catch (error) {

      console.error('[StockReceiptController] ❌❌❌ ERROR IN approve ❌❌❌');
      console.error('[StockReceiptController] Error message:', error.message);
      console.error('[StockReceiptController] Error stack:', error.stack);
      console.log('========================================');

      return res.status(400).json({
        success: false,
        message: 'Lỗi khi duyệt phiếu nhập kho',
        error: error.message,
      });
    }
  };

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

    console.log('========================================');
    console.log('[StockReceiptController] reject function called');
    console.log('[StockReceiptController] Request IP:', req.ip);
    console.log('[StockReceiptController] Params:', req.params);

    console.log('[StockReceiptController] Request body:', JSON.stringify({
      ...req.body,
      rejectionReason: req.body.rejectionReason ? req.body.rejectionReason.substring(0, 100) + '...' : undefined
    }, null, 2));

    try {

      const { id } = req.params;

      const { rejectionReason } = req.body;

      const approvedBy = req.user?.userId || req.user?.user_id;

      console.log('[StockReceiptController] Rejecting stock receipt:', {
        receiptId: id,
        approvedBy,
        hasRejectionReason: !!rejectionReason
      });

      if (!approvedBy || !rejectionReason) {
        console.log('[StockReceiptController] ❌ Validation failed: Missing required fields');
        return res.status(400).json({
          success: false,
          message: 'Vui lòng cung cấp đầy đủ thông tin',
        });
      }

      console.log('[StockReceiptController] ❌ Rejecting stock receipt...');

      const db = getDatabase();
      const now = new Date();
      const rejectSql = `UPDATE \`stockreceipts\` 
        SET \`status\` = ?, \`approved_by\` = ?, \`approved_at\` = ?, \`rejection_reason\` = ?, \`updated_at\` = ? 
        WHERE \`receipt_id\` = ?`;
      await db.execute(rejectSql, ['rejected', approvedBy, now, rejectionReason, now, id]);

      const selectSql = `SELECT * FROM \`stockreceipts\` WHERE \`receipt_id\` = ? LIMIT 1`;
      const [updatedRows] = await db.execute(selectSql, [id]);
      const updated = updatedRows && updatedRows.length > 0 ? updatedRows[0] : null;

      console.log('[StockReceiptController] ✅✅✅ STOCK RECEIPT REJECTED SUCCESSFULLY ✅✅✅');
      console.log('[StockReceiptController] Updated status:', updated?.status);
      console.log('========================================');

      return res.status(200).json({
        success: true,
        message: 'Từ chối phiếu nhập kho thành công',
        data: updated,  
      });
    } 

    catch (error) {

      console.error('[StockReceiptController] ❌❌❌ ERROR IN reject ❌❌❌');
      console.error('[StockReceiptController] Error message:', error.message);
      console.error('[StockReceiptController] Error stack:', error.stack);
      console.log('========================================');

      return res.status(400).json({
        success: false,
        message: 'Lỗi khi từ chối',
        error: error.message,
      });
    }
  };

  /**
   * HTTP Handler: PUT /stock-receipts/:id
   * Cập nhật phiếu nhập kho
   * 
   * URL Params:
   * - id: ID của phiếu nhập kho (bắt buộc)
   * 
   * Request Body:
   * - Các trường có thể cập nhật (tùy chọn)
   * 
   * Response:
   * - 200: Success { success: true, message: "...", data: {...} }
   * - 400: Bad Request (validation error)
   * - 404: Not Found (không tìm thấy)
   * 
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Promise<void>} JSON response
   */
  const update = async (req, res) => {
    console.log('========================================');
    console.log('[StockReceiptController] update function called');
    console.log('[StockReceiptController] Request IP:', req.ip);
    console.log('[StockReceiptController] Params:', req.params);
    console.log('[StockReceiptController] Request body:', JSON.stringify(req.body, null, 2));

    try {
      const { id } = req.params;

      if (!id) {
        console.log('[StockReceiptController] ❌ Validation failed: Missing ID');
        return res.status(400).json({
          success: false,
          message: 'ID là bắt buộc',
        });
      }

      const db = getDatabase();
      const checkSql = `SELECT * FROM \`stockreceipts\` WHERE \`receipt_id\` = ? LIMIT 1`;
      const [existingRows] = await db.execute(checkSql, [id]);
      
      if (!existingRows || existingRows.length === 0) {
        console.log('[StockReceiptController] ❌ Stock receipt not found');
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy phiếu nhập kho',
        });
      }

      const allowedFields = [
        'receipt_number', 'status', 'items', 'notes', 
        'approved_by', 'approved_at', 'rejection_reason'
      ];
      
      const updateFields = [];
      const updateValues = [];
      
      for (const field of allowedFields) {
        if (req.body[field] !== undefined) {
          updateFields.push(`\`${field}\` = ?`);
          updateValues.push(req.body[field]);
        }
      }

      if (updateFields.length === 0) {
        console.log('[StockReceiptController] ❌ No fields to update');
        return res.status(400).json({
          success: false,
          message: 'Không có trường nào để cập nhật',
        });
      }

      updateFields.push('`updated_at` = ?');
      updateValues.push(new Date());
      updateValues.push(id);

      const updateSql = `UPDATE \`stockreceipts\` SET ${updateFields.join(', ')} WHERE \`receipt_id\` = ?`;
      await db.execute(updateSql, updateValues);

      const [updatedRows] = await db.execute(checkSql, [id]);
      const updated = updatedRows && updatedRows.length > 0 ? updatedRows[0] : null;

      console.log('[StockReceiptController] ✅ Stock receipt updated');
      console.log('========================================');

      return res.status(200).json({
        success: true,
        message: 'Cập nhật phiếu nhập kho thành công',
        data: updated,
      });
    } catch (error) {
      console.error('[StockReceiptController] ❌❌❌ ERROR IN update ❌❌❌');
      console.error('[StockReceiptController] Error message:', error.message);
      console.error('[StockReceiptController] Error stack:', error.stack);
      console.log('========================================');

      return res.status(400).json({
        success: false,
        message: 'Lỗi khi cập nhật phiếu nhập kho',
        error: error.message,
      });
    }
  };

  /**
   * HTTP Handler: DELETE /stock-receipts/:id
   * Xóa phiếu nhập kho (soft delete hoặc hard delete)
   * 
   * URL Params:
   * - id: ID của phiếu nhập kho (bắt buộc)
   * 
   * Response:
   * - 200: Success { success: true, message: "..." }
   * - 400: Bad Request (validation error)
   * - 404: Not Found (không tìm thấy)
   * 
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Promise<void>} JSON response
   */
  const deleteById = async (req, res) => {
    console.log('========================================');
    console.log('[StockReceiptController] delete function called');
    console.log('[StockReceiptController] Request IP:', req.ip);
    console.log('[StockReceiptController] Params:', req.params);

    try {
      const { id } = req.params;

      if (!id) {
        console.log('[StockReceiptController] ❌ Validation failed: Missing ID');
        return res.status(400).json({
          success: false,
          message: 'ID là bắt buộc',
        });
      }

      const db = getDatabase();
      const checkSql = `SELECT * FROM \`stockreceipts\` WHERE \`receipt_id\` = ? LIMIT 1`;
      const [existingRows] = await db.execute(checkSql, [id]);
      
      if (!existingRows || existingRows.length === 0) {
        console.log('[StockReceiptController] ❌ Stock receipt not found');
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy phiếu nhập kho',
        });
      }

      const deleteSql = `DELETE FROM \`stockreceipts\` WHERE \`receipt_id\` = ?`;
      await db.execute(deleteSql, [id]);

      console.log('[StockReceiptController] ✅ Stock receipt deleted');
      console.log('========================================');

      return res.status(200).json({
        success: true,
        message: 'Xóa phiếu nhập kho thành công',
      });
    } catch (error) {
      console.error('[StockReceiptController] ❌❌❌ ERROR IN delete ❌❌❌');
      console.error('[StockReceiptController] Error message:', error.message);
      console.error('[StockReceiptController] Error stack:', error.stack);
      console.log('========================================');

      return res.status(400).json({
        success: false,
        message: 'Lỗi khi xóa phiếu nhập kho',
        error: error.message,
      });
    }
  };

  return {
    getAll,
    getById,
    getByReceiptNumber,       
    getByStatus,              
    create,                   
    update,
    delete: deleteById,
    approve,                  
    reject,                   
  };
};

module.exports = createStockReceiptController();
