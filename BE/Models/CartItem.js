const createBaseModel = require('./BaseModel');
/**
 * Tạo CartItem Model với các methods mở rộng cho quản lý giỏ hàng
 * CartItem là các sản phẩm trong giỏ hàng của người dùng
 * Một user có thể có nhiều cart items (nhiều sản phẩm trong giỏ hàng)
 * 
 * @returns {Object} CartItem model object với các methods:
 * - Từ BaseModel: findAll, findById, create, update, delete, count, execute, rawQuery
 * - Riêng CartItem: findByUserId, findByUserAndProduct, getCartTotal, addOrUpdate,
 *   clearUserCart, getProductIdsByUserId, findByUserIdWithProducts
 */

const createCartItemModel = () => {
  const baseModel = createBaseModel({
    tableName: 'cartitems',
    primaryKey: 'cart_item_id',
    columns: [
      'cart_item_id',
      'user_id',
      'product_id',
      'quantity',              
      'unit_price',
      'product_snapshot',
      'unit_price_snapshot',
      'created_at',
      'updated_at',
    ],
  });
  /**
   * Tìm tất cả cart items (sản phẩm) trong giỏ hàng của một người dùng
   * Một user có thể có nhiều cart items (nhiều sản phẩm trong giỏ)
   * 
   * @param {number} userId - ID của người dùng
   * @returns {Promise<Array>} Mảng các cart items của user
   * 
   * Ví dụ:
   * - userId = 1 => Tìm tất cả sản phẩm trong giỏ hàng của user ID = 1
   * - Kết quả: [{ product_id: 1, quantity: 2, ... }, { product_id: 2, quantity: 1, ... }]
   * - Sắp xếp: sản phẩm mới thêm vào trước (created_at DESC)
   */

  const findByUserId = async (userId) => {
    const sql = `SELECT * FROM \`${baseModel.tableName}\` WHERE \`user_id\` = ? ORDER BY \`created_at\` DESC`;
    return await baseModel.execute(sql, [userId]);
  };
  /**
   * Tìm cart item cụ thể của một user và một sản phẩm
   * Hữu ích để kiểm tra sản phẩm đã có trong giỏ hàng chưa
   * 
   * @param {number} userId - ID của người dùng
   * @param {number|string} productId - ID của sản phẩm
   * @returns {Promise<Object|null>} CartItem object hoặc null nếu không tìm thấy
   * 
   * Ví dụ:
   * - userId = 1, productId = 5 => Tìm cart item của user 1 chứa sản phẩm 5
   * - Kết quả: { cart_item_id: 10, user_id: 1, product_id: 5, quantity: 2, ... } hoặc null
   * 
   * Sử dụng: Kiểm tra trước khi thêm sản phẩm vào giỏ (nếu đã có thì update quantity)
   */

  const findByUserAndProduct = async (userId, productId) => {
    const sql = `SELECT * FROM \`${baseModel.tableName}\` WHERE \`user_id\` = ? AND \`product_id\` = ? LIMIT 1`;
    const rows = await baseModel.execute(sql, [userId, productId]);
    return Array.isArray(rows) ? rows[0] || null : rows;
  };
  /**
   * Tính tổng tiền của giỏ hàng cho một người dùng
   * Sử dụng SQL SUM với JOIN products để tính tổng (quantity * price) từ giá hiện tại của sản phẩm
   * 
   * @param {number} userId - ID của người dùng
   * @returns {Promise<number>} Tổng tiền giỏ hàng (0 nếu giỏ hàng trống)
   * 
   * Công thức tính:
   * total = SUM(quantity * p.price) cho tất cả cart items của user
   * Giá được lấy từ bảng products để đảm bảo luôn dùng giá hiện tại
   * 
   * Ví dụ:
   * - Cart items: [{ quantity: 2, product_id: 1 }, { quantity: 1, product_id: 2 }]
   * - Products: [{ product_id: 1, price: 100000 }, { product_id: 2, price: 200000 }]
   * - Total = (2 * 100000) + (1 * 200000) = 400000
   * 
   * Performance: Tính toán trong database với JOIN (nhanh hơn tính trong JavaScript)
   */

  const getCartTotal = async (userId) => {
    const sql = `
      SELECT SUM(ci.\`quantity\` * COALESCE(p.\`price\`, 0)) as total 
      FROM \`${baseModel.tableName}\` ci
      LEFT JOIN \`products\` p ON ci.product_id = p.product_id
      WHERE ci.\`user_id\` = ?
    `;
    const rows = await baseModel.execute(sql, [userId]);
    return rows[0]?.total || 0;
  };
  /**
   * Thêm sản phẩm vào giỏ hàng hoặc cập nhật số lượng nếu đã có
   * Logic: Nếu sản phẩm đã có trong giỏ, tăng quantity; nếu chưa có, tạo mới
   * 
   * @param {number} userId - ID của người dùng
   * @param {number|string} productId - ID của sản phẩm
   * @param {number} quantity - Số lượng cần thêm (không phải số lượng mới)
   * @param {number} unitPrice - Giá đơn vị tại thời điểm thêm vào giỏ
   * @param {Object|string|null} productSnapshot - Snapshot thông tin sản phẩm (tùy chọn)
   * @returns {Promise<Object>} CartItem object đã được tạo hoặc cập nhật
   * 
   * Ví dụ:
   * - userId = 1, productId = 5, quantity = 2
   *   => Nếu chưa có: Tạo cart item mới với quantity = 2
   *   => Nếu đã có (quantity = 3): Cập nhật thành quantity = 3 + 2 = 5
   * 
   * Lý do cần snapshot:
   * - Sản phẩm có thể thay đổi giá, tên, hình ảnh sau khi thêm vào giỏ
   * - Snapshot giúp hiển thị đúng thông tin sản phẩm tại thời điểm thêm vào giỏ
   */

  const addOrUpdate = async (userId, productId, quantity, unitPrice, productSnapshot = null) => {
    console.log('[CartItem Model] 🔍 addOrUpdate called:', {
      userId,                      
      productId,                  
      quantity,                   
      unitPrice,                  
      hasSnapshot: !!productSnapshot,  
      productIdType: typeof productId   
    });
    const existing = await findByUserAndProduct(userId, productId);
    console.log('[CartItem Model] 🔍 Existing item found:', {
      exists: !!existing,                    
      existingQuantity: existing?.quantity,  
      existingProductId: existing?.product_id,  
      requestedProductId: productId,         
      matches: existing?.product_id === productId  
    });
    if (existing) {
      if (existing.product_id !== productId) {
        console.error('[CartItem Model] ❌ CRITICAL: Existing item product_id mismatch!', {
          requestedProductId: productId,
          existingProductId: existing.product_id,
          cart_item_id: existing.cart_item_id
        });
      }
      const newQuantity = existing.quantity + quantity;
      console.log('[CartItem Model] ➕ Updating existing item:', {
        cart_item_id: existing.cart_item_id,  
        oldQuantity: existing.quantity,        
        addedQuantity: quantity,              
        newQuantity: newQuantity,             
        productId: existing.product_id
      });
      return await baseModel.update(existing.cart_item_id, {
        quantity: newQuantity,
        unit_price: unitPrice,                
        unit_price_snapshot: unitPrice,      
        product_snapshot: productSnapshot ? JSON.stringify(productSnapshot) : null,  
        updated_at: new Date(),               
      });
    } 
    else {
      console.log('[CartItem Model] ➕ Creating new item:', {
        userId,
        productId,
        quantity,
        unitPrice
      });
      const insertResult = await baseModel.create({
        user_id: userId,                      
        product_id: productId,                
        quantity,                            
        unit_price: unitPrice,                
        unit_price_snapshot: unitPrice,       
        product_snapshot: productSnapshot ? JSON.stringify(productSnapshot) : null,  
      });
      
      // After INSERT, fetch the created record to get full data including auto-generated fields
      let result;
      if (insertResult && insertResult.insertId) {
        // MySQL2 returns ResultSetHeader with insertId
        result = await baseModel.findById(insertResult.insertId);
      } else if (insertResult && typeof insertResult === 'object' && insertResult.cart_item_id) {
        // If create() already returns the full object (some implementations)
        result = insertResult;
      } else {
        // Fallback: Find by user_id and product_id
        result = await findByUserAndProduct(userId, productId);
      }
      
      if (!result) {
        console.error('[CartItem Model] ❌ CRITICAL: Failed to fetch created item!', {
          insertResult,
          userId,
          productId
        });
        throw new Error('Failed to create cart item');
      }
      
      if (result.product_id !== productId) {
        console.error('[CartItem Model] ❌ CRITICAL: Created item product_id mismatch!', {
          requestedProductId: productId,
          createdProductId: result.product_id,
          cart_item_id: result.cart_item_id
        });
      }
      
      console.log('[CartItem Model] ✅ Created item successfully:', {
        cart_item_id: result.cart_item_id,
        product_id: result.product_id,
        quantity: result.quantity
      });
      
      return result;
    }
  };
  /**
   * Xóa toàn bộ cart items của một người dùng
   * Thường được gọi sau khi đặt hàng thành công hoặc khi user muốn xóa giỏ hàng
   * 
   * @param {number} userId - ID của người dùng
   * @returns {Promise<Object>} Kết quả DELETE query
   * 
   * Ví dụ:
   * - userId = 1 => Xóa tất cả sản phẩm trong giỏ hàng của user ID = 1
   * 
   * Lưu ý: Đây là hard delete (xóa vĩnh viễn), không phải soft delete
   */

  const clearUserCart = async (userId) => {
    const sql = `DELETE FROM \`${baseModel.tableName}\` WHERE \`user_id\` = ?`;
    return await baseModel.execute(sql, [userId]);
  };
  /**
   * Lấy danh sách các product_id (không trùng lặp) trong giỏ hàng của user
   * Sử dụng SQL DISTINCT để loại bỏ duplicate (trong trường hợp có duplicate data)
   * Tối ưu hơn so với việc lấy tất cả cart items rồi map/filter trong JavaScript
   * 
   * @param {number} userId - ID của người dùng
   * @returns {Promise<Array>} Mảng các product_id (không trùng lặp)
   * 
   * Ví dụ:
   * - userId = 1 => Lấy danh sách product_id trong giỏ hàng của user 1
   * - Kết quả: [1, 2, 3, 5] (các product_id không trùng lặp)
   * 
   * Sử dụng: 
   * - Để batch fetch thông tin sản phẩm (tối ưu hơn fetch từng cái)
   * - Để kiểm tra sản phẩm nào đang trong giỏ hàng
   * 
   * Performance: Tính toán trong database (nhanh hơn JavaScript)
   */

  const getProductIdsByUserId = async (userId) => {
    const sql = `SELECT DISTINCT \`product_id\` FROM \`${baseModel.tableName}\` WHERE \`user_id\` = ? AND \`product_id\` IS NOT NULL`;
    const rows = await baseModel.execute(sql, [userId]);
    return (rows || []).map(row => row.product_id);
  };
  /**
   * Tìm cart items của user kèm thông tin chi tiết sản phẩm
   * Sử dụng SQL JOIN để lấy thông tin từ 2 bảng trong 1 query
   * Tối ưu hơn so với việc query cart items rồi batch fetch products riêng
   * 
   * @param {number} userId - ID của người dùng
   * @returns {Promise<Array>} Mảng cart items với thông tin sản phẩm đầy đủ
   * 
   * Kết quả bao gồm:
   * - Tất cả cột từ cartitems (ci.*)
   * - Thông tin sản phẩm từ products (p.name, p.price, p.images, etc.)
   * 
   * Ví dụ kết quả:
   * [
   *   {
   *     cart_item_id: 1,
   *     user_id: 1,
   *     product_id: 5,
   *     quantity: 2,
   *     unit_price: 100000,
   *     product_name: "iPhone 15 Pro Max",
   *     product_price: 100000,
   *     product_images: "...",
   *     ...
   *   },
   *   ...
   * ]
   * 
   * Performance: 1 query với JOIN thay vì 2 queries riêng lẻ
   */

  const findByUserIdWithProducts = async (userId) => {
    const sql = `
      SELECT 
        ci.*,
        p.product_id as product_product_id,
        p.id as product_db_id,
        p.name as product_name,
        p.slug as product_slug,
        p.price as product_price,
        p.stock_quantity as product_stock_quantity,
        p.is_active as product_is_active,
        p.deleted_at as product_deleted_at,
        p.images as product_images,
        p.description as product_description,
        p.category_id as product_category_id,
        p.brand as product_brand
      FROM \`${baseModel.tableName}\` ci
      LEFT JOIN \`products\` p ON ci.product_id = p.product_id
      WHERE ci.\`user_id\` = ?
      ORDER BY ci.\`created_at\` DESC
    `;
    return await baseModel.execute(sql, [userId]);
  };
  /**
   * Cập nhật giá trong cartitems từ giá hiện tại của products
   * Được gọi để đồng bộ giá trong giỏ hàng với giá hiện tại của sản phẩm
   * 
   * @param {number} userId - ID của người dùng (tùy chọn, nếu không có thì cập nhật tất cả)
   * @returns {Promise<Object>} Kết quả UPDATE query
   */

  const syncPricesFromProducts = async (userId = null) => {
    if (userId) {
      const sql = `
        UPDATE \`${baseModel.tableName}\` ci
        INNER JOIN \`products\` p ON ci.product_id = p.product_id
        SET ci.unit_price = p.price, ci.updated_at = NOW()
        WHERE ci.user_id = ?
      `;
      return await baseModel.execute(sql, [userId]);
    } else {
      const sql = `
        UPDATE \`${baseModel.tableName}\` ci
        INNER JOIN \`products\` p ON ci.product_id = p.product_id
        SET ci.unit_price = p.price, ci.updated_at = NOW()
      `;
      return await baseModel.execute(sql, []);
    }
  };
  /**
   * Cập nhật giá trong tất cả cartitems của một sản phẩm cụ thể
   * Được gọi khi giá sản phẩm được cập nhật để đồng bộ giá trong tất cả giỏ hàng
   * 
   * @param {number|string} productId - ID của sản phẩm
   * @returns {Promise<Object>} Kết quả UPDATE query
   */

  const syncPriceForProduct = async (productId) => {
    const sql = `
      UPDATE \`${baseModel.tableName}\` ci
      INNER JOIN \`products\` p ON ci.product_id = p.product_id
      SET ci.unit_price = p.price, ci.updated_at = NOW()
      WHERE ci.product_id = ? AND p.product_id = ?
    `;
    return await baseModel.execute(sql, [productId, productId]);
  };
  return {
    ...baseModel,
    findByUserId,                     
    findByUserAndProduct,             
    getCartTotal,                     
    addOrUpdate,                      
    clearUserCart,                    
    getProductIdsByUserId,            
    findByUserIdWithProducts,
    syncPricesFromProducts,
    syncPriceForProduct,
  };
};
module.exports = createCartItemModel;
