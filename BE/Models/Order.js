// ============================================
// IMPORT BASE MODEL
// ============================================
// Import factory function createBaseModel từ BaseModel.js
// BaseModel cung cấp các methods CRUD cơ bản
const createBaseModel = require('./BaseModel');

// ============================================
// ORDER MODEL FACTORY FUNCTION
// ============================================
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
  // ============================================
  // KHỞI TẠO BASE MODEL
  // ============================================
  // Tạo baseModel bằng cách gọi createBaseModel với cấu hình cho bảng orders
  const baseModel = createBaseModel({
    // Tên bảng trong database
    tableName: 'orders',
    
    // Primary key của bảng (cột order_id)
    primaryKey: 'order_id',
    
    // Danh sách tất cả các cột hợp lệ trong bảng orders
    // Chỉ các cột trong danh sách này mới được phép insert/update (bảo mật)
    columns: [
      'order_id',              // ID tự tăng (primary key)
      'order_number',          // Số đơn hàng duy nhất (ví dụ: "ORD-2025-001")
      'user_id',               // ID người dùng đặt hàng (foreign key -> users)
      'shipping_address_id',  // ID địa chỉ giao hàng (foreign key -> addresses)
      'billing_address_id',    // ID địa chỉ thanh toán (foreign key -> addresses)
      'status_id',             // ID trạng thái đơn hàng (foreign key -> orderstatus)
      'order_date',            // Ngày đặt hàng
      'total_amount',          // Tổng tiền đơn hàng (sau khi trừ discount, cộng shipping, tax)
      'coupon_id',             // ID mã giảm giá đã áp dụng (foreign key -> coupons, nullable)
      'discount_amount',       // Số tiền được giảm (từ coupon)
      'shipping_fee',          // Phí vận chuyển
      'tax_amount',            // Thuế VAT
      'currency',              // Loại tiền tệ (ví dụ: "VND", "USD")
      'processed_by',          // ID người xử lý đơn hàng (admin/shipper, nullable)
      'notes',                 // Ghi chú đơn hàng (từ khách hàng hoặc admin)
      'status_history',        // Lịch sử thay đổi trạng thái (JSON string)
      'created_at',            // Thời gian tạo
      'updated_at',            // Thời gian cập nhật
    ],
  });

  // ============================================
  // FIND BY ORDER NUMBER FUNCTION: Tìm đơn hàng theo số đơn
  // ============================================
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
    // Xây dựng SQL query để tìm đơn hàng theo order_number
    // Sử dụng prepared statement (?) để tránh SQL injection
    // LIMIT 1 để chỉ lấy 1 kết quả (order_number phải unique)
    const sql = `SELECT * FROM \`${baseModel.tableName}\` WHERE \`order_number\` = ? LIMIT 1`;
    
    // Thực thi query với orderNumber làm parameter
    const rows = await baseModel.execute(sql, [orderNumber]);
    
    // Trả về order đầu tiên nếu có, nếu không trả về null
    return Array.isArray(rows) ? rows[0] || null : rows;
  };

  // ============================================
  // FIND BY USER ID FUNCTION: Tìm đơn hàng theo người dùng
  // ============================================
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
    // Destructure options để lấy limit và offset
    const { limit, offset } = options;
    
    // Bắt đầu xây dựng SQL query
    // ORDER BY created_at DESC: sắp xếp đơn hàng mới nhất trước
    let sql = `SELECT * FROM \`${baseModel.tableName}\` WHERE \`user_id\` = ? ORDER BY \`created_at\` DESC`;
    
    // Nếu có limit, thêm LIMIT vào query
    if (limit) {
      // Parse limit sang integer để tránh SQL injection
      sql += ` LIMIT ${parseInt(limit)}`;
      
      // Nếu có offset, thêm OFFSET vào query (chỉ khi có limit)
      if (offset) {
        // Parse offset sang integer
        sql += ` OFFSET ${parseInt(offset)}`;
      }
    }
    
    // Thực thi query với userId làm parameter
    return await baseModel.execute(sql, [userId]);
  };

  // ============================================
  // FIND BY STATUS ID FUNCTION: Tìm đơn hàng theo trạng thái
  // ============================================
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
    // Destructure options để lấy limit và offset
    const { limit, offset } = options;
    
    // Bắt đầu xây dựng SQL query
    // ORDER BY created_at DESC: sắp xếp đơn hàng mới nhất trước
    let sql = `SELECT * FROM \`${baseModel.tableName}\` WHERE \`status_id\` = ? ORDER BY \`created_at\` DESC`;
    
    // Nếu có limit, thêm LIMIT vào query
    if (limit) {
      // Parse limit sang integer
      sql += ` LIMIT ${parseInt(limit)}`;
      
      // Nếu có offset, thêm OFFSET vào query
      if (offset) {
        // Parse offset sang integer
        sql += ` OFFSET ${parseInt(offset)}`;
      }
    }
    
    // Thực thi query với statusId làm parameter
    return await baseModel.execute(sql, [statusId]);
  };

  // ============================================
  // UPDATE STATUS FUNCTION: Cập nhật trạng thái đơn hàng
  // ============================================
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
    // ============================================
    // BƯỚC 1: Tạo object chứa dữ liệu cần update
    // ============================================
    const updateData = {
      status_id: statusId,              // Trạng thái mới
      updated_at: new Date(),           // Cập nhật thời gian update
    };
    
    // Nếu có người xử lý, thêm vào updateData
    if (processedBy) {
      updateData.processed_by = processedBy;
    }
    
    // ============================================
    // BƯỚC 2: Lấy thông tin đơn hàng hiện tại để lấy status_history
    // ============================================
    const orderData = await baseModel.findById(orderId);
    
    // Nếu tìm thấy đơn hàng
    if (orderData) {
      // Khởi tạo mảng statusHistory
      let statusHistory = [];
      
      // ============================================
      // BƯỚC 3: Parse status_history từ database
      // ============================================
      try {
        // Nếu có status_history
        if (orderData.status_history) {
          // Kiểm tra kiểu dữ liệu: string (JSON) hoặc đã là array
          statusHistory = typeof orderData.status_history === 'string' 
            ? JSON.parse(orderData.status_history)  // Parse JSON string thành array
            : orderData.status_history;              // Đã là array, dùng trực tiếp
        }
      } catch (e) {
        // Nếu parse fail (JSON không hợp lệ), khởi tạo mảng rỗng
        statusHistory = [];
      }
      
      // ============================================
      // BƯỚC 4: Thêm entry mới vào status_history
      // ============================================
      // Push entry mới chứa thông tin thay đổi trạng thái
      statusHistory.push({
        status_id: statusId,                    // Trạng thái mới
        changed_at: new Date().toISOString(),   // Thời gian thay đổi (ISO format)
        changed_by: processedBy || null,        // Người thay đổi (có thể null)
      });
      
      // ============================================
      // BƯỚC 5: Serialize status_history và thêm vào updateData
      // ============================================
      // Convert array thành JSON string để lưu vào database
      updateData.status_history = JSON.stringify(statusHistory);
    }
    
    // ============================================
    // BƯỚC 6: Cập nhật đơn hàng với dữ liệu mới
    // ============================================
    // Thực thi UPDATE query
    return baseModel.update(orderId, updateData);
  };

  // ============================================
  // FIND BY STATUS ALIAS: Alias cho findByStatusId
  // ============================================
  /**
   * Alias (bí danh) của findByStatusId
   * Cho phép gọi bằng tên ngắn gọn hơn: findByStatus thay vì findByStatusId
   * 
   * @param {number} statusId - ID của trạng thái
   * @param {Object} options - Tùy chọn pagination
   * @returns {Promise<Array>} Mảng các đơn hàng
   */
  const findByStatus = findByStatusId;

  // ============================================
  // FIND BY ORDER NUMBER PATTERN FUNCTION: Tìm đơn hàng theo pattern
  // ============================================
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
    // Xây dựng SQL query với LIKE và wildcard %
    // %pattern%: tìm pattern ở bất kỳ đâu trong order_number
    // ORDER BY created_at DESC: đơn hàng mới nhất trước
    // LIMIT ?: giới hạn số lượng kết quả
    const sql = `SELECT * FROM \`${baseModel.tableName}\` WHERE \`order_number\` LIKE ? ORDER BY \`created_at\` DESC LIMIT ?`;
    
    // Thực thi query với pattern (thêm % ở đầu và cuối) và limit
    const rows = await baseModel.execute(sql, [`%${pattern}%`, limit]);
    
    // Trả về đơn hàng đầu tiên nếu có, nếu không trả về null
    return Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
  };

  // ============================================
  // FIND ALL WITH COUNT FUNCTION: Lấy tất cả với pagination và total count
  // ============================================
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
    // ============================================
    // BƯỚC 1: Xây dựng WHERE clause (giống logic BaseModel.buildWhereClause)
    // ============================================
    // Tạo Set từ columns để kiểm tra key hợp lệ nhanh (O(1) lookup)
    const columnSet = new Set(baseModel.columns);
    
    // Lọc các keys hợp lệ từ filters (chỉ giữ keys có trong columnSet)
    const filterKeys = Object.keys(filters).filter((key) => columnSet.has(key));
    
    // Mảng chứa các fragment của WHERE clause
    const fragments = [];
    
    // Mảng chứa các giá trị để bind vào prepared statement
    const values = [];
    
    // Duyệt qua từng key hợp lệ để xây dựng WHERE clause
    filterKeys.forEach((key) => {
      const rawValue = filters[key];
      
      // CASE 1: Filter với operator tùy chỉnh (>, <, >=, <=, LIKE, etc.)
      // Ví dụ: { total_amount: { operator: '>', value: 1000000 } }
      if (rawValue && typeof rawValue === 'object' && rawValue.hasOwnProperty('value')) {
        const operator = rawValue.operator || '=';
        fragments.push(`\`${key}\` ${operator} ?`);
        values.push(rawValue.value);
      } 
      // CASE 2: Filter với NULL value
      else if (rawValue === null || rawValue === 'null' || rawValue === 'NULL') {
        fragments.push(`\`${key}\` IS NULL`);
      } 
      // CASE 3: Filter với giá trị thông thường (=)
      else {
        fragments.push(`\`${key}\` = ?`);
        values.push(rawValue);
      }
    });
    
    // Nối các fragments bằng ' AND ' để tạo WHERE clause
    const whereClause = fragments.length > 0 ? `WHERE ${fragments.join(' AND ')}` : '';
    
    // Tạo ORDER BY clause, mặc định sắp xếp theo created_at DESC (mới nhất trước)
    const orderByClause = orderBy ? `ORDER BY ${orderBy}` : 'ORDER BY created_at DESC';
    
    // ============================================
    // BƯỚC 2: Xây dựng SQL query với window function
    // ============================================
    // Sử dụng window function COUNT(*) OVER() để lấy total count trong cùng 1 query
    // COUNT(*) OVER() đếm tổng số rows phù hợp với WHERE clause (trước khi LIMIT)
    // Mỗi row sẽ có thêm cột total_count với cùng giá trị
    // Build SQL query với window function COUNT(*) OVER() để lấy data và total count trong 1 query
    // Lấy tất cả cột của orders và thêm cột total_count (tổng số rows)
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
    
    // Thực thi query
    const rows = await baseModel.execute(sql, values);
    
    // ============================================
    // BƯỚC 3: Extract total count từ kết quả
    // ============================================
    // Lấy total từ row đầu tiên (tất cả rows đều có cùng total_count)
    // Parse sang integer, mặc định 0 nếu không có
    const total = rows && rows.length > 0 ? parseInt(rows[0].total_count || 0) : 0;
    
    // ============================================
    // BƯỚC 4: Loại bỏ total_count khỏi mỗi row
    // ============================================
    // Map qua từng row và loại bỏ cột total_count (không cần thiết trong data)
    // Sử dụng destructuring: { total_count, ...rest } để tách total_count ra
    const data = (rows || []).map(row => {
      const { total_count, ...rest } = row;  // Tách total_count ra, giữ lại các cột khác
      return rest;                           // Trả về object không có total_count
    });
    
    // Trả về object chứa data và total
    return { data, total };
  };

  // ============================================
  // RETURN ORDER MODEL OBJECT
  // ============================================
  // Trả về object chứa tất cả methods từ BaseModel và các methods riêng của Order
  // Spread operator (...) để copy tất cả methods từ baseModel
  return {
    ...baseModel,                    // Tất cả methods từ BaseModel (findAll, findById, create, update, delete, etc.)
    findByOrderNumber,                // Tìm theo order_number
    findByUserId,                     // Tìm theo user_id
    findByStatusId,                   // Tìm theo status_id
    findByStatus,                     // Alias của findByStatusId
    findByOrderNumberPattern,         // Tìm theo pattern trong order_number
    updateStatus,                     // Cập nhật trạng thái (có lưu history)
    findAllWithCount,                 // Lấy tất cả với pagination và total count
  };
};

// ============================================
// EXPORT MODULE
// ============================================
// Export factory function để các file khác có thể import và sử dụng
// Cách sử dụng: const createOrderModel = require('./Order');
//               const order = createOrderModel();
module.exports = createOrderModel;