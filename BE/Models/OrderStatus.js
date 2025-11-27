// ============================================
// IMPORT BASE MODEL
// ============================================
// Import factory function createBaseModel từ BaseModel.js
const createBaseModel = require('./BaseModel');

// ============================================
// ORDER STATUS MODEL FACTORY FUNCTION
// ============================================
/**
 * Tạo OrderStatus Model với các methods mở rộng cho quản lý trạng thái đơn hàng
 * OrderStatus là các trạng thái có thể có của đơn hàng (PENDING, CONFIRMED, SHIPPING, etc.)
 * 
 * @returns {Object} OrderStatus model object với các methods:
 * - Từ BaseModel: findAll, findById, create, update, delete, count, execute, rawQuery
 * - Riêng OrderStatus: findByName, findAllOrdered, findByNames, findByIds,
 *   findAllWithCount, ensureOrderStatuses
 */
const createOrderStatusModel = () => {
  // ============================================
  // KHỞI TẠO BASE MODEL
  // ============================================
  // Tạo baseModel với cấu hình cho bảng orderstatus
  const baseModel = createBaseModel({
    // Tên bảng trong database
    tableName: 'orderstatus',
    
    // Primary key của bảng
    primaryKey: 'status_id',
    
    // Danh sách tất cả các cột hợp lệ trong bảng orderstatus
    columns: [
      'status_id',      // ID tự tăng (primary key)
      'status_name',    // Tên trạng thái (ví dụ: "Chờ xác nhận", "Đã xác nhận")
      'sort_order',     // Thứ tự sắp xếp (để hiển thị theo thứ tự logic)
    ],
  });

  // ============================================
  // FIND BY NAME FUNCTION: Tìm trạng thái theo tên
  // ============================================
  /**
   * Tìm trạng thái đơn hàng theo tên
   * 
   * @param {string} name - Tên trạng thái (ví dụ: "Chờ xác nhận", "Đã xác nhận")
   * @returns {Promise<Object|null>} OrderStatus object hoặc null nếu không tìm thấy
   * 
   * Ví dụ:
   * - name = "Chờ xác nhận" => Tìm status có tên này
   * - Kết quả: { status_id: 1, status_name: "Chờ xác nhận", sort_order: 1 }
   */
  const findByName = async (name) => {
    // Xây dựng SQL query để tìm trạng thái theo tên
    // LIMIT 1 vì status_name phải unique
    const sql = `SELECT * FROM \`${baseModel.tableName}\` WHERE \`status_name\` = ? LIMIT 1`;
    
    // Thực thi query với name làm parameter
    const rows = await baseModel.execute(sql, [name]);
    
    // Trả về status đầu tiên nếu có, nếu không trả về null
    return Array.isArray(rows) ? rows[0] || null : rows;
  };

  // ============================================
  // FIND ALL ORDERED FUNCTION: Lấy tất cả trạng thái đã sắp xếp
  // ============================================
  /**
   * Lấy tất cả trạng thái đơn hàng đã được sắp xếp theo sort_order
   * Hữu ích để hiển thị dropdown, select box với thứ tự logic
   * 
   * @returns {Promise<Array>} Mảng tất cả order statuses đã sắp xếp
   * 
   * Thứ tự sắp xếp:
   * - sort_order ASC: Sắp xếp theo thứ tự logic (1, 2, 3, ...)
   * - status_id ASC: Nếu sort_order bằng nhau, sắp xếp theo ID
   * 
   * Ví dụ kết quả:
   * [
   *   { status_id: 1, status_name: "Chờ xác nhận", sort_order: 1 },
   *   { status_id: 2, status_name: "Đã xác nhận", sort_order: 2 },
   *   { status_id: 3, status_name: "Đang giao hàng", sort_order: 3 },
   *   ...
   * ]
   */
  const findAllOrdered = async () => {
    // Xây dựng SQL query để lấy tất cả statuses đã sắp xếp
    // ORDER BY sort_order ASC: sắp xếp theo thứ tự logic
    // ORDER BY status_id ASC: nếu sort_order bằng nhau, sắp xếp theo ID
    const sql = `SELECT * FROM \`${baseModel.tableName}\` ORDER BY \`sort_order\` ASC, \`status_id\` ASC`;
    
    // Thực thi query (không có parameters)
    return await baseModel.execute(sql);
  };

  // ============================================
  // BATCH FIND BY NAMES FUNCTION: Tìm nhiều trạng thái theo tên
  // ============================================
  /**
   * Tìm nhiều trạng thái cùng lúc theo tên bằng SQL WHERE IN
   * Thay vì thực hiện N queries riêng lẻ, chỉ thực hiện 1 query duy nhất
   * 
   * @param {Array<string>} names - Mảng các tên trạng thái cần tìm
   * @returns {Promise<Array>} Mảng các order statuses khớp với names
   * 
   * Ví dụ:
   * - names = ["Chờ xác nhận", "Đã xác nhận", "Đang giao hàng"]
   * - Kết quả: [status1, status2, status3]
   * 
   * Performance: O(1) query thay vì O(N) queries
   */
  const findByNames = async (names) => {
    // Kiểm tra input có phải array và có phần tử không
    if (!Array.isArray(names) || names.length === 0) {
      return [];
    }
    
    // Tạo placeholders cho SQL WHERE IN clause
    const placeholders = names.map(() => '?').join(',');
    
    // Xây dựng SQL query với WHERE IN
    // ORDER BY để đảm bảo thứ tự kết quả
    const sql = `SELECT * FROM \`${baseModel.tableName}\` WHERE \`status_name\` IN (${placeholders}) ORDER BY \`sort_order\` ASC, \`status_id\` ASC`;
    
    // Thực thi query với mảng names làm parameters
    return await baseModel.execute(sql, names);
  };

  // ============================================
  // BATCH FIND BY IDS FUNCTION: Tìm nhiều trạng thái theo ID
  // ============================================
  /**
   * Tìm nhiều trạng thái cùng lúc theo status_id bằng SQL WHERE IN
   * 
   * @param {Array<number>} statusIds - Mảng các status_id cần tìm
   * @returns {Promise<Array>} Mảng các order statuses khớp với statusIds
   * 
   * Ví dụ:
   * - statusIds = [1, 2, 3] => Tìm status có ID 1, 2, 3
   * 
   * Performance: O(1) query thay vì O(N) queries
   */
  const findByIds = async (statusIds) => {
    // Kiểm tra input có phải array và có phần tử không
    if (!Array.isArray(statusIds) || statusIds.length === 0) {
      return [];
    }
    
    // Tạo placeholders cho SQL WHERE IN clause
    const placeholders = statusIds.map(() => '?').join(',');
    
    // Xây dựng SQL query với WHERE IN
    const sql = `SELECT * FROM \`${baseModel.tableName}\` WHERE \`status_id\` IN (${placeholders}) ORDER BY \`sort_order\` ASC, \`status_id\` ASC`;
    
    // Thực thi query với mảng statusIds làm parameters
    return await baseModel.execute(sql, statusIds);
  };

  // ============================================
  // FIND ALL WITH COUNT FUNCTION: Lấy tất cả với pagination và total count
  // ============================================
  /**
   * Lấy tất cả order statuses với pagination và total count trong 1 query duy nhất
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
    // Tạo Set từ columns để kiểm tra key hợp lệ nhanh
    const columnSet = new Set(baseModel.columns);
    
    // Lọc các keys hợp lệ từ filters
    const filterKeys = Object.keys(filters).filter((key) => columnSet.has(key));
    
    // Mảng chứa các fragment của WHERE clause
    const fragments = [];
    
    // Mảng chứa các giá trị để bind vào prepared statement
    const values = [];
    
    // Duyệt qua từng key hợp lệ để xây dựng WHERE clause
    filterKeys.forEach((key) => {
      const rawValue = filters[key];
      
      // CASE 1: Filter với operator tùy chỉnh
      if (rawValue && typeof rawValue === 'object' && rawValue.hasOwnProperty('value')) {
        const operator = rawValue.operator || '=';
        fragments.push(`\`${key}\` ${operator} ?`);
        values.push(rawValue.value);
      } 
      // CASE 2: Filter với NULL value
      else if (rawValue === null || rawValue === 'null' || rawValue === 'NULL') {
        fragments.push(`\`${key}\` IS NULL`);
      } 
      // CASE 3: Filter với giá trị thông thường
      else {
        fragments.push(`\`${key}\` = ?`);
        values.push(rawValue);
      }
    });
    
    // Nối các fragments thành WHERE clause
    const whereClause = fragments.length > 0 ? `WHERE ${fragments.join(' AND ')}` : '';
    
    // Tạo ORDER BY clause, mặc định sắp xếp theo sort_order
    const orderByClause = orderBy ? `ORDER BY ${orderBy}` : 'ORDER BY sort_order ASC, status_id ASC';
    
    // ============================================
    // BƯỚC 2: Xây dựng SQL query với window function
    // ============================================
    // Sử dụng window function COUNT(*) OVER() để lấy total count
    const sql = `
      SELECT 
        *,                                    // Lấy tất cả cột
        COUNT(*) OVER() as total_count        // Thêm cột total_count
      FROM \`${baseModel.tableName}\`
      ${whereClause}                          // WHERE clause (nếu có)
      ${orderByClause}                        // ORDER BY clause
      ${typeof limit === 'number' ? `LIMIT ${limit}` : ''}      // LIMIT (nếu có)
      ${typeof offset === 'number' ? `OFFSET ${offset}` : ''}   // OFFSET (nếu có)
    `;
    
    // Thực thi query
    const rows = await baseModel.execute(sql, values);
    
    // ============================================
    // BƯỚC 3: Extract total count từ kết quả
    // ============================================
    // Lấy total từ row đầu tiên (tất cả rows đều có cùng total_count)
    const total = rows && rows.length > 0 ? parseInt(rows[0].total_count || 0) : 0;
    
    // ============================================
    // BƯỚC 4: Loại bỏ total_count khỏi mỗi row
    // ============================================
    // Map qua từng row và loại bỏ cột total_count
    const data = (rows || []).map(row => {
      const { total_count, ...rest } = row;  // Tách total_count ra
      return rest;                           // Trả về object không có total_count
    });
    
    // Trả về object chứa data và total
    return { data, total };
  };

  // ============================================
  // ENSURE ORDER STATUSES FUNCTION: Đảm bảo các trạng thái tồn tại
  // ============================================
  /**
   * Đảm bảo các order status được insert vào database
   * Chạy khi server khởi động để đảm bảo database có đầy đủ status
   * Sử dụng batch INSERT với VALUES multiple rows (single SQL query)
   * Sử dụng ON DUPLICATE KEY UPDATE để tránh lỗi nếu status đã tồn tại
   * 
   * @returns {Promise<void>} Không trả về giá trị
   * 
   * Các trạng thái được đảm bảo:
   * 1. Chờ xác nhận (PENDING)
   * 2. Đã xác nhận (CONFIRMED)
   * 3. Đang giao hàng (SHIPPING)
   * 4. Đã giao hàng (DELIVERED)
   * 5. Đã hủy (CANCELLED)
   * 6. Trả hàng (RETURNED)
   * 8. Hoàn thành (COMPLETED) - Lưu ý: status_id = 8, không phải 7
   * 
   * Performance: 1 query batch INSERT thay vì N queries riêng lẻ
   */
  const ensureOrderStatuses = async () => {
    try {
      // ============================================
      // BƯỚC 1: Định nghĩa danh sách các trạng thái cần đảm bảo
      // ============================================
      // Mảng chứa các order statuses mặc định của hệ thống
      const statuses = [
        { status_id: 1, status_name: 'Chờ xác nhận', sort_order: 1 },      // PENDING
        { status_id: 2, status_name: 'Đã xác nhận', sort_order: 2 },       // CONFIRMED
        { status_id: 3, status_name: 'Đang giao hàng', sort_order: 3 },   // SHIPPING
        { status_id: 4, status_name: 'Đã giao hàng', sort_order: 4 },     // DELIVERED
        { status_id: 5, status_name: 'Đã hủy', sort_order: 5 },           // CANCELLED
        { status_id: 6, status_name: 'Trả hàng', sort_order: 6 },         // RETURNED
        { status_id: 8, status_name: 'Hoàn thành', sort_order: 7 },        // COMPLETED (Lưu ý: ID = 8, không phải 7)
      ];

      // ============================================
      // BƯỚC 2: Xây dựng batch INSERT query
      // ============================================
      // Tạo placeholders cho VALUES clause
      // Ví dụ: statuses có 7 items => values = "(?, ?, ?), (?, ?, ?), ..." (7 lần)
      const values = statuses.map(() => '(?, ?, ?)').join(', ');
      
      // Tạo mảng parameters từ statuses
      // flatMap: chuyển mảng 2D thành 1D
      // Ví dụ: [{id:1, name:'A', order:1}, {id:2, name:'B', order:2}]
      // => [1, 'A', 1, 2, 'B', 2]
      const params = statuses.flatMap(s => [s.status_id, s.status_name, s.sort_order]);
      
      // ============================================
      // BƯỚC 3: Xây dựng SQL INSERT với ON DUPLICATE KEY UPDATE
      // ============================================
      // ON DUPLICATE KEY UPDATE: Nếu status_id đã tồn tại (duplicate key),
      // thì update status_name và sort_order thay vì throw error
      // Điều này cho phép chạy nhiều lần mà không bị lỗi
      const sql = `
        INSERT INTO \`${baseModel.tableName}\` (\`status_id\`, \`status_name\`, \`sort_order\`)
        VALUES ${values}
        ON DUPLICATE KEY UPDATE
          \`status_name\` = VALUES(\`status_name\`),    // Update status_name nếu duplicate
          \`sort_order\` = VALUES(\`sort_order\`)       // Update sort_order nếu duplicate
      `;
      
      // ============================================
      // BƯỚC 4: Thực thi batch INSERT
      // ============================================
      // Thực thi query với params (mảng các giá trị)
      await baseModel.execute(sql, params);
      
      // Log thành công
      console.log('[OrderStatus] ✅ All order statuses ensured in database using batch INSERT');
    } catch (error) {
      // Nếu có lỗi, log để debug
      console.error('[OrderStatus] ❌ Error ensuring order statuses:', error);
    }
  };

  // ============================================
  // RETURN ORDER STATUS MODEL OBJECT
  // ============================================
  // Trả về object chứa tất cả methods từ BaseModel và các methods riêng của OrderStatus
  // Spread operator (...) để copy tất cả methods từ baseModel
  return {
    ...baseModel,                    // Tất cả methods từ BaseModel (findAll, findById, create, update, delete, etc.)
    findByName,                       // Tìm theo tên
    findAllOrdered,                   // Lấy tất cả đã sắp xếp
    findByNames,                      // Tìm nhiều statuses theo tên (batch)
    findByIds,                        // Tìm nhiều statuses theo ID (batch)
    findAllWithCount,                 // Lấy tất cả với pagination và total count
    ensureOrderStatuses,             // Đảm bảo các statuses tồn tại trong database
  };
};

// ============================================
// EXPORT MODULE
// ============================================
// Export factory function để các file khác có thể import và sử dụng
// Cách sử dụng: const createOrderStatusModel = require('./OrderStatus');
//               const orderStatus = createOrderStatusModel();
module.exports = createOrderStatusModel;
