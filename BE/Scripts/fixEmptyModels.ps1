# Script to fix empty model files
$modelsDir = "D:\DuAn\DOANCUOICUNG\Do-An-Tot-Nghiep-2025\BE\Models"

# Category.js
$categoryContent = @'
const createBaseModel = require('./BaseModel');

const createCategoryModel = () => {
  const baseModel = createBaseModel({
    tableName: 'categories',
    primaryKey: 'category_id',
    columns: [
      'category_id',
      'name',
      'slug',
      'description',
      'parent_id',
      'created_at',
    ],
  });

  const findBySlug = async (slug) => {
    const sql = `SELECT * FROM \`${baseModel.tableName}\` WHERE \`slug\` = ? LIMIT 1`;
    const rows = await baseModel.execute(sql, [slug]);
    return Array.isArray(rows) ? rows[0] || null : rows;
  };

  const findByParent = async (parentId) => {
    const sql = `SELECT * FROM \`${baseModel.tableName}\` WHERE \`parent_id\` = ? ORDER BY \`name\` ASC`;
    return await baseModel.execute(sql, [parentId]);
  };

  return {
    ...baseModel,
    findBySlug,
    findByParent,
  };
};

module.exports = createCategoryModel;
'@

# Brand.js
$brandContent = @'
const createBaseModel = require('./BaseModel');

const createBrandModel = () => {
  const baseModel = createBaseModel({
    tableName: 'brands',
    primaryKey: 'brand_id',
    columns: [
      'brand_id',
      'name',
      'description',
      'created_at',
    ],
  });

  return {
    ...baseModel,
  };
};

module.exports = createBrandModel;
'@

# Order.js
$orderContent = @'
const createBaseModel = require('./BaseModel');

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

  const findByOrderNumber = async (orderNumber) => {
    const sql = `SELECT * FROM \`${baseModel.tableName}\` WHERE \`order_number\` = ? LIMIT 1`;
    const rows = await baseModel.execute(sql, [orderNumber]);
    return Array.isArray(rows) ? rows[0] || null : rows;
  };

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

  return {
    ...baseModel,
    findByOrderNumber,
    findByUserId,
    findByStatusId,
  };
};

module.exports = createOrderModel;
'@

# OrderItem.js
$orderItemContent = @'
const createBaseModel = require('./BaseModel');

const createOrderItemModel = () => {
  const baseModel = createBaseModel({
    tableName: 'orderitems',
    primaryKey: 'order_item_id',
    columns: [
      'order_item_id',
      'order_id',
      'product_id',
      'quantity',
      'unit_price',
      'total_price',
      'product_snapshot',
      'unit_price_snapshot',
      'total_price_snapshot',
    ],
  });

  const findByOrderId = async (orderId) => {
    const sql = `SELECT * FROM \`${baseModel.tableName}\` WHERE \`order_id\` = ? ORDER BY \`order_item_id\` ASC`;
    return await baseModel.execute(sql, [orderId]);
  };

  return {
    ...baseModel,
    findByOrderId,
  };
};

module.exports = createOrderItemModel;
'@

# OrderStatus.js
$orderStatusContent = @'
const createBaseModel = require('./BaseModel');

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

  const findByName = async (name) => {
    const sql = `SELECT * FROM \`${baseModel.tableName}\` WHERE \`status_name\` = ? LIMIT 1`;
    const rows = await baseModel.execute(sql, [name]);
    return Array.isArray(rows) ? rows[0] || null : rows;
  };

  const findAllOrdered = async () => {
    const sql = `SELECT * FROM \`${baseModel.tableName}\` ORDER BY \`sort_order\` ASC, \`status_id\` ASC`;
    return await baseModel.execute(sql);
  };

  return {
    ...baseModel,
    findByName,
    findAllOrdered,
  };
};

module.exports = createOrderStatusModel;
'@

# CartItem.js
$cartItemContent = @'
const createBaseModel = require('./BaseModel');

