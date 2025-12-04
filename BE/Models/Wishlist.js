const createBaseModel = require('./BaseModel');
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
  const baseModel = createBaseModel({
    tableName: 'wishlist',
    primaryKey: 'wishlist_id',
    columns: [
      'wishlist_id',
      'user_id',
      'product_id',
      'added_at',
    ],
  });
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
    const sql = `SELECT * FROM \`${baseModel.tableName}\` WHERE \`user_id\` = ? ORDER BY \`added_at\` DESC`;
    return await baseModel.execute(sql, [userId]);
  };
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
    const sql = `SELECT * FROM \`${baseModel.tableName}\` WHERE \`user_id\` = ? AND \`product_id\` = ? LIMIT 1`;
    const rows = await baseModel.execute(sql, [userId, productId]);
    return Array.isArray(rows) ? rows[0] || null : rows;
  };
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
    const existing = await findByUserAndProduct(userId, productId);
    if (existing) {
      return existing;
    } 
    else {
      const result = await baseModel.create({
        user_id: userId,      
        product_id: productId, 
      });
      return await baseModel.findById(result.insertId);
    }
  };
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
    const sql = `DELETE FROM \`${baseModel.tableName}\` WHERE \`user_id\` = ? AND \`product_id\` = ?`;
    return await baseModel.execute(sql, [userId, productId]);
  };
  return {
    ...baseModel,
    findByUserId,                     
    findByUserAndProduct,             
    addToWishlist,                    
    removeFromWishlist,               
  };
};
module.exports = createWishlistModel;
