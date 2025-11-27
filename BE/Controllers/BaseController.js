// ============================================
// BASE CONTROLLER - CONTROLLER CƠ BẢN
// ============================================
/**
 * BaseController - Controller cơ bản với các operations chung
 * Sử dụng Function component pattern (factory function)
 * 
 * Mục đích:
 * - Tái sử dụng code cho các CRUD operations
 * - Chuẩn hóa response format
 * - Tự động error handling và logging
 * - Hỗ trợ pagination, filtering, sorting
 */
const { logger } = require('../Middlewares/errorHandler');

// ============================================
// BASE CONTROLLER FACTORY FUNCTION
// ============================================
/**
 * Tạo BaseController với các HTTP handlers cơ bản
 * 
 * @param {Object} model - Model object từ BaseModel (có các methods: findAll, findById, create, update, delete, count)
 * @returns {Object} Controller object với các handlers: getAll, getById, create, update, delete, count
 * 
 * Cách sử dụng:
 * const productModel = createProductModel();
 * const productController = createBaseController(productModel);
 * router.get('/', productController.getAll);
 */
const createBaseController = (model) => {
  // ============================================
  // GET ALL FUNCTION: Lấy tất cả records với pagination
  // ============================================
  /**
   * HTTP Handler: GET /resource
   * Lấy tất cả records với pagination, filtering, và sorting
   * 
   * Query Parameters:
   * - page: Số trang (mặc định: 1)
   * - limit: Số lượng/trang (mặc định: 10, max: 100)
   * - orderBy: Câu lệnh ORDER BY (mặc định: 'created_at DESC')
   * - *: Các filter khác (tự động parse thành filters object)
   * 
   * Response:
   * {
   *   success: true,
   *   data: [...],
   *   pagination: { page, limit, total, totalPages }
   * }
   * 
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Promise<void>} JSON response
   */
  const getAll = async (req, res) => {
    // ============================================
    // BƯỚC 1: Logging - Ghi log thông tin request
    // ============================================
    // Log separator để dễ đọc trong console
    console.log('========================================');
    
    // Log tên function và table name để biết đang xử lý resource nào
    console.log(`[BaseController:${model.tableName}] getAll function called`);
    
    // Log IP của client để tracking và security
    console.log(`[BaseController:${model.tableName}] Request IP:`, req.ip);
    
    // Log URL đầy đủ (bao gồm query params) để debug
    console.log(`[BaseController:${model.tableName}] Request URL:`, req.originalUrl);
    
    // Log tất cả query parameters (đã format JSON để dễ đọc)
    // JSON.stringify với null, 2 để format đẹp (indent 2 spaces)
    console.log(`[BaseController:${model.tableName}] Query params:`, JSON.stringify(req.query, null, 2));
    
    // ============================================
    // BƯỚC 2: Parse và validate query parameters
    // ============================================
    try {
      // Destructure query params:
      // - page: Số trang (mặc định: 1)
      // - limit: Số lượng/trang (mặc định: 10)
      // - ...filters: Tất cả params còn lại sẽ là filters (rest operator)
      // Ví dụ: ?page=2&limit=20&is_active=1&category_id=5
      // => page=2, limit=20, filters={is_active: 1, category_id: 5}
      const { page = 1, limit = 10, ...filters } = req.query;
      
      // Tính offset (số lượng records bỏ qua) cho pagination
      // Ví dụ: page=2, limit=10 => offset = (2-1) * 10 = 10 (bỏ qua 10 records đầu)
      // Lưu ý: offset này chỉ để log, sẽ tính lại sau khi validate
      const offset = (parseInt(page) - 1) * parseInt(limit);

      // ============================================
      // BƯỚC 3: Validate và clamp pagination params
      // ============================================
      // Validate page: phải >= 1, nếu không hợp lệ thì mặc định 1
      // Math.max(1, ...) đảm bảo page không bao giờ < 1
      const pageNum = Math.max(1, parseInt(page) || 1);
      
      // Validate limit: phải >= 1 và <= 100
      // Math.max(1, ...) đảm bảo limit >= 1
      // Math.min(100, ...) đảm bảo limit <= 100 (giới hạn để tránh query quá lớn)
      // Nếu không hợp lệ thì mặc định 10
      const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 10)); // Max 100 items per page

      // Log pagination params đã được validate
      console.log(`[BaseController:${model.tableName}] Pagination:`, { pageNum, limitNum, offset });
      
      // Log filters (các điều kiện lọc)
      console.log(`[BaseController:${model.tableName}] Filters:`, filters);

      // ============================================
      // BƯỚC 4: Fetch data từ database
      // ============================================
      console.log(`[BaseController:${model.tableName}] 🔍 Fetching data from database...`);
      
      // Khai báo biến để lưu data và total
      let data, total;
      
      // ============================================
      // CASE 1: Model có findAllWithCount (tối ưu - 1 query)
      // ============================================
      // Kiểm tra model có method findAllWithCount không
      // findAllWithCount sử dụng window function COUNT(*) OVER() để lấy total trong 1 query
      // Tối ưu hơn so với 2 queries riêng (findAll + count)
      if (typeof model.findAllWithCount === 'function') {
        // Gọi findAllWithCount với options
        const result = await model.findAllWithCount({
          filters,                              // Điều kiện lọc
          limit: limitNum,                     // Số lượng tối đa
          offset: (pageNum - 1) * limitNum,    // Số lượng bỏ qua (tính lại với pageNum đã validate)
          orderBy: req.query.orderBy || 'created_at DESC',  // Sắp xếp (mặc định: mới nhất trước)
        });
        
        // Extract data và total từ result
        // result = { data: [...], total: 100 }
        data = result.data;
        total = result.total;
      } 
      // ============================================
      // CASE 2: Model không có findAllWithCount (fallback - 2 queries)
      // ============================================
      // Fallback cho các model chưa implement findAllWithCount
      // Sử dụng Promise.all để chạy 2 queries song song (nhanh hơn chạy tuần tự)
      else {
        // Promise.all chạy 2 promises song song:
        // 1. findAll: Lấy data với pagination
        // 2. count: Đếm tổng số records
        [data, total] = await Promise.all([
          // Query 1: Lấy data với pagination
          model.findAll({
            filters,                              // Điều kiện lọc
            limit: limitNum,                     // Số lượng tối đa
            offset: (pageNum - 1) * limitNum,    // Số lượng bỏ qua
            orderBy: req.query.orderBy || 'created_at DESC',  // Sắp xếp
          }),
          // Query 2: Đếm tổng số records (với cùng filters)
          model.count(filters),
        ]);
      }

      // ============================================
      // BƯỚC 5: Log kết quả và trả về response
      // ============================================
      // Log thông tin kết quả đã fetch
      console.log(`[BaseController:${model.tableName}] ✅ Data fetched:`, {
        count: data?.length || 0,  // Số lượng records trong page hiện tại
        total,                       // Tổng số records (tất cả pages)
        pageNum,                     // Số trang hiện tại
        limitNum                     // Số lượng/trang
      });
      console.log('========================================');

      // Trả về JSON response với status 200 (OK)
      return res.status(200).json({
        success: true,              // Flag thành công
        data,                       // Mảng các records
        pagination: {               // Thông tin pagination
          page: pageNum,            // Số trang hiện tại
          limit: limitNum,          // Số lượng/trang
          total,                    // Tổng số records
          totalPages: Math.ceil(total / limitNum),  // Tổng số trang (làm tròn lên)
        },
      });
    } 
    // ============================================
    // ERROR HANDLING: Xử lý lỗi
    // ============================================
    catch (error) {
      // Log lỗi với format dễ nhận biết
      console.error(`[BaseController:${model.tableName}] ❌❌❌ ERROR IN getAll ❌❌❌`);
      console.error(`[BaseController:${model.tableName}] Error message:`, error.message);
      console.error(`[BaseController:${model.tableName}] Error stack:`, error.stack);
      console.log('========================================');
      
      // Ghi log lỗi vào logger (có thể ghi vào file hoặc external service)
      logger.error(`Error in getAll (${model.tableName}): ${error.message}`, { error: error.stack });
      
      // Trả về error response với status 500 (Internal Server Error)
      return res.status(500).json({
        success: false,            // Flag thất bại
        message: 'Lỗi khi lấy dữ liệu',  // Message cho user
        // Chỉ hiển thị error message chi tiết trong development mode
        // Trong production, không hiển thị để tránh leak thông tin nhạy cảm
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      });
    }
  };

  // ============================================
  // GET BY ID FUNCTION: Lấy 1 record theo ID
  // ============================================
  /**
   * HTTP Handler: GET /resource/:id
   * Lấy 1 record duy nhất theo ID từ URL params
   * 
   * URL Params:
   * - id: ID của record cần lấy (bắt buộc)
   * 
   * Response:
   * - 200: Success { success: true, data: {...} }
   * - 400: Bad Request (thiếu ID)
   * - 404: Not Found (không tìm thấy)
   * - 500: Server Error
   * 
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Promise<void>} JSON response
   */
  const getById = async (req, res) => {
    // ============================================
    // BƯỚC 1: Logging - Ghi log thông tin request
    // ============================================
    console.log('========================================');
    console.log(`[BaseController:${model.tableName}] getById function called`);
    console.log(`[BaseController:${model.tableName}] Request IP:`, req.ip);
    console.log(`[BaseController:${model.tableName}] Request URL:`, req.originalUrl);
    console.log(`[BaseController:${model.tableName}] Params:`, req.params);
    
    try {
      // ============================================
      // BƯỚC 2: Extract ID từ URL params
      // ============================================
      // Lấy id từ req.params (từ URL: /products/:id)
      const { id } = req.params;
      
      // ============================================
      // BƯỚC 3: Validate ID
      // ============================================
      // Kiểm tra ID có tồn tại không
      if (!id) {
        console.log(`[BaseController:${model.tableName}] ❌ Validation failed: Missing ID`);
        // Trả về 400 Bad Request nếu thiếu ID
        return res.status(400).json({
          success: false,
          message: 'ID là bắt buộc',
        });
      }

      // ============================================
      // BƯỚC 4: Tìm record trong database
      // ============================================
      console.log(`[BaseController:${model.tableName}] 🔍 Finding record with ID:`, id);
      
      // Gọi model.findById để tìm record
      const data = await model.findById(id);

      // ============================================
      // BƯỚC 5: Kiểm tra record có tồn tại không
      // ============================================
      if (!data) {
        console.log(`[BaseController:${model.tableName}] ❌ Record not found with ID:`, id);
        // Trả về 404 Not Found nếu không tìm thấy
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy dữ liệu',
        });
      }

      // ============================================
      // BƯỚC 6: Trả về response thành công
      // ============================================
      console.log(`[BaseController:${model.tableName}] ✅ Record found`);
      console.log('========================================');

      // Trả về JSON response với status 200 (OK)
      return res.status(200).json({
        success: true,
        data,  // Record tìm được
      });
    } 
    // ============================================
    // ERROR HANDLING: Xử lý lỗi
    // ============================================
    catch (error) {
      console.error(`[BaseController:${model.tableName}] ❌❌❌ ERROR IN getById ❌❌❌`);
      console.error(`[BaseController:${model.tableName}] Error message:`, error.message);
      console.error(`[BaseController:${model.tableName}] Error stack:`, error.stack);
      console.log('========================================');
      
      // Ghi log lỗi với ID để debug
      logger.error(`Error in getById (${model.tableName}): ${error.message}`, { error: error.stack, id: req.params.id });
      
      // Trả về error response với status 500
      return res.status(500).json({
        success: false,
        message: 'Lỗi khi lấy dữ liệu',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      });
    }
  };

  // ============================================
  // CREATE FUNCTION: Tạo record mới
  // ============================================
  /**
   * HTTP Handler: POST /resource
   * Tạo record mới từ request body
   * 
   * Request Body:
   * - Object chứa dữ liệu cần tạo (không được rỗng)
   * 
   * Response:
   * - 201: Created { success: true, message: "...", data: {...} }
   * - 400: Bad Request (body rỗng hoặc lỗi validation)
   * 
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Promise<void>} JSON response
   */
  const create = async (req, res) => {
    // ============================================
    // BƯỚC 1: Logging - Ghi log thông tin request
    // ============================================
    console.log('========================================');
    console.log(`[BaseController:${model.tableName}] create function called`);
    console.log(`[BaseController:${model.tableName}] Request IP:`, req.ip);
    console.log(`[BaseController:${model.tableName}] Request URL:`, req.originalUrl);
    // Log request body (đã format JSON để dễ đọc)
    console.log(`[BaseController:${model.tableName}] Request body:`, JSON.stringify(req.body, null, 2));
    
    try {
      // ============================================
      // BƯỚC 2: Validate request body
      // ============================================
      // Kiểm tra body có tồn tại và không rỗng không
      // Object.keys(req.body).length === 0: Kiểm tra object rỗng
      if (!req.body || Object.keys(req.body).length === 0) {
        console.log(`[BaseController:${model.tableName}] ❌ Validation failed: Empty body`);
        // Trả về 400 Bad Request nếu body rỗng
        return res.status(400).json({
          success: false,
          message: 'Dữ liệu không được để trống',
        });
      }

      // ============================================
      // BƯỚC 3: Tạo record trong database
      // ============================================
      console.log(`[BaseController:${model.tableName}] 💾 Creating record in database...`);
      
      // Log thông tin debug về model.create (để troubleshoot nếu có vấn đề)
      console.log(`[BaseController:${model.tableName}] 🔍 Model.create type:`, typeof model.create);
      console.log(`[BaseController:${model.tableName}] 🔍 Model.create function:`, model.create.toString().substring(0, 200));
      console.log(`[BaseController:${model.tableName}] 🔍 Calling model.create() with data:`, JSON.stringify(req.body, null, 2));
      
      // Gọi model.create để tạo record mới
      // model.create trả về result object chứa insertId
      const result = await model.create(req.body);
      
      // ============================================
      // BƯỚC 4: Extract insertId từ result
      // ============================================
      // Xử lý nhiều format có thể có của result:
      // - result.insertId (format thông thường)
      // - result[0]?.insertId (nếu result là array)
      // - result.insertId (fallback)
      // Optional chaining (?.) để tránh lỗi nếu result[0] là undefined
      const insertId = result.insertId || result[0]?.insertId || result.insertId;
      
      console.log(`[BaseController:${model.tableName}] Create result:`, { insertId, result });
      
      // ============================================
      // BƯỚC 5: Xử lý trường hợp không có insertId
      // ============================================
      // Nếu không có insertId (có thể do database không trả về hoặc lỗi)
      if (!insertId) {
        console.log(`[BaseController:${model.tableName}] ⚠️ Warning: No insertId returned`);
        // Log warning để theo dõi
        logger.warn(`Create operation did not return insertId for ${model.tableName}`);
        
        // Trả về result trực tiếp (không fetch lại)
        return res.status(201).json({
          success: true,
          message: 'Tạo mới thành công',
          data: result,  // Trả về result gốc
        });
      }

      // ============================================
      // BƯỚC 6: Fetch record vừa tạo để trả về
      // ============================================
      // Fetch lại record vừa tạo để đảm bảo có đầy đủ dữ liệu
      // (có thể có default values, timestamps, etc. được set bởi database)
      console.log(`[BaseController:${model.tableName}] 🔍 Fetching newly created record...`);
      const newRecord = await model.findById(insertId);
      
      console.log(`[BaseController:${model.tableName}] ✅ Record created successfully with ID:`, insertId);
      console.log('========================================');

      // Trả về JSON response với status 201 (Created)
      return res.status(201).json({
        success: true,
        message: 'Tạo mới thành công',
        data: newRecord,  // Record đầy đủ vừa fetch
      });
    } 
    // ============================================
    // ERROR HANDLING: Xử lý lỗi
    // ============================================
    catch (error) {
      console.error(`[BaseController:${model.tableName}] ❌❌❌ ERROR IN create ❌❌❌`);
      console.error(`[BaseController:${model.tableName}] Error message:`, error.message);
      console.error(`[BaseController:${model.tableName}] Error stack:`, error.stack);
      // Log thêm error details (name, code) để debug
      console.error(`[BaseController:${model.tableName}] Error details:`, {
        name: error.name,    // Tên error (ví dụ: "ValidationError")
        code: error.code     // Error code (ví dụ: "ER_DUP_ENTRY" cho MySQL duplicate)
      });
      console.log('========================================');
      
      // Ghi log lỗi với body để debug
      logger.error(`Error in create (${model.tableName}): ${error.message}`, { error: error.stack, body: req.body });
      
      // Trả về error response với status 400 (Bad Request)
      // Dùng 400 thay vì 500 vì lỗi thường do client (validation, duplicate, etc.)
      return res.status(400).json({
        success: false,
        message: 'Lỗi khi tạo mới',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      });
    }
  };

  // ============================================
  // UPDATE FUNCTION: Cập nhật record
  // ============================================
  /**
   * HTTP Handler: PUT /resource/:id hoặc PATCH /resource/:id
   * Cập nhật record theo ID
   * 
   * URL Params:
   * - id: ID của record cần cập nhật (bắt buộc)
   * 
   * Request Body:
   * - Object chứa dữ liệu cần cập nhật (không được rỗng)
   * 
   * Response:
   * - 200: Success { success: true, message: "...", data: {...} }
   * - 400: Bad Request (thiếu ID, body rỗng, hoặc lỗi validation)
   * - 404: Not Found (không tìm thấy record)
   * 
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Promise<void>} JSON response
   */
  const update = async (req, res) => {
    // ============================================
    // BƯỚC 1: Logging - Ghi log thông tin request
    // ============================================
    console.log('========================================');
    console.log(`[BaseController:${model.tableName}] update function called`);
    console.log(`[BaseController:${model.tableName}] Request IP:`, req.ip);
    console.log(`[BaseController:${model.tableName}] Request URL:`, req.originalUrl);
    console.log(`[BaseController:${model.tableName}] Params:`, req.params);
    console.log(`[BaseController:${model.tableName}] Request body:`, JSON.stringify(req.body, null, 2));
    
    try {
      // ============================================
      // BƯỚC 2: Extract và validate ID
      // ============================================
      // Lấy id từ URL params
      const { id } = req.params;
      
      // Kiểm tra ID có tồn tại không
      if (!id) {
        console.log(`[BaseController:${model.tableName}] ❌ Validation failed: Missing ID`);
        return res.status(400).json({
          success: false,
          message: 'ID là bắt buộc',
        });
      }

      // ============================================
      // BƯỚC 3: Validate request body
      // ============================================
      // Kiểm tra body có tồn tại và không rỗng không
      if (!req.body || Object.keys(req.body).length === 0) {
        console.log(`[BaseController:${model.tableName}] ❌ Validation failed: Empty body`);
        return res.status(400).json({
          success: false,
          message: 'Dữ liệu cập nhật không được để trống',
        });
      }

      // ============================================
      // BƯỚC 4: Kiểm tra record có tồn tại không
      // ============================================
      // Kiểm tra trước khi update để tránh update record không tồn tại
      console.log(`[BaseController:${model.tableName}] 🔍 Checking if record exists...`);
      const existing = await model.findById(id);

      // Nếu không tìm thấy, trả về 404
      if (!existing) {
        console.log(`[BaseController:${model.tableName}] ❌ Record not found with ID:`, id);
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy dữ liệu',
        });
      }

      // ============================================
      // BƯỚC 5: Cập nhật record
      // ============================================
      console.log(`[BaseController:${model.tableName}] ✅ Record found, updating...`);
      
      // Gọi model.update để cập nhật record
      await model.update(id, req.body);
      
      // ============================================
      // BƯỚC 6: Fetch record sau khi update
      // ============================================
      // Fetch lại record sau khi update để đảm bảo có dữ liệu mới nhất
      // (có thể có triggers, default values, timestamps được update bởi database)
      console.log(`[BaseController:${model.tableName}] 🔍 Fetching updated record...`);
      const updated = await model.findById(id);
      
      console.log(`[BaseController:${model.tableName}] ✅ Record updated successfully`);
      console.log('========================================');

      // Trả về JSON response với status 200 (OK)
      return res.status(200).json({
        success: true,
        message: 'Cập nhật thành công',
        data: updated,  // Record đã được cập nhật
      });
    } 
    // ============================================
    // ERROR HANDLING: Xử lý lỗi
    // ============================================
    catch (error) {
      console.error(`[BaseController:${model.tableName}] ❌❌❌ ERROR IN update ❌❌❌`);
      console.error(`[BaseController:${model.tableName}] Error message:`, error.message);
      console.error(`[BaseController:${model.tableName}] Error stack:`, error.stack);
      console.log('========================================');
      
      // Ghi log lỗi với ID để debug
      logger.error(`Error in update (${model.tableName}): ${error.message}`, { error: error.stack, id: req.params.id });
      
      // Trả về error response với status 400 (Bad Request)
      return res.status(400).json({
        success: false,
        message: 'Lỗi khi cập nhật',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      });
    }
  };

  // ============================================
  // DELETE FUNCTION: Xóa record
  // ============================================
  /**
   * HTTP Handler: DELETE /resource/:id
   * Xóa record theo ID (hard delete - xóa vĩnh viễn)
   * 
   * URL Params:
   * - id: ID của record cần xóa (bắt buộc)
   * 
   * Response:
   * - 200: Success { success: true, message: "Xóa thành công" }
   * - 400: Bad Request (thiếu ID)
   * - 404: Not Found (không tìm thấy record)
   * 
   * Lưu ý: Đây là hard delete (xóa vĩnh viễn). Nếu cần soft delete, nên dùng update.
   * 
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Promise<void>} JSON response
   */
  const deleteRecord = async (req, res) => {
    // ============================================
    // BƯỚC 1: Logging - Ghi log thông tin request
    // ============================================
    console.log('========================================');
    console.log(`[BaseController:${model.tableName}] delete function called`);
    console.log(`[BaseController:${model.tableName}] Request IP:`, req.ip);
    console.log(`[BaseController:${model.tableName}] Request URL:`, req.originalUrl);
    console.log(`[BaseController:${model.tableName}] Params:`, req.params);
    
    try {
      // ============================================
      // BƯỚC 2: Extract và validate ID
      // ============================================
      // Lấy id từ URL params
      const { id } = req.params;
      
      // Kiểm tra ID có tồn tại không
      if (!id) {
        console.log(`[BaseController:${model.tableName}] ❌ Validation failed: Missing ID`);
        return res.status(400).json({
          success: false,
          message: 'ID là bắt buộc',
        });
      }

      // ============================================
      // BƯỚC 3: Kiểm tra record có tồn tại không
      // ============================================
      // Kiểm tra trước khi xóa để tránh xóa record không tồn tại
      console.log(`[BaseController:${model.tableName}] 🔍 Checking if record exists...`);
      const existing = await model.findById(id);

      // Nếu không tìm thấy, trả về 404
      if (!existing) {
        console.log(`[BaseController:${model.tableName}] ❌ Record not found with ID:`, id);
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy dữ liệu',
        });
      }

      // ============================================
      // BƯỚC 4: Xóa record
      // ============================================
      console.log(`[BaseController:${model.tableName}] ✅ Record found, deleting...`);
      
      // Gọi model.delete để xóa record (hard delete)
      await model.delete(id);
      
      console.log(`[BaseController:${model.tableName}] ✅ Record deleted successfully`);
      console.log('========================================');

      // Ghi log info khi xóa thành công (để audit trail)
      logger.info(`Record deleted: ${model.tableName} ID ${id}`);

      // Trả về JSON response với status 200 (OK)
      // Không trả về data vì record đã bị xóa
      return res.status(200).json({
        success: true,
        message: 'Xóa thành công',
      });
    } 
    // ============================================
    // ERROR HANDLING: Xử lý lỗi
    // ============================================
    catch (error) {
      console.error(`[BaseController:${model.tableName}] ❌❌❌ ERROR IN delete ❌❌❌`);
      console.error(`[BaseController:${model.tableName}] Error message:`, error.message);
      console.error(`[BaseController:${model.tableName}] Error stack:`, error.stack);
      console.log('========================================');
      
      // Ghi log lỗi với ID để debug
      logger.error(`Error in delete (${model.tableName}): ${error.message}`, { error: error.stack, id: req.params.id });
      
      // Trả về error response với status 400 (Bad Request)
      return res.status(400).json({
        success: false,
        message: 'Lỗi khi xóa',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      });
    }
  };

  // ============================================
  // COUNT FUNCTION: Đếm số lượng records
  // ============================================
  /**
   * HTTP Handler: GET /resource/count
   * Đếm số lượng records với filters từ query params
   * 
   * Query Parameters:
   * - *: Các filter (tự động parse thành filters object)
   * 
   * Response:
   * - 200: Success { success: true, count: 100 }
   * - 500: Server Error
   * 
   * Ví dụ:
   * GET /products/count?is_active=1
   * => { success: true, count: 50 }
   * 
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Promise<void>} JSON response
   */
  const count = async (req, res) => {
    // ============================================
    // BƯỚC 1: Logging - Ghi log thông tin request
    // ============================================
    console.log('========================================');
    console.log(`[BaseController:${model.tableName}] count function called`);
    console.log(`[BaseController:${model.tableName}] Request IP:`, req.ip);
    // Log query params (các filters)
    console.log(`[BaseController:${model.tableName}] Query params:`, JSON.stringify(req.query, null, 2));
    
    try {
      // ============================================
      // BƯỚC 2: Đếm records với filters
      // ============================================
      console.log(`[BaseController:${model.tableName}] 🔢 Counting records...`);
      
      // Gọi model.count với filters từ query params
      // req.query sẽ được parse thành filters object
      // Ví dụ: ?is_active=1&category_id=5 => { is_active: 1, category_id: 5 }
      const countResult = await model.count(req.query);
      
      console.log(`[BaseController:${model.tableName}] ✅ Count result:`, countResult);
      console.log('========================================');
      
      // Trả về JSON response với status 200 (OK)
      return res.status(200).json({
        success: true,
        count: countResult,  // Số lượng records
      });
    } 
    // ============================================
    // ERROR HANDLING: Xử lý lỗi
    // ============================================
    catch (error) {
      console.error(`[BaseController:${model.tableName}] ❌❌❌ ERROR IN count ❌❌❌`);
      console.error(`[BaseController:${model.tableName}] Error message:`, error.message);
      console.error(`[BaseController:${model.tableName}] Error stack:`, error.stack);
      console.log('========================================');
      
      // Ghi log lỗi
      logger.error(`Error in count (${model.tableName}): ${error.message}`, { error: error.stack });
      
      // Trả về error response với status 500 (Internal Server Error)
      return res.status(500).json({
        success: false,
        message: 'Lỗi khi đếm',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      });
    }
  };

  // ============================================
  // RETURN CONTROLLER OBJECT
  // ============================================
  // Trả về object chứa tất cả HTTP handlers
  // Các handlers này sẽ được sử dụng trong routes
  return {
    getAll,                    // GET /resource - Lấy tất cả với pagination
    getById,                   // GET /resource/:id - Lấy 1 record theo ID
    create,                    // POST /resource - Tạo record mới
    update,                    // PUT /resource/:id - Cập nhật record
    delete: deleteRecord,      // DELETE /resource/:id - Xóa record (đổi tên từ deleteRecord thành delete)
    count,                     // GET /resource/count - Đếm số lượng records
  };
};

// ============================================
// EXPORT MODULE
// ============================================
// Export factory function để các file khác có thể import và sử dụng
// Cách sử dụng: const createBaseController = require('./BaseController');
//               const controller = createBaseController(model);
module.exports = createBaseController;
