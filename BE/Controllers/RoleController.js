const createBaseController = require('./BaseController');
const { role } = require('../Models');

const createRoleController = () => {
  const baseController = createBaseController(role);

  const getByName = async (req, res) => {
    console.log('========================================');
    console.log('[RoleController] getByName function called');
    console.log('[RoleController] Request IP:', req.ip);
    console.log('[RoleController] Params:', req.params);
    
    try {
      const { name } = req.params;
      console.log('[RoleController] Searching for role:', name);
      
      if (!name || !name.trim()) {
        console.log('[RoleController] ❌ Validation failed: Missing role name');
        return res.status(400).json({
          success: false,
          message: 'Tên role là bắt buộc',
        });
      }

      console.log('[RoleController] 🔍 Finding role by name...');
      const data = await role.findByName(name.trim());

      if (!data) {
        console.log('[RoleController] ❌ Role not found');
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy role',
        });
      }

      console.log('[RoleController] ✅ Role found:', data.role_id);
      console.log('========================================');

      return res.status(200).json({
        success: true,
        data,
      });
    } catch (error) {
      console.error('[RoleController] ❌❌❌ ERROR IN getByName ❌❌❌');
      console.error('[RoleController] Error message:', error.message);
      console.error('[RoleController] Error stack:', error.stack);
      console.log('========================================');
      
      const { logger } = require('../Middlewares/errorHandler');
      logger.error(`Error in RoleController.getByName: ${error.message}`, { error: error.stack, name: req.params.name });
      return res.status(500).json({
        success: false,
        message: 'Lỗi khi lấy dữ liệu',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      });
    }
  };

  // Override getAll để sử dụng orderBy phù hợp (không có created_at)
  const getAll = async (req, res) => {
    console.log('========================================');
    console.log('[RoleController] getAll function called (override)');
    console.log('[RoleController] Request IP:', req.ip);
    console.log('[RoleController] Request URL:', req.originalUrl);
    console.log('[RoleController] Query params:', JSON.stringify(req.query, null, 2));
    
    try {
      const { page = 1, limit = 10, ...filters } = req.query;
      const pageNum = Math.max(1, parseInt(page) || 1);
      const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 10));

      console.log('[RoleController] Pagination:', { pageNum, limitNum });
      console.log('[RoleController] Filters:', filters);

      // Use single SQL query with window function COUNT(*) OVER() to get data and total count
      // This replaces Promise.all with 2 separate queries (findAll + count)
      const { data, total } = await role.findAllWithCount({
        filters,
        limit: limitNum,
        offset: (pageNum - 1) * limitNum,
        orderBy: req.query.orderBy || 'role_id ASC',
      });

      console.log('[RoleController] ✅ Data fetched:', {
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
          pages: Math.ceil(total / limitNum),
        },
      });
    } catch (error) {
      console.error('[RoleController] ❌❌❌ ERROR IN getAll ❌❌❌');
      console.error('[RoleController] Error message:', error.message);
      console.error('[RoleController] Error stack:', error.stack);
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
  };
};

module.exports = createRoleController();
