/**
 * API Types và Interfaces (JSDoc)
 * Sử dụng để hỗ trợ TypeScript hoặc IDE autocomplete
 */

/**
 * @typedef {Object} ApiResponse
 * @property {boolean} success - Trạng thái thành công
 * @property {string} message - Thông báo
 * @property {*} data - Dữ liệu trả về
 * @property {Pagination} [pagination] - Thông tin phân trang
 */

/**
 * @typedef {Object} Pagination
 * @property {number} page - Trang hiện tại
 * @property {number} limit - Số items mỗi trang
 * @property {number} total - Tổng số items
 * @property {number} totalPages - Tổng số trang
 */

/**
 * @typedef {Object} User
 * @property {number} user_id - ID user
 * @property {string} username - Username
 * @property {string} email - Email
 * @property {number} role_id - Role ID
 * @property {string} [first_name] - First name
 * @property {string} [last_name] - Last name
 * @property {string} [phone] - Phone number
 */

/**
 * @typedef {Object} Product
 * @property {number} id - Product ID
 * @property {string} name - Product name
 * @property {string} slug - Product slug
 * @property {string} sku - SKU
 * @property {number} price - Price
 * @property {number} stock_quantity - Stock quantity
 * @property {number} category_id - Category ID
 * @property {number} is_active - Is active
 * @property {string[]} [images] - Product images
 */

/**
 * @typedef {Object} CartItem
 * @property {number} cart_item_id - Cart item ID
 * @property {number} user_id - User ID
 * @property {number} product_id - Product ID
 * @property {number} quantity - Quantity
 * @property {number} unit_price - Unit price
 */

/**
 * @typedef {Object} Order
 * @property {number} order_id - Order ID
 * @property {string} order_number - Order number
 * @property {number} user_id - User ID
 * @property {number} total_amount - Total amount
 * @property {number} order_status_id - Order status ID
 * @property {string} created_at - Created date
 */

/**
 * @typedef {Object} Address
 * @property {number} address_id - Address ID
 * @property {number} user_id - User ID
 * @property {string} full_name - Full name
 * @property {string} phone - Phone number
 * @property {string} address_line1 - Address line 1
 * @property {string} [address_line2] - Address line 2
 * @property {string} city - City
 * @property {string} district - District
 * @property {string} ward - Ward
 * @property {string} province - Province
 * @property {string} [postal_code] - Postal code
 * @property {string} country - Country
 * @property {boolean} is_default_shipping - Is default shipping
 */

/**
 * @typedef {Object} Review
 * @property {number} review_id - Review ID
 * @property {number} product_id - Product ID
 * @property {number} user_id - User ID
 * @property {number} order_id - Order ID
 * @property {number} rating - Rating (1-5)
 * @property {string} comment - Comment
 * @property {string[]} [images] - Review images
 */

/**
 * @typedef {Object} Coupon
 * @property {number} coupon_id - Coupon ID
 * @property {string} code - Coupon code
 * @property {string} discount_type - Discount type (percentage/fixed)
 * @property {number} discount_value - Discount value
 * @property {number} [min_purchase] - Minimum purchase
 * @property {number} [max_discount] - Maximum discount
 * @property {string} valid_from - Valid from date
 * @property {string} valid_to - Valid to date
 * @property {boolean} is_active - Is active
 */

/**
 * @typedef {Object} Payment
 * @property {number} payment_id - Payment ID
 * @property {number} order_id - Order ID
 * @property {string} gateway - Payment gateway
 * @property {number} amount - Amount
 * @property {number} payment_status_id - Payment status ID
 * @property {string} transaction_id - Transaction ID
 * @property {string} created_at - Created date
 */

export {};

