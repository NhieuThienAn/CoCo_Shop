// ============================================
// IMPORT BASE MODEL
// ============================================
// Import factory function createBaseModel từ BaseModel.js
// BaseModel cung cấp các methods CRUD cơ bản (findAll, findById, create, update, delete, etc.)
const createBaseModel = require('./BaseModel');

// ============================================
// SHIPPER MODEL FACTORY FUNCTION
// ============================================
/**
 * Tạo Shipper Model với các methods mở rộng cho quản lý người giao hàng
 * Shipper là người vận chuyển, giao hàng cho khách hàng
 * 
 * @returns {Object} Shipper model object với các methods:
 * - Từ BaseModel: findAll, findById, create, update, delete, count, execute, rawQuery
 * - Riêng Shipper: findByName, findFirstByName
 */
const createShipperModel = () => {
  // ============================================
  // KHỞI TẠO BASE MODEL
  // ============================================
  // Tạo baseModel bằng cách gọi createBaseModel với cấu hình cho bảng shippers
  const baseModel = createBaseModel({
    // Tên bảng trong database
    tableName: 'shippers',
    
    // Primary key của bảng (cột shipper_id)
    primaryKey: 'shipper_id',
    
    // Danh sách tất cả các cột hợp lệ trong bảng shippers
    // Chỉ các cột trong danh sách này mới được phép insert/update (bảo mật)
    columns: [
      'shipper_id',      // ID tự tăng (primary key)
      'name',            // Tên người giao hàng (ví dụ: "Nguyễn Văn A", "Công ty vận chuyển XYZ")
      'contact_info',    // Thông tin liên hệ (có thể là JSON string chứa phone, email, address, etc.)
      'created_at',      // Thời gian tạo
    ],
  });

  // ============================================
  // FIND BY NAME FUNCTION: Tìm shipper theo tên (partial match)
  // ============================================
  /**
   * Tìm shipper theo tên (tìm kiếm partial match)
   * Sử dụng SQL LIKE với wildcard % để tìm kiếm
   * Trả về tất cả shippers có tên chứa chuỗi tìm kiếm
   * 
   * @param {string} name - Tên hoặc một phần tên của shipper cần tìm
   * @returns {Promise<Array>} Mảng các shipper objects khớp với tên
   * 
   * Ví dụ:
   * - name = "Nguyễn" => Tìm tất cả shipper có tên chứa "Nguyễn"
   * - Kết quả: [{ name: "Nguyễn Văn A", ... }, { name: "Nguyễn Thị B", ... }]
   * 
   * Lưu ý: Trả về tất cả kết quả khớp, không giới hạn số lượng
   */
  const findByName = async (name) => {
    // Xây dựng SQL query với LIKE và wildcard %
    // %name%: tìm name ở bất kỳ đâu trong cột name
    // Ví dụ: name = "Nguyễn" => tìm "%Nguyễn%" (tìm "Nguyễn Văn A", "Văn Nguyễn", etc.)
    const sql = `SELECT * FROM \`${baseModel.tableName}\` WHERE \`name\` LIKE ?`;
    
    // Thực thi query với pattern (thêm % ở đầu và cuối)
    // `%${name}%`: tạo pattern tìm kiếm partial match
    return baseModel.execute(sql, [`%${name}%`]);
  };

  // ============================================
  // FIND FIRST BY NAME FUNCTION: Tìm shipper đầu tiên theo tên
  // ============================================
  /**
   * Tìm shipper đầu tiên theo tên (partial match)
   * Tương tự findByName nhưng chỉ trả về 1 kết quả đầu tiên
   * Hữu ích khi chỉ cần 1 shipper và không quan tâm đến các shipper khác
   * 
   * @param {string} name - Tên hoặc một phần tên của shipper cần tìm
   * @returns {Promise<Object|null>} Shipper object đầu tiên khớp hoặc null
   * 
   * Ví dụ:
   * - name = "Nguyễn" => Tìm shipper đầu tiên có tên chứa "Nguyễn"
   * - Kết quả: { shipper_id: 1, name: "Nguyễn Văn A", ... } hoặc null
   * 
   * Performance: LIMIT 1 giúp database dừng tìm kiếm ngay khi tìm thấy kết quả đầu tiên
   */
  const findFirstByName = async (name) => {
    // Xây dựng SQL query với LIKE và LIMIT 1
    // LIMIT 1: chỉ lấy 1 kết quả đầu tiên (tối ưu performance)
    const sql = `SELECT * FROM \`${baseModel.tableName}\` WHERE \`name\` LIKE ? LIMIT 1`;
    
    // Thực thi query với pattern (thêm % ở đầu và cuối)
    const rows = await baseModel.execute(sql, [`%${name}%`]);
    
    // Trả về shipper đầu tiên nếu có, nếu không trả về null
    // Kiểm tra Array.isArray để đảm bảo rows là array trước khi truy cập [0]
    return Array.isArray(rows) ? rows[0] || null : rows;
  };

  // ============================================
  // RETURN SHIPPER MODEL OBJECT
  // ============================================
  // Trả về object chứa tất cả methods từ BaseModel và các methods riêng của Shipper
  // Spread operator (...) để copy tất cả methods từ baseModel
  // Sau đó thêm các methods riêng của Shipper
  return {
    ...baseModel,                    // Tất cả methods từ BaseModel (findAll, findById, create, update, delete, etc.)
    findByName,                       // Tìm shipper theo tên (trả về tất cả kết quả)
    findFirstByName,                  // Tìm shipper đầu tiên theo tên (chỉ 1 kết quả)
  };
};

// ============================================
// EXPORT MODULE
// ============================================
// Export factory function để các file khác có thể import và sử dụng
// Cách sử dụng: const createShipperModel = require('./Shipper');
//               const shipper = createShipperModel();
module.exports = createShipperModel;
