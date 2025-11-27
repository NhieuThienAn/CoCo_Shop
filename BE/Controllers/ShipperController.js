// ============================================
// IMPORT MODULES
// ============================================
// Import BaseController factory function
// BaseController cung cấp các HTTP handlers cơ bản (getAll, getById, create, update, delete, count)
const createBaseController = require('./BaseController');

// Import shipper model từ Models/index.js
// shipper là instance của Shipper model đã được khởi tạo
const { shipper } = require('../Models');

// ============================================
// SHIPPER CONTROLLER FACTORY FUNCTION
// ============================================
/**
 * Tạo ShipperController với các HTTP handlers cho quản lý shippers
 * ShipperController kế thừa tất cả handlers từ BaseController và thêm các handlers riêng
 * 
 * @returns {Object} ShipperController object với các handlers:
 * - Từ BaseController: getAll, getById, create, update, delete, count
 * - Riêng Shipper: searchByName
 */
const createShipperController = () => {
  // Tạo baseController từ BaseController với shipper model
  // baseController sẽ có các handlers cơ bản: getAll, getById, create, update, delete, count
  const baseController = createBaseController(shipper);

  // ============================================
  // SEARCH BY NAME FUNCTION: Tìm kiếm shipper theo tên
  // ============================================
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
    // ============================================
    // BƯỚC 1: Logging - Ghi log thông tin request
    // ============================================
    console.log('========================================');
    console.log('[ShipperController] searchByName function called');
    console.log('[ShipperController] Request IP:', req.ip);
    console.log('[ShipperController] Query:', req.query);
    
    try {
      // ============================================
      // BƯỚC 2: Extract và validate name từ query params
      // ============================================
      // Lấy name từ query parameters
      const { name } = req.query;
      console.log('[ShipperController] Searching for shipper:', name);
      
      // Validation: name là bắt buộc
      if (!name) {
        console.log('[ShipperController] ❌ Validation failed: Missing shipper name');
        return res.status(400).json({
          success: false,
          message: 'Vui lòng cung cấp tên đơn vị vận chuyển',
        });
      }

      // ============================================
      // BƯỚC 3: Tìm kiếm shipper theo tên
      // ============================================
      console.log('[ShipperController] 🔍 Finding shipper by name...');
      
      // Gọi shipper.findByName để tìm kiếm shipper theo tên
      // Method này có thể trả về array (nếu có nhiều kết quả) hoặc single object
      const data = await shipper.findByName(name);
      
      console.log('[ShipperController] ✅ Shipper search completed:', data?.length || 0, 'results');
      console.log('========================================');
      
      // ============================================
      // BƯỚC 4: Trả về response thành công
      // ============================================
      // Trả về JSON response với status 200 (OK)
      return res.status(200).json({
        success: true,
        data,  // Mảng các shippers tìm được (hoặc single object)
      });
    } 
    // ============================================
    // ERROR HANDLING: Xử lý lỗi
    // ============================================
    catch (error) {
      // Log lỗi chi tiết để debug
      console.error('[ShipperController] ❌❌❌ ERROR IN searchByName ❌❌❌');
      console.error('[ShipperController] Error message:', error.message);
      console.error('[ShipperController] Error stack:', error.stack);
      console.log('========================================');
      
      // Trả về error response với status 500 (Internal Server Error)
      return res.status(500).json({
        success: false,
        message: 'Lỗi khi tìm kiếm',
        error: error.message,
      });
    }
  };

  // ============================================
  // RETURN CONTROLLER OBJECT
  // ============================================
  // Trả về object chứa tất cả HTTP handlers
  // Spread baseController để lấy các handlers cơ bản
  // Sau đó thêm các handlers riêng của ShipperController
  return {
    ...baseController,    // Spread các handlers từ BaseController (getAll, getById, create, update, delete, count)
    searchByName,          // Handler riêng: Tìm kiếm shipper theo tên
  };
};

// ============================================
// EXPORT MODULE
// ============================================
// Export ShipperController đã được khởi tạo (singleton pattern)
// Cách sử dụng: const shipperController = require('./ShipperController');
//               router.get('/search', shipperController.searchByName);
module.exports = createShipperController();
