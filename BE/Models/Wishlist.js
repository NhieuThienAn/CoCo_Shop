// ============================================
// IMPORT BASE MODEL
// ============================================
// Import factory function createBaseModel từ BaseModel.js
// BaseModel cung cấp các methods CRUD cơ bản (findAll, findById, create, update, delete, etc.)
const createBaseModel = require('./BaseModel');

// ============================================
// WISHLIST MODEL FACTORY FUNCTION
// ============================================
/**
 * Tạo Wishlist Model với các methods mở rộng cho quản lý danh sách yêu thích
 * Wishlist là danh sách sản phẩm mà user yêu thích (wishlist = danh sách mong muốn)
 * Một user có thể có nhiều sản phẩm trong wishlist
 * 
 * @returns {Object} Wishlist model object với các methods:
 * - Từ BaseModel: findAll, findById, create, update, delete, count, execute, rawQuery
 * - Riêng Wishlist: findByUserId, findByUserAndProduct, addToWishlist, removeFromWishlist
 */
const createWishlistModel = () => {
  // ============================================
  // KHỞI TẠO BASE MODEL
  // ============================================
  // Tạo baseModel bằng cách gọi createBaseModel với cấu hình cho bảng wishlist
  const baseModel = createBaseModel({
    // Tên bảng trong database
    tableName: 'wishlist',
    
    // Primary key của bảng (cột wishlist_id)
    primaryKey: 'wishlist_id',
    
    // Danh sách tất cả các cột hợp lệ trong bảng wishlist
    // Chỉ các cột trong danh sách này mới được phép insert/update (bảo mật)
    columns: [
      'wishlist_id',    // ID tự tăng (primary key)
      'user_id',        // ID người dùng sở hữu wishlist (foreign key -> users)
      'product_id',     // ID sản phẩm trong wishlist (foreign key -> products)
      'added_at',       // Thời gian thêm vào wishlist (tự động set khi tạo)
    ],
  });

  // ============================================
  // FIND BY USER ID FUNCTION: Tìm wishlist theo người dùng
  // ============================================
  /**
   * Tìm tất cả sản phẩm trong wishlist của một người dùng
   * Một user có thể có nhiều sản phẩm trong wishlist
   * 
   * @param {number} userId - ID của người dùng
   * @returns {Promise<Array>} Mảng các wishlist items của user
   * 
   * Ví dụ:
   * - userId = 1 => Tìm tất cả sản phẩm trong wishlist của user ID = 1
   * - Kết quả: [{ wishlist_id: 1, user_id: 1, product_id: 5, ... }, { wishlist_id: 2, user_id: 1, product_id: 10, ... }]
   * - Sắp xếp: sản phẩm mới thêm vào trước (added_at DESC)
   */
  const findByUserId = async (userId) => {
    // Xây dựng SQL query để tìm wishlist items theo user_id
    // ORDER BY added_at DESC: sắp xếp sản phẩm mới thêm vào trước
    const sql = `SELECT * FROM \`${baseModel.tableName}\` WHERE \`user_id\` = ? ORDER BY \`added_at\` DESC`;
    
    // Thực thi query với userId làm parameter
    return await baseModel.execute(sql, [userId]);
  };

  // ============================================
  // FIND BY USER AND PRODUCT FUNCTION: Tìm wishlist item cụ thể
  // ============================================
  /**
   * Tìm wishlist item cụ thể của một user và một sản phẩm
   * Hữu ích để kiểm tra sản phẩm đã có trong wishlist chưa
   * 
   * @param {number} userId - ID của người dùng
   * @param {number|string} productId - ID của sản phẩm
   * @returns {Promise<Object|null>} Wishlist item object hoặc null nếu không tìm thấy
   * 
   * Ví dụ:
   * - userId = 1, productId = 5 => Tìm wishlist item của user 1 chứa sản phẩm 5
   * - Kết quả: { wishlist_id: 10, user_id: 1, product_id: 5, added_at: "..." } hoặc null
   * 
   * Sử dụng: Kiểm tra trước khi thêm sản phẩm vào wishlist (tránh duplicate)
   */
  const findByUserAndProduct = async (userId, productId) => {
    // Xây dựng SQL query với 2 điều kiện: user_id và product_id
    // LIMIT 1 vì một user chỉ có thể có 1 wishlist item cho mỗi sản phẩm
    const sql = `SELECT * FROM \`${baseModel.tableName}\` WHERE \`user_id\` = ? AND \`product_id\` = ? LIMIT 1`;
    
    // Thực thi query với userId và productId làm parameters
    const rows = await baseModel.execute(sql, [userId, productId]);
    
    // Trả về wishlist item đầu tiên nếu có, nếu không trả về null
    // Kiểm tra Array.isArray để đảm bảo rows là array trước khi truy cập [0]
    return Array.isArray(rows) ? rows[0] || null : rows;
  };

  // ============================================
  // ADD TO WISHLIST FUNCTION: Thêm sản phẩm vào wishlist
  // ============================================
  /**
   * Thêm sản phẩm vào wishlist của user
   * Nếu sản phẩm đã có trong wishlist, trả về item hiện có (không tạo duplicate)
   * 
   * @param {number} userId - ID của người dùng
   * @param {number|string} productId - ID của sản phẩm
   * @returns {Promise<Object>} Wishlist item object (đã tồn tại hoặc mới tạo)
   * 
   * Logic:
   * 1. Kiểm tra sản phẩm đã có trong wishlist chưa
   * 2. Nếu có => Trả về item hiện có (idempotent - gọi nhiều lần không tạo duplicate)
   * 3. Nếu chưa có => Tạo mới và trả về item mới
   * 
   * Ví dụ:
   * - userId = 1, productId = 5
   *   => Nếu chưa có: Tạo wishlist item mới
   *   => Nếu đã có: Trả về wishlist item hiện có
   * 
   * Lưu ý: Idempotent operation - gọi nhiều lần với cùng params sẽ trả về cùng kết quả
   */
  const addToWishlist = async (userId, productId) => {
    // ============================================
    // BƯỚC 1: Kiểm tra sản phẩm đã có trong wishlist chưa
    // ============================================
    const existing = await findByUserAndProduct(userId, productId);
    
    // ============================================
    // BƯỚC 2: Xử lý theo trường hợp
    // ============================================
    
    // CASE 1: Sản phẩm đã có trong wishlist
    if (existing) {
      // Trả về item hiện có (không tạo duplicate)
      // Idempotent: gọi nhiều lần sẽ trả về cùng kết quả
      return existing;
    } 
    // CASE 2: Sản phẩm chưa có trong wishlist => Tạo mới
    else {
      // Tạo wishlist item mới
      // baseModel.create trả về { insertId, ... } (kết quả INSERT query)
      const result = await baseModel.create({
        user_id: userId,      // ID người dùng
        product_id: productId, // ID sản phẩm
        // added_at sẽ được tự động set bởi database (DEFAULT CURRENT_TIMESTAMP)
      });
      
      // Lấy wishlist item vừa tạo bằng insertId
      // insertId là ID của row vừa được insert
      return await baseModel.findById(result.insertId);
    }
  };

  // ============================================
  // REMOVE FROM WISHLIST FUNCTION: Xóa sản phẩm khỏi wishlist
  // ============================================
  /**
   * Xóa sản phẩm khỏi wishlist của user
   * 
   * @param {number} userId - ID của người dùng
   * @param {number|string} productId - ID của sản phẩm cần xóa
   * @returns {Promise<Object>} Kết quả DELETE query
   * 
   * Ví dụ:
   * - userId = 1, productId = 5 => Xóa sản phẩm 5 khỏi wishlist của user 1
   * 
   * Lưu ý: Đây là hard delete (xóa vĩnh viễn), không phải soft delete
   * Nếu sản phẩm không có trong wishlist, query vẫn chạy nhưng không xóa gì (không lỗi)
   */
  const removeFromWishlist = async (userId, productId) => {
    // Xây dựng SQL DELETE query với 2 điều kiện
    // DELETE FROM: Xóa rows thỏa mãn điều kiện
    const sql = `DELETE FROM \`${baseModel.tableName}\` WHERE \`user_id\` = ? AND \`product_id\` = ?`;
    
    // Thực thi query với userId và productId làm parameters
    return await baseModel.execute(sql, [userId, productId]);
  };

  // ============================================
  // RETURN WISHLIST MODEL OBJECT
  // ============================================
  // Trả về object chứa tất cả methods từ BaseModel và các methods riêng của Wishlist
  // Spread operator (...) để copy tất cả methods từ baseModel
  // Sau đó thêm các methods riêng của Wishlist
  return {
    ...baseModel,                    // Tất cả methods từ BaseModel (findAll, findById, create, update, delete, etc.)
    findByUserId,                     // Tìm wishlist items theo user_id
    findByUserAndProduct,             // Tìm wishlist item cụ thể (user + product)
    addToWishlist,                    // Thêm sản phẩm vào wishlist (idempotent)
    removeFromWishlist,               // Xóa sản phẩm khỏi wishlist
  };
};

// ============================================
// EXPORT MODULE
// ============================================
// Export factory function để các file khác có thể import và sử dụng
// Cách sử dụng: const createWishlistModel = require('./Wishlist');
//               const wishlist = createWishlistModel();
module.exports = createWishlistModel;
