// ============================================
// IMPORT BASE MODEL
// ============================================
// Import factory function createBaseModel từ BaseModel.js
// BaseModel cung cấp các methods CRUD cơ bản (findAll, findById, create, update, delete, etc.)
const createBaseModel = require('./BaseModel');

// ============================================
// PRODUCT MODEL FACTORY FUNCTION
// ============================================
/**
 * Tạo Product Model với các methods mở rộng cho quản lý sản phẩm
 * Product Model kế thừa tất cả methods từ BaseModel và thêm các methods riêng
 * 
 * @returns {Object} Product model object với các methods:
 * - Từ BaseModel: findAll, findById, create, update, delete, count, execute, rawQuery
 * - Riêng Product: findBySlug, findBySku, findByCategory, findActive, search, 
 *   softDelete, restore, updateStock, batchUpdateStock, parseImages, serializeImages,
 *   validateImage, addImage, removeImage, setPrimaryImage, updateImages, getPrimaryImage,
 *   findAllWithCount, getDeletedWithCount, getProductStatisticsCounts
 */
const createProductModel = () => {
  // ============================================
  // KHỞI TẠO BASE MODEL
  // ============================================
  // Tạo baseModel bằng cách gọi createBaseModel với cấu hình cho bảng products
  const baseModel = createBaseModel({
    // Tên bảng trong database
    tableName: 'products',
    
    // Primary key của bảng (cột id)
    primaryKey: 'id',
    
    // Danh sách tất cả các cột hợp lệ trong bảng products
    // Chỉ các cột trong danh sách này mới được phép insert/update (bảo mật)
    columns: [
      'id',                    // ID tự tăng (primary key)
      'product_id',            // Mã sản phẩm duy nhất (có thể là UUID hoặc custom ID)
      'name',                  // Tên sản phẩm
      'slug',                  // URL-friendly name (ví dụ: "iphone-15-pro-max")
      'short_description',     // Mô tả ngắn
      'description',           // Mô tả chi tiết
      'meta_title',            // Meta title cho SEO
      'meta_description',      // Meta description cho SEO
      'origin',                // Xuất xứ
      'manufacturer',          // Nhà sản xuất
      'tags',                  // Tags (có thể là JSON string)
      'sort_order',            // Thứ tự sắp xếp
      'brand',                 // Thương hiệu
      'category_id',          // ID danh mục (foreign key)
      'is_active',             // Trạng thái active (1 = active, 0 = inactive)
      'sku',                   // Stock Keeping Unit (mã SKU duy nhất)
      'barcode',               // Mã vạch
      'price',                 // Giá bán
      'msrp',                  // Manufacturer's Suggested Retail Price (giá niêm yết)
      'stock_quantity',       // Số lượng tồn kho
      'volume_ml',             // Thể tích (ml) - cho sản phẩm dạng lỏng
      'images',                // Hình ảnh (JSON string chứa array các image objects)
      'attributes',            // Thuộc tính (JSON string)
      'ingredients',           // Thành phần (JSON string)
      'created_at',            // Thời gian tạo
      'updated_at',            // Thời gian cập nhật
      'deleted_at',            // Thời gian xóa (soft delete - NULL = chưa xóa)
    ],
  });

  // ============================================
  // FIND BY SLUG FUNCTION: Tìm sản phẩm theo slug
  // ============================================
  /**
   * Tìm sản phẩm theo slug (URL-friendly name)
   * Slug thường được dùng trong URL: /products/iphone-15-pro-max
   * 
   * @param {string} slug - Slug của sản phẩm (ví dụ: "iphone-15-pro-max")
   * @returns {Promise<Object|null>} Product object hoặc null nếu không tìm thấy
   * 
   * Lưu ý: Chỉ trả về sản phẩm chưa bị xóa (deleted_at IS NULL)
   */
  const findBySlug = async (slug) => {
    // Xây dựng SQL query để tìm sản phẩm theo slug
    // Sử dụng prepared statement (?) để tránh SQL injection
    // LIMIT 1 để chỉ lấy 1 kết quả (tối ưu performance)
    // deleted_at IS NULL để loại bỏ sản phẩm đã bị soft delete
    const sql = `SELECT * FROM \`${baseModel.tableName}\` WHERE \`slug\` = ? AND \`deleted_at\` IS NULL LIMIT 1`;
    
    // Thực thi query với slug làm parameter
    const rows = await baseModel.execute(sql, [slug]);
    
    // Trả về product đầu tiên nếu có, nếu không trả về null
    // Kiểm tra Array.isArray để đảm bảo rows là array trước khi truy cập [0]
    return Array.isArray(rows) ? rows[0] || null : rows;
  };

  // ============================================
  // FIND BY SKU FUNCTION: Tìm sản phẩm theo SKU
  // ============================================
  /**
   * Tìm sản phẩm theo SKU (Stock Keeping Unit)
   * SKU là mã sản phẩm duy nhất dùng để quản lý kho
   * 
   * @param {string} sku - Mã SKU của sản phẩm (ví dụ: "IP15PM-256-BLK")
   * @returns {Promise<Object|null>} Product object hoặc null nếu không tìm thấy
   * 
   * Lưu ý: Chỉ trả về sản phẩm chưa bị xóa (deleted_at IS NULL)
   */
  const findBySku = async (sku) => {
    // Xây dựng SQL query để tìm sản phẩm theo SKU
    // Tương tự findBySlug nhưng tìm theo cột sku
    const sql = `SELECT * FROM \`${baseModel.tableName}\` WHERE \`sku\` = ? AND \`deleted_at\` IS NULL LIMIT 1`;
    
    // Thực thi query với sku làm parameter
    const rows = await baseModel.execute(sql, [sku]);
    
    // Trả về product đầu tiên hoặc null
    return Array.isArray(rows) ? rows[0] || null : rows;
  };

  // ============================================
  // FIND FIRST BY PRODUCT ID FUNCTION: Tìm sản phẩm theo product_id
  // ============================================
  /**
   * Tìm sản phẩm đầu tiên theo product_id (khác với id - primary key)
   * product_id có thể là UUID hoặc custom ID, không phải auto-increment id
   * 
   * @param {string|number} productId - Mã product_id của sản phẩm
   * @returns {Promise<Object|null>} Product object hoặc null nếu không tìm thấy
   * 
   * Lưu ý: 
   * - Chỉ trả về sản phẩm chưa bị xóa (deleted_at IS NULL)
   * - LIMIT 1 để đảm bảo chỉ trả về 1 kết quả (trong trường hợp có duplicate)
   */
  const findFirstByProductId = async (productId) => {
    // Xây dựng SQL query để tìm sản phẩm theo product_id
    // Tìm theo cột product_id (không phải id - primary key)
    const sql = `SELECT * FROM \`${baseModel.tableName}\` WHERE \`product_id\` = ? AND \`deleted_at\` IS NULL LIMIT 1`;
    
    // Thực thi query với productId làm parameter
    const rows = await baseModel.execute(sql, [productId]);
    
    // Trả về product đầu tiên hoặc null
    return Array.isArray(rows) ? rows[0] || null : rows;
  };

  // ============================================
  // BATCH FIND BY PRODUCT IDS FUNCTION: Tìm nhiều sản phẩm cùng lúc
  // ============================================
  /**
   * Tìm nhiều sản phẩm cùng lúc bằng cách sử dụng SQL WHERE IN
   * Thay vì thực hiện N queries riêng lẻ (trong vòng lặp), chỉ thực hiện 1 query duy nhất
   * Tối ưu performance khi cần lấy nhiều sản phẩm
   * 
   * @param {Array<string|number>} productIds - Mảng các product_id cần tìm
   * @returns {Promise<Array>} Mảng các product objects
   * 
   * Ví dụ:
   * - Input: ['PROD-001', 'PROD-002', 'PROD-003']
   * - Output: [product1, product2, product3]
   * 
   * Performance: O(1) query thay vì O(N) queries
   */
  const findByProductIds = async (productIds) => {
    // Kiểm tra input có phải array và có phần tử không
    if (!Array.isArray(productIds) || productIds.length === 0) {
      return [];
    }
    
    // Loại bỏ các giá trị falsy (null, undefined, '', 0, false) và duplicate
    // Sử dụng Set để loại bỏ duplicate, sau đó spread về array
    // Ví dụ: [1, 2, 2, null, 3] => [1, 2, 3]
    const uniqueProductIds = [...new Set(productIds.filter(Boolean))];
    
    // Nếu sau khi filter không còn gì, trả về mảng rỗng
    if (uniqueProductIds.length === 0) {
      return [];
    }
    
    // Tạo placeholders cho SQL WHERE IN clause
    // Ví dụ: uniqueProductIds = [1, 2, 3] => placeholders = "?,?,?"
    const placeholders = uniqueProductIds.map(() => '?').join(',');
    
    // Xây dựng SQL query với WHERE IN
    // WHERE IN cho phép tìm nhiều giá trị trong 1 query
    // ORDER BY để đảm bảo thứ tự kết quả
    const sql = `SELECT * FROM \`${baseModel.tableName}\` WHERE \`product_id\` IN (${placeholders}) AND \`deleted_at\` IS NULL ORDER BY \`product_id\` ASC`;
    
    // Thực thi query với mảng uniqueProductIds làm parameters
    // MySQL sẽ bind từng giá trị vào các ? tương ứng
    return await baseModel.execute(sql, uniqueProductIds);
  };

  // ============================================
  // FIND BY PRODUCT IDS AS MAP FUNCTION: Trả về dạng map object
  // ============================================
  /**
   * Tìm nhiều sản phẩm và trả về dạng map object (dictionary)
   * Key là product_id, value là product object
   * Hữu ích khi cần lookup nhanh product theo product_id (O(1) lookup)
   * 
   * @param {Array<string|number>} productIds - Mảng các product_id cần tìm
   * @returns {Promise<Object>} Object với product_id làm key
   * 
   * Ví dụ:
   * - Input: ['PROD-001', 'PROD-002']
   * - Output: { 'PROD-001': product1, 'PROD-002': product2 }
   * 
   * Sử dụng: const product = productMap['PROD-001'] // O(1) lookup
   */
  const findByProductIdsAsMap = async (productIds) => {
    // Gọi hàm findByProductIds để lấy mảng products
    const products = await findByProductIds(productIds);
    
    // Tạo object rỗng để làm map
    const productMap = {};
    
    // Duyệt qua từng product và thêm vào map với product_id làm key
    // Sử dụng forEach để tạo map: { product_id: product, ... }
    (products || []).forEach(product => {
      productMap[product.product_id] = product;
    });
    
    // Trả về map object
    return productMap;
  };

  // ============================================
  // FIND BY CATEGORY FUNCTION: Tìm sản phẩm theo danh mục
  // ============================================
  /**
   * Tìm tất cả sản phẩm thuộc một danh mục cụ thể
   * Chỉ trả về sản phẩm đang active và chưa bị xóa
   * 
   * @param {number} categoryId - ID của danh mục
   * @param {Object} options - Tùy chọn pagination và sorting
   * @param {number} options.limit - Số lượng records tối đa
   * @param {number} options.offset - Số lượng records bỏ qua
   * @param {string} options.orderBy - Câu lệnh ORDER BY (mặc định: 'sort_order ASC, created_at DESC')
   * @returns {Promise<Array>} Mảng các sản phẩm
   */
  const findByCategory = async (categoryId, options = {}) => {
    // Destructure options với giá trị mặc định
    const { limit, offset, orderBy = 'sort_order ASC, created_at DESC' } = options;
    
    // Sử dụng số 1 thay vì boolean true để match với database tinyint(1) format
    // MySQL lưu boolean dưới dạng tinyint(1): 1 = true, 0 = false
    return baseModel.findAll({
      // Filters: chỉ lấy sản phẩm thuộc category, đang active, và chưa bị xóa
      filters: { category_id: categoryId, is_active: 1, deleted_at: null },
      limit,      // Giới hạn số lượng
      offset,     // Bỏ qua số lượng (cho pagination)
      orderBy,    // Sắp xếp theo sort_order trước, sau đó created_at
    });
  };

  // ============================================
  // FIND ACTIVE FUNCTION: Tìm tất cả sản phẩm đang active
  // ============================================
  /**
   * Tìm tất cả sản phẩm đang active (is_active = 1) và chưa bị xóa
   * Dùng để hiển thị sản phẩm cho khách hàng
   * 
   * @param {Object} options - Tùy chọn pagination và sorting
   * @param {number} options.limit - Số lượng records tối đa
   * @param {number} options.offset - Số lượng records bỏ qua
   * @param {string} options.orderBy - Câu lệnh ORDER BY (mặc định: 'sort_order ASC, created_at DESC')
   * @returns {Promise<Array>} Mảng các sản phẩm đang active
   */
  const findActive = async (options = {}) => {
    // Destructure options với giá trị mặc định
    const { limit, offset, orderBy = 'sort_order ASC, created_at DESC' } = options;
    
    // Sử dụng số 1 để match với database tinyint(1) format
    return baseModel.findAll({
      // Filters: chỉ lấy sản phẩm đang active và chưa bị xóa
      filters: { is_active: 1, deleted_at: null },
      limit,
      offset,
      orderBy,
    });
  };

  // ============================================
  // SEARCH FUNCTION: Tìm kiếm sản phẩm theo từ khóa
  // ============================================
  /**
   * Tìm kiếm sản phẩm theo từ khóa trong tên, mô tả, hoặc SKU
   * Sử dụng SQL LIKE với wildcard % để tìm kiếm partial match
   * 
   * @param {string} keyword - Từ khóa tìm kiếm
   * @param {Object} options - Tùy chọn pagination
   * @param {number} options.limit - Số lượng records tối đa
   * @param {number} options.offset - Số lượng records bỏ qua
   * @returns {Promise<Array>} Mảng các sản phẩm khớp với từ khóa
   * 
   * Ví dụ:
   * - keyword = "iphone" => Tìm trong name, description, sku có chứa "iphone"
   * - Kết quả: ["iPhone 15", "iPhone 15 Pro", "IPHONE-15-SKU"]
   */
  const search = async (keyword, options = {}) => {
    // Destructure options
    const { limit, offset } = options;
    
    // Xây dựng SQL query với LIKE cho tìm kiếm partial match
    // Tìm trong 3 cột: name, description, sku
    // Chỉ lấy sản phẩm active và chưa bị xóa
    const sql = `SELECT * FROM \`${baseModel.tableName}\` 
      WHERE (\`name\` LIKE ? OR \`description\` LIKE ? OR \`sku\` LIKE ?) 
      AND \`is_active\` = 1 AND \`deleted_at\` IS NULL
      ORDER BY \`sort_order\` ASC, \`created_at\` DESC
      ${limit ? `LIMIT ${limit}` : ''} ${offset ? `OFFSET ${offset}` : ''}`;
    
    // Tạo search term với wildcard % ở đầu và cuối
    // Ví dụ: "iphone" => "%iphone%" (tìm bất kỳ đâu trong chuỗi)
    const searchTerm = `%${keyword}%`;
    
    // Thực thi query với 3 searchTerm (cho 3 cột: name, description, sku)
    return baseModel.execute(sql, [searchTerm, searchTerm, searchTerm]);
  };

  // ============================================
  // SOFT DELETE FUNCTION: Xóa mềm sản phẩm
  // ============================================
  /**
   * Xóa mềm sản phẩm (soft delete)
   * Thay vì xóa thật khỏi database, chỉ set deleted_at = current timestamp
   * Lợi ích: Có thể khôi phục sau, không mất dữ liệu, giữ được lịch sử
   * 
   * @param {number} id - ID của sản phẩm cần xóa
   * @returns {Promise<Object>} Kết quả update
   */
  const softDelete = async (id) => {
    // Update sản phẩm với deleted_at = thời gian hiện tại
    // Sản phẩm vẫn còn trong database nhưng không hiển thị trong queries thông thường
    return baseModel.update(id, { deleted_at: new Date() });
  };

  // ============================================
  // RESTORE FUNCTION: Khôi phục sản phẩm đã xóa
  // ============================================
  /**
   * Khôi phục sản phẩm đã bị xóa mềm
   * Set deleted_at = null để sản phẩm hiển thị lại bình thường
   * 
   * @param {number} id - ID của sản phẩm cần khôi phục
   * @returns {Promise<Object>} Kết quả update
   */
  const restore = async (id) => {
    // Update sản phẩm với deleted_at = null
    // Sản phẩm sẽ hiển thị lại trong các queries
    return baseModel.update(id, { deleted_at: null });
  };

  // ============================================
  // UPDATE STOCK FUNCTION: Cập nhật tồn kho
  // ============================================
  /**
   * Cập nhật tồn kho của sản phẩm (tăng hoặc giảm)
   * Tính toán stock mới = stock hiện tại + quantityChange
   * Đảm bảo stock không bao giờ âm (Math.max(0, ...))
   * 
   * @param {number} productId - ID của sản phẩm
   * @param {number} quantityChange - Số lượng thay đổi (dương = tăng, âm = giảm)
   * @returns {Promise<Object>} Kết quả update hoặc undefined nếu không tìm thấy sản phẩm
   * 
   * Ví dụ:
   * - productId = 1, quantityChange = 10 => Tăng 10 sản phẩm
   * - productId = 1, quantityChange = -5 => Giảm 5 sản phẩm
   * - Nếu stock hiện tại = 3, quantityChange = -10 => stock mới = 0 (không âm)
   */
  const updateStock = async (productId, quantityChange) => {
    // Tìm sản phẩm theo ID
    const product = await baseModel.findById(productId);
    
    // Nếu tìm thấy sản phẩm
    if (product) {
      // Tính stock mới = stock hiện tại + thay đổi
      // Math.max(0, ...) đảm bảo stock không bao giờ âm
      // (product.stock_quantity || 0) xử lý trường hợp stock_quantity là null/undefined
      const newStock = Math.max(0, (product.stock_quantity || 0) + quantityChange);
      
      // Cập nhật stock mới vào database
      return baseModel.update(productId, { stock_quantity: newStock });
    }
    // Nếu không tìm thấy, trả về undefined (không throw error)
  };

  // ============================================
  // BATCH UPDATE STOCK FUNCTION: Cập nhật tồn kho hàng loạt
  // ============================================
  /**
   * Cập nhật tồn kho cho nhiều sản phẩm cùng lúc bằng SQL UPDATE với CASE WHEN
   * Thay vì thực hiện N queries UPDATE riêng lẻ, chỉ thực hiện 1 query duy nhất
   * Tối ưu performance khi cần update nhiều sản phẩm
   * 
   * @param {Array<Object>} updates - Mảng các object chứa product_id và quantity_change
   * @param {string|number} updates[].product_id - ID của sản phẩm
   * @param {number} updates[].quantity_change - Số lượng thay đổi (dương = tăng, âm = giảm)
   * @returns {Promise<void>} Không trả về giá trị
   * 
   * Ví dụ input:
   * [
   *   { product_id: 'PROD-001', quantity_change: 10 },  // Tăng 10
   *   { product_id: 'PROD-002', quantity_change: -5 },  // Giảm 5
   *   { product_id: 'PROD-003', quantity_change: 20 }   // Tăng 20
   * ]
   * 
   * Performance: O(1) query thay vì O(N) queries
   */
  const batchUpdateStock = async (updates) => {
    // Kiểm tra input có phải array và có phần tử không
    if (!Array.isArray(updates) || updates.length === 0) {
      return;
    }

    // ============================================
    // BƯỚC 1: Lấy danh sách product_ids và fetch stock hiện tại
    // ============================================
    // Extract product_ids từ updates array
    // filter(Boolean) loại bỏ các giá trị falsy
    const productIds = updates.map(u => u.product_id).filter(Boolean);
    
    // Nếu không có product_id hợp lệ, return
    if (productIds.length === 0) {
      return;
    }

    // Loại bỏ duplicate product_ids
    const uniqueProductIds = [...new Set(productIds)];
    
    // Tạo placeholders cho SQL WHERE IN
    const placeholders = uniqueProductIds.map(() => '?').join(',');

    // Batch fetch stock hiện tại của tất cả sản phẩm trong 1 query
    // Chỉ lấy product_id và stock_quantity để tối ưu
    // Sử dụng WHERE IN để lấy nhiều sản phẩm cùng lúc
    const [currentStockRows] = await baseModel.execute(
      `SELECT \`product_id\`, \`stock_quantity\` FROM \`${baseModel.tableName}\` WHERE \`product_id\` IN (${placeholders})`,
      uniqueProductIds
    );

    // ============================================
    // BƯỚC 2: Tạo map để lookup stock hiện tại nhanh (O(1))
    // ============================================
    // Tạo object map: { product_id: stock_quantity, ... }
    // Giúp lookup stock hiện tại nhanh khi tính stock mới
    const stockMap = {};
    (currentStockRows || []).forEach(row => {
      // Parse stock_quantity sang integer, mặc định 0 nếu null/undefined
      stockMap[row.product_id] = parseInt(row.stock_quantity || 0);
    });

    // ============================================
    // BƯỚC 3: Xây dựng CASE WHEN clauses cho batch UPDATE
    // ============================================
    // CASE WHEN cho phép update nhiều rows với giá trị khác nhau trong 1 query
    // Ví dụ: 
    // CASE 
    //   WHEN product_id = 'PROD-001' THEN 50
    //   WHEN product_id = 'PROD-002' THEN 30
    //   ELSE stock_quantity
    // END
    const caseClauses = [];
    const updateProductIds = [];

    // Duyệt qua từng update để tính stock mới và tạo CASE WHEN clause
    updates.forEach(update => {
      const productId = update.product_id;
      // Parse quantity_change sang integer, mặc định 0
      const quantityChange = parseInt(update.quantity_change || 0);
      
      // Lấy stock hiện tại từ map (O(1) lookup)
      const currentStock = stockMap[productId] || 0;
      
      // Tính stock mới, đảm bảo không âm
      const newStock = Math.max(0, currentStock + quantityChange);

      // Thêm CASE WHEN clause: "WHEN `product_id` = ? THEN ?"
      caseClauses.push(`WHEN \`product_id\` = ? THEN ?`);
      
      // Thêm productId và newStock vào mảng parameters
      // Thứ tự: productId, newStock, productId, newStock, ...
      updateProductIds.push(productId, newStock);
    });

    // Nếu không có case clauses, return
    if (caseClauses.length === 0) {
      return;
    }

    // ============================================
    // BƯỚC 4: Xây dựng và thực thi SQL UPDATE với CASE WHEN
    // ============================================
    // Nối các CASE WHEN clauses lại với nhau
    const caseClause = caseClauses.join(' ');
    
    // Tạo placeholders cho WHERE IN clause
    const wherePlaceholders = uniqueProductIds.map(() => '?').join(',');

    // Xây dựng SQL UPDATE với CASE WHEN
    // SET stock_quantity = CASE ... ELSE stock_quantity END
    // ELSE stock_quantity: giữ nguyên giá trị cũ nếu không match CASE nào
    const sql = `
      UPDATE \`${baseModel.tableName}\`
      SET \`stock_quantity\` = CASE ${caseClause} ELSE \`stock_quantity\` END
      WHERE \`product_id\` IN (${wherePlaceholders})
    `;

    // Thực thi query
    // Parameters: [...updateProductIds, ...uniqueProductIds]
    // - updateProductIds: [productId1, newStock1, productId2, newStock2, ...]
    // - uniqueProductIds: [productId1, productId2, ...] (cho WHERE IN)
    await baseModel.execute(sql, [...updateProductIds, ...uniqueProductIds]);
  };

  // ============================================
  // PARSE IMAGES FUNCTION: Parse images từ database
  // ============================================
  /**
   * Parse images từ database (có thể là JSON string, Buffer, hoặc Array)
   * Normalize format để hỗ trợ cả format cũ và mới:
   * - Format cũ: { image_url, alt_text, sort_order }
   * - Format mới: { url, alt, order, is_primary }
   * 
   * @param {string|Buffer|Array} images - Images từ database
   * @returns {Array} Mảng các image objects đã được normalize
   * 
   * Format output:
   * [
   *   { url: '...', alt: '...', is_primary: true, order: 0 },
   *   { url: '...', alt: '...', is_primary: false, order: 1 }
   * ]
   */
  const parseImages = (images) => {
    // ============================================
    // BƯỚC 1: Log thông tin images để debug
    // ============================================
    // Log để biết images có dữ liệu không, kiểu dữ liệu là gì
    console.log('[Product Model] 🔍 parseImages called:', {
      hasImages: !!images,                    // Có images không (boolean)
      imagesType: typeof images,              // Kiểu dữ liệu (string, object, etc.)
      isBuffer: Buffer.isBuffer(images),       // Có phải Buffer không
      isArray: Array.isArray(images),         // Có phải Array không
      imagesValue: typeof images === 'string' 
        ? (images.length > 200 ? images.substring(0, 200) + '...' : images)  // Chỉ log 200 ký tự đầu nếu quá dài
        : images,
    });
    
    // ============================================
    // BƯỚC 2: Kiểm tra images có tồn tại không
    // ============================================
    // Nếu không có images (null, undefined, empty string), trả về mảng rỗng
    if (!images) {
      console.log('[Product Model] No images, returning empty array');
      return [];
    }
    
    // Biến để lưu parsed images
    let parsed = null;
    
    // ============================================
    // BƯỚC 3: Parse images tùy theo kiểu dữ liệu
    // ============================================
    
    // CASE 1: images là JSON string
    // Database thường lưu JSON dưới dạng TEXT/VARCHAR
    if (typeof images === 'string') {
      try {
        // Parse JSON string thành JavaScript object/array
        // Ví dụ: '{"url":"..."}' => {url: "..."}
        parsed = JSON.parse(images);
        console.log('[Product Model] ✅ Parsed JSON string:', {
          isArray: Array.isArray(parsed),     // Có phải array không
          count: Array.isArray(parsed) ? parsed.length : 0,  // Số lượng images
        });
      } catch (e) {
        // Nếu parse JSON fail (JSON không hợp lệ), log lỗi và trả về mảng rỗng
        console.error('[Product Model] ❌ Error parsing JSON string:', e);
        console.error('[Product Model] Images string:', images.substring(0, 200));
        return [];
      }
    } 
    // CASE 2: images là Buffer
    // Một số database driver trả về JSON dưới dạng Buffer
    else if (Buffer.isBuffer(images)) {
      try {
        // Convert Buffer sang string (UTF-8), sau đó parse JSON
        // Ví dụ: Buffer('{"url":"..."}') => '{"url":"..."}' => {url: "..."}
        parsed = JSON.parse(images.toString('utf8'));
        console.log('[Product Model] ✅ Parsed Buffer:', {
          isArray: Array.isArray(parsed),
          count: Array.isArray(parsed) ? parsed.length : 0,
        });
      } catch (e) {
        // Nếu parse fail, log lỗi và trả về mảng rỗng
        console.error('[Product Model] ❌ Error parsing Buffer:', e);
        return [];
      }
    } 
    // CASE 3: images đã là Array
    // Trường hợp images đã được parse sẵn (từ cache hoặc đã xử lý trước đó)
    else if (Array.isArray(images)) {
      console.log('[Product Model] ✅ Images is already array:', {
        count: images.length,
      });
      // Sử dụng trực tiếp, không cần parse
      parsed = images;
    } 
    // CASE 4: Kiểu dữ liệu không hỗ trợ
    // Trường hợp images có kiểu dữ liệu không mong đợi (number, boolean, etc.)
    else {
      console.log('[Product Model] ⚠️  Unknown images type, returning empty array');
      return [];
    }
    
    // ============================================
    // BƯỚC 4: Normalize format - Chuẩn hóa format images
    // ============================================
    // Hỗ trợ cả format cũ và mới để tương thích ngược
    // Format cũ: { image_url, alt_text, sort_order }
    // Format mới: { url, alt, order, is_primary }
    if (Array.isArray(parsed)) {
      // Map qua từng image để normalize
      const normalized = parsed.map((img, index) => {
        // Tạo image object đã được normalize
        const normalizedImg = {
          // url: Ưu tiên url mới, nếu không có thì dùng image_url cũ, nếu không có thì ''
          url: img.url || img.image_url || '',
          
          // alt: Ưu tiên alt mới, nếu không có thì dùng alt_text cũ, nếu không có thì ''
          alt: img.alt || img.alt_text || '',
          
          // is_primary: 
          // - Nếu là true hoặc 1 => true
          // - Nếu là image đầu tiên và chỉ có 1 image => true (tự động set primary)
          // - Ngược lại => false
          is_primary: img.is_primary === true || img.is_primary === 1 || (index === 0 && parsed.length === 1),
          
          // order: 
          // - Ưu tiên order mới (parse sang integer)
          // - Nếu không có thì dùng sort_order cũ (parse sang integer)
          // - Nếu không có thì dùng index (vị trí trong array)
          order: img.order !== undefined ? parseInt(img.order) : (img.sort_order !== undefined ? parseInt(img.sort_order) : index),
        };
        
        // Giữ lại id nếu có (để reference sau này)
        if (img.id !== undefined) {
          normalizedImg.id = img.id;
        }
        
        // Log từng image đã normalize để debug
        console.log(`[Product Model] Normalized image ${index + 1}:`, {
          url: normalizedImg.url.length > 50 ? normalizedImg.url.substring(0, 50) + '...' : normalizedImg.url,
          alt: normalizedImg.alt,
          is_primary: normalizedImg.is_primary,
          order: normalizedImg.order,
        });
        
        // Trả về image đã normalize
        return normalizedImg;
      });
      
      // Log tổng số images đã normalize
      console.log('[Product Model] ✅ Images normalized:', {
        count: normalized.length,
      });
      
      // Trả về mảng images đã normalize
      return normalized;
    }
    
    // Nếu parsed không phải array, trả về mảng rỗng
    return [];
  };

  // ============================================
  // SERIALIZE IMAGES FUNCTION: Convert images array thành JSON string
  // ============================================
  /**
   * Serialize (chuyển đổi) mảng images thành JSON string để lưu vào database
   * Database lưu images dưới dạng JSON string trong cột TEXT/JSON
   * 
   * @param {Array} images - Mảng các image objects
   * @returns {string|null} JSON string hoặc null nếu invalid
   * 
   * Ví dụ input:
   * [
   *   { url: 'https://...', alt: 'Image 1', is_primary: true, order: 0 }
   * ]
   * 
   * Ví dụ output:
   * '{"url":"https://...","alt":"Image 1","is_primary":true,"order":0}'
   */
  const serializeImages = (images) => {
    console.log('[Product Model] 🔍 serializeImages called:', {
      hasImages: !!images,
      isArray: Array.isArray(images),
      count: Array.isArray(images) ? images.length : 0,
      images: Array.isArray(images) 
        ? images.map(img => ({
            url: img.url ? (img.url.length > 50 ? img.url.substring(0, 50) + '...' : img.url) : 'no url',
            alt: img.alt,
            is_primary: img.is_primary,
            order: img.order,
          }))
        : images,
    });
    
    if (!images || !Array.isArray(images)) {
      console.log('[Product Model] ⚠️  Invalid images, returning null');
      return null;
    }
    
    try {
      const serialized = JSON.stringify(images);
      console.log('[Product Model] ✅ Serialized images:', {
        length: serialized.length,
        preview: serialized.length > 200 ? serialized.substring(0, 200) + '...' : serialized,
      });
      return serialized;
    } catch (e) {
      console.error('[Product Model] ❌ Error serializing images:', e);
      return null;
    }
  };

  // ============================================
  // VALIDATE IMAGE FUNCTION: Kiểm tra image object hợp lệ
  // ============================================
  /**
   * Validate image object trước khi lưu vào database
   * Kiểm tra: image là object, có url hợp lệ (không rỗng)
   * Hỗ trợ: data URL (base64), absolute URL, relative path
   * 
   * @param {Object} image - Image object cần validate
   * @returns {boolean} true nếu hợp lệ, false nếu không
   * 
   * Các trường hợp hợp lệ:
   * - data:image/png;base64,... (base64 image)
   * - https://example.com/image.jpg (absolute URL)
   * - /images/product.jpg (absolute path)
   * - ./images/product.jpg (relative path)
   */
  const validateImage = (image) => {
    console.log('[Product Model] 🔍 validateImage called:', {
      hasImage: !!image,
      imageType: typeof image,
      isObject: typeof image === 'object' && image !== null,
      hasUrl: !!image?.url,
      urlType: typeof image?.url,
      urlValue: image?.url ? (image.url.length > 100 ? image.url.substring(0, 100) + '...' : image.url) : null,
      urlLength: image?.url?.length || 0,
    });
    
    if (!image || typeof image !== 'object') {
      console.log('[Product Model] ❌ Validation failed: Not an object');
      return false;
    }
    
    if (!image.url || typeof image.url !== 'string') {
      console.log('[Product Model] ❌ Validation failed: Missing or invalid URL');
      return false;
    }
    
    if (image.url.trim().length === 0) {
      console.log('[Product Model] ❌ Validation failed: Empty URL');
      return false;
    }
    
    const trimmedUrl = image.url.trim();
    console.log('[Product Model] Checking URL format:', {
      trimmedUrl: trimmedUrl.length > 100 ? trimmedUrl.substring(0, 100) + '...' : trimmedUrl,
      isDataUrl: trimmedUrl.startsWith('data:'),
      isAbsolutePath: trimmedUrl.startsWith('/'),
      isRelativePath: trimmedUrl.startsWith('./'),
    });
    
    // Accept data URLs (base64 images)
    if (trimmedUrl.startsWith('data:')) {
      console.log('[Product Model] ✅ Validation passed: Data URL (base64)');
      return true;
    }
    
    // Validate URL format
    try {
      new URL(trimmedUrl);
      console.log('[Product Model] ✅ Validation passed: Valid absolute URL');
      return true;
    } catch (e) {
      // Nếu không phải URL hợp lệ, có thể là relative path
      if (trimmedUrl.startsWith('/') || trimmedUrl.startsWith('./')) {
        console.log('[Product Model] ✅ Validation passed: Relative path');
        return true;
      }
      console.log('[Product Model] ❌ Validation failed: Invalid URL format');
      return false;
    }
  };

  // ============================================
  // ADD IMAGE FUNCTION: Thêm image vào sản phẩm
  // ============================================
  /**
   * Thêm một image mới vào sản phẩm
   * Tự động set primary nếu là image đầu tiên
   * Tự động sắp xếp theo order
   * 
   * @param {number} productId - ID của sản phẩm
   * @param {Object} imageData - Image object cần thêm
   * @param {string} imageData.url - URL của image (bắt buộc)
   * @param {string} imageData.alt - Alt text (tùy chọn)
   * @param {boolean} imageData.is_primary - Có phải primary image không (tùy chọn)
   * @param {number} imageData.order - Thứ tự hiển thị (tùy chọn)
   * @returns {Promise<Array>} Mảng images sau khi thêm
   */
  const addImage = async (productId, imageData) => {
    const product = await baseModel.findById(productId);
    if (!product) return null;

    if (!validateImage(imageData)) {
      throw new Error('Image data không hợp lệ. Cần có url.');
    }

    const images = parseImages(product.images);
    
    // Kiểm tra image đã tồn tại chưa
    if (images.some(img => img.url === imageData.url)) {
      throw new Error('Image đã tồn tại');
    }

    // Thêm image mới
    const newImage = {
      url: imageData.url.trim(),
      alt: imageData.alt || '',
      is_primary: imageData.is_primary === true || images.length === 0, // Nếu là image đầu tiên thì set primary
      order: imageData.order !== undefined ? parseInt(imageData.order) : images.length,
    };

    // Nếu set primary, bỏ primary của các image khác
    if (newImage.is_primary) {
      images.forEach(img => { img.is_primary = false; });
    }

    images.push(newImage);

    // Sắp xếp theo order
    images.sort((a, b) => (a.order || 0) - (b.order || 0));

    await baseModel.update(productId, { images: serializeImages(images) });
    return images;
  };

  // ============================================
  // REMOVE IMAGE FUNCTION: Xóa image khỏi sản phẩm
  // ============================================
  /**
   * Xóa một image khỏi sản phẩm theo URL
   * Nếu xóa primary image, tự động set image đầu tiên làm primary
   * 
   * @param {number} productId - ID của sản phẩm
   * @param {string} imageUrl - URL của image cần xóa
   * @returns {Promise<Array>} Mảng images sau khi xóa
   * @throws {Error} Nếu image không tồn tại
   */
  const removeImage = async (productId, imageUrl) => {
    const product = await baseModel.findById(productId);
    if (!product) return null;

    const images = parseImages(product.images);
    const filteredImages = images.filter(img => img.url !== imageUrl);

    if (filteredImages.length === images.length) {
      throw new Error('Image không tồn tại');
    }

    // Nếu xóa primary image, set image đầu tiên làm primary
    const removedWasPrimary = images.find(img => img.url === imageUrl)?.is_primary;
    if (removedWasPrimary && filteredImages.length > 0) {
      filteredImages[0].is_primary = true;
    }

    await baseModel.update(productId, { images: serializeImages(filteredImages) });
    return filteredImages;
  };

  // ============================================
  // SET PRIMARY IMAGE FUNCTION: Đặt image làm primary
  // ============================================
  /**
   * Đặt một image làm primary image (hình ảnh chính)
   * Tự động bỏ primary của các image khác
   * 
   * @param {number} productId - ID của sản phẩm
   * @param {string} imageUrl - URL của image cần set primary
   * @returns {Promise<Array>} Mảng images sau khi update
   * @throws {Error} Nếu image không tồn tại
   */
  const setPrimaryImage = async (productId, imageUrl) => {
    const product = await baseModel.findById(productId);
    if (!product) return null;

    const images = parseImages(product.images);
    const targetImage = images.find(img => img.url === imageUrl);

    if (!targetImage) {
      throw new Error('Image không tồn tại');
    }

    // Bỏ primary của tất cả images
    images.forEach(img => { img.is_primary = false; });
    
    // Set primary cho image được chọn
    targetImage.is_primary = true;

    await baseModel.update(productId, { images: serializeImages(images) });
    return images;
  };

  // ============================================
  // UPDATE IMAGES FUNCTION: Cập nhật toàn bộ danh sách images
  // ============================================
  /**
   * Cập nhật toàn bộ danh sách images của sản phẩm
   * Validate tất cả images, normalize format, kiểm tra kích thước
   * Tự động set primary nếu không có
   * 
   * @param {number} productId - ID của sản phẩm
   * @param {Array} imagesArray - Mảng các image objects mới
   * @returns {Promise<Array>} Mảng images đã được normalize
   * @throws {Error} Nếu images không hợp lệ hoặc quá lớn (>10MB)
   */
  const updateImages = async (productId, imagesArray) => {
    console.log('[Product Model] 🔍 updateImages called:', {
      productId,
      imagesArrayLength: imagesArray?.length || 0,
      isArray: Array.isArray(imagesArray),
      imagesArray: imagesArray?.map((img, idx) => ({
        index: idx,
        url: img.url ? (img.url.length > 50 ? img.url.substring(0, 50) + '...' : img.url) : 'no url',
        urlLength: img.url?.length || 0,
        alt: img.alt,
        is_primary: img.is_primary,
        order: img.order,
      })) || [],
    });
    
    if (!Array.isArray(imagesArray)) {
      console.log('[Product Model] ❌ updateImages failed: Not an array');
      throw new Error('Images phải là một mảng');
    }

    // Validate tất cả images
    console.log('[Product Model] Validating images...');
    for (let i = 0; i < imagesArray.length; i++) {
      const img = imagesArray[i];
      console.log(`[Product Model] Validating image ${i + 1}/${imagesArray.length}:`, {
        url: img.url ? (img.url.length > 50 ? img.url.substring(0, 50) + '...' : img.url) : 'no url',
        alt: img.alt,
        is_primary: img.is_primary,
        order: img.order,
      });
      
      if (!validateImage(img)) {
        console.log(`[Product Model] ❌ Image ${i + 1} validation failed`);
        throw new Error(`Image không hợp lệ tại vị trí ${i + 1}: ${JSON.stringify(img)}`);
      }
      console.log(`[Product Model] ✅ Image ${i + 1} validation passed`);
    }

    // Đảm bảo có ít nhất một primary image
    const hasPrimary = imagesArray.some(img => img.is_primary === true);
    console.log('[Product Model] Primary image check:', {
      hasPrimary,
      imagesCount: imagesArray.length,
    });
    
    if (imagesArray.length > 0 && !hasPrimary) {
      console.log('[Product Model] No primary image found, setting first image as primary');
      imagesArray[0].is_primary = true;
    }

    // Normalize images
    console.log('[Product Model] Normalizing images...');
    const normalizedImages = imagesArray.map((img, index) => {
      const normalized = {
        url: img.url.trim(),
        alt: img.alt || '',
        is_primary: img.is_primary === true,
        order: img.order !== undefined ? parseInt(img.order) : index,
      };
      console.log(`[Product Model] Normalized image ${index + 1}:`, {
        url: normalized.url.length > 50 ? normalized.url.substring(0, 50) + '...' : normalized.url,
        urlLength: normalized.url.length,
        alt: normalized.alt,
        is_primary: normalized.is_primary,
        order: normalized.order,
      });
      return normalized;
    });

    // Sắp xếp theo order
    normalizedImages.sort((a, b) => (a.order || 0) - (b.order || 0));
    console.log('[Product Model] Images sorted by order');

    console.log('[Product Model] Saving images to database...');
    
    // Check size before serializing
    let totalSize = 0;
    normalizedImages.forEach((img, idx) => {
      const size = img.url ? img.url.length : 0;
      totalSize += size;
      console.log(`[Product Model] Image ${idx + 1} size before save:`, {
        sizeBytes: size,
        sizeKB: (size / 1024).toFixed(2),
        sizeMB: (size / (1024 * 1024)).toFixed(2),
      });
    });
    
    console.log('[Product Model] Total images size before save:', {
      totalSizeBytes: totalSize,
      totalSizeKB: (totalSize / 1024).toFixed(2),
      totalSizeMB: (totalSize / (1024 * 1024)).toFixed(2),
    });
    
    const serialized = serializeImages(normalizedImages);
    console.log('[Product Model] Serialized images for database:', {
      hasSerialized: !!serialized,
      serializedLength: serialized?.length || 0,
      serializedSizeKB: serialized ? (serialized.length / 1024).toFixed(2) : 0,
      serializedSizeMB: serialized ? (serialized.length / (1024 * 1024)).toFixed(2) : 0,
    });
    
    // Check if serialized data is too large
    const MAX_IMAGES_SIZE = 10 * 1024 * 1024; // 10MB
    if (serialized && serialized.length > MAX_IMAGES_SIZE) {
      const sizeMB = (serialized.length / (1024 * 1024)).toFixed(2);
      const maxSizeMB = (MAX_IMAGES_SIZE / (1024 * 1024)).toFixed(2);
      console.error('[Product Model] ❌ Serialized images too large:', {
        sizeMB: sizeMB,
        maxSizeMB: maxSizeMB,
      });
      throw new Error(`Tổng kích thước hình ảnh quá lớn (${sizeMB}MB). Vui lòng giảm kích thước hình ảnh. Tối đa: ${maxSizeMB}MB`);
    }
    
    await baseModel.update(productId, { images: serialized });
    
    console.log('[Product Model] ✅ Images saved successfully');
    console.log('[Product Model] Returning normalized images:', {
      count: normalizedImages.length,
      images: normalizedImages.map(img => ({
        url: img.url.length > 50 ? img.url.substring(0, 50) + '...' : img.url,
        alt: img.alt,
        is_primary: img.is_primary,
        order: img.order,
      })),
    });
    
    return normalizedImages;
  };

  // ============================================
  // GET PRIMARY IMAGE FUNCTION: Lấy primary image
  // ============================================
  /**
   * Lấy primary image (hình ảnh chính) của sản phẩm
   * Nếu không có primary, trả về image đầu tiên
   * 
   * @param {number} productId - ID của sản phẩm
   * @returns {Promise<Object|null>} Primary image object hoặc null
   */
  const getPrimaryImage = async (productId) => {
    const product = await baseModel.findById(productId);
    if (!product) return null;

    const images = parseImages(product.images);
    return images.find(img => img.is_primary === true) || images[0] || null;
  };

  // ============================================
  // FIND ALL WITH COUNT FUNCTION: Lấy tất cả với pagination và total count
  // ============================================
  /**
   * Lấy tất cả sản phẩm với pagination và total count trong 1 query duy nhất
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
    // Build WHERE clause manually (same logic as BaseModel.buildWhereClause)
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
      } else if (rawValue === null || rawValue === 'null' || rawValue === 'NULL') {
        fragments.push(`\`${key}\` IS NULL`);
      } else {
        fragments.push(`\`${key}\` = ?`);
        values.push(rawValue);
      }
    });
    
    const whereClause = fragments.length > 0 ? `WHERE ${fragments.join(' AND ')}` : '';
    const orderByClause = orderBy ? `ORDER BY ${orderBy}` : 'ORDER BY sort_order ASC, created_at DESC';
    
    // Use window function COUNT(*) OVER() to get total count in single query
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
    
    // Extract total from first row (all rows have same total_count)
    const total = rows && rows.length > 0 ? parseInt(rows[0].total_count || 0) : 0;
    
    // Remove total_count from each row
    const data = (rows || []).map(row => {
      const { total_count, ...rest } = row;
      return rest;
    });
    
    return { data, total };
  };

  // ============================================
  // GET DELETED WITH COUNT FUNCTION: Lấy sản phẩm đã xóa với pagination
  // ============================================
  /**
   * Lấy danh sách sản phẩm đã bị xóa mềm (deleted_at IS NOT NULL)
   * Với pagination và total count trong 1 query
   * 
   * @param {Object} options - Tùy chọn pagination
   * @param {number} options.limit - Số lượng records tối đa
   * @param {number} options.offset - Số lượng records bỏ qua
   * @returns {Promise<Object>} { data: Array, total: number }
   */
  const getDeletedWithCount = async ({ limit, offset } = {}) => {
    const sql = `
      SELECT 
        *,
        COUNT(*) OVER() as total_count
      FROM \`${baseModel.tableName}\`
      WHERE \`deleted_at\` IS NOT NULL
      ORDER BY \`deleted_at\` DESC
      ${typeof limit === 'number' ? `LIMIT ${limit}` : ''}
      ${typeof offset === 'number' ? `OFFSET ${offset}` : ''}
    `;
    
    const rows = await baseModel.execute(sql, []);
    
    // Extract total from first row (all rows have same total_count)
    const total = rows && rows.length > 0 ? parseInt(rows[0].total_count || 0) : 0;
    
    // Remove total_count from each row
    const data = (rows || []).map(row => {
      const { total_count, ...rest } = row;
      return rest;
    });
    
    return { data, total };
  };

  // ============================================
  // GET PRODUCT STATISTICS COUNTS FUNCTION: Thống kê sản phẩm
  // ============================================
  /**
   * Lấy thống kê số lượng sản phẩm trong 1 query duy nhất
   * Sử dụng CASE WHEN với SUM để đếm nhiều điều kiện cùng lúc
   * Tối ưu hơn so với nhiều COUNT queries riêng lẻ
   * 
   * @returns {Promise<Object>} Object chứa các số liệu thống kê:
   * - totalAll: Tổng số sản phẩm (kể cả đã xóa)
   * - totalActive: Số sản phẩm active và chưa xóa
   * - activeOnly: Số sản phẩm active (kể cả đã xóa)
   * - notDeleted: Số sản phẩm chưa xóa (kể cả inactive)
   * - totalDeleted: Số sản phẩm đã xóa
   * 
   * Performance: 1 query thay vì 5 queries COUNT riêng lẻ
   */
  const getProductStatisticsCounts = async () => {
    const sql = `
      SELECT 
        COUNT(*) as total_all,
        SUM(CASE WHEN \`is_active\` = 1 AND \`deleted_at\` IS NULL THEN 1 ELSE 0 END) as total_active,
        SUM(CASE WHEN \`is_active\` = 1 THEN 1 ELSE 0 END) as active_only,
        SUM(CASE WHEN \`deleted_at\` IS NULL THEN 1 ELSE 0 END) as not_deleted,
        SUM(CASE WHEN \`deleted_at\` IS NOT NULL THEN 1 ELSE 0 END) as total_deleted
      FROM \`${baseModel.tableName}\`
    `;
    
    const rows = await baseModel.execute(sql, []);
    const result = rows && rows.length > 0 ? rows[0] : {};
    
    return {
      totalAll: parseInt(result.total_all || 0),
      totalActive: parseInt(result.total_active || 0),
      activeOnly: parseInt(result.active_only || 0),
      notDeleted: parseInt(result.not_deleted || 0),
      totalDeleted: parseInt(result.total_deleted || 0),
    };
  };

  // ============================================
  // RETURN PRODUCT MODEL OBJECT
  // ============================================
  // Trả về object chứa tất cả methods từ BaseModel và các methods riêng của Product
  // Spread operator (...) để copy tất cả methods từ baseModel
  // Sau đó thêm các methods riêng của Product
  return {
    ...baseModel,                    // Tất cả methods từ BaseModel (findAll, findById, create, update, delete, etc.)
    findBySlug,                      // Tìm theo slug
    findBySku,                       // Tìm theo SKU
    findFirstByProductId,            // Tìm theo product_id
    findByProductIds,                // Tìm nhiều sản phẩm cùng lúc (array)
    findByProductIdsAsMap,           // Tìm nhiều sản phẩm cùng lúc (map object)
    findByCategory,                  // Tìm theo danh mục
    findActive,                      // Tìm sản phẩm active
    search,                          // Tìm kiếm theo từ khóa
    softDelete,                      // Xóa mềm
    restore,                         // Khôi phục
    updateStock,                     // Cập nhật tồn kho (đơn lẻ)
    batchUpdateStock,                // Cập nhật tồn kho (hàng loạt)
    parseImages,                     // Parse images từ database
    serializeImages,                 // Serialize images để lưu database
    validateImage,                   // Validate image object
    addImage,                        // Thêm image
    removeImage,                     // Xóa image
    setPrimaryImage,                 // Đặt primary image
    updateImages,                    // Cập nhật toàn bộ images
    getPrimaryImage,                 // Lấy primary image
    findAllWithCount,                // Lấy tất cả với pagination và total count
    getDeletedWithCount,             // Lấy sản phẩm đã xóa với pagination
    getProductStatisticsCounts,      // Thống kê sản phẩm
  };
};

// ============================================
// EXPORT MODULE
// ============================================
// Export factory function để các file khác có thể import và sử dụng
// Cách sử dụng: const createProductModel = require('./Product');
//               const product = createProductModel();
module.exports = createProductModel;