const createCartItemModel = () => {
  const baseModel = createBaseModel({
    tableName: 'cartitems',
    primaryKey: 'cart_item_id',
    columns: [
      'cart_item_id',
      'user_id',
      'product_id',
      'quantity',
      'unit_price',
      'product_snapshot',
      'unit_price_snapshot',
      'created_at',
      'updated_at',
    ],
  });

  const findByUserId = async (userId) => {
    const sql = `SELECT * FROM \`${baseModel.tableName}\` WHERE \`user_id\` = ? ORDER BY \`created_at\` DESC`;
    return await baseModel.execute(sql, [userId]);
  };

  const findByUserAndProduct = async (userId, productId) => {
    const sql = `SELECT * FROM \`${baseModel.tableName}\` WHERE \`user_id\` = ? AND \`product_id\` = ? LIMIT 1`;
    const rows = await baseModel.execute(sql, [userId, productId]);
    return Array.isArray(rows) ? rows[0] || null : rows;
  };

  const getCartTotal = async (userId) => {
    const sql = `SELECT SUM(\`quantity\` * \`unit_price\`) as total FROM \`${baseModel.tableName}\` WHERE \`user_id\` = ?`;
    const rows = await baseModel.execute(sql, [userId]);
    return rows[0]?.total || 0;
  };

  const addOrUpdate = async (userId, productId, quantity, unitPrice, productSnapshot = null) => {
    const existing = await findByUserAndProduct(userId, productId);
    
    if (existing) {
      const newQuantity = existing.quantity + quantity;
      return await baseModel.update(existing.cart_item_id, {
        quantity: newQuantity,
        unit_price: unitPrice,
        unit_price_snapshot: unitPrice,
        product_snapshot: productSnapshot ? JSON.stringify(productSnapshot) : null,
        updated_at: new Date(),
      });
    } else {
      return await baseModel.create({
        user_id: userId,
        product_id: productId,
        quantity,
        unit_price: unitPrice,
        unit_price_snapshot: unitPrice,
        product_snapshot: productSnapshot ? JSON.stringify(productSnapshot) : null,
      });
    }
  };

  const clearUserCart = async (userId) => {
    const sql = `DELETE FROM \`${baseModel.tableName}\` WHERE \`user_id\` = ?`;
    return await baseModel.execute(sql, [userId]);
  };

  return {
    ...baseModel,
    findByUserId,
    findByUserAndProduct,
    getCartTotal,
    addOrUpdate,
    clearUserCart,
  };
};

module.exports = createCartItemModel;
'@

# Payment.js
$paymentContent = @'
const createBaseModel = require('./BaseModel');

const createPaymentModel = () => {
  const baseModel = createBaseModel({
    tableName: 'payments',
    primaryKey: 'payment_id',
    columns: [
      'payment_id',
      'order_id',
      'payment_method_id',
      'gateway',
      'gateway_transaction_id',
      'gateway_status',
      'gateway_response',
      'is_captured',
      'refunded_amount',
      'attempt_count',
      'last_attempt_at',
      'metadata',
      'amount',
      'payment_status_id',
      'paid_at',
      'transaction_reference',
      'payment_logs',
      'created_at',
    ],
  });

  const findByOrderId = async (orderId) => {
    const sql = `SELECT * FROM \`${baseModel.tableName}\` WHERE \`order_id\` = ? ORDER BY \`created_at\` DESC`;
    return await baseModel.execute(sql, [orderId]);
  };

  const findByGatewayTransactionId = async (gatewayTransactionId) => {
    const sql = `SELECT * FROM \`${baseModel.tableName}\` WHERE \`gateway_transaction_id\` = ? LIMIT 1`;
    const rows = await baseModel.execute(sql, [gatewayTransactionId]);
    return Array.isArray(rows) ? rows[0] || null : rows;
  };

  return {
    ...baseModel,
    findByOrderId,
    findByGatewayTransactionId,
  };
};

module.exports = createPaymentModel;
'@

# PaymentMethod.js
$paymentMethodContent = @'
const createBaseModel = require('./BaseModel');

const createPaymentMethodModel = () => {
  const baseModel = createBaseModel({
    tableName: 'paymentmethods',
    primaryKey: 'payment_method_id',
    columns: [
      'payment_method_id',
      'method_name',
      'description',
    ],
  });

  const findByName = async (name) => {
    const sql = `SELECT * FROM \`${baseModel.tableName}\` WHERE \`method_name\` = ? LIMIT 1`;
    const rows = await baseModel.execute(sql, [name]);
    return Array.isArray(rows) ? rows[0] || null : rows;
  };

  return {
    ...baseModel,
    findByName,
  };
};

module.exports = createPaymentMethodModel;
'@

# PaymentStatus.js
$paymentStatusContent = @'
const createBaseModel = require('./BaseModel');

