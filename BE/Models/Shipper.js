const createBaseModel = require('./BaseModel');
/**
 * Tạo Shipper Model với các methods mở rộng cho quản lý người giao hàng
 * Shipper là người vận chuyển, giao hàng cho khách hàng
 * 
 * @returns {Object} Shipper model object với các methods:
 * - Từ BaseModel: findAll, findById, create, update, delete, count, execute, rawQuery
 * - Riêng Shipper: findByName, findFirstByName
 */

const createShipperModel = () => {
  const baseModel = createBaseModel({
    tableName: 'shippers',
    primaryKey: 'shipper_id',
    columns: [
      'shipper_id',
      'name',
      'contact_info',
      'created_at',      
    ],
  });
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
    const sql = `SELECT * FROM \`${baseModel.tableName}\` WHERE \`name\` LIKE ?`;
    return baseModel.execute(sql, [`%${name}%`]);
  };
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
    const sql = `SELECT * FROM \`${baseModel.tableName}\` WHERE \`name\` LIKE ? LIMIT 1`;
    const rows = await baseModel.execute(sql, [`%${name}%`]);
    return Array.isArray(rows) ? rows[0] || null : rows;
  };
  return {
    ...baseModel,
    findByName,                       
    findFirstByName,                  
  };
};
module.exports = createShipperModel;
