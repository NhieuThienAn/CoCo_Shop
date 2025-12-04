const { getDatabase } = require('../Config/database');
/**
 * Tạo BaseModel function component
 * Đây là một factory function tạo ra một model object với các methods CRUD cơ bản
 * 
 * @param {Object} config - Configuration object chứa thông tin cấu hình model
 * @param {string} config.tableName - Tên bảng trong database (bắt buộc)
 * @param {string} config.primaryKey - Tên cột primary key (mặc định: null)
 * @param {Array<string>} config.columns - Danh sách các cột hợp lệ của bảng (mặc định: [])
 * @returns {Object} Model object với các methods: findAll, findById, create, update, delete, count, execute, rawQuery
 */

const createBaseModel = ({ tableName, primaryKey = null, columns = [] }) => {
  if (!tableName) {
    throw new Error('BaseModel yêu cầu tableName');
  }
  const columnSet = new Set(columns);
  /**
   * Hàm thực thi SQL query với error handling
   * @param {string} sql - Câu lệnh SQL cần thực thi
   * @param {Array} params - Mảng các tham số để bind vào SQL (mặc định: [])
   * @returns {Promise<Array>} Kết quả trả về từ database
   */

  const execute = async (sql, params = []) => {
    const db = getDatabase();
    try {
      const [rows] = await db.execute(sql, params);
      return rows;
    } catch (error) {
      const { logger } = require('../Middlewares/errorHandler');
      const enhancedError = new Error(`[BaseModel:${tableName}] ${error.message}`);
      enhancedError.originalError = error;
      enhancedError.sql = sql;
      enhancedError.params = params;
      logger.error(`Database error in ${tableName}: ${error.message}`, {
        sql: sql.substring(0, 200),
        params: params.length > 10 ? params.slice(0, 10) : params,
        error: error.stack,
      });
      throw enhancedError;
    }
  };
  /**
   * Lọc các key trong data object chỉ giữ lại những key có trong columnSet
   * Mục đích: Chỉ cho phép insert/update các cột hợp lệ, tránh SQL injection
   * 
   * @param {Object} data - Object chứa dữ liệu cần lọc (mặc định: {})
   * @returns {Array<string>} Mảng các tên cột hợp lệ
   * 
   * Ví dụ:
   * - columns = ['name', 'email', 'age']
   * - data = { name: 'John', email: 'john@example.com', password: '123', age: 25 }
   * - Kết quả: ['name', 'email', 'age'] (password bị loại bỏ vì không có trong columns)
   */

  const filterColumns = (data = {}) => {
    return Object.keys(data).filter((key) => columnSet.has(key));
  };
  /**
   * Xây dựng WHERE clause và values array từ filters object
   * Hỗ trợ nhiều loại filter: =, >, <, IS NULL, etc.
   * 
   * @param {Object} filters - Object chứa các điều kiện filter (mặc định: {})
   * @returns {Object} Object chứa { clause: string, values: Array }
   * 
   * Ví dụ:
   * - filters = { name: 'John', age: { operator: '>', value: 18 }, status: null }
   * - Kết quả: { clause: "`name` = ? AND `age` > ? AND `status` IS NULL", values: ['John', 18] }
   */

  const buildWhereClause = (filters = {}) => {
    const keys = filterColumns(filters);
    console.log(`[BaseModel:${tableName}] buildWhereClause:`, {
      inputFilters: filters,        
      filteredKeys: keys,           
      columnSet: Array.from(columnSet), 
    });
    if (!keys.length) {
      console.log(`[BaseModel:${tableName}] No valid filter keys found`);
      return { clause: '', values: [] };
    }
    const fragments = [];
    const values = [];
    keys.forEach((key) => {
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
    const clause = fragments.join(' AND ');
    console.log(`[BaseModel:${tableName}] Final WHERE clause:`, clause);
    console.log(`[BaseModel:${tableName}] Final values:`, values);
    return {
      clause,   
      values,   
    };
  };
  /**
   * Lấy tất cả records từ bảng với các tùy chọn filter, pagination, sorting
   * 
   * @param {Object} options - Object chứa các tùy chọn
   * @param {Object} options.filters - Object chứa các điều kiện filter (mặc định: {})
   * @param {number} options.limit - Số lượng records tối đa trả về
   * @param {number} options.offset - Số lượng records bỏ qua (cho pagination)
   * @param {string} options.orderBy - Câu lệnh ORDER BY (ví dụ: "created_at DESC")
   * @returns {Promise<Array>} Mảng các records
   */

  const findAll = async ({ filters = {}, limit, offset, orderBy } = {}) => {
    const { clause, values } = buildWhereClause(filters);
    const parts = [`SELECT * FROM \`${tableName}\``];
    if (clause) {
      parts.push(`WHERE ${clause}`);
    }
    if (orderBy) {
      parts.push(`ORDER BY ${orderBy}`);
    }
    if (typeof limit === 'number') {
      parts.push(`LIMIT ${limit}`);
    }
    if (typeof offset === 'number') {
      parts.push(`OFFSET ${offset}`);
    }
    const sql = parts.join(' ');
    console.log(`[BaseModel] findAll SQL for ${tableName}:`, sql);
    console.log(`[BaseModel] findAll values:`, values);
    const results = await execute(sql, values);
    console.log(`[BaseModel] findAll results count for ${tableName}:`, Array.isArray(results) ? results.length : 0);
    return results;
  };
  /**
   * Lấy 1 record từ bảng theo primary key
   * 
   * @param {number|string} id - Giá trị của primary key
   * @returns {Promise<Object|null>} Record tìm được hoặc null nếu không tìm thấy
   */

  const findById = async (id) => {
    if (!primaryKey) {
      throw new Error(`Model ${tableName} chưa định nghĩa primary key`);
    }
    const sql = `SELECT * FROM \`${tableName}\` WHERE \`${primaryKey}\` = ? LIMIT 1`;
    const rows = await execute(sql, [id]);
    return Array.isArray(rows) ? rows[0] || null : rows;
  };
  /**
   * Đếm số lượng records trong bảng với các điều kiện filter
   * 
   * @param {Object} filters - Object chứa các điều kiện filter (mặc định: {})
   * @returns {Promise<number>} Số lượng records
   */

  const count = async (filters = {}) => {
    const { clause, values } = buildWhereClause(filters);
    const parts = [`SELECT COUNT(*) AS total FROM \`${tableName}\``];
    if (clause) {
      parts.push(`WHERE ${clause}`);
    }
    const sql = parts.join(' ');
    console.log(`[BaseModel] count SQL for ${tableName}:`, sql);
    console.log(`[BaseModel] count values:`, values);
    const [result] = await execute(sql, values);
    const total = result && result.total !== undefined ? Number(result.total) : 0;
    console.log(`[BaseModel] count result for ${tableName}:`, total);
    return total;
  };
  /**
   * Tạo record mới trong bảng
   * 
   * @param {Object} data - Object chứa dữ liệu cần insert (mặc định: {})
   * @returns {Promise<Object>} Kết quả insert (chứa insertId)
   */

  const create = async (data = {}) => {
    const validColumns = filterColumns(data);
    if (!validColumns.length) {
      throw new Error(`Không có cột hợp lệ để tạo bản ghi trong ${tableName}`);
    }
    const placeholders = validColumns.map(() => '?').join(', ');
    const colsSql = validColumns.map((key) => `\`${key}\``).join(', ');
    const sql = `INSERT INTO \`${tableName}\` (${colsSql}) VALUES (${placeholders})`;
    const values = validColumns.map((key) => {
      const value = data[key];
      if (value === undefined) {
        return null;
      }
      if (value !== null && typeof value === 'object') {
        try {
          return JSON.stringify(value);
        } catch (e) {
          return null;
        }
      }
      return value;
    });
    return execute(sql, values);
  };
  /**
   * Cập nhật record trong bảng theo primary key
   * 
   * @param {number|string} id - Giá trị của primary key
   * @param {Object} data - Object chứa dữ liệu cần update (mặc định: {})
   * @returns {Promise<Object>} Kết quả update
   */

  const update = async (id, data = {}) => {
    if (!primaryKey) {
      throw new Error(`Model ${tableName} chưa định nghĩa primary key`);
    }
    const validColumns = filterColumns(data).filter((key) => key !== primaryKey);
    if (!validColumns.length) {
      throw new Error(`Không có cột hợp lệ để cập nhật bản ghi trong ${tableName}`);
    }
    const assignments = validColumns.map((key) => `\`${key}\` = ?`).join(', ');
    const sql = `UPDATE \`${tableName}\` SET ${assignments} WHERE \`${primaryKey}\` = ?`;
    const values = validColumns.map((key) => data[key] === undefined ? null : data[key]);
    values.push(id);
    return execute(sql, values);
  };
  /**
   * Xóa record từ bảng theo primary key
   * 
   * @param {number|string} id - Giá trị của primary key
   * @returns {Promise<Object>} Kết quả delete
   */

  const deleteById = async (id) => {
    if (!primaryKey) {
      throw new Error(`Model ${tableName} chưa định nghĩa primary key`);
    }
    const sql = `DELETE FROM \`${tableName}\` WHERE \`${primaryKey}\` = ?`;
    return execute(sql, [id]);
  };
  /**
   * Thực thi SQL query tùy chỉnh (raw SQL)
   * Dùng khi cần query phức tạp không thể dùng các method trên
   * 
   * @param {string} sql - Câu lệnh SQL tùy chỉnh
   * @param {Array} params - Mảng các tham số để bind vào SQL (mặc định: [])
   * @returns {Promise<Array>} Kết quả từ query
   */

  const rawQuery = async (sql, params = []) => {
    return execute(sql, params);
  };
  return {
    tableName,
    primaryKey,
    columns,
    execute,
    findAll,         
    findById,        
    count,           
    create,          
    update,          
    delete: deleteById, 
    rawQuery,        
  };
};
module.exports = createBaseModel;
