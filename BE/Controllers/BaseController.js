const { logger } = require('../Middlewares/errorHandler');
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
    console.log('========================================');
    console.log(`[BaseController:${model.tableName}] getAll function called`);
    console.log(`[BaseController:${model.tableName}] Request IP:`, req.ip);
    console.log(`[BaseController:${model.tableName}] Request URL:`, req.originalUrl);
    console.log(`[BaseController:${model.tableName}] Query params:`, JSON.stringify(req.query, null, 2));
    try {
      const { page = 1, limit = 10, ...filters } = req.query;
      const offset = (parseInt(page) - 1) * parseInt(limit);
      const pageNum = Math.max(1, parseInt(page) || 1);
      const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 10));
      console.log(`[BaseController:${model.tableName}] Pagination:`, { pageNum, limitNum, offset });
      console.log(`[BaseController:${model.tableName}] Filters:`, filters);
      console.log(`[BaseController:${model.tableName}] 🔍 Fetching data from database...`);
      let data, total;
      if (typeof model.findAllWithCount === 'function') {
        const result = await model.findAllWithCount({
          filters,                              
          limit: limitNum,                     
          offset: (pageNum - 1) * limitNum,
          orderBy: req.query.orderBy || 'created_at DESC',
        });
        data = result.data;
        total = result.total;
      } 
      else {
        [data, total] = await Promise.all([
          model.findAll({
            filters,                              
            limit: limitNum,                     
            offset: (pageNum - 1) * limitNum,    
            orderBy: req.query.orderBy || 'created_at DESC',  
          }),
          model.count(filters),
        ]);
      }
      console.log(`[BaseController:${model.tableName}] ✅ Data fetched:`, {
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
          page: pageNum,            
          limit: limitNum,
          total,                    
          totalPages: Math.ceil(total / limitNum),
        },
      });
    } 
    catch (error) {
      console.error(`[BaseController:${model.tableName}] ❌❌❌ ERROR IN getAll ❌❌❌`);
      console.error(`[BaseController:${model.tableName}] Error message:`, error.message);
      console.error(`[BaseController:${model.tableName}] Error stack:`, error.stack);
      console.log('========================================');
      logger.error(`Error in getAll (${model.tableName}): ${error.message}`, { error: error.stack });
      return res.status(500).json({
        success: false,            
        message: 'Lỗi khi lấy dữ liệu',  

        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      });
    }
  };
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
    console.log('========================================');
    console.log(`[BaseController:${model.tableName}] getById function called`);
    console.log(`[BaseController:${model.tableName}] Request IP:`, req.ip);
    console.log(`[BaseController:${model.tableName}] Request URL:`, req.originalUrl);
    console.log(`[BaseController:${model.tableName}] Params:`, req.params);
    try {
      const { id } = req.params;
      if (!id) {
        console.log(`[BaseController:${model.tableName}] ❌ Validation failed: Missing ID`);
        return res.status(400).json({
          success: false,
          message: 'ID là bắt buộc',
        });
      }
      console.log(`[BaseController:${model.tableName}] 🔍 Finding record with ID:`, id);
      const data = await model.findById(id);
      if (!data) {
        console.log(`[BaseController:${model.tableName}] ❌ Record not found with ID:`, id);
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy dữ liệu',
        });
      }
      console.log(`[BaseController:${model.tableName}] ✅ Record found`);
      console.log('========================================');
      return res.status(200).json({
        success: true,
        data,  
      });
    } 
    catch (error) {
      console.error(`[BaseController:${model.tableName}] ❌❌❌ ERROR IN getById ❌❌❌`);
      console.error(`[BaseController:${model.tableName}] Error message:`, error.message);
      console.error(`[BaseController:${model.tableName}] Error stack:`, error.stack);
      console.log('========================================');
      logger.error(`Error in getById (${model.tableName}): ${error.message}`, { error: error.stack, id: req.params.id });
      return res.status(500).json({
        success: false,
        message: 'Lỗi khi lấy dữ liệu',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      });
    }
  };
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
    console.log('========================================');
    console.log(`[BaseController:${model.tableName}] create function called`);
    console.log(`[BaseController:${model.tableName}] Request IP:`, req.ip);
    console.log(`[BaseController:${model.tableName}] Request URL:`, req.originalUrl);
    console.log(`[BaseController:${model.tableName}] Request body:`, JSON.stringify(req.body, null, 2));
    try {
      if (!req.body || Object.keys(req.body).length === 0) {
        console.log(`[BaseController:${model.tableName}] ❌ Validation failed: Empty body`);
        return res.status(400).json({
          success: false,
          message: 'Dữ liệu không được để trống',
        });
      }
      console.log(`[BaseController:${model.tableName}] 💾 Creating record in database...`);
      console.log(`[BaseController:${model.tableName}] 🔍 Model.create type:`, typeof model.create);
      console.log(`[BaseController:${model.tableName}] 🔍 Model.create function:`, model.create.toString().substring(0, 200));
      console.log(`[BaseController:${model.tableName}] 🔍 Calling model.create() with data:`, JSON.stringify(req.body, null, 2));
      const result = await model.create(req.body);
      const insertId = result.insertId || result[0]?.insertId || result.insertId;
      console.log(`[BaseController:${model.tableName}] Create result:`, { insertId, result });
      if (!insertId) {
        console.log(`[BaseController:${model.tableName}] ⚠️ Warning: No insertId returned`);
        logger.warn(`Create operation did not return insertId for ${model.tableName}`);
        return res.status(201).json({
          success: true,
          message: 'Tạo mới thành công',
          data: result,  
        });
      }
      console.log(`[BaseController:${model.tableName}] 🔍 Fetching newly created record...`);
      const newRecord = await model.findById(insertId);
      console.log(`[BaseController:${model.tableName}] ✅ Record created successfully with ID:`, insertId);
      console.log('========================================');
      return res.status(201).json({
        success: true,
        message: 'Tạo mới thành công',
        data: newRecord,  
      });
    } 
    catch (error) {
      console.error(`[BaseController:${model.tableName}] ❌❌❌ ERROR IN create ❌❌❌`);
      console.error(`[BaseController:${model.tableName}] Error message:`, error.message);
      console.error(`[BaseController:${model.tableName}] Error stack:`, error.stack);
      console.error(`[BaseController:${model.tableName}] Error details:`, {
        name: error.name,
        code: error.code
      });
      console.log('========================================');
      logger.error(`Error in create (${model.tableName}): ${error.message}`, { error: error.stack, body: req.body });
      return res.status(400).json({
        success: false,
        message: 'Lỗi khi tạo mới',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      });
    }
  };
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
    console.log('========================================');
    console.log(`[BaseController:${model.tableName}] update function called`);
    console.log(`[BaseController:${model.tableName}] Request IP:`, req.ip);
    console.log(`[BaseController:${model.tableName}] Request URL:`, req.originalUrl);
    console.log(`[BaseController:${model.tableName}] Params:`, req.params);
    console.log(`[BaseController:${model.tableName}] Request body:`, JSON.stringify(req.body, null, 2));
    try {
      const { id } = req.params;
      if (!id) {
        console.log(`[BaseController:${model.tableName}] ❌ Validation failed: Missing ID`);
        return res.status(400).json({
          success: false,
          message: 'ID là bắt buộc',
        });
      }
      if (!req.body || Object.keys(req.body).length === 0) {
        console.log(`[BaseController:${model.tableName}] ❌ Validation failed: Empty body`);
        return res.status(400).json({
          success: false,
          message: 'Dữ liệu cập nhật không được để trống',
        });
      }
      console.log(`[BaseController:${model.tableName}] 🔍 Checking if record exists...`);
      const existing = await model.findById(id);
      if (!existing) {
        console.log(`[BaseController:${model.tableName}] ❌ Record not found with ID:`, id);
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy dữ liệu',
        });
      }
      console.log(`[BaseController:${model.tableName}] ✅ Record found, updating...`);
      await model.update(id, req.body);
      console.log(`[BaseController:${model.tableName}] 🔍 Fetching updated record...`);
      const updated = await model.findById(id);
      console.log(`[BaseController:${model.tableName}] ✅ Record updated successfully`);
      console.log('========================================');
      return res.status(200).json({
        success: true,
        message: 'Cập nhật thành công',
        data: updated,  
      });
    } 
    catch (error) {
      console.error(`[BaseController:${model.tableName}] ❌❌❌ ERROR IN update ❌❌❌`);
      console.error(`[BaseController:${model.tableName}] Error message:`, error.message);
      console.error(`[BaseController:${model.tableName}] Error stack:`, error.stack);
      console.log('========================================');
      logger.error(`Error in update (${model.tableName}): ${error.message}`, { error: error.stack, id: req.params.id });
      return res.status(400).json({
        success: false,
        message: 'Lỗi khi cập nhật',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      });
    }
  };
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
    console.log('========================================');
    console.log(`[BaseController:${model.tableName}] delete function called`);
    console.log(`[BaseController:${model.tableName}] Request IP:`, req.ip);
    console.log(`[BaseController:${model.tableName}] Request URL:`, req.originalUrl);
    console.log(`[BaseController:${model.tableName}] Params:`, req.params);
    try {
      const { id } = req.params;
      if (!id) {
        console.log(`[BaseController:${model.tableName}] ❌ Validation failed: Missing ID`);
        return res.status(400).json({
          success: false,
          message: 'ID là bắt buộc',
        });
      }
      console.log(`[BaseController:${model.tableName}] 🔍 Checking if record exists...`);
      const existing = await model.findById(id);
      if (!existing) {
        console.log(`[BaseController:${model.tableName}] ❌ Record not found with ID:`, id);
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy dữ liệu',
        });
      }
      console.log(`[BaseController:${model.tableName}] ✅ Record found, deleting...`);
      await model.delete(id);
      console.log(`[BaseController:${model.tableName}] ✅ Record deleted successfully`);
      console.log('========================================');
      logger.info(`Record deleted: ${model.tableName} ID ${id}`);
      return res.status(200).json({
        success: true,
        message: 'Xóa thành công',
      });
    } 
    catch (error) {
      console.error(`[BaseController:${model.tableName}] ❌❌❌ ERROR IN delete ❌❌❌`);
      console.error(`[BaseController:${model.tableName}] Error message:`, error.message);
      console.error(`[BaseController:${model.tableName}] Error stack:`, error.stack);
      console.log('========================================');
      logger.error(`Error in delete (${model.tableName}): ${error.message}`, { error: error.stack, id: req.params.id });
      return res.status(400).json({
        success: false,
        message: 'Lỗi khi xóa',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      });
    }
  };
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
    console.log('========================================');
    console.log(`[BaseController:${model.tableName}] count function called`);
    console.log(`[BaseController:${model.tableName}] Request IP:`, req.ip);
    console.log(`[BaseController:${model.tableName}] Query params:`, JSON.stringify(req.query, null, 2));
    try {
      console.log(`[BaseController:${model.tableName}] 🔢 Counting records...`);
      const countResult = await model.count(req.query);
      console.log(`[BaseController:${model.tableName}] ✅ Count result:`, countResult);
      console.log('========================================');
      return res.status(200).json({
        success: true,
        count: countResult,  
      });
    } 
    catch (error) {
      console.error(`[BaseController:${model.tableName}] ❌❌❌ ERROR IN count ❌❌❌`);
      console.error(`[BaseController:${model.tableName}] Error message:`, error.message);
      console.error(`[BaseController:${model.tableName}] Error stack:`, error.stack);
      console.log('========================================');
      logger.error(`Error in count (${model.tableName}): ${error.message}`, { error: error.stack });
      return res.status(500).json({
        success: false,
        message: 'Lỗi khi đếm',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      });
    }
  };
  return {
    getAll,
    getById,
    create,
    update,
    delete: deleteRecord,
    count,
  };
};
module.exports = createBaseController;
