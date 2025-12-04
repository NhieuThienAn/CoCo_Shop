const createBaseModel = require('./BaseModel');
/**
 * Tạo Order Model với các methods mở rộng cho quản lý đơn hàng
 * Order Model kế thừa tất cả methods từ BaseModel và thêm các methods riêng
 * 
 * @returns {Object} Order model object với các methods:
 * - Từ BaseModel: findAll, findById, create, update, delete, count, execute, rawQuery
 * - Riêng Order: findByOrderNumber, findByUserId, findByStatusId, findByStatus,
 *   findByOrderNumberPattern, updateStatus, findAllWithCount
 */

const createOrderModel = () => {
  const baseModel = createBaseModel({
    tableName: 'orders',
    primaryKey: 'order_id',
    columns: [
      'order_id',
      'order_number',
      'user_id',
      'shipping_address_id',
      'billing_address_id',
      'status_id',
      'order_date',            
      'total_amount',
      'coupon_id',
      'discount_amount',
      'shipping_fee',          
      'tax_amount',            
      'currency',
      'processed_by',
      'notes',
      'status_history',
      'created_at',            
      'updated_at',            
    ],
  });
  /**
   * Tìm đơn hàng theo order_number (số đơn hàng)
   * order_number thường có format: "ORD-2025-001" hoặc "ORD-123456"
   * 
   * @param {string} orderNumber - Số đơn hàng cần tìm
   * @returns {Promise<Object|null>} Order object hoặc null nếu không tìm thấy
   * 
   * Ví dụ:
   * - orderNumber = "ORD-2025-001" => Tìm đơn hàng có số đơn này
   */

  const findByOrderNumber = async (orderNumber) => {
    const sql = `SELECT * FROM \`${baseModel.tableName}\` WHERE \`order_number\` = ? LIMIT 1`;
    const rows = await baseModel.execute(sql, [orderNumber]);
    return Array.isArray(rows) ? rows[0] || null : rows;
  };
  /**
   * Tìm tất cả đơn hàng của một người dùng cụ thể
   * Sắp xếp theo thời gian tạo (mới nhất trước)
   * Hỗ trợ pagination
   * 
   * @param {number} userId - ID của người dùng
   * @param {Object} options - Tùy chọn pagination
   * @param {number} options.limit - Số lượng records tối đa
   * @param {number} options.offset - Số lượng records bỏ qua
   * @returns {Promise<Array>} Mảng các đơn hàng của user
   * 
   * Ví dụ:
   * - userId = 1 => Tìm tất cả đơn hàng của user có ID = 1
   * - Kết quả sắp xếp: đơn hàng mới nhất trước
   */

  const findByUserId = async (userId, options = {}) => {
    const { limit, offset } = options;
    let sql = `SELECT * FROM \`${baseModel.tableName}\` WHERE \`user_id\` = ? ORDER BY \`created_at\` DESC`;
    if (limit) {
      sql += ` LIMIT ${parseInt(limit)}`;
      if (offset) {
        sql += ` OFFSET ${parseInt(offset)}`;
      }
    }
    return await baseModel.execute(sql, [userId]);
  };
  /**
   * Tìm tất cả đơn hàng có cùng trạng thái
   * Hữu ích để lấy danh sách đơn hàng cần xử lý (ví dụ: status_id = 3 = "Đang giao hàng")
   * Sắp xếp theo thời gian tạo (mới nhất trước)
   * Hỗ trợ pagination
   * 
   * @param {number} statusId - ID của trạng thái đơn hàng
   * @param {Object} options - Tùy chọn pagination
   * @param {number} options.limit - Số lượng records tối đa
   * @param {number} options.offset - Số lượng records bỏ qua
   * @returns {Promise<Array>} Mảng các đơn hàng có cùng trạng thái
   * 
   * Ví dụ:
   * - statusId = 3 => Tìm tất cả đơn hàng đang giao hàng
   * - statusId = 1 => Tìm tất cả đơn hàng chờ xác nhận
   */

  const findByStatusId = async (statusId, options = {}) => {
    const { limit, offset } = options;
    let sql = `SELECT * FROM \`${baseModel.tableName}\` WHERE \`status_id\` = ? ORDER BY \`created_at\` DESC`;
    if (limit) {
      sql += ` LIMIT ${parseInt(limit)}`;
      if (offset) {
        sql += ` OFFSET ${parseInt(offset)}`;
      }
    }
    return await baseModel.execute(sql, [statusId]);
  };
  /**
   * Cập nhật trạng thái đơn hàng và ghi lại lịch sử thay đổi
   * Tự động cập nhật updated_at và lưu vào status_history
   * 
   * @param {number} orderId - ID của đơn hàng
   * @param {number} statusId - ID trạng thái mới
   * @param {number|null} processedBy - ID người xử lý (admin/shipper, tùy chọn)
   * @returns {Promise<Object>} Kết quả update
   * 
   * Ví dụ:
   * - orderId = 1, statusId = 3, processedBy = 2
   *   => Cập nhật đơn hàng 1 sang trạng thái "Đang giao hàng" bởi shipper ID 2
   *   => Ghi lại vào status_history: [{ status_id: 3, changed_at: "...", changed_by: 2 }]
   */

  const updateStatus = async (orderId, statusId, processedBy = null) => {
    const updateData = {
      status_id: statusId,              
      updated_at: new Date(),           
    };
    if (processedBy) {
      updateData.processed_by = processedBy;
    }
    const orderData = await baseModel.findById(orderId);
    if (orderData) {
      let statusHistory = [];
      try {
        if (orderData.status_history) {
          statusHistory = typeof orderData.status_history === 'string' 
            ? JSON.parse(orderData.status_history)  
            : orderData.status_history;              
        }
      } catch (e) {
        statusHistory = [];
      }
      statusHistory.push({
        status_id: statusId,                    
        changed_at: new Date().toISOString(),
        changed_by: processedBy || null,
      });
      updateData.status_history = JSON.stringify(statusHistory);
    }
    return baseModel.update(orderId, updateData);
  };
  /**
   * Alias (bí danh) của findByStatusId
   * Cho phép gọi bằng tên ngắn gọn hơn: findByStatus thay vì findByStatusId
   * 
   * @param {number} statusId - ID của trạng thái
   * @param {Object} options - Tùy chọn pagination
   * @returns {Promise<Array>} Mảng các đơn hàng
   */

  const findByStatus = findByStatusId;
  /**
   * Tìm đơn hàng theo pattern trong order_number (partial match)
   * Sử dụng SQL LIKE với wildcard % để tìm kiếm
   * Trả về đơn hàng đầu tiên khớp với pattern
   * 
   * @param {string} pattern - Pattern cần tìm (ví dụ: "2025", "ORD-001")
   * @param {number} limit - Số lượng kết quả tối đa (mặc định: 10)
   * @returns {Promise<Object|null>} Order object đầu tiên khớp hoặc null
   * 
   * Ví dụ:
   * - pattern = "2025" => Tìm order_number có chứa "2025" (ví dụ: "ORD-2025-001")
   * - pattern = "001" => Tìm order_number có chứa "001"
   * 
   * Lưu ý: Chỉ trả về đơn hàng đầu tiên (LIMIT 1), sắp xếp theo created_at DESC
   */

  const findByOrderNumberPattern = async (pattern, limit = 10) => {
    const sql = `SELECT * FROM \`${baseModel.tableName}\` WHERE \`order_number\` LIKE ? ORDER BY \`created_at\` DESC LIMIT ?`;
    const rows = await baseModel.execute(sql, [`%${pattern}%`, limit]);
    return Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
  };
  /**
   * Lấy tất cả đơn hàng với pagination và total count trong 1 query duy nhất
   * Sử dụng window function COUNT(*) OVER() để lấy total count
   * Tối ưu hơn so với 2 queries riêng (findAll + count)
   * 
   * @param {Object} options - Tùy chọn
   * @param {Object} options.filters - Filters cho WHERE clause
   * @param {number} options.limit - Số lượng records tối đa
   * @param {number} options.offset - Số lượng records bỏ qua
   * @param {string} options.orderBy - Câu lệnh ORDER BY
   * @returns {Promise<Object>} { data: Array, total: number }
   * 
   * Performance: 1 query thay vì 2 queries (findAll + count)
   */

  const findAllWithCount = async ({ filters = {}, limit, offset, orderBy } = {}) => {
    const columnSet = new Set(baseModel.columns);
    const filterKeys = Object.keys(filters).filter((key) => columnSet.has(key));
    const fragments = [];
    const values = [];
    filterKeys.forEach((key) => {
      const rawValue = filters[key];
      if (rawValue && typeof rawValue === 'object' && rawValue.hasOwnProperty('value')) {
        const operator = rawValue.operator || '=';
        fragments.push(`\`${key}\` ${operator} ?`);
        values.push(rawValue.value);
      } 
      else if (rawValue === null || rawValue === 'null' || rawValue === 'NULL') {
        fragments.push(`\`${key}\` IS NULL`);
      } 
      else {
        fragments.push(`\`${key}\` = ?`);
        values.push(rawValue);
      }
    });
    const whereClause = fragments.length > 0 ? `WHERE ${fragments.join(' AND ')}` : '';
    const orderByClause = orderBy ? `ORDER BY ${orderBy}` : 'ORDER BY created_at DESC';
    const sql = `
      SELECT 
        *,
        COUNT(*) OVER() as total_count
      FROM \`${baseModel.tableName}\`
      ${whereClause}
      ${orderByClause}
      ${typeof limit === 'number' ? `LIMIT ${limit}` : ''}
      ${typeof offset === 'number' ? `OFFSET ${offset}` : ''}
    `;
    const rows = await baseModel.execute(sql, values);
    const total = rows && rows.length > 0 ? parseInt(rows[0].total_count || 0) : 0;
    const data = (rows || []).map(row => {
      const { total_count, ...rest } = row;
      return rest;                           
    });
    return { data, total };
  };
  return {
    ...baseModel,
    findByOrderNumber,                
    findByUserId,                     
    findByStatusId,                   
    findByStatus,                     
    findByOrderNumberPattern,         
    updateStatus,                     
    findAllWithCount,                 
  };
};
module.exports = createOrderModel;
