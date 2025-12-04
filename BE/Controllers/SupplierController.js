const createBaseController = require('./BaseController');
const { supplier } = require('../Models');
const createSupplierController = () => {
  const baseController = createBaseController(supplier);
  const searchByName = async (req, res) => {
    console.log('========================================');
    console.log('[SupplierController] searchByName function called');
    console.log('[SupplierController] Request IP:', req.ip);
    console.log('[SupplierController] Query:', req.query);
    try {
      const { name } = req.query;
      console.log('[SupplierController] Searching for supplier:', name);
      if (!name) {
        console.log('[SupplierController] ❌ Validation failed: Missing supplier name');
        return res.status(400).json({
          success: false,
          message: 'Vui lòng cung cấp tên nhà cung cấp',
        });
      }
      console.log('[SupplierController] 🔍 Finding supplier by name...');
      const data = await supplier.findByName(name);
      console.log('[SupplierController] ✅ Supplier search completed:', data?.length || 0, 'results');
      console.log('========================================');
      return res.status(200).json({
        success: true,
        data,
      });
    } catch (error) {
      console.error('[SupplierController] ❌❌❌ ERROR IN searchByName ❌❌❌');
      console.error('[SupplierController] Error message:', error.message);
      console.error('[SupplierController] Error stack:', error.stack);
      console.log('========================================');
      return res.status(500).json({
        success: false,
        message: 'Lỗi khi tìm kiếm',
        error: error.message,
      });
    }
  };
  return {
    ...baseController,
    searchByName,
  };
};
module.exports = createSupplierController();
