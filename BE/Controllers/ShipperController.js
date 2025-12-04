const createBaseController = require('./BaseController');
const { shipper } = require('../Models');
/**
 * Tạo ShipperController với các HTTP handlers cho quản lý shippers
 * ShipperController kế thừa tất cả handlers từ BaseController và thêm các handlers riêng
 * 
 * @returns {Object} ShipperController object với các handlers:
 * - Từ BaseController: getAll, getById, create, update, delete, count
 * - Riêng Shipper: searchByName
 */

const createShipperController = () => {
  const baseController = createBaseController(shipper);
  /**
   * HTTP Handler: GET /shippers/search?name=...
   * Tìm kiếm shipper theo tên
   * 
   * Query Parameters:
   * - name: Tên shipper cần tìm (bắt buộc)
   * 
   * Response:
   * - 200: Success { success: true, data: [...] }
   * - 400: Bad Request (thiếu name)
   * - 500: Server Error
   * 
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Promise<void>} JSON response
   */

  const searchByName = async (req, res) => {
    console.log('========================================');
    console.log('[ShipperController] searchByName function called');
    console.log('[ShipperController] Request IP:', req.ip);
    console.log('[ShipperController] Query:', req.query);
    try {
      const { name } = req.query;
      console.log('[ShipperController] Searching for shipper:', name);
      if (!name) {
        console.log('[ShipperController] ❌ Validation failed: Missing shipper name');
        return res.status(400).json({
          success: false,
          message: 'Vui lòng cung cấp tên đơn vị vận chuyển',
        });
      }
      console.log('[ShipperController] 🔍 Finding shipper by name...');
      const data = await shipper.findByName(name);
      console.log('[ShipperController] ✅ Shipper search completed:', data?.length || 0, 'results');
      console.log('========================================');
      return res.status(200).json({
        success: true,
        data,
      });
    } 
    catch (error) {
      console.error('[ShipperController] ❌❌❌ ERROR IN searchByName ❌❌❌');
      console.error('[ShipperController] Error message:', error.message);
      console.error('[ShipperController] Error stack:', error.stack);
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
module.exports = createShipperController();
