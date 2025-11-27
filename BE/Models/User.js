// ============================================
// IMPORT BASE MODEL
// ============================================
// Import factory function createBaseModel từ BaseModel.js
// BaseModel cung cấp các methods CRUD cơ bản (findAll, findById, create, update, delete, etc.)
const createBaseModel = require('./BaseModel');

// ============================================
// USER MODEL FACTORY FUNCTION
// ============================================
/**
 * Tạo User Model với các methods mở rộng cho quản lý người dùng
 * User Model kế thừa tất cả methods từ BaseModel và thêm các methods riêng
 * 
 * @returns {Object} User model object với các methods:
 * - Từ BaseModel: findAll, findById, create, update, delete, count, execute, rawQuery
 * - Riêng User: findByEmail, findByUsername, findByRole, updateLastLogin,
 *   incrementFailedLoginAttempts, resetFailedLoginAttempts, findAllWithCount
 */
const createUserModel = () => {
  // ============================================
  // KHỞI TẠO BASE MODEL
  // ============================================
  // Tạo baseModel bằng cách gọi createBaseModel với cấu hình cho bảng users
  const baseModel = createBaseModel({
    // Tên bảng trong database
    tableName: 'users',
    
    // Primary key của bảng (cột user_id)
    primaryKey: 'user_id',
    
    // Danh sách tất cả các cột hợp lệ trong bảng users
    // Chỉ các cột trong danh sách này mới được phép insert/update (bảo mật)
    columns: [
      'user_id',                // ID tự tăng (primary key)
      'username',               // Tên đăng nhập (unique)
      'email',                  // Email (unique, dùng để đăng nhập)
      'password_hash',          // Mật khẩu đã được hash (bcrypt/argon2)
      'first_name',             // Tên
      'last_name',              // Họ
      'phone',                  // Số điện thoại
      'avatar_url',             // URL ảnh đại diện
      'bio',                    // Tiểu sử, mô tả về bản thân
      'role_id',                // ID vai trò (foreign key -> roles)
      'is_active',              // Trạng thái active (1 = active, 0 = inactive)
      'email_verified',         // Email đã được xác thực chưa (1 = verified, 0 = not verified)
      'last_login',             // Thời gian đăng nhập cuối cùng
      'failed_login_attempts',  // Số lần đăng nhập thất bại (dùng để chống brute force)
      'sessions',               // Thông tin sessions (có thể là JSON string)
      'tokens',                 // Refresh tokens (có thể là JSON string)
      'created_at',             // Thời gian tạo tài khoản
      'updated_at',             // Thời gian cập nhật
    ],
  });

  // ============================================
  // FIND BY EMAIL FUNCTION: Tìm user theo email
  // ============================================
  /**
   * Tìm user theo email
   * Email thường được dùng để đăng nhập (unique trong hệ thống)
   * 
   * @param {string} email - Email của user cần tìm
   * @returns {Promise<Object|null>} User object hoặc null nếu không tìm thấy
   * 
   * Ví dụ:
   * - email = "user@example.com" => Tìm user có email này
   * - Kết quả: { user_id: 1, email: "user@example.com", username: "...", ... } hoặc null
   * 
   * Sử dụng: Đăng nhập, kiểm tra email đã tồn tại chưa
   */
  const findByEmail = async (email) => {
    // Xây dựng SQL query để tìm user theo email
    // Sử dụng prepared statement (?) để tránh SQL injection
    // LIMIT 1 vì email phải unique (chỉ có 1 user với email này)
    const sql = `SELECT * FROM \`${baseModel.tableName}\` WHERE \`email\` = ? LIMIT 1`;
    
    // Thực thi query với email làm parameter
    const rows = await baseModel.execute(sql, [email]);
    
    // Trả về user đầu tiên nếu có, nếu không trả về null
    // Kiểm tra Array.isArray để đảm bảo rows là array trước khi truy cập [0]
    return Array.isArray(rows) ? rows[0] || null : rows;
  };

  // ============================================
  // FIND BY USERNAME FUNCTION: Tìm user theo username
  // ============================================
  /**
   * Tìm user theo username
   * Username thường được dùng để đăng nhập hoặc hiển thị (unique trong hệ thống)
   * 
   * @param {string} username - Username của user cần tìm
   * @returns {Promise<Object|null>} User object hoặc null nếu không tìm thấy
   * 
   * Ví dụ:
   * - username = "john_doe" => Tìm user có username này
   * - Kết quả: { user_id: 1, username: "john_doe", email: "...", ... } hoặc null
   * 
   * Sử dụng: Đăng nhập, kiểm tra username đã tồn tại chưa, hiển thị profile
   */
  const findByUsername = async (username) => {
    // Xây dựng SQL query để tìm user theo username
    // Tương tự findByEmail nhưng tìm theo cột username
    // LIMIT 1 vì username phải unique
    const sql = `SELECT * FROM \`${baseModel.tableName}\` WHERE \`username\` = ? LIMIT 1`;
    
    // Thực thi query với username làm parameter
    const rows = await baseModel.execute(sql, [username]);
    
    // Trả về user đầu tiên nếu có, nếu không trả về null
    return Array.isArray(rows) ? rows[0] || null : rows;
  };

  // ============================================
  // FIND BY ROLE FUNCTION: Tìm users theo vai trò
  // ============================================
  /**
   * Tìm tất cả users có cùng vai trò (role)
   * Hữu ích để lấy danh sách admin, customer, shipper, etc.
   * 
   * @param {number} roleId - ID của vai trò (foreign key -> roles)
   * @returns {Promise<Array>} Mảng các user objects có cùng role_id
   * 
   * Ví dụ:
   * - roleId = 1 => Tìm tất cả users có role_id = 1 (ví dụ: Admin)
   * - Kết quả: [{ user_id: 1, role_id: 1, ... }, { user_id: 2, role_id: 1, ... }]
   * 
   * Sử dụng: Quản lý users theo vai trò, phân quyền
   */
  const findByRole = async (roleId) => {
    // Sử dụng baseModel.findAll với filter role_id
    // findAll tự động xây dựng WHERE clause và thực thi query
    return baseModel.findAll({ filters: { role_id: roleId } });
  };

  // ============================================
  // UPDATE LAST LOGIN FUNCTION: Cập nhật thời gian đăng nhập cuối
  // ============================================
  /**
   * Cập nhật thời gian đăng nhập cuối cùng của user
   * Được gọi sau khi user đăng nhập thành công
   * 
   * @param {number} userId - ID của user
   * @returns {Promise<Object>} Kết quả update
   * 
   * Ví dụ:
   * - userId = 1 => Cập nhật last_login = thời gian hiện tại cho user ID = 1
   * 
   * Sử dụng: Tracking hoạt động đăng nhập, bảo mật (phát hiện đăng nhập bất thường)
   */
  const updateLastLogin = async (userId) => {
    // Cập nhật user với last_login = thời gian hiện tại
    return baseModel.update(userId, { last_login: new Date() });
  };

  // ============================================
  // INCREMENT FAILED LOGIN ATTEMPTS FUNCTION: Tăng số lần đăng nhập thất bại
  // ============================================
  /**
   * Tăng số lần đăng nhập thất bại của user
   * Được gọi khi user nhập sai mật khẩu
   * Dùng để chống brute force attack (khóa tài khoản sau N lần thất bại)
   * 
   * @param {number} userId - ID của user
   * @returns {Promise<Object>} Kết quả update hoặc undefined nếu không tìm thấy user
   * 
   * Logic:
   * - Lấy số lần thất bại hiện tại
   * - Tăng lên 1
   * - Cập nhật vào database
   * 
   * Ví dụ:
   * - failed_login_attempts hiện tại = 2
   * - Sau khi gọi hàm => failed_login_attempts = 3
   * - Nếu >= 5 lần => Có thể khóa tài khoản tạm thời
   */
  const incrementFailedLoginAttempts = async (userId) => {
    // Lấy thông tin user hiện tại
    const userData = await baseModel.findById(userId);
    
    // Nếu tìm thấy user
    if (userData) {
      // Tính số lần thất bại mới = số lần hiện tại + 1
      // (userData.failed_login_attempts || 0): Nếu null/undefined thì mặc định 0
      const attempts = (userData.failed_login_attempts || 0) + 1;
      
      // Cập nhật số lần thất bại mới
      return baseModel.update(userId, { 
        failed_login_attempts: attempts,      // Số lần thất bại mới
        updated_at: new Date(),               // Cập nhật thời gian
        // Ghi chú: updated_at có thể được dùng như last_failed_login nếu không có cột riêng
      });
    }
    // Nếu không tìm thấy user, trả về undefined (không throw error)
  };

  // ============================================
  // RESET FAILED LOGIN ATTEMPTS FUNCTION: Reset số lần đăng nhập thất bại
  // ============================================
  /**
   * Reset số lần đăng nhập thất bại về 0
   * Được gọi khi user đăng nhập thành công
   * 
   * @param {number} userId - ID của user
   * @returns {Promise<Object>} Kết quả update
   * 
   * Ví dụ:
   * - userId = 1, failed_login_attempts = 3
   * - Sau khi gọi hàm => failed_login_attempts = 0
   * 
   * Sử dụng: Reset counter sau khi đăng nhập thành công
   */
  const resetFailedLoginAttempts = async (userId) => {
    // Cập nhật user với failed_login_attempts = 0
    return baseModel.update(userId, { failed_login_attempts: 0 });
  };

  // ============================================
  // FIND ALL WITH COUNT FUNCTION: Lấy tất cả với pagination và total count
  // ============================================
  /**
   * Lấy tất cả users với pagination và total count trong 1 query duy nhất
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
      // Ví dụ: { created_at: { operator: '>', value: '2025-01-01' } }
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
    
    // Tạo ORDER BY clause, mặc định sắp xếp theo created_at DESC (user mới nhất trước)
    const orderByClause = orderBy ? `ORDER BY ${orderBy}` : 'ORDER BY created_at DESC';
    
    // ============================================
    // BƯỚC 2: Xây dựng SQL query với window function
    // ============================================
    // Sử dụng window function COUNT(*) OVER() để lấy total count trong cùng 1 query
    // COUNT(*) OVER() đếm tổng số rows phù hợp với WHERE clause (trước khi LIMIT)
    // Mỗi row sẽ có thêm cột total_count với cùng giá trị
    // Build SQL query với window function COUNT(*) OVER() để lấy data và total count trong 1 query
    // Lấy tất cả cột của users và thêm cột total_count (tổng số rows)
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
  // RETURN USER MODEL OBJECT
  // ============================================
  // Trả về object chứa tất cả methods từ BaseModel và các methods riêng của User
  // Spread operator (...) để copy tất cả methods từ baseModel
  return {
    ...baseModel,                    // Tất cả methods từ BaseModel (findAll, findById, create, update, delete, etc.)
    findByEmail,                      // Tìm theo email
    findByUsername,                   // Tìm theo username
    findByRole,                       // Tìm theo vai trò
    updateLastLogin,                  // Cập nhật thời gian đăng nhập cuối
    incrementFailedLoginAttempts,     // Tăng số lần đăng nhập thất bại
    resetFailedLoginAttempts,         // Reset số lần đăng nhập thất bại
    findAllWithCount,                 // Lấy tất cả với pagination và total count
  };
};

// ============================================
// EXPORT MODULE
// ============================================
// Export factory function để các file khác có thể import và sử dụng
// Cách sử dụng: const createUserModel = require('./User');
//               const user = createUserModel();
module.exports = createUserModel;

