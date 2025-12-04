const createBaseController = require('./BaseController');
const { orderStatus } = require('../Models');
/**
 * Tạo OrderStatusController với các HTTP handlers cho quản lý order statuses
 * OrderStatusController kế thừa tất cả handlers từ BaseController và thêm các handlers riêng
 * 
 * @returns {Object} OrderStatusController object với các handlers:
 * - Từ BaseController: getAll (được override), getById, create, update, delete, count
 * - Riêng OrderStatus: getByName, getAllOrdered, getByNames, getByIds
 */

const createOrderStatusController = () => {
  const baseController = createBaseController(orderStatus);
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
    console.log('========================================');
    console.log('[OrderStatusController] getByName function called');
    console.log('[OrderStatusController] Request IP:', req.ip);
    console.log('[OrderStatusController] Params:', req.params);
    try {
      const { name } = req.params;
      console.log('[OrderStatusController] 🔍 Finding order status by name:', name);
      const data = await orderStatus.findByName(name);
      if (!data) {
        console.log('[OrderStatusController] ❌ Order status not found');
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy trạng thái',
        });
      }
      console.log('[OrderStatusController] ✅ Order status found:', data.status_id);
      console.log('========================================');
      return res.status(200).json({
        success: true,
        data,  
      });
    } 
    catch (error) {
      console.error('[OrderStatusController] ❌❌❌ ERROR IN getByName ❌❌❌');
      console.error('[OrderStatusController] Error message:', error.message);
      console.error('[OrderStatusController] Error stack:', error.stack);
      console.log('========================================');
      return res.status(500).json({
        success: false,
        message: 'Lỗi khi lấy dữ liệu',
        error: error.message,
      });
    }
  };
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
    console.log('========================================');
    console.log('[OrderStatusController] getAllOrdered function called');
    console.log('[OrderStatusController] Request IP:', req.ip);
    try {
      console.log('[OrderStatusController] 🔍 Fetching all ordered statuses...');
      const data = await orderStatus.findAllOrdered();
      console.log('[OrderStatusController] ✅ Order statuses fetched:', data?.length || 0);
      console.log('========================================');
      return res.status(200).json({
        success: true,
        data,  
      });
    } 
    catch (error) {
      console.error('[OrderStatusController] ❌❌❌ ERROR IN getAllOrdered ❌❌❌');
      console.error('[OrderStatusController] Error message:', error.message);
      console.error('[OrderStatusController] Error stack:', error.stack);
      console.log('========================================');
      return res.status(500).json({
        success: false,
        message: 'Lỗi khi lấy dữ liệu',
        error: error.message,
      });
    }
  };
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
    console.log('========================================');
    console.log('[OrderStatusController] getByNames function called (batch)');
    console.log('[OrderStatusController] Request IP:', req.ip);
    console.log('[OrderStatusController] Body:', req.body);
    try {
      const { names } = req.body;
      if (!Array.isArray(names) || names.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Vui lòng cung cấp mảng tên trạng thái',
        });
      }
      console.log('[OrderStatusController] 🔍 Batch fetching order statuses by names:', names);
      const data = await orderStatus.findByNames(names);
      console.log('[OrderStatusController] ✅ Order statuses fetched:', data?.length || 0);
      console.log('========================================');
      return res.status(200).json({
        success: true,
        data,              
        count: data?.length || 0,  
      });
    } 
    catch (error) {
      console.error('[OrderStatusController] ❌❌❌ ERROR IN getByNames ❌❌❌');
      console.error('[OrderStatusController] Error message:', error.message);
      console.error('[OrderStatusController] Error stack:', error.stack);
      console.log('========================================');
      return res.status(500).json({
        success: false,
        message: 'Lỗi khi lấy dữ liệu',
        error: error.message,
      });
    }
  };
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
    console.log('========================================');
    console.log('[OrderStatusController] getByIds function called (batch)');
    console.log('[OrderStatusController] Request IP:', req.ip);
    console.log('[OrderStatusController] Body:', req.body);
    try {
      const { ids } = req.body;
      if (!Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Vui lòng cung cấp mảng ID trạng thái',
        });
      }
      const validIds = ids.filter(id => !isNaN(parseInt(id))).map(id => parseInt(id));
      if (validIds.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Vui lòng cung cấp ID hợp lệ',
        });
      }
      console.log('[OrderStatusController] 🔍 Batch fetching order statuses by IDs:', validIds);
      const data = await orderStatus.findByIds(validIds);
      console.log('[OrderStatusController] ✅ Order statuses fetched:', data?.length || 0);
      console.log('========================================');
      return res.status(200).json({
        success: true,
        data,              
        count: data?.length || 0,  
      });
    } 
    catch (error) {
      console.error('[OrderStatusController] ❌❌❌ ERROR IN getByIds ❌❌❌');
      console.error('[OrderStatusController] Error message:', error.message);
      console.error('[OrderStatusController] Error stack:', error.stack);
      console.log('========================================');
      return res.status(500).json({
        success: false,
        message: 'Lỗi khi lấy dữ liệu',
        error: error.message,
      });
    }
  };
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
    console.log('========================================');
    console.log('[OrderStatusController] getAll function called (override)');
    console.log('[OrderStatusController] Request IP:', req.ip);
    console.log('[OrderStatusController] Request URL:', req.originalUrl);
    console.log('[OrderStatusController] Query params:', JSON.stringify(req.query, null, 2));
    try {
      const { page = 1, limit = 10, ...filters } = req.query;
      const pageNum = Math.max(1, parseInt(page) || 1);
      const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 10));
      console.log('[OrderStatusController] Pagination:', { pageNum, limitNum });
      console.log('[OrderStatusController] Filters:', filters);
      const { data, total } = await orderStatus.findAllWithCount({
        filters,                              
        limit: limitNum,                     
        offset: (pageNum - 1) * limitNum,    
        orderBy: req.query.orderBy || 'sort_order ASC, status_id ASC',
      });
      console.log('[OrderStatusController] ✅ Data fetched using single SQL query:', {
        count: data?.length || 0,
        total,
        pageNum,
        limitNum
      });
      console.log('========================================');
      return res.status(200).json({
        success: true,
        data,              
        pagination: {      
          pages: Math.ceil(total / limitNum),  
        },
      });
    } 
    catch (error) {
      console.error('[OrderStatusController] ❌❌❌ ERROR IN getAll ❌❌❌');
      console.error('[OrderStatusController] Error message:', error.message);
      console.error('[OrderStatusController] Error stack:', error.stack);
      console.log('========================================');
      return res.status(500).json({
        success: false,
        message: 'Lỗi khi lấy dữ liệu',
        error: error.message,
      });
    }
  };
  return {
    ...baseController,
    getAll,                
    getByName,              
    getAllOrdered,          
    getByNames,            
    getByIds,              
  };
};
module.exports = createOrderStatusController();
