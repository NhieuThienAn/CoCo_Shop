const createBaseModel = require('./BaseModel');
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
  const baseModel = createBaseModel({
    tableName: 'orderstatus',
    primaryKey: 'status_id',
    columns: [
      'status_id',
      'status_name',
      'sort_order',
    ],
  });
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
    const sql = `SELECT * FROM \`${baseModel.tableName}\` WHERE \`status_name\` = ? LIMIT 1`;
    const rows = await baseModel.execute(sql, [name]);
    return Array.isArray(rows) ? rows[0] || null : rows;
  };
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
    const sql = `SELECT * FROM \`${baseModel.tableName}\` ORDER BY \`sort_order\` ASC, \`status_id\` ASC`;
    return await baseModel.execute(sql);
  };
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
    if (!Array.isArray(names) || names.length === 0) {
      return [];
    }
    const placeholders = names.map(() => '?').join(',');
    const sql = `SELECT * FROM \`${baseModel.tableName}\` WHERE \`status_name\` IN (${placeholders}) ORDER BY \`sort_order\` ASC, \`status_id\` ASC`;
    return await baseModel.execute(sql, names);
  };
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
    if (!Array.isArray(statusIds) || statusIds.length === 0) {
      return [];
    }
    const placeholders = statusIds.map(() => '?').join(',');
    const sql = `SELECT * FROM \`${baseModel.tableName}\` WHERE \`status_id\` IN (${placeholders}) ORDER BY \`sort_order\` ASC, \`status_id\` ASC`;
    return await baseModel.execute(sql, statusIds);
  };
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
    const orderByClause = orderBy ? `ORDER BY ${orderBy}` : 'ORDER BY sort_order ASC, status_id ASC';
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
      const statuses = [
        { status_id: 1, status_name: 'Chờ xác nhận', sort_order: 1 },      
        { status_id: 2, status_name: 'Đã xác nhận', sort_order: 2 },       
        { status_id: 3, status_name: 'Đang giao hàng', sort_order: 3 },   
        { status_id: 4, status_name: 'Đã giao hàng', sort_order: 4 },     
        { status_id: 5, status_name: 'Đã hủy', sort_order: 5 },           
        { status_id: 6, status_name: 'Trả hàng', sort_order: 6 },         
        { status_id: 8, status_name: 'Hoàn thành', sort_order: 7 },
      ];
      const values = statuses.map(() => '(?, ?, ?)').join(', ');
      const params = statuses.flatMap(s => [s.status_id, s.status_name, s.sort_order]);
      const sql = `
        INSERT INTO \`${baseModel.tableName}\` (\`status_id\`, \`status_name\`, \`sort_order\`)
        VALUES ${values}
        ON DUPLICATE KEY UPDATE
          \`status_name\` = VALUES(\`status_name\`),
          \`sort_order\` = VALUES(\`sort_order\`)
      `;
      await baseModel.execute(sql, params);
      console.log('[OrderStatus] ✅ All order statuses ensured in database using batch INSERT');
    } catch (error) {
      console.error('[OrderStatus] ❌ Error ensuring order statuses:', error);
    }
  };
  return {
    ...baseModel,
    findByName,                       
    findAllOrdered,                   
    findByNames,                      
    findByIds,                        
    findAllWithCount,                 
    ensureOrderStatuses,             
  };
};
module.exports = createOrderStatusModel;
