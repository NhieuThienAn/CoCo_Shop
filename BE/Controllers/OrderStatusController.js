// ============================================
// IMPORT MODULES
// ============================================
// Import BaseController factory function
// BaseController cung cấp các HTTP handlers cơ bản (getAll, getById, create, update, delete, count)
const createBaseController = require('./BaseController');

// Import orderStatus model từ Models/index.js
// orderStatus là instance của OrderStatus model đã được khởi tạo
const { orderStatus } = require('../Models');

// ============================================
// ORDER STATUS CONTROLLER FACTORY FUNCTION
// ============================================
/**
 * Tạo OrderStatusController với các HTTP handlers cho quản lý order statuses
 * OrderStatusController kế thừa tất cả handlers từ BaseController và thêm các handlers riêng
 * 
 * @returns {Object} OrderStatusController object với các handlers:
 * - Từ BaseController: getAll (được override), getById, create, update, delete, count
 * - Riêng OrderStatus: getByName, getAllOrdered, getByNames, getByIds
 */
const createOrderStatusController = () => {
  // Tạo baseController từ BaseController với orderStatus model
  // baseController sẽ có các handlers cơ bản: getAll, getById, create, update, delete, count
  const baseController = createBaseController(orderStatus);

  // ============================================
  // GET BY NAME FUNCTION: Lấy order status theo tên
  // ============================================
  /**
   * HTTP Handler: GET /order-statuses/name/:name
   * Lấy order status theo tên (status_name)
   * 
   * URL Params:
   * - name: Tên của order status (bắt buộc)
   * 
   * Response:
   * - 200: Success { success: true, data: {...} }
   * - 404: Not Found (không tìm thấy)
   * - 500: Server Error
   * 
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Promise<void>} JSON response
   */
  const getByName = async (req, res) => {
    // ============================================
    // BƯỚC 1: Logging - Ghi log thông tin request
    // ============================================
    console.log('========================================');
    console.log('[OrderStatusController] getByName function called');
    console.log('[OrderStatusController] Request IP:', req.ip);
    console.log('[OrderStatusController] Params:', req.params);
    
    try {
      // ============================================
      // BƯỚC 2: Extract name từ request params
      // ============================================
      // Lấy name từ URL params
      const { name } = req.params;
      console.log('[OrderStatusController] 🔍 Finding order status by name:', name);
      
      // ============================================
      // BƯỚC 3: Tìm order status theo tên
      // ============================================
      // Gọi orderStatus.findByName để tìm status theo tên
      const data = await orderStatus.findByName(name);

      // ============================================
      // BƯỚC 4: Kiểm tra kết quả
      // ============================================
      // Nếu không tìm thấy, trả về 404
      if (!data) {
        console.log('[OrderStatusController] ❌ Order status not found');
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy trạng thái',
        });
      }

      console.log('[OrderStatusController] ✅ Order status found:', data.status_id);
      console.log('========================================');

      // ============================================
      // BƯỚC 5: Trả về response thành công
      // ============================================
      // Trả về JSON response với status 200 (OK)
      return res.status(200).json({
        success: true,
        data,  // Order status object
      });
    } 
    // ============================================
    // ERROR HANDLING: Xử lý lỗi
    // ============================================
    catch (error) {
      // Log lỗi chi tiết để debug
      console.error('[OrderStatusController] ❌❌❌ ERROR IN getByName ❌❌❌');
      console.error('[OrderStatusController] Error message:', error.message);
      console.error('[OrderStatusController] Error stack:', error.stack);
      console.log('========================================');
      
      // Trả về error response với status 500 (Internal Server Error)
      return res.status(500).json({
        success: false,
        message: 'Lỗi khi lấy dữ liệu',
        error: error.message,
      });
    }
  };

  // ============================================
  // GET ALL ORDERED FUNCTION: Lấy tất cả order statuses đã sắp xếp
  // ============================================
  /**
   * HTTP Handler: GET /order-statuses/ordered
   * Lấy tất cả order statuses đã được sắp xếp theo sort_order
   * 
   * Response:
   * - 200: Success { success: true, data: [...] }
   * - 500: Server Error
   * 
   * Đặc biệt:
   * - Sắp xếp theo sort_order (thứ tự hiển thị trong workflow)
   * 
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Promise<void>} JSON response
   */
  const getAllOrdered = async (req, res) => {
    // ============================================
    // BƯỚC 1: Logging - Ghi log thông tin request
    // ============================================
    console.log('========================================');
    console.log('[OrderStatusController] getAllOrdered function called');
    console.log('[OrderStatusController] Request IP:', req.ip);
    
    try {
      // ============================================
      // BƯỚC 2: Fetch tất cả order statuses đã sắp xếp
      // ============================================
      console.log('[OrderStatusController] 🔍 Fetching all ordered statuses...');
      
      // Gọi orderStatus.findAllOrdered để lấy tất cả statuses đã sắp xếp
      // Method này sắp xếp theo sort_order (thứ tự trong workflow)
      const data = await orderStatus.findAllOrdered();
      
      console.log('[OrderStatusController] ✅ Order statuses fetched:', data?.length || 0);
      console.log('========================================');
      
      // ============================================
      // BƯỚC 3: Trả về response thành công
      // ============================================
      // Trả về JSON response với status 200 (OK)
      return res.status(200).json({
        success: true,
        data,  // Mảng các order statuses đã sắp xếp
      });
    } 
    // ============================================
    // ERROR HANDLING: Xử lý lỗi
    // ============================================
    catch (error) {
      // Log lỗi chi tiết để debug
      console.error('[OrderStatusController] ❌❌❌ ERROR IN getAllOrdered ❌❌❌');
      console.error('[OrderStatusController] Error message:', error.message);
      console.error('[OrderStatusController] Error stack:', error.stack);
      console.log('========================================');
      
      // Trả về error response với status 500 (Internal Server Error)
      return res.status(500).json({
        success: false,
        message: 'Lỗi khi lấy dữ liệu',
        error: error.message,
      });
    }
  };

  // ============================================
  // GET BY NAMES FUNCTION: Batch fetch order statuses theo nhiều tên
  // ============================================
  /**
   * HTTP Handler: POST /order-statuses/batch/names
   * Batch fetch order statuses theo nhiều tên (sử dụng SQL WHERE IN - 1 query)
   * 
   * Request Body:
   * - names: Mảng các tên order status (bắt buộc)
   *   Ví dụ: { names: ['Chờ xác nhận', 'Đã xác nhận', 'Đang giao hàng'] }
   * 
   * Response:
   * - 200: Success { success: true, data: [...], count: N }
   * - 400: Bad Request (thiếu names hoặc không phải array)
   * - 500: Server Error
   * 
   * Đặc biệt:
   * - Sử dụng SQL WHERE IN để tối ưu (1 query thay vì N queries)
   * - Tránh N+1 problem
   * 
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Promise<void>} JSON response
   */
  const getByNames = async (req, res) => {
    // ============================================
    // BƯỚC 1: Logging - Ghi log thông tin request
    // ============================================
    console.log('========================================');
    console.log('[OrderStatusController] getByNames function called (batch)');
    console.log('[OrderStatusController] Request IP:', req.ip);
    console.log('[OrderStatusController] Body:', req.body);
    
    try {
      // ============================================
      // BƯỚC 2: Extract và validate names từ request body
      // ============================================
      // Lấy names từ request body
      const { names } = req.body;
      
      // Validate: names phải là array và không rỗng
      if (!Array.isArray(names) || names.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Vui lòng cung cấp mảng tên trạng thái',
        });
      }

      console.log('[OrderStatusController] 🔍 Batch fetching order statuses by names:', names);
      
      // ============================================
      // BƯỚC 3: Batch fetch order statuses bằng SQL WHERE IN
      // ============================================
      // Sử dụng batch SQL query với WHERE IN (1 query thay vì N queries)
      // Tối ưu hơn so với fetch từng status riêng lẻ (tránh N+1 problem)
      const data = await orderStatus.findByNames(names);
      
      console.log('[OrderStatusController] ✅ Order statuses fetched:', data?.length || 0);
      console.log('========================================');

      // ============================================
      // BƯỚC 4: Trả về response thành công
      // ============================================
      // Trả về JSON response với status 200 (OK)
      return res.status(200).json({
        success: true,
        data,              // Mảng các order statuses
        count: data?.length || 0,  // Số lượng statuses tìm được
      });
    } 
    // ============================================
    // ERROR HANDLING: Xử lý lỗi
    // ============================================
    catch (error) {
      // Log lỗi chi tiết để debug
      console.error('[OrderStatusController] ❌❌❌ ERROR IN getByNames ❌❌❌');
      console.error('[OrderStatusController] Error message:', error.message);
      console.error('[OrderStatusController] Error stack:', error.stack);
      console.log('========================================');
      
      // Trả về error response với status 500 (Internal Server Error)
      return res.status(500).json({
        success: false,
        message: 'Lỗi khi lấy dữ liệu',
        error: error.message,
      });
    }
  };

  // ============================================
  // GET BY IDS FUNCTION: Batch fetch order statuses theo nhiều ID
  // ============================================
  /**
   * HTTP Handler: POST /order-statuses/batch/ids
   * Batch fetch order statuses theo nhiều ID (sử dụng SQL WHERE IN - 1 query)
   * 
   * Request Body:
   * - ids: Mảng các ID order status (bắt buộc)
   *   Ví dụ: { ids: [1, 2, 3, 4] }
   * 
   * Response:
   * - 200: Success { success: true, data: [...], count: N }
   * - 400: Bad Request (thiếu ids, không phải array, hoặc không có ID hợp lệ)
   * - 500: Server Error
   * 
   * Đặc biệt:
   * - Sử dụng SQL WHERE IN để tối ưu (1 query thay vì N queries)
   * - Validate và filter IDs hợp lệ (chỉ lấy số)
   * - Tránh N+1 problem
   * 
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Promise<void>} JSON response
   */
  const getByIds = async (req, res) => {
    // ============================================
    // BƯỚC 1: Logging - Ghi log thông tin request
    // ============================================
    console.log('========================================');
    console.log('[OrderStatusController] getByIds function called (batch)');
    console.log('[OrderStatusController] Request IP:', req.ip);
    console.log('[OrderStatusController] Body:', req.body);
    
    try {
      // ============================================
      // BƯỚC 2: Extract và validate ids từ request body
      // ============================================
      // Lấy ids từ request body
      const { ids } = req.body;
      
      // Validation 1: ids phải là array và không rỗng
      if (!Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Vui lòng cung cấp mảng ID trạng thái',
        });
      }

      // ============================================
      // BƯỚC 3: Validate và filter IDs hợp lệ
      // ============================================
      // Lọc và chuyển đổi IDs thành số nguyên
      // filter: Chỉ lấy các ID có thể parse thành số
      // map: Chuyển đổi sang số nguyên
      const validIds = ids.filter(id => !isNaN(parseInt(id))).map(id => parseInt(id));
      
      // Validation 2: Phải có ít nhất 1 ID hợp lệ
      if (validIds.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Vui lòng cung cấp ID hợp lệ',
        });
      }

      console.log('[OrderStatusController] 🔍 Batch fetching order statuses by IDs:', validIds);
      
      // ============================================
      // BƯỚC 4: Batch fetch order statuses bằng SQL WHERE IN
      // ============================================
      // Sử dụng batch SQL query với WHERE IN (1 query thay vì N queries)
      // Tối ưu hơn so với fetch từng status riêng lẻ (tránh N+1 problem)
      const data = await orderStatus.findByIds(validIds);
      
      console.log('[OrderStatusController] ✅ Order statuses fetched:', data?.length || 0);
      console.log('========================================');

      // ============================================
      // BƯỚC 5: Trả về response thành công
      // ============================================
      // Trả về JSON response với status 200 (OK)
      return res.status(200).json({
        success: true,
        data,              // Mảng các order statuses
        count: data?.length || 0,  // Số lượng statuses tìm được
      });
    } 
    // ============================================
    // ERROR HANDLING: Xử lý lỗi
    // ============================================
    catch (error) {
      // Log lỗi chi tiết để debug
      console.error('[OrderStatusController] ❌❌❌ ERROR IN getByIds ❌❌❌');
      console.error('[OrderStatusController] Error message:', error.message);
      console.error('[OrderStatusController] Error stack:', error.stack);
      console.log('========================================');
      
      // Trả về error response với status 500 (Internal Server Error)
      return res.status(500).json({
        success: false,
        message: 'Lỗi khi lấy dữ liệu',
        error: error.message,
      });
    }
  };

  // ============================================
  // GET ALL FUNCTION: Override getAll từ BaseController
  // ============================================
  /**
   * HTTP Handler: GET /order-statuses
   * Override getAll từ BaseController để sử dụng orderBy phù hợp (sort_order thay vì created_at)
   * 
   * Query Parameters:
   * - page: Số trang (mặc định: 1)
   * - limit: Số lượng/trang (mặc định: 10, max: 100)
   * - orderBy: Câu lệnh ORDER BY (mặc định: 'sort_order ASC, status_id ASC')
   * - ...filters: Các filter khác
   * 
   * Response:
   * - 200: Success { success: true, data: [...], pagination: {...} }
   * - 500: Server Error
   * 
   * Đặc biệt:
   * - Sử dụng window function COUNT(*) OVER() để tối ưu (1 query thay vì 2)
   * - Sắp xếp theo sort_order (thứ tự trong workflow) thay vì created_at
   * 
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Promise<void>} JSON response
   */
  const getAll = async (req, res) => {
    // ============================================
    // BƯỚC 1: Logging - Ghi log thông tin request
    // ============================================
    console.log('========================================');
    console.log('[OrderStatusController] getAll function called (override)');
    console.log('[OrderStatusController] Request IP:', req.ip);
    console.log('[OrderStatusController] Request URL:', req.originalUrl);
    console.log('[OrderStatusController] Query params:', JSON.stringify(req.query, null, 2));
    
    try {
      // ============================================
      // BƯỚC 2: Parse và validate query parameters
      // ============================================
      // Destructure query params
      const { page = 1, limit = 10, ...filters } = req.query;
      
      // Validate và clamp pagination params
      const pageNum = Math.max(1, parseInt(page) || 1);  // page >= 1
      const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 10));  // 1 <= limit <= 100

      console.log('[OrderStatusController] Pagination:', { pageNum, limitNum });
      console.log('[OrderStatusController] Filters:', filters);

      // ============================================
      // BƯỚC 3: Fetch data từ database
      // ============================================
      // Sử dụng single SQL query với window function COUNT(*) OVER() để lấy data và total count
      // Tối ưu hơn so với Promise.all với 2 queries riêng (findAll + count)
      const { data, total } = await orderStatus.findAllWithCount({
        filters,                              // Điều kiện lọc
        limit: limitNum,                     // Số lượng tối đa
        offset: (pageNum - 1) * limitNum,    // Số lượng bỏ qua
        // Sắp xếp theo sort_order (thứ tự trong workflow) thay vì created_at
        orderBy: req.query.orderBy || 'sort_order ASC, status_id ASC',
      });

      console.log('[OrderStatusController] ✅ Data fetched using single SQL query:', {
        count: data?.length || 0,
        total,
        pageNum,
        limitNum
      });
      console.log('========================================');

      // ============================================
      // BƯỚC 4: Trả về response thành công
      // ============================================
      // Trả về JSON response với status 200 (OK)
      return res.status(200).json({
        success: true,
        data,              // Mảng các order statuses
        pagination: {      // Thông tin pagination
          page: pageNum,
          limit: limitNum,
          total,
          pages: Math.ceil(total / limitNum),  // Tổng số trang
        },
      });
    } 
    // ============================================
    // ERROR HANDLING: Xử lý lỗi
    // ============================================
    catch (error) {
      // Log lỗi chi tiết để debug
      console.error('[OrderStatusController] ❌❌❌ ERROR IN getAll ❌❌❌');
      console.error('[OrderStatusController] Error message:', error.message);
      console.error('[OrderStatusController] Error stack:', error.stack);
      console.log('========================================');
      
      // Trả về error response với status 500 (Internal Server Error)
      return res.status(500).json({
        success: false,
        message: 'Lỗi khi lấy dữ liệu',
        error: error.message,
      });
    }
  };

  // ============================================
  // RETURN CONTROLLER OBJECT
  // ============================================
  // Trả về object chứa tất cả HTTP handlers
  // Spread baseController để lấy các handlers cơ bản
  // Sau đó override/thêm các handlers riêng của OrderStatusController
  return {
    ...baseController,    // Spread các handlers từ BaseController (getAll được override, getById, create, update, delete, count)
    getAll,                // Override getAll với orderBy phù hợp
    getByName,              // Handler riêng: Lấy order status theo tên
    getAllOrdered,          // Handler riêng: Lấy tất cả order statuses đã sắp xếp
    getByNames,            // Handler riêng: Batch fetch theo nhiều tên
    getByIds,              // Handler riêng: Batch fetch theo nhiều ID
  };
};

// ============================================
// EXPORT MODULE
// ============================================
// Export OrderStatusController đã được khởi tạo (singleton pattern)
// Cách sử dụng: const orderStatusController = require('./OrderStatusController');
//               router.get('/', orderStatusController.getAll);
module.exports = createOrderStatusController();