const createPaymentStatusModel = () => {
  const baseModel = createBaseModel({
    tableName: 'paymentstatus',
    primaryKey: 'payment_status_id',
    columns: [
      'payment_status_id',
      'status_name',
    ],
  });

  const findByName = async (name) => {
    const sql = `SELECT * FROM \`${baseModel.tableName}\` WHERE \`status_name\` = ? LIMIT 1`;
    const rows = await baseModel.execute(sql, [name]);
    return Array.isArray(rows) ? rows[0] || null : rows;
  };

  return {
    ...baseModel,
    findByName,
  };
};

module.exports = createPaymentStatusModel;
'@

# Review.js
$reviewContent = @'
const createBaseModel = require('./BaseModel');

const createReviewModel = () => {
  const baseModel = createBaseModel({
    tableName: 'reviews',
    primaryKey: 'review_id',
    columns: [
      'review_id',
      'user_id',
      'product_id',
      'rating',
      'comment',
      'created_at',
      'updated_at',
    ],
  });

  const findByProductId = async (productId, options = {}) => {
    const { limit, offset } = options;
    let sql = `SELECT * FROM \`${baseModel.tableName}\` WHERE \`product_id\` = ? ORDER BY \`created_at\` DESC`;
    if (limit) {
      sql += ` LIMIT ${parseInt(limit)}`;
      if (offset) {
        sql += ` OFFSET ${parseInt(offset)}`;
      }
    }
    return await baseModel.execute(sql, [productId]);
  };

  const findByUserId = async (userId) => {
    const sql = `SELECT * FROM \`${baseModel.tableName}\` WHERE \`user_id\` = ? ORDER BY \`created_at\` DESC`;
    return await baseModel.execute(sql, [userId]);
  };

  const findByUserAndProduct = async (userId, productId) => {
    const sql = `SELECT * FROM \`${baseModel.tableName}\` WHERE \`user_id\` = ? AND \`product_id\` = ? LIMIT 1`;
    const rows = await baseModel.execute(sql, [userId, productId]);
    return Array.isArray(rows) ? rows[0] || null : rows;
  };

  const getProductRating = async (productId) => {
    const sql = `
      SELECT 
        COUNT(*) as total_reviews,
        AVG(\`rating\`) as average_rating,
        SUM(CASE WHEN \`rating\` = 5 THEN 1 ELSE 0 END) as rating_5,
        SUM(CASE WHEN \`rating\` = 4 THEN 1 ELSE 0 END) as rating_4,
        SUM(CASE WHEN \`rating\` = 3 THEN 1 ELSE 0 END) as rating_3,
        SUM(CASE WHEN \`rating\` = 2 THEN 1 ELSE 0 END) as rating_2,
        SUM(CASE WHEN \`rating\` = 1 THEN 1 ELSE 0 END) as rating_1
      FROM \`${baseModel.tableName}\`
      WHERE \`product_id\` = ?
    `;
    const rows = await baseModel.execute(sql, [productId]);
    return rows[0] || {
      total_reviews: 0,
      average_rating: 0,
      rating_5: 0,
      rating_4: 0,
      rating_3: 0,
      rating_2: 0,
      rating_1: 0,
    };
  };

  return {
    ...baseModel,
    findByProductId,
    findByUserId,
    findByUserAndProduct,
    getProductRating,
  };
};

module.exports = createReviewModel;
'@

# Wishlist.js
$wishlistContent = @'
const createBaseModel = require('./BaseModel');

const createWishlistModel = () => {
  const baseModel = createBaseModel({
    tableName: 'wishlist',
    primaryKey: 'wishlist_id',
    columns: [
      'wishlist_id',
      'user_id',
      'product_id',
      'added_at',
    ],
  });

  const findByUserId = async (userId) => {
    const sql = `SELECT * FROM \`${baseModel.tableName}\` WHERE \`user_id\` = ? ORDER BY \`added_at\` DESC`;
    return await baseModel.execute(sql, [userId]);
  };

  const findByUserAndProduct = async (userId, productId) => {
    const sql = `SELECT * FROM \`${baseModel.tableName}\` WHERE \`user_id\` = ? AND \`product_id\` = ? LIMIT 1`;
    const rows = await baseModel.execute(sql, [userId, productId]);
    return Array.isArray(rows) ? rows[0] || null : rows;
  };

  const addToWishlist = async (userId, productId) => {
    const existing = await findByUserAndProduct(userId, productId);
    if (existing) {
      return existing;
    }
    const result = await baseModel.create({
      user_id: userId,
      product_id: productId,
    });
    return await baseModel.findById(result.insertId);
  };

  const removeFromWishlist = async (userId, productId) => {
    const sql = `DELETE FROM \`${baseModel.tableName}\` WHERE \`user_id\` = ? AND \`product_id\` = ?`;
    return await baseModel.execute(sql, [userId, productId]);
  };

  return {
    ...baseModel,
    findByUserId,
    findByUserAndProduct,
    addToWishlist,
    removeFromWishlist,
  };
};

