const createBaseModel = require('./BaseModel');
const createEmailOtpModel = () => {
  const baseModel = createBaseModel({
    tableName: 'email_otps',
    primaryKey: 'otp_id',
    columns: [
      'otp_id',
      'email',
      'otp_code',
      'user_id',
      'purpose',
      'registration_data',
      'expires_at',
      'verified',
      'attempts',
      'created_at',
      'verified_at',
    ],
  });
  /**
   * Tạo OTP mới
   * @param {Object} data - { email, otp_code, user_id, purpose, expires_at, registration_data }
   */

  const create = async (data) => {
    await baseModel.execute(
      `DELETE FROM \`${baseModel.tableName}\` 
       WHERE \`email\` = ? AND \`verified\` = 0 AND \`expires_at\` < NOW()`,
      [data.email]
    );
    const sql = `
      INSERT INTO \`${baseModel.tableName}\` 
      (\`email\`, \`otp_code\`, \`user_id\`, \`purpose\`, \`registration_data\`, \`expires_at\`, \`verified\`, \`attempts\`)
      VALUES (?, ?, ?, ?, ?, ?, 0, 0)
    `;
    const result = await baseModel.execute(sql, [
      data.email,
      data.otp_code,
      data.user_id || null,
      data.purpose || 'email_verification',
      data.registration_data ? JSON.stringify(data.registration_data) : null,
      data.expires_at,
    ]);
    return result;
  };
  /**
   * Tìm OTP chưa verify và chưa hết hạn
   * @param {string} email
   * @param {string} otpCode
   * @param {string} purpose - optional
   */

  const findValidOTP = async (email, otpCode, purpose = 'email_verification') => {
    const sql = `
      SELECT * FROM \`${baseModel.tableName}\`
      WHERE \`email\` = ? 
        AND \`otp_code\` = ?
        AND \`purpose\` = ?
        AND \`verified\` = 0
        AND \`expires_at\` > NOW()
      ORDER BY \`created_at\` DESC
      LIMIT 1
    `;
    const rows = await baseModel.execute(sql, [email, otpCode, purpose]);
    return Array.isArray(rows) ? rows[0] || null : rows;
  };
  /**
   * Tìm OTP mới nhất chưa verify của email
   * @param {string} email
   * @param {string} purpose - optional
   */

  const findLatestOTP = async (email, purpose = 'email_verification') => {
    const sql = `
      SELECT * FROM \`${baseModel.tableName}\`
      WHERE \`email\` = ? 
        AND \`purpose\` = ?
        AND \`verified\` = 0
        AND \`expires_at\` > NOW()
      ORDER BY \`created_at\` DESC
      LIMIT 1
    `;
    const rows = await baseModel.execute(sql, [email, purpose]);
    return Array.isArray(rows) ? rows[0] || null : rows;
  };
  /**
   * Đánh dấu OTP đã được verify
   * @param {number} otpId
   */

  const markAsVerified = async (otpId) => {
    const sql = `
      UPDATE \`${baseModel.tableName}\`
      SET \`verified\` = 1, \`verified_at\` = NOW()
      WHERE \`otp_id\` = ?
    `;
    await baseModel.execute(sql, [otpId]);
  };
  /**
   * Tăng số lần thử sai
   * @param {number} otpId
   */

  const incrementAttempts = async (otpId) => {
    const sql = `
      UPDATE \`${baseModel.tableName}\`
      SET \`attempts\` = \`attempts\` + 1
      WHERE \`otp_id\` = ?
    `;
    await baseModel.execute(sql, [otpId]);
  };
  const cleanupExpired = async () => {
    const sql = `
      DELETE FROM \`${baseModel.tableName}\`
      WHERE \`expires_at\` < NOW() AND \`verified\` = 0
    `;
    const result = await baseModel.execute(sql, []);
    return result.affectedRows || 0;
  };
  /**
   * Đếm số lần gửi OTP trong khoảng thời gian (rate limiting)
   * @param {string} email
   * @param {number} minutes - Số phút gần đây
   */

  const countRecentOTPs = async (email, minutes = 10) => {
    const sql = `
      SELECT COUNT(*) as count
      FROM \`${baseModel.tableName}\`
      WHERE \`email\` = ?
        AND \`created_at\` > DATE_SUB(NOW(), INTERVAL ? MINUTE)
    `;
    const rows = await baseModel.execute(sql, [email, minutes]);
    return Array.isArray(rows) && rows[0] ? parseInt(rows[0].count) : 0;
  };
  return {
    ...baseModel,
    create,
    findValidOTP,
    findLatestOTP,
    markAsVerified,
    incrementAttempts,
    cleanupExpired,
    countRecentOTPs,
  };
};
module.exports = createEmailOtpModel;
