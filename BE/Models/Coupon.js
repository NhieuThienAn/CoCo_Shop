const createBaseModel = require('./BaseModel');

const createCouponModel = () => {
  const baseModel = createBaseModel({
    tableName: 'coupons',
    primaryKey: 'coupon_id',
    columns: [
      'coupon_id',
      'code',
      'description',
      'discount_amount',
      'discount_percent',
      'min_cart_value',
      'start_date',
      'end_date',
      'usage_limit',
      'used_count',
      'is_active',
      'applicable_categories',
      'applicable_products',
      'created_at',
    ],
  });

  const findByCode = async (code) => {
    const sql = `SELECT * FROM \`${baseModel.tableName}\` WHERE \`code\` = ? LIMIT 1`;
    const rows = await baseModel.execute(sql, [code]);
    return Array.isArray(rows) ? rows[0] || null : rows;
  };

  const findActiveCoupons = async () => {
    const now = new Date().toISOString().split('T')[0];
    const sql = `SELECT * FROM \`${baseModel.tableName}\` 
      WHERE \`is_active\` = 1 
      AND (\`start_date\` IS NULL OR \`start_date\` <= ?)
      AND (\`end_date\` IS NULL OR \`end_date\` >= ?)
      ORDER BY \`created_at\` DESC`;
    return await baseModel.execute(sql, [now, now]);
  };

  /**
   * Validate coupon using SQL WHERE clause and CASE WHEN for all validations in single query
   * This replaces JavaScript conditional checks after fetching data
   * Only min_cart_value validation needs to be done after fetching (depends on cartValue parameter)
   */
  const validateCoupon = async (code, cartValue = 0) => {
    // Use single SQL query with CASE WHEN to validate all conditions and get coupon data
    // This replaces multiple JavaScript conditional checks after fetching data
    const now = new Date();
    const nowDateTime = now.toISOString().slice(0, 19).replace('T', ' ');
    
    // Single SQL query: get coupon data and validation error in one query
    const sql = `SELECT 
      *,
      CASE 
        WHEN \`is_active\` != 1 THEN 'Mã giảm giá đã bị vô hiệu hóa'
        WHEN \`start_date\` IS NOT NULL AND \`start_date\` > ? THEN 'Mã giảm giá chưa có hiệu lực'
        WHEN \`end_date\` IS NOT NULL AND \`end_date\` < ? THEN 'Mã giảm giá đã hết hạn'
        WHEN \`usage_limit\` IS NOT NULL AND \`used_count\` >= \`usage_limit\` THEN 'Mã giảm giá đã hết lượt sử dụng'
        ELSE NULL
      END as validation_error
      FROM \`${baseModel.tableName}\`
      WHERE \`code\` = ?
      LIMIT 1`;
    
    const rows = await baseModel.execute(sql, [nowDateTime, nowDateTime, code]);
    const result = Array.isArray(rows) ? rows[0] || null : rows;
    
    if (!result) {
      return { valid: false, message: 'Mã giảm giá không tồn tại' };
    }

    // Extract validation_error and remove it from coupon data
    const { validation_error, ...coupon } = result;
    
    if (validation_error) {
      return { valid: false, message: validation_error };
    }

    // Only min_cart_value validation needs to be done after fetching (depends on cartValue parameter)
    if (coupon.min_cart_value && cartValue < coupon.min_cart_value) {
      return { valid: false, message: `Giá trị đơn hàng tối thiểu là ${coupon.min_cart_value.toLocaleString('vi-VN')} VNĐ` };
    }

    return { valid: true, message: 'Mã giảm giá hợp lệ', coupon };
  };

  const incrementUsage = async (couponId) => {
    const coupon = await baseModel.findById(couponId);
    if (coupon) {
      const newUsedCount = (coupon.used_count || 0) + 1;
      return baseModel.update(couponId, { used_count: newUsedCount });
    }
    return null;
  };

  return {
    ...baseModel,
    findByCode,
    findActiveCoupons,
    validateCoupon,
    incrementUsage,
  };
};

module.exports = createCouponModel;
