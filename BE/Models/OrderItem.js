// ============================================
// IMPORT BASE MODEL
// ============================================
// Import factory function createBaseModel từ BaseModel.js
const createBaseModel = require('./BaseModel');

// ============================================
// ORDER ITEM MODEL FACTORY FUNCTION
// ============================================
/**
 * Tạo OrderItem Model với các methods mở rộng cho quản lý chi tiết đơn hàng
 * OrderItem là các sản phẩm trong một đơn hàng (1 order có nhiều order items)
 * 
 * @returns {Object} OrderItem model object với các methods:
 * - Từ BaseModel: findAll, findById, create, update, delete, count, execute, rawQuery
 * - Riêng OrderItem: findByOrderId, findByProductId, findByOrderIdWithDetails,
 *   findByProductIdWithDetails, findByOrderIds, findByProductIds, createWithSnapshot
 */
const createOrderItemModel = () => {
  // ============================================
  // KHỞI TẠO BASE MODEL
  // ============================================
  // Tạo baseModel với cấu hình cho bảng orderitems
  const baseModel = createBaseModel({
    // Tên bảng trong database
    tableName: 'orderitems',
    
    // Primary key của bảng
    primaryKey: 'order_item_id',
    
    // Danh sách tất cả các cột hợp lệ trong bảng orderitems
    columns: [
      'order_item_id',          // ID tự tăng (primary key)
      'order_id',               // ID đơn hàng (foreign key -> orders)
      'product_id',             // ID sản phẩm (foreign key -> products)
      'quantity',               // Số lượng sản phẩm trong đơn hàng
      'unit_price',             // Giá đơn vị tại thời điểm đặt hàng (có thể thay đổi sau)
      'total_price',            // Tổng tiền = unit_price * quantity
      'product_snapshot',       // Snapshot thông tin sản phẩm tại thời điểm đặt hàng (JSON)
                                 // Lưu lại để tham khảo khi sản phẩm thay đổi sau này
      'unit_price_snapshot',    // Snapshot giá đơn vị (backup của unit_price)
      'total_price_snapshot',   // Snapshot tổng tiền (backup của total_price)
    ],
  });

  // ============================================
  // FIND BY ORDER ID FUNCTION: Tìm order items theo đơn hàng
  // ============================================
  /**
   * Tìm tất cả order items (chi tiết sản phẩm) của một đơn hàng
   * Một đơn hàng có thể có nhiều order items (nhiều sản phẩm)
   * 
   * @param {number} orderId - ID của đơn hàng
   * @returns {Promise<Array>} Mảng các order items của đơn hàng
   * 
   * Ví dụ:
   * - orderId = 1 => Tìm tất cả sản phẩm trong đơn hàng có ID = 1
   * - Kết quả: [{ product_id: 1, quantity: 2, ... }, { product_id: 2, quantity: 1, ... }]
   */
  const findByOrderId = async (orderId) => {
    // Xây dựng SQL query để tìm order items theo order_id
    // ORDER BY order_item_id ASC: sắp xếp theo thứ tự thêm vào
    const sql = `SELECT * FROM \`${baseModel.tableName}\` WHERE \`order_id\` = ? ORDER BY \`order_item_id\` ASC`;
    
    // Thực thi query với orderId làm parameter
    return await baseModel.execute(sql, [orderId]);
  };

  // ============================================
  // FIND BY PRODUCT ID FUNCTION: Tìm order items theo sản phẩm
  // ============================================
  /**
   * Tìm tất cả order items chứa một sản phẩm cụ thể
   * Hữu ích để xem sản phẩm đã được đặt trong những đơn hàng nào
   * 
   * @param {number} productId - ID của sản phẩm
   * @returns {Promise<Array>} Mảng các order items chứa sản phẩm này
   * 
   * Ví dụ:
   * - productId = 1 => Tìm tất cả đơn hàng có chứa sản phẩm ID = 1
   * - Kết quả: [{ order_id: 1, quantity: 2, ... }, { order_id: 5, quantity: 1, ... }]
   */
  const findByProductId = async (productId) => {
    // Xây dựng SQL query để tìm order items theo product_id
    // ORDER BY order_item_id DESC: sắp xếp mới nhất trước
    const sql = `SELECT * FROM \`${baseModel.tableName}\` WHERE \`product_id\` = ? ORDER BY \`order_item_id\` DESC`;
    
    // Thực thi query với productId làm parameter
    return await baseModel.execute(sql, [productId]);
  };

  // ============================================
  // FIND BY ORDER ID WITH DETAILS FUNCTION: Tìm với thông tin chi tiết
  // ============================================
  /**
   * Tìm order items theo order_id kèm thông tin sản phẩm và đơn hàng
   * Sử dụng SQL JOIN để lấy thông tin từ 3 bảng trong 1 query
   * Tối ưu hơn so với việc query riêng từng bảng
   * 
   * @param {number} orderId - ID của đơn hàng
   * @returns {Promise<Array>} Mảng order items với thông tin đầy đủ
   * 
   * Kết quả bao gồm:
   * - Tất cả cột từ orderitems (oi.*)
   * - Thông tin sản phẩm từ products (p.name, p.price, etc.)
   * - Thông tin đơn hàng từ orders (o.order_number, o.status_id, etc.)
   * 
   * Performance: 1 query với JOIN thay vì 3 queries riêng lẻ
   */
  const findByOrderIdWithDetails = async (orderId) => {
    // Xây dựng SQL query với LEFT JOIN
    // LEFT JOIN: Lấy tất cả order items, kể cả khi product hoặc order không tồn tại
    const sql = `
      SELECT 
        oi.*,                                    // Tất cả cột từ orderitems
        p.product_id as product_product_id,      // ID sản phẩm (đổi tên để tránh conflict)
        p.name as product_name,                  // Tên sản phẩm
        p.price as product_price,                // Giá sản phẩm hiện tại
        p.stock_quantity as product_stock_quantity, // Tồn kho hiện tại
        p.is_active as product_is_active,        // Trạng thái active
        o.order_id as order_order_id,            // ID đơn hàng (đổi tên để tránh conflict)
        o.order_number as order_number,          // Số đơn hàng
        o.status_id as order_status_id,          // Trạng thái đơn hàng
        o.total_amount as order_total_amount,    // Tổng tiền đơn hàng
        o.created_at as order_created_at         // Thời gian tạo đơn hàng
      FROM \`${baseModel.tableName}\` oi         // Bảng chính: orderitems (alias: oi)
      LEFT JOIN \`products\` p ON oi.product_id = p.product_id    // JOIN với products
      LEFT JOIN \`orders\` o ON oi.order_id = o.order_id          // JOIN với orders
      WHERE oi.order_id = ?                     // Filter theo order_id
      ORDER BY oi.order_item_id ASC              // Sắp xếp theo thứ tự
    `;
    
    // Thực thi query với orderId làm parameter
    return await baseModel.execute(sql, [orderId]);
  };

  // ============================================
  // FIND BY PRODUCT ID WITH DETAILS FUNCTION: Tìm với thông tin chi tiết
  // ============================================
  /**
   * Tìm order items theo product_id kèm thông tin sản phẩm và đơn hàng
   * Tương tự findByOrderIdWithDetails nhưng filter theo product_id
   * 
   * @param {number} productId - ID của sản phẩm
   * @returns {Promise<Array>} Mảng order items chứa sản phẩm này với thông tin đầy đủ
   * 
   * Hữu ích để:
   * - Xem sản phẩm đã được đặt trong những đơn hàng nào
   * - Xem thông tin đơn hàng và sản phẩm cùng lúc
   */
  const findByProductIdWithDetails = async (productId) => {
    // SQL query tương tự findByOrderIdWithDetails nhưng WHERE theo product_id
    const sql = `
      SELECT 
        oi.*,                                    // Tất cả cột từ orderitems
        p.product_id as product_product_id,      // ID sản phẩm
        p.name as product_name,                  // Tên sản phẩm
        p.price as product_price,                // Giá sản phẩm
        p.stock_quantity as product_stock_quantity, // Tồn kho
        p.is_active as product_is_active,        // Trạng thái
        o.order_id as order_order_id,            // ID đơn hàng
        o.order_number as order_number,          // Số đơn hàng
        o.status_id as order_status_id,          // Trạng thái đơn hàng
        o.total_amount as order_total_amount,    // Tổng tiền
        o.created_at as order_created_at         // Thời gian tạo
      FROM \`${baseModel.tableName}\` oi
      LEFT JOIN \`products\` p ON oi.product_id = p.product_id
      LEFT JOIN \`orders\` o ON oi.order_id = o.order_id
      WHERE oi.product_id = ?                    // Filter theo product_id
      ORDER BY oi.order_item_id DESC              // Sắp xếp mới nhất trước
    `;
    
    // Thực thi query với productId làm parameter
    return await baseModel.execute(sql, [productId]);
  };

  // ============================================
  // BATCH FIND BY ORDER IDS FUNCTION: Tìm order items của nhiều đơn hàng
  // ============================================
  /**
   * Tìm order items của nhiều đơn hàng cùng lúc bằng SQL WHERE IN
   * Thay vì thực hiện N queries riêng lẻ, chỉ thực hiện 1 query duy nhất
   * 
   * @param {Array<number>} orderIds - Mảng các order_id cần tìm
   * @returns {Promise<Array>} Mảng tất cả order items của các đơn hàng
   * 
   * Ví dụ:
   * - orderIds = [1, 2, 3] => Tìm order items của đơn hàng 1, 2, 3
   * - Kết quả: [item1, item2, item3, ...] (tất cả items của 3 đơn hàng)
   * 
   * Performance: O(1) query thay vì O(N) queries
   */
  const findByOrderIds = async (orderIds) => {
    // Kiểm tra input có phải array và có phần tử không
    if (!Array.isArray(orderIds) || orderIds.length === 0) {
      return [];
    }
    
    // Tạo placeholders cho SQL WHERE IN clause
    // Ví dụ: orderIds = [1, 2, 3] => placeholders = "?,?,?"
    const placeholders = orderIds.map(() => '?').join(',');
    
    // Xây dựng SQL query với WHERE IN
    // ORDER BY: sắp xếp theo order_id trước, sau đó order_item_id
    const sql = `SELECT * FROM \`${baseModel.tableName}\` WHERE \`order_id\` IN (${placeholders}) ORDER BY \`order_id\` ASC, \`order_item_id\` ASC`;
    
    // Thực thi query với mảng orderIds làm parameters
    return await baseModel.execute(sql, orderIds);
  };

  // ============================================
  // BATCH FIND BY PRODUCT IDS FUNCTION: Tìm order items của nhiều sản phẩm
  // ============================================
  /**
   * Tìm order items của nhiều sản phẩm cùng lúc bằng SQL WHERE IN
   * Hữu ích để xem nhiều sản phẩm đã được đặt trong những đơn hàng nào
   * 
   * @param {Array<number>} productIds - Mảng các product_id cần tìm
   * @returns {Promise<Array>} Mảng tất cả order items chứa các sản phẩm này
   * 
   * Ví dụ:
   * - productIds = [1, 2, 3] => Tìm order items chứa sản phẩm 1, 2, 3
   * 
   * Performance: O(1) query thay vì O(N) queries
   */
  const findByProductIds = async (productIds) => {
    // Kiểm tra input có phải array và có phần tử không
    if (!Array.isArray(productIds) || productIds.length === 0) {
      return [];
    }
    
    // Tạo placeholders cho SQL WHERE IN clause
    const placeholders = productIds.map(() => '?').join(',');
    
    // Xây dựng SQL query với WHERE IN
    // ORDER BY: sắp xếp theo product_id trước, sau đó order_item_id (mới nhất trước)
    const sql = `SELECT * FROM \`${baseModel.tableName}\` WHERE \`product_id\` IN (${placeholders}) ORDER BY \`product_id\` ASC, \`order_item_id\` DESC`;
    
    // Thực thi query với mảng productIds làm parameters
    return await baseModel.execute(sql, productIds);
  };

  // ============================================
  // CREATE WITH SNAPSHOT FUNCTION: Tạo order item với snapshot
  // ============================================
  /**
   * Tạo order item mới và lưu snapshot thông tin sản phẩm tại thời điểm đặt hàng
   * Snapshot giúp lưu lại thông tin sản phẩm khi đặt hàng, kể cả khi sản phẩm thay đổi sau này
   * 
   * @param {number} orderId - ID của đơn hàng
   * @param {number} productId - ID của sản phẩm
   * @param {number} quantity - Số lượng sản phẩm
   * @param {number} unitPrice - Giá đơn vị tại thời điểm đặt hàng
   * @param {Object|string|null} productSnapshot - Snapshot thông tin sản phẩm (tùy chọn)
   * @returns {Promise<Object>} Kết quả create (chứa insertId)
   * 
   * Ví dụ productSnapshot:
   * {
   *   name: "iPhone 15 Pro Max",
   *   price: 29990000,
   *   images: [...],
   *   ...
   * }
   * 
   * Lý do cần snapshot:
   * - Sản phẩm có thể thay đổi giá, tên, hình ảnh sau khi đặt hàng
   * - Snapshot giúp hiển thị đúng thông tin sản phẩm tại thời điểm đặt hàng
   * - Quan trọng cho việc xử lý khiếu nại, trả hàng
   */
  const createWithSnapshot = async (orderId, productId, quantity, unitPrice, productSnapshot = null) => {
    // ============================================
    // BƯỚC 1: Tính tổng tiền
    // ============================================
    // Tổng tiền = giá đơn vị * số lượng
    // Parse để đảm bảo là number
    const totalPrice = parseFloat(unitPrice) * parseInt(quantity);
    
    // ============================================
    // BƯỚC 2: Tạo object chứa dữ liệu order item
    // ============================================
    const data = {
      order_id: orderId,                        // ID đơn hàng
      product_id: productId,                    // ID sản phẩm
      quantity: parseInt(quantity),             // Số lượng (parse sang integer)
      unit_price: parseFloat(unitPrice),        // Giá đơn vị (parse sang float)
      total_price: totalPrice,                  // Tổng tiền
      unit_price_snapshot: parseFloat(unitPrice), // Snapshot giá đơn vị (backup)
      total_price_snapshot: totalPrice,         // Snapshot tổng tiền (backup)
    };
    
    // ============================================
    // BƯỚC 3: Xử lý product_snapshot nếu có
    // ============================================
    // Nếu có productSnapshot, thêm vào data
    if (productSnapshot) {
      // Kiểm tra kiểu dữ liệu: string (đã JSON stringify) hoặc object
      data.product_snapshot = typeof productSnapshot === 'string' 
        ? productSnapshot                       // Đã là string, dùng trực tiếp
        : JSON.stringify(productSnapshot);      // Là object, stringify thành JSON
    }
    
    // ============================================
    // BƯỚC 4: Tạo order item trong database
    // ============================================
    // Gọi baseModel.create để insert vào database
    return await baseModel.create(data);
  };

  // ============================================
  // ADD METHODS TO BASE MODEL
  // ============================================
  // Thêm các methods trực tiếp vào baseModel object (mutate object)
  // Cách này khác với return {...baseModel, ...} - thay đổi trực tiếp baseModel
  // Lý do: Một số trường hợp cần mutate để đảm bảo methods được thêm đúng cách
  baseModel.findByOrderId = findByOrderId;
  baseModel.findByProductId = findByProductId;
  baseModel.findByOrderIdWithDetails = findByOrderIdWithDetails;
  baseModel.findByProductIdWithDetails = findByProductIdWithDetails;
  baseModel.findByOrderIds = findByOrderIds;
  baseModel.findByProductIds = findByProductIds;
  
  // ============================================
  // ASSIGN CREATE WITH SNAPSHOT METHOD
  // ============================================
  // Thêm method createWithSnapshot với error handling
  // Có fallback nếu assignment thông thường không hoạt động
  try {
    // Thử gán method trực tiếp
    baseModel.createWithSnapshot = createWithSnapshot;
    
    // Kiểm tra xem method đã được thêm thành công chưa
    if (typeof baseModel.createWithSnapshot !== 'function') {
      // Nếu không thành công, dùng Object.defineProperty để force add
      // defineProperty cho phép kiểm soát chi tiết hơn về property
      Object.defineProperty(baseModel, 'createWithSnapshot', {
        value: createWithSnapshot,    // Giá trị của property
        writable: true,               // Có thể ghi đè
        enumerable: true,             // Hiển thị khi enumerate (for...in)
        configurable: true,           // Có thể xóa hoặc thay đổi descriptor
      });
    }
  } catch (error) {
    // Nếu có lỗi, log và để Models/index.js xử lý fallback
    console.error('[OrderItem] Error adding createWithSnapshot:', error);
    // Fallback: Models/index.js sẽ thêm method này nếu cần
  }
  
  // ============================================
  // RETURN BASE MODEL
  // ============================================
  // Trả về baseModel đã được mutate (đã thêm các methods)
  // Khác với các model khác (return {...baseModel, ...}), model này mutate trực tiếp
  return baseModel;
};

// ============================================
// EXPORT MODULE
// ============================================
// Export factory function để các file khác có thể import và sử dụng
module.exports = createOrderItemModel;
