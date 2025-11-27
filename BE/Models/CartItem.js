// ============================================
// IMPORT BASE MODEL
// ============================================
// Import factory function createBaseModel từ BaseModel.js
// BaseModel cung cấp các methods CRUD cơ bản (findAll, findById, create, update, delete, etc.)
const createBaseModel = require('./BaseModel');

// ============================================
// CART ITEM MODEL FACTORY FUNCTION
// ============================================
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
  // ============================================
  // KHỞI TẠO BASE MODEL
  // ============================================
  // Tạo baseModel bằng cách gọi createBaseModel với cấu hình cho bảng cartitems
  const baseModel = createBaseModel({
    // Tên bảng trong database
    tableName: 'cartitems',
    
    // Primary key của bảng (cột cart_item_id)
    primaryKey: 'cart_item_id',
    
    // Danh sách tất cả các cột hợp lệ trong bảng cartitems
    // Chỉ các cột trong danh sách này mới được phép insert/update (bảo mật)
    columns: [
      'cart_item_id',          // ID tự tăng (primary key)
      'user_id',               // ID người dùng sở hữu giỏ hàng (foreign key -> users)
      'product_id',            // ID sản phẩm trong giỏ hàng (foreign key -> products)
      'quantity',              // Số lượng sản phẩm trong giỏ hàng
      'unit_price',            // Giá đơn vị tại thời điểm thêm vào giỏ (có thể thay đổi)
      'product_snapshot',       // Snapshot thông tin sản phẩm tại thời điểm thêm vào giỏ (JSON)
                                // Lưu lại để hiển thị khi sản phẩm thay đổi sau này
      'unit_price_snapshot',   // Snapshot giá đơn vị (backup của unit_price)
      'created_at',            // Thời gian tạo (khi thêm vào giỏ)
      'updated_at',            // Thời gian cập nhật (khi cập nhật số lượng)
    ],
  });

  // ============================================
  // FIND BY USER ID FUNCTION: Tìm cart items theo người dùng
  // ============================================
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
    // Xây dựng SQL query để tìm cart items theo user_id
    // ORDER BY created_at DESC: sắp xếp sản phẩm mới thêm vào trước
    const sql = `SELECT * FROM \`${baseModel.tableName}\` WHERE \`user_id\` = ? ORDER BY \`created_at\` DESC`;
    
    // Thực thi query với userId làm parameter
    return await baseModel.execute(sql, [userId]);
  };

  // ============================================
  // FIND BY USER AND PRODUCT FUNCTION: Tìm cart item cụ thể
  // ============================================
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
    // Xây dựng SQL query với 2 điều kiện: user_id và product_id
    // LIMIT 1 vì một user chỉ có thể có 1 cart item cho mỗi sản phẩm
    const sql = `SELECT * FROM \`${baseModel.tableName}\` WHERE \`user_id\` = ? AND \`product_id\` = ? LIMIT 1`;
    
    // Thực thi query với userId và productId làm parameters
    const rows = await baseModel.execute(sql, [userId, productId]);
    
    // Trả về cart item đầu tiên nếu có, nếu không trả về null
    // Kiểm tra Array.isArray để đảm bảo rows là array trước khi truy cập [0]
    return Array.isArray(rows) ? rows[0] || null : rows;
  };

  // ============================================
  // GET CART TOTAL FUNCTION: Tính tổng tiền giỏ hàng
  // ============================================
  /**
   * Tính tổng tiền của giỏ hàng cho một người dùng
   * Sử dụng SQL SUM để tính tổng (quantity * unit_price) của tất cả cart items
   * 
   * @param {number} userId - ID của người dùng
   * @returns {Promise<number>} Tổng tiền giỏ hàng (0 nếu giỏ hàng trống)
   * 
   * Công thức tính:
   * total = SUM(quantity * unit_price) cho tất cả cart items của user
   * 
   * Ví dụ:
   * - Cart items: [{ quantity: 2, unit_price: 100000 }, { quantity: 1, unit_price: 200000 }]
   * - Total = (2 * 100000) + (1 * 200000) = 400000
   * 
   * Performance: Tính toán trong database (nhanh hơn tính trong JavaScript)
   */
  const getCartTotal = async (userId) => {
    // Xây dựng SQL query với SUM aggregate function
    // SUM(quantity * unit_price): Tính tổng (số lượng * giá đơn vị) cho mỗi cart item
    // as total: Đặt tên alias cho kết quả SUM
    const sql = `SELECT SUM(\`quantity\` * \`unit_price\`) as total FROM \`${baseModel.tableName}\` WHERE \`user_id\` = ?`;
    
    // Thực thi query với userId làm parameter
    const rows = await baseModel.execute(sql, [userId]);
    
    // Trả về total từ row đầu tiên, mặc định 0 nếu không có kết quả
    // rows[0]?.total: Optional chaining để tránh lỗi nếu rows[0] là undefined
    // || 0: Nếu total là null/undefined, trả về 0
    return rows[0]?.total || 0;
  };

  // ============================================
  // ADD OR UPDATE FUNCTION: Thêm hoặc cập nhật cart item
  // ============================================
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
    // ============================================
    // BƯỚC 1: Log thông tin để debug
    // ============================================
    // Log các thông tin đầu vào để theo dõi quá trình xử lý
    console.log('[CartItem Model] 🔍 addOrUpdate called:', {
      userId,                      // ID người dùng
      productId,                  // ID sản phẩm
      quantity,                   // Số lượng cần thêm
      unitPrice,                  // Giá đơn vị
      hasSnapshot: !!productSnapshot,  // Có snapshot không
      productIdType: typeof productId   // Kiểu dữ liệu của productId
    });
    
    // ============================================
    // BƯỚC 2: Kiểm tra cart item đã tồn tại chưa
    // ============================================
    // Tìm cart item của user và sản phẩm này
    const existing = await findByUserAndProduct(userId, productId);
    
    // Log kết quả tìm kiếm
    console.log('[CartItem Model] 🔍 Existing item found:', {
      exists: !!existing,                    // Có tồn tại không
      existingQuantity: existing?.quantity,  // Số lượng hiện tại
      existingProductId: existing?.product_id,  // Product ID hiện tại
      requestedProductId: productId,         // Product ID yêu cầu
      matches: existing?.product_id === productId  // Có khớp không
    });
    
    // ============================================
    // BƯỚC 3: Xử lý theo trường hợp
    // ============================================
    
    // CASE 1: Cart item đã tồn tại => Cập nhật số lượng
    if (existing) {
      // Kiểm tra product_id có khớp không (safety check)
      if (existing.product_id !== productId) {
        // Log lỗi nếu không khớp (có thể do bug hoặc data corruption)
        console.error('[CartItem Model] ❌ CRITICAL: Existing item product_id mismatch!', {
          requestedProductId: productId,
          existingProductId: existing.product_id,
          cart_item_id: existing.cart_item_id
        });
        // Vẫn tiếp tục xử lý nhưng log lỗi để debug
      }
      
      // ============================================
      // Tính số lượng mới = số lượng hiện tại + số lượng thêm vào
      // ============================================
      const newQuantity = existing.quantity + quantity;
      
      // Log thông tin cập nhật
      console.log('[CartItem Model] ➕ Updating existing item:', {
        cart_item_id: existing.cart_item_id,  // ID cart item cần update
        oldQuantity: existing.quantity,        // Số lượng cũ
        addedQuantity: quantity,              // Số lượng thêm vào
        newQuantity: newQuantity,             // Số lượng mới
        productId: existing.product_id
      });
      
      // Cập nhật cart item với số lượng mới
      return await baseModel.update(existing.cart_item_id, {
        quantity: newQuantity,                // Số lượng mới (cộng dồn)
        unit_price: unitPrice,                // Cập nhật giá mới (giá có thể thay đổi)
        unit_price_snapshot: unitPrice,      // Lưu snapshot giá
        product_snapshot: productSnapshot ? JSON.stringify(productSnapshot) : null,  // Lưu snapshot sản phẩm
        updated_at: new Date(),               // Cập nhật thời gian
      });
    } 
    // CASE 2: Cart item chưa tồn tại => Tạo mới
    else {
      // Log thông tin tạo mới
      console.log('[CartItem Model] ➕ Creating new item:', {
        userId,
        productId,
        quantity,
        unitPrice
      });
      
      // Tạo cart item mới
      const result = await baseModel.create({
        user_id: userId,                      // ID người dùng
        product_id: productId,                // ID sản phẩm
        quantity,                            // Số lượng
        unit_price: unitPrice,                // Giá đơn vị
        unit_price_snapshot: unitPrice,       // Snapshot giá
        product_snapshot: productSnapshot ? JSON.stringify(productSnapshot) : null,  // Snapshot sản phẩm
      });
      
      // ============================================
      // BƯỚC 4: Verify kết quả tạo mới (safety check)
      // ============================================
      // Kiểm tra product_id có khớp không
      if (result.product_id !== productId) {
        // Log lỗi nếu không khớp (có thể do bug)
        console.error('[CartItem Model] ❌ CRITICAL: Created item product_id mismatch!', {
          requestedProductId: productId,
          createdProductId: result.product_id,
          cart_item_id: result.cart_item_id
        });
      }
      
      // Trả về kết quả
      return result;
    }
  };

  // ============================================
  // CLEAR USER CART FUNCTION: Xóa toàn bộ giỏ hàng
  // ============================================
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
    // Xây dựng SQL DELETE query
    // DELETE FROM: Xóa tất cả rows thỏa mãn điều kiện
    const sql = `DELETE FROM \`${baseModel.tableName}\` WHERE \`user_id\` = ?`;
    
    // Thực thi query với userId làm parameter
    return await baseModel.execute(sql, [userId]);
  };

  // ============================================
  // GET PRODUCT IDS BY USER ID FUNCTION: Lấy danh sách product IDs
  // ============================================
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
    // Xây dựng SQL query với DISTINCT
    // DISTINCT: Loại bỏ các giá trị trùng lặp
    // product_id IS NOT NULL: Chỉ lấy product_id hợp lệ (không null)
    const sql = `SELECT DISTINCT \`product_id\` FROM \`${baseModel.tableName}\` WHERE \`user_id\` = ? AND \`product_id\` IS NOT NULL`;
    
    // Thực thi query với userId làm parameter
    const rows = await baseModel.execute(sql, [userId]);
    
    // Map qua rows để extract product_id thành mảng
    // (rows || []): Đảm bảo rows là array (tránh lỗi nếu rows là null/undefined)
    return (rows || []).map(row => row.product_id);
  };

  // ============================================
  // FIND BY USER ID WITH PRODUCTS FUNCTION: Tìm với thông tin sản phẩm
  // ============================================
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
    // Xây dựng SQL query với LEFT JOIN
    // LEFT JOIN: Lấy tất cả cart items, kể cả khi product không tồn tại (đã bị xóa)
    const sql = `
      SELECT 
        ci.*,                                    // Tất cả cột từ cartitems
        p.product_id as product_product_id,      // ID sản phẩm (đổi tên để tránh conflict)
        p.id as product_db_id,                   // ID database của sản phẩm (primary key)
        p.name as product_name,                  // Tên sản phẩm
        p.slug as product_slug,                  // Slug sản phẩm (URL-friendly)
        p.price as product_price,                // Giá sản phẩm hiện tại
        p.stock_quantity as product_stock_quantity, // Tồn kho hiện tại
        p.is_active as product_is_active,        // Trạng thái active
        p.deleted_at as product_deleted_at,     // Thời gian xóa (nếu đã bị xóa)
        p.images as product_images,              // Hình ảnh sản phẩm (JSON string)
        p.description as product_description,   // Mô tả sản phẩm
        p.category_id as product_category_id,   // ID danh mục
        p.brand as product_brand                // Thương hiệu
      FROM \`${baseModel.tableName}\` ci         // Bảng chính: cartitems (alias: ci)
      LEFT JOIN \`products\` p ON ci.product_id = p.product_id    // JOIN với products
      WHERE ci.\`user_id\` = ?                   // Filter theo user_id
      ORDER BY ci.\`created_at\` DESC             // Sắp xếp sản phẩm mới thêm vào trước
    `;
    
    // Thực thi query với userId làm parameter
    return await baseModel.execute(sql, [userId]);
  };

  // ============================================
  // RETURN CART ITEM MODEL OBJECT
  // ============================================
  // Trả về object chứa tất cả methods từ BaseModel và các methods riêng của CartItem
  // Spread operator (...) để copy tất cả methods từ baseModel
  // Sau đó thêm các methods riêng của CartItem
  return {
    ...baseModel,                    // Tất cả methods từ BaseModel (findAll, findById, create, update, delete, etc.)
    findByUserId,                     // Tìm cart items theo user_id
    findByUserAndProduct,             // Tìm cart item cụ thể (user + product)
    getCartTotal,                     // Tính tổng tiền giỏ hàng
    addOrUpdate,                      // Thêm hoặc cập nhật cart item
    clearUserCart,                    // Xóa toàn bộ giỏ hàng
    getProductIdsByUserId,            // Lấy danh sách product_id trong giỏ hàng
    findByUserIdWithProducts,         // Tìm cart items với thông tin sản phẩm (JOIN)
  };
};

// ============================================
// EXPORT MODULE
// ============================================
// Export factory function để các file khác có thể import và sử dụng
// Cách sử dụng: const createCartItemModel = require('./CartItem');
//               const cartItem = createCartItemModel();
module.exports = createCartItemModel;
