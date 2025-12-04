const createBaseModel = require('./BaseModel');
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
  const baseModel = createBaseModel({
    tableName: 'orderitems',
    primaryKey: 'order_item_id',
    columns: [
      'order_item_id',
      'order_id',
      'product_id',
      'quantity',               
      'unit_price',
      'total_price',
      'product_snapshot',
      'unit_price_snapshot',
      'total_price_snapshot',
    ],
  });
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
    const sql = `SELECT * FROM \`${baseModel.tableName}\` WHERE \`order_id\` = ? ORDER BY \`order_item_id\` ASC`;
    return await baseModel.execute(sql, [orderId]);
  };
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
    const sql = `SELECT * FROM \`${baseModel.tableName}\` WHERE \`product_id\` = ? ORDER BY \`order_item_id\` DESC`;
    return await baseModel.execute(sql, [productId]);
  };
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
    const sql = `
      SELECT 
        oi.*,
        p.product_id as product_product_id,
        p.name as product_name,
        p.price as product_price,
        p.stock_quantity as product_stock_quantity,
        p.is_active as product_is_active,
        o.order_id as order_order_id,
        o.order_number as order_number,
        o.status_id as order_status_id,
        o.total_amount as order_total_amount,
        o.created_at as order_created_at
      FROM \`${baseModel.tableName}\` oi
      LEFT JOIN \`products\` p ON oi.product_id = p.product_id
      LEFT JOIN \`orders\` o ON oi.order_id = o.order_id
      WHERE oi.order_id = ?
      ORDER BY oi.order_item_id ASC
    `;
    return await baseModel.execute(sql, [orderId]);
  };
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
    const sql = `
      SELECT 
        oi.*,
        p.product_id as product_product_id,
        p.name as product_name,
        p.price as product_price,
        p.stock_quantity as product_stock_quantity,
        p.is_active as product_is_active,
        o.order_id as order_order_id,
        o.order_number as order_number,
        o.status_id as order_status_id,
        o.total_amount as order_total_amount,
        o.created_at as order_created_at
      FROM \`${baseModel.tableName}\` oi
      LEFT JOIN \`products\` p ON oi.product_id = p.product_id
      LEFT JOIN \`orders\` o ON oi.order_id = o.order_id
      WHERE oi.product_id = ?
      ORDER BY oi.order_item_id DESC
    `;
    return await baseModel.execute(sql, [productId]);
  };
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
    if (!Array.isArray(orderIds) || orderIds.length === 0) {
      return [];
    }
    const placeholders = orderIds.map(() => '?').join(',');
    const sql = `SELECT * FROM \`${baseModel.tableName}\` WHERE \`order_id\` IN (${placeholders}) ORDER BY \`order_id\` ASC, \`order_item_id\` ASC`;
    return await baseModel.execute(sql, orderIds);
  };
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
    if (!Array.isArray(productIds) || productIds.length === 0) {
      return [];
    }
    const placeholders = productIds.map(() => '?').join(',');
    const sql = `SELECT * FROM \`${baseModel.tableName}\` WHERE \`product_id\` IN (${placeholders}) ORDER BY \`product_id\` ASC, \`order_item_id\` DESC`;
    return await baseModel.execute(sql, productIds);
  };
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
    const totalPrice = parseFloat(unitPrice) * parseInt(quantity);
    const data = {
      order_id: orderId,                        
      product_id: productId,                    
      quantity: parseInt(quantity),
      unit_price: parseFloat(unitPrice),
      total_price: totalPrice,                  
      unit_price_snapshot: parseFloat(unitPrice),
      total_price_snapshot: totalPrice,
    };
    if (productSnapshot) {
      data.product_snapshot = typeof productSnapshot === 'string' 
        ? productSnapshot                       
        : JSON.stringify(productSnapshot);      
    }
    return await baseModel.create(data);
  };
  baseModel.findByOrderId = findByOrderId;
  baseModel.findByProductId = findByProductId;
  baseModel.findByOrderIdWithDetails = findByOrderIdWithDetails;
  baseModel.findByProductIdWithDetails = findByProductIdWithDetails;
  baseModel.findByOrderIds = findByOrderIds;
  baseModel.findByProductIds = findByProductIds;
  try {
    baseModel.createWithSnapshot = createWithSnapshot;
    if (typeof baseModel.createWithSnapshot !== 'function') {
      Object.defineProperty(baseModel, 'createWithSnapshot', {
        value: createWithSnapshot,    
        writable: true,               
        enumerable: true,
        configurable: true,           
      });
    }
  } catch (error) {
    console.error('[OrderItem] Error adding createWithSnapshot:', error);
  }
  return baseModel;
};
module.exports = createOrderItemModel;
