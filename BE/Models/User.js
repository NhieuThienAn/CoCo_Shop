const createBaseModel = require('./BaseModel');
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
  const baseModel = createBaseModel({
    tableName: 'users',
    primaryKey: 'user_id',
    columns: [
      'user_id',
      'username',
      'email',
      'password_hash',
      'first_name',             
      'last_name',              
      'phone',                  
      'avatar_url',             
      'bio',                    
      'role_id',
      'is_active',
      'email_verified',
      'last_login',             
      'failed_login_attempts',
      'sessions',
      'tokens',
      'deleted_at',
      'created_at',             
      'updated_at',             
    ],
  });
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
    const sql = `SELECT * FROM \`${baseModel.tableName}\` WHERE \`email\` = ? LIMIT 1`;
    const rows = await baseModel.execute(sql, [email]);
    return Array.isArray(rows) ? rows[0] || null : rows;
  };
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
    const sql = `SELECT * FROM \`${baseModel.tableName}\` WHERE \`username\` = ? LIMIT 1`;
    const rows = await baseModel.execute(sql, [username]);
    return Array.isArray(rows) ? rows[0] || null : rows;
  };
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
    return baseModel.findAll({ filters: { role_id: roleId } });
  };
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
    return baseModel.update(userId, { last_login: new Date() });
  };
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
    const userData = await baseModel.findById(userId);
    if (userData) {
      const attempts = (userData.failed_login_attempts || 0) + 1;
      return baseModel.update(userId, { 
        failed_login_attempts: attempts,      
        updated_at: new Date(),               
      });
    }
  };
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
    return baseModel.update(userId, { failed_login_attempts: 0 });
  };
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

  /**
   * Xóa mềm người dùng (soft delete)
   * Thay vì xóa thật khỏi database, chỉ set deleted_at = current timestamp
   * Lợi ích: Có thể khôi phục sau, không mất dữ liệu, giữ được lịch sử
   * 
   * @param {number} id - ID của người dùng cần xóa
   * @returns {Promise<Object>} Kết quả update
   */
  const softDelete = async (id) => {
    return baseModel.update(id, { deleted_at: new Date() });
  };

  /**
   * Khôi phục người dùng đã bị xóa mềm
   * Set deleted_at = null để người dùng hiển thị lại bình thường
   * 
   * @param {number} id - ID của người dùng cần khôi phục
   * @returns {Promise<Object>} Kết quả update
   */
  const restore = async (id) => {
    return baseModel.update(id, { deleted_at: null });
  };

  const findAllWithCount = async ({ filters = {}, limit, offset, orderBy, includeDeleted = false } = {}) => {
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
    // Thêm filter deleted_at nếu không include deleted và cột deleted_at tồn tại
    let useDeletedAtFilter = false;
    if (!includeDeleted && columnSet.has('deleted_at')) {
      useDeletedAtFilter = true;
      fragments.push('`deleted_at` IS NULL');
    }
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
    
    // Thử query với deleted_at filter, nếu lỗi thì thử lại không có filter
    try {
      const rows = await baseModel.execute(sql, values);
      const total = rows && rows.length > 0 ? parseInt(rows[0].total_count || 0) : 0;
      const data = (rows || []).map(row => {
        const { total_count, ...rest } = row;
        return rest;                           
      });
      return { data, total };
    } catch (error) {
      // Nếu lỗi liên quan đến deleted_at và đang dùng filter đó, thử lại không có filter
      if (useDeletedAtFilter && (error.message.includes('deleted_at') || error.message.includes('Unknown column'))) {
        console.log('[UserModel] ⚠️ deleted_at column may not exist, retrying without deleted_at filter');
        // Xóa filter deleted_at và thử lại
        const fragmentsWithoutDeleted = fragments.filter(f => !f.includes('deleted_at'));
        const whereClauseWithoutDeleted = fragmentsWithoutDeleted.length > 0 ? `WHERE ${fragmentsWithoutDeleted.join(' AND ')}` : '';
        const sqlWithoutDeleted = `
          SELECT 
            *,
            COUNT(*) OVER() as total_count
          FROM \`${baseModel.tableName}\`
          ${whereClauseWithoutDeleted}
          ${orderByClause}
          ${typeof limit === 'number' ? `LIMIT ${limit}` : ''}
          ${typeof offset === 'number' ? `OFFSET ${offset}` : ''}
        `;
        const rows = await baseModel.execute(sqlWithoutDeleted, values);
        const total = rows && rows.length > 0 ? parseInt(rows[0].total_count || 0) : 0;
        const data = (rows || []).map(row => {
          const { total_count, ...rest } = row;
          return rest;                           
        });
        return { data, total };
      }
      // Nếu lỗi khác, throw lại
      throw error;
    }
  };
  return {
    ...baseModel,
    findByEmail,                      
    findByUsername,                   
    findByRole,                       
    updateLastLogin,                  
    incrementFailedLoginAttempts,     
    resetFailedLoginAttempts,         
    softDelete,
    restore,
    findAllWithCount,                 
  };
};
module.exports = createUserModel;
