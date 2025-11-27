const createBaseController = require('./BaseController');
const { brand } = require('../Models');

const createBrandController = () => {
  const baseController = createBaseController(brand);

  const getByName = async (req, res) => {
    console.log('========================================');
    console.log('[BrandController] getByName function called');
    console.log('[BrandController] Request IP:', req.ip);
    console.log('[BrandController] Params:', req.params);
    
    try {
      const { name } = req.params;
      console.log('[BrandController] Searching for brand:', name);
      
      if (!name || !name.trim()) {
        console.log('[BrandController] ❌ Validation failed: Missing brand name');
        return res.status(400).json({
          success: false,
          message: 'Tên thương hiệu là bắt buộc',
        });
      }

      console.log('[BrandController] 🔍 Finding brand by name...');
      const data = await brand.findByName(name.trim());

      if (!data) {
        console.log('[BrandController] ❌ Brand not found');
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy thương hiệu',
        });
      }

      console.log('[BrandController] ✅ Brand found:', data.brand_id);
      console.log('========================================');

      return res.status(200).json({
        success: true,
        data,
      });
    } catch (error) {
      console.error('[BrandController] ❌❌❌ ERROR IN getByName ❌❌❌');
      console.error('[BrandController] Error message:', error.message);
      console.error('[BrandController] Error stack:', error.stack);
      console.log('========================================');
      
      const { logger } = require('../Middlewares/errorHandler');
      logger.error(`Error in BrandController.getByName: ${error.message}`, { error: error.stack, name: req.params.name });
      return res.status(500).json({
        success: false,
        message: 'Lỗi khi lấy dữ liệu',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      });
    }
  };

  return {
    ...baseController,
    getByName,
  };
};

module.exports = createBrandController();
