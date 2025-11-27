// ============================================
// IMPORT MODULES
// ============================================
// Import hàm getDatabase từ file cấu hình database
// Hàm này trả về connection pool đã được khởi tạo
const { getDatabase } = require('../Config/database');

// ============================================
// BASE MODEL FACTORY FUNCTION
// ============================================
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
  // ============================================
  // VALIDATION: Kiểm tra tableName có được cung cấp không
  // ============================================
  // Nếu không có tableName, throw error để dừng việc tạo model
  if (!tableName) {
    throw new Error('BaseModel yêu cầu tableName');
  }

  // ============================================
  // COLUMN SET: Tạo Set để lưu danh sách các cột hợp lệ
  // ============================================
  // Sử dụng Set để tối ưu việc kiểm tra cột có hợp lệ không (O(1) lookup)
  // Set giúp loại bỏ duplicate và tăng tốc độ kiểm tra
  const columnSet = new Set(columns);

  // ============================================
  // EXECUTE FUNCTION: Hàm thực thi SQL query
  // ============================================
  /**
   * Hàm thực thi SQL query với error handling
   * @param {string} sql - Câu lệnh SQL cần thực thi
   * @param {Array} params - Mảng các tham số để bind vào SQL (mặc định: [])
   * @returns {Promise<Array>} Kết quả trả về từ database
   */
  const execute = async (sql, params = []) => {
    // Lấy database connection pool từ config
    const db = getDatabase();
    
    try {
      // Thực thi SQL query với params
      // db.execute() trả về [rows, fields], ta chỉ lấy rows (dòng đầu tiên)
      // Sử dụng prepared statement để tránh SQL injection
      const [rows] = await db.execute(sql, params);
      
      // Trả về kết quả (mảng các object)
      return rows;
    } catch (error) {
      // ============================================
      // ERROR HANDLING: Xử lý lỗi khi thực thi query
      // ============================================
      // Import logger để ghi log lỗi
      const { logger } = require('../Middlewares/errorHandler');
      
      // Tạo error object mới với thông tin chi tiết hơn
      // Thêm prefix [BaseModel:tableName] để dễ debug
      const enhancedError = new Error(`[BaseModel:${tableName}] ${error.message}`);
      
      // Lưu thông tin gốc của error để có thể trace lại
      enhancedError.originalError = error;
      
      // Lưu SQL query và params để debug
      enhancedError.sql = sql;
      enhancedError.params = params;
      
      // Ghi log lỗi với thông tin chi tiết
      logger.error(`Database error in ${tableName}: ${error.message}`, {
        // Chỉ log 200 ký tự đầu của SQL để tránh log quá dài
        sql: sql.substring(0, 200),
        // Nếu có nhiều hơn 10 params, chỉ log 10 đầu tiên
        params: params.length > 10 ? params.slice(0, 10) : params,
        // Log stack trace để biết lỗi xảy ra ở đâu
        error: error.stack,
      });
      
      // Throw error để caller có thể xử lý
      throw enhancedError;
    }
  };

  // ============================================
  // FILTER COLUMNS FUNCTION: Lọc các cột hợp lệ
  // ============================================
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
    // Object.keys(data) lấy tất cả keys từ data object
    // .filter() chỉ giữ lại những key có trong columnSet
    // columnSet.has(key) kiểm tra key có tồn tại trong Set không (O(1) complexity)
    return Object.keys(data).filter((key) => columnSet.has(key));
  };

  // ============================================
  // BUILD WHERE CLAUSE FUNCTION: Xây dựng WHERE clause
  // ============================================
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
    // Lọc các keys hợp lệ từ filters (chỉ giữ keys có trong columnSet)
    const keys = filterColumns(filters);
    
    // Log để debug (chỉ trong development)
    console.log(`[BaseModel:${tableName}] buildWhereClause:`, {
      inputFilters: filters,        // Filters đầu vào
      filteredKeys: keys,           // Keys sau khi lọc
      columnSet: Array.from(columnSet), // Danh sách tất cả columns hợp lệ
    });
    
    // Nếu không có keys hợp lệ, trả về WHERE clause rỗng
    if (!keys.length) {
      console.log(`[BaseModel:${tableName}] No valid filter keys found`);
      return { clause: '', values: [] };
    }

    // Mảng chứa các fragment của WHERE clause (ví dụ: ["`name` = ?", "`age` > ?"])
    const fragments = [];
    
    // Mảng chứa các giá trị tương ứng với các ? trong SQL (để bind vào prepared statement)
    const values = [];

    // Duyệt qua từng key hợp lệ để xây dựng WHERE clause
    keys.forEach((key) => {
      // Lấy giá trị filter cho key này
      const rawValue = filters[key];
      
      // ============================================
      // CASE 1: Filter với operator tùy chỉnh (>, <, >=, <=, LIKE, etc.)
      // ============================================
      // Nếu rawValue là object và có property 'value'
      // Ví dụ: { age: { operator: '>', value: 18 } }
      if (rawValue && typeof rawValue === 'object' && rawValue.hasOwnProperty('value')) {
        // Lấy operator, mặc định là '=' nếu không có
        const operator = rawValue.operator || '=';
        
        // Thêm fragment vào mảng (ví dụ: "`age` > ?")
        fragments.push(`\`${key}\` ${operator} ?`);
        
        // Thêm giá trị vào mảng values để bind vào ?
        values.push(rawValue.value);
      } 
      // ============================================
      // CASE 2: Filter với NULL value
      // ============================================
      // Xử lý trường hợp giá trị là null (hoặc chuỗi 'null'/'NULL' từ query params)
      else if (rawValue === null || rawValue === 'null' || rawValue === 'NULL') {
        // Sử dụng IS NULL thay vì = NULL (vì NULL không thể so sánh bằng =)
        fragments.push(`\`${key}\` IS NULL`);
        // Không cần thêm giá trị vào values vì IS NULL không cần parameter
      } 
      // ============================================
      // CASE 3: Filter với giá trị thông thường (=)
      // ============================================
      // Trường hợp mặc định: so sánh bằng
      else {
        // Thêm fragment với operator mặc định là =
        fragments.push(`\`${key}\` = ?`);
        
        // Thêm giá trị vào mảng values
        values.push(rawValue);
      }
    });

    // Nối các fragments bằng ' AND ' để tạo WHERE clause hoàn chỉnh
    // Ví dụ: "`name` = ? AND `age` > ? AND `status` IS NULL"
    const clause = fragments.join(' AND ');
    
    // Log để debug
    console.log(`[BaseModel:${tableName}] Final WHERE clause:`, clause);
    console.log(`[BaseModel:${tableName}] Final values:`, values);

    // Trả về object chứa clause và values
    return {
      clause,   // WHERE clause string
      values,   // Array các giá trị để bind vào prepared statement
    };
  };

  // ============================================
  // FIND ALL FUNCTION: Lấy tất cả records với filter, pagination, sorting
  // ============================================
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
    // Xây dựng WHERE clause và values từ filters
    const { clause, values } = buildWhereClause(filters);
    
    // Bắt đầu xây dựng SQL query
    // parts là mảng chứa các phần của SQL, sẽ được join lại thành câu SQL hoàn chỉnh
    const parts = [`SELECT * FROM \`${tableName}\``];
    
    // Nếu có WHERE clause, thêm vào query
    if (clause) {
      parts.push(`WHERE ${clause}`);
    }

    // Nếu có orderBy, thêm ORDER BY vào query
    // Ví dụ: "ORDER BY created_at DESC, name ASC"
    if (orderBy) {
      parts.push(`ORDER BY ${orderBy}`);
    }
    
    // Nếu có limit (kiểu number), thêm LIMIT vào query
    // Ví dụ: "LIMIT 10"
    if (typeof limit === 'number') {
      parts.push(`LIMIT ${limit}`);
    }
    
    // Nếu có offset (kiểu number), thêm OFFSET vào query
    // Ví dụ: "OFFSET 20" (bỏ qua 20 records đầu)
    if (typeof offset === 'number') {
      parts.push(`OFFSET ${offset}`);
    }

    // Nối các parts bằng khoảng trắng để tạo SQL query hoàn chỉnh
    const sql = parts.join(' ');
    
    // Log để debug
    console.log(`[BaseModel] findAll SQL for ${tableName}:`, sql);
    console.log(`[BaseModel] findAll values:`, values);
    
    // Thực thi query và lấy kết quả
    const results = await execute(sql, values);
    
    // Log số lượng records trả về
    console.log(`[BaseModel] findAll results count for ${tableName}:`, Array.isArray(results) ? results.length : 0);
    
    // Trả về kết quả
    return results;
  };

  // ============================================
  // FIND BY ID FUNCTION: Lấy 1 record theo primary key
  // ============================================
  /**
   * Lấy 1 record từ bảng theo primary key
   * 
   * @param {number|string} id - Giá trị của primary key
   * @returns {Promise<Object|null>} Record tìm được hoặc null nếu không tìm thấy
   */
  const findById = async (id) => {
    // Kiểm tra primaryKey có được định nghĩa không
    if (!primaryKey) {
      throw new Error(`Model ${tableName} chưa định nghĩa primary key`);
    }
    
    // Xây dựng SQL query để tìm record theo primary key
    // Sử dụng LIMIT 1 để chỉ lấy 1 record (tối ưu performance)
    const sql = `SELECT * FROM \`${tableName}\` WHERE \`${primaryKey}\` = ? LIMIT 1`;
    
    // Thực thi query với id làm parameter
    const rows = await execute(sql, [id]);
    
    // Trả về record đầu tiên nếu có, nếu không trả về null
    // Kiểm tra Array.isArray để đảm bảo rows là array trước khi truy cập [0]
    return Array.isArray(rows) ? rows[0] || null : rows;
  };

  // ============================================
  // COUNT FUNCTION: Đếm số lượng records với filter
  // ============================================
  /**
   * Đếm số lượng records trong bảng với các điều kiện filter
   * 
   * @param {Object} filters - Object chứa các điều kiện filter (mặc định: {})
   * @returns {Promise<number>} Số lượng records
   */
  const count = async (filters = {}) => {
    // Xây dựng WHERE clause và values từ filters
    const { clause, values } = buildWhereClause(filters);
    
    // Bắt đầu xây dựng SQL query cho COUNT
    const parts = [`SELECT COUNT(*) AS total FROM \`${tableName}\``];
    
    // Nếu có WHERE clause, thêm vào query
    if (clause) {
      parts.push(`WHERE ${clause}`);
    }
    
    // Nối các parts thành SQL query hoàn chỉnh
    const sql = parts.join(' ');
    
    // Log để debug
    console.log(`[BaseModel] count SQL for ${tableName}:`, sql);
    console.log(`[BaseModel] count values:`, values);
    
    // Thực thi query
    // execute() trả về mảng, ta lấy phần tử đầu tiên [result]
    const [result] = await execute(sql, values);
    
    // Lấy giá trị total từ result và convert sang number
    // Nếu result hoặc result.total không tồn tại, trả về 0
    const total = result && result.total !== undefined ? Number(result.total) : 0;
    
    // Log kết quả
    console.log(`[BaseModel] count result for ${tableName}:`, total);
    
    // Trả về số lượng
    return total;
  };

  // ============================================
  // CREATE FUNCTION: Tạo record mới
  // ============================================
  /**
   * Tạo record mới trong bảng
   * 
   * @param {Object} data - Object chứa dữ liệu cần insert (mặc định: {})
   * @returns {Promise<Object>} Kết quả insert (chứa insertId)
   */
  const create = async (data = {}) => {
    // Lọc các cột hợp lệ từ data (chỉ giữ cột có trong columnSet)
    const validColumns = filterColumns(data);
    
    // Kiểm tra có ít nhất 1 cột hợp lệ không
    if (!validColumns.length) {
      throw new Error(`Không có cột hợp lệ để tạo bản ghi trong ${tableName}`);
    }

    // Tạo placeholders cho VALUES clause
    // Ví dụ: validColumns = ['name', 'email'] => placeholders = "?, ?"
    const placeholders = validColumns.map(() => '?').join(', ');
    
    // Tạo danh sách tên cột với backticks (để tránh conflict với MySQL keywords)
    // Ví dụ: validColumns = ['name', 'email'] => colsSql = "`name`, `email`"
    const colsSql = validColumns.map((key) => `\`${key}\``).join(', ');
    
    // Xây dựng SQL INSERT statement
    // Ví dụ: "INSERT INTO `users` (`name`, `email`) VALUES (?, ?)"
    const sql = `INSERT INTO \`${tableName}\` (${colsSql}) VALUES (${placeholders})`;
    
    // ============================================
    // CRITICAL FIX: Xử lý undefined và object values
    // ============================================
    // MySQL2 không chấp nhận undefined, phải convert thành null
    // Nếu value là object/array, cần stringify thành JSON
    const values = validColumns.map((key) => {
      // Lấy giá trị từ data object
      const value = data[key];
      
      // Nếu value là undefined, convert thành null
      if (value === undefined) {
        return null;
      }
      
      // Nếu value là object hoặc array (không phải null)
      // Cần stringify thành JSON string để lưu vào database
      if (value !== null && typeof value === 'object') {
        try {
          // Convert object/array thành JSON string
          // Ví dụ: { name: 'John' } => '{"name":"John"}'
          return JSON.stringify(value);
        } catch (e) {
          // Nếu stringify fail (ví dụ: circular reference), trả về null
          return null;
        }
      }
      
      // Trường hợp còn lại: trả về giá trị gốc (string, number, boolean, null)
      return value;
    });
    
    // Thực thi INSERT query
    return execute(sql, values);
  };

  // ============================================
  // UPDATE FUNCTION: Cập nhật record
  // ============================================
  /**
   * Cập nhật record trong bảng theo primary key
   * 
   * @param {number|string} id - Giá trị của primary key
   * @param {Object} data - Object chứa dữ liệu cần update (mặc định: {})
   * @returns {Promise<Object>} Kết quả update
   */
  const update = async (id, data = {}) => {
    // Kiểm tra primaryKey có được định nghĩa không
    if (!primaryKey) {
      throw new Error(`Model ${tableName} chưa định nghĩa primary key`);
    }

    // Lọc các cột hợp lệ và loại bỏ primaryKey (không cho phép update primary key)
    // Ví dụ: validColumns = ['name', 'email', 'user_id'] => sau filter = ['name', 'email']
    const validColumns = filterColumns(data).filter((key) => key !== primaryKey);
    
    // Kiểm tra có ít nhất 1 cột hợp lệ để update không
    if (!validColumns.length) {
      throw new Error(`Không có cột hợp lệ để cập nhật bản ghi trong ${tableName}`);
    }

    // Tạo các assignment cho SET clause
    // Ví dụ: validColumns = ['name', 'email'] => assignments = "`name` = ?, `email` = ?"
    const assignments = validColumns.map((key) => `\`${key}\` = ?`).join(', ');
    
    // Xây dựng SQL UPDATE statement
    // Ví dụ: "UPDATE `users` SET `name` = ?, `email` = ? WHERE `user_id` = ?"
    const sql = `UPDATE \`${tableName}\` SET ${assignments} WHERE \`${primaryKey}\` = ?`;
    
    // ============================================
    // Xử lý values: Convert undefined thành null
    // ============================================
    // Map các giá trị từ data, convert undefined thành null
    // Ví dụ: data = { name: 'John', email: undefined } => values = ['John', null]
    const values = validColumns.map((key) => data[key] === undefined ? null : data[key]);
    
    // Thêm id vào cuối mảng values để bind vào WHERE clause
    values.push(id);
    
    // Thực thi UPDATE query
    return execute(sql, values);
  };

  // ============================================
  // DELETE BY ID FUNCTION: Xóa record theo primary key
  // ============================================
  /**
   * Xóa record từ bảng theo primary key
   * 
   * @param {number|string} id - Giá trị của primary key
   * @returns {Promise<Object>} Kết quả delete
   */
  const deleteById = async (id) => {
    // Kiểm tra primaryKey có được định nghĩa không
    if (!primaryKey) {
      throw new Error(`Model ${tableName} chưa định nghĩa primary key`);
    }

    // Xây dựng SQL DELETE statement
    // Ví dụ: "DELETE FROM `users` WHERE `user_id` = ?"
    const sql = `DELETE FROM \`${tableName}\` WHERE \`${primaryKey}\` = ?`;
    
    // Thực thi DELETE query với id làm parameter
    return execute(sql, [id]);
  };

  // ============================================
  // RAW QUERY FUNCTION: Thực thi SQL query tùy chỉnh
  // ============================================
  /**
   * Thực thi SQL query tùy chỉnh (raw SQL)
   * Dùng khi cần query phức tạp không thể dùng các method trên
   * 
   * @param {string} sql - Câu lệnh SQL tùy chỉnh
   * @param {Array} params - Mảng các tham số để bind vào SQL (mặc định: [])
   * @returns {Promise<Array>} Kết quả từ query
   */
  const rawQuery = async (sql, params = []) => {
    // Gọi execute function để thực thi query
    return execute(sql, params);
  };

  // ============================================
  // RETURN MODEL OBJECT: Trả về object chứa tất cả methods
  // ============================================
  // Trả về object chứa tất cả các methods và properties để các model khác có thể sử dụng
  return {
    tableName,        // Tên bảng (để reference)
    primaryKey,      // Tên primary key column (để reference)
    columns,         // Danh sách các columns (để reference)
    execute,         // Hàm thực thi SQL (có thể dùng cho query phức tạp)
    findAll,         // Lấy tất cả records với filter, pagination, sorting
    findById,        // Lấy 1 record theo primary key
    count,           // Đếm số lượng records với filter
    create,          // Tạo record mới
    update,          // Cập nhật record theo primary key
    delete: deleteById, // Xóa record theo primary key (đổi tên từ deleteById thành delete)
    rawQuery,        // Thực thi SQL query tùy chỉnh
  };
};

// ============================================
// EXPORT MODULE: Export factory function
// ============================================
// Export factory function để các file khác có thể import và sử dụng
// Cách sử dụng: const createBaseModel = require('./BaseModel');
module.exports = createBaseModel;