module.exports = createWishlistModel;
'@

# Coupon.js
$couponContent = @'
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

  const validateCoupon = async (code, cartValue = 0) => {
    const coupon = await findByCode(code);
    
    if (!coupon) {
      return { valid: false, message: 'Mã giảm giá không tồn tại' };
    }

    if (!coupon.is_active) {
      return { valid: false, message: 'Mã giảm giá đã bị vô hiệu hóa' };
    }

    const now = new Date();
    if (coupon.start_date && new Date(coupon.start_date) > now) {
      return { valid: false, message: 'Mã giảm giá chưa có hiệu lực' };
    }

    if (coupon.end_date && new Date(coupon.end_date) < now) {
      return { valid: false, message: 'Mã giảm giá đã hết hạn' };
    }

    if (coupon.usage_limit && coupon.used_count >= coupon.usage_limit) {
      return { valid: false, message: 'Mã giảm giá đã hết lượt sử dụng' };
    }

    if (coupon.min_cart_value && cartValue < coupon.min_cart_value) {
      return { valid: false, message: `Giá trị đơn hàng tối thiểu là ${coupon.min_cart_value.toLocaleString('vi-VN')} VNĐ` };
    }

    return { valid: true, message: 'Mã giảm giá hợp lệ', coupon };
  };

  return {
    ...baseModel,
    findByCode,
    findActiveCoupons,
    validateCoupon,
  };
};

module.exports = createCouponModel;
'@

# TokenBlacklist.js
$tokenBlacklistContent = @'
const createBaseModel = require('./BaseModel');

const createTokenBlacklistModel = () => {
  const baseModel = createBaseModel({
    tableName: 'tokenblacklist',
    primaryKey: 'id',
    columns: [
      'id',
      'token',
      'token_type',
      'expires_at',
      'blacklisted_at',
    ],
  });

  const isTokenBlacklisted = async (token) => {
    const sql = `SELECT * FROM \`${baseModel.tableName}\` WHERE \`token\` = ? LIMIT 1`;
    const rows = await baseModel.execute(sql, [token]);
    return Array.isArray(rows) ? rows.length > 0 : false;
  };

  const addToBlacklist = async (token, tokenType = 'access', expiresAt = null) => {
    return await baseModel.create({
      token,
      token_type: tokenType,
      expires_at: expiresAt,
    });
  };

  const cleanupExpiredTokens = async () => {
    const sql = `DELETE FROM \`${baseModel.tableName}\` WHERE \`expires_at\` IS NOT NULL AND \`expires_at\` < NOW()`;
    return await baseModel.execute(sql);
  };

  return {
    ...baseModel,
    isTokenBlacklisted,
    addToBlacklist,
    cleanupExpiredTokens,
  };
};

module.exports = createTokenBlacklistModel;
'@

# Write all files
$files = @{
  'Category.js' = $categoryContent
  'Brand.js' = $brandContent
  'Order.js' = $orderContent
  'OrderItem.js' = $orderItemContent
  'OrderStatus.js' = $orderStatusContent
  'CartItem.js' = $cartItemContent
  'Payment.js' = $paymentContent
  'PaymentMethod.js' = $paymentMethodContent
  'PaymentStatus.js' = $paymentStatusContent
  'Review.js' = $reviewContent
  'Wishlist.js' = $wishlistContent
  'Coupon.js' = $couponContent
  'TokenBlacklist.js' = $tokenBlacklistContent
}

foreach ($file in $files.GetEnumerator()) {
  $filePath = Join-Path $modelsDir $file.Key
  [System.IO.File]::WriteAllText($filePath, $file.Value, [System.Text.Encoding]::UTF8)
  Write-Host "✅ Written $($file.Key)"
}

Write-Host "`n✅ All model files have been written!"

