// ============================================
// IMPORT MODULES
// ============================================
// Import BaseController factory function
// BaseController cung cấp các HTTP handlers cơ bản (getAll, getById, create, update, delete, count)
const createBaseController = require('./BaseController');

// Import category model từ Models/index.js
// category là instance của Category model đã được khởi tạo
const { category } = require('../Models');

// ============================================
// CATEGORY CONTROLLER FACTORY FUNCTION
// ============================================
/**
 * Tạo CategoryController với các HTTP handlers cho quản lý categories
 * CategoryController kế thừa tất cả handlers từ BaseController và thêm các handlers riêng
 * 
 * @returns {Object} CategoryController object với các handlers:
 * - Từ BaseController: getAll, getById, create, update, delete, count
 * - Riêng Category: getBySlug, getByParent, getCategoryTree
 */
const createCategoryController = () => {
  // Tạo baseController từ BaseController với category model
  // baseController sẽ có các handlers cơ bản: getAll, getById, create, update, delete, count
  const baseController = createBaseController(category);

  // ============================================
  // GET BY SLUG FUNCTION: Lấy category theo slug
  // ============================================
  /**
   * HTTP Handler: GET /categories/slug/:slug
   * Lấy category theo slug (URL-friendly identifier)
   * 
   * URL Params:
   * - slug: Slug của category (bắt buộc)
   * 
   * Response:
   * - 200: Success { success: true, data: {...} }
   * - 400: Bad Request (thiếu slug)
   * - 404: Not Found (không tìm thấy category)
   * - 500: Server Error
   * 
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Promise<void>} JSON response
   */
  const getBySlug = async (req, res) => {
    // ============================================
    // BƯỚC 1: Logging - Ghi log thông tin request
    // ============================================
    console.log('========================================');
    console.log('[CategoryController] getBySlug function called');
    console.log('[CategoryController] Request IP:', req.ip);
    console.log('[CategoryController] Params:', req.params);
    
    try {
      // ============================================
      // BƯỚC 2: Extract và validate slug từ params
      // ============================================
      // Lấy slug từ URL params
      const { slug } = req.params;
      
      // Validation: slug phải tồn tại và không rỗng
      if (!slug || !slug.trim()) {
        console.log('[CategoryController] ❌ Validation failed: Missing slug');
        return res.status(400).json({
          success: false,
          message: 'Slug là bắt buộc',
        });
      }

      // ============================================
      // BƯỚC 3: Tìm category theo slug
      // ============================================
      console.log('[CategoryController] 🔍 Finding category by slug:', slug.trim());
      
      // Gọi category.findBySlug để tìm category theo slug (đã trim)
      const data = await category.findBySlug(slug.trim());

      // ============================================
      // BƯỚC 4: Kiểm tra kết quả
      // ============================================
      // Nếu không tìm thấy, trả về 404
      if (!data) {
        console.log('[CategoryController] ❌ Category not found');
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy category',
        });
      }

      console.log('[CategoryController] ✅ Category found:', data.category_id);
      console.log('========================================');

      // ============================================
      // BƯỚC 5: Trả về response thành công
      // ============================================
      // Trả về JSON response với status 200 (OK)
      return res.status(200).json({
        success: true,
        data,  // Category object
      });
    } 
    // ============================================
    // ERROR HANDLING: Xử lý lỗi
    // ============================================
    catch (error) {
      // Log lỗi chi tiết để debug
      console.error('[CategoryController] ❌❌❌ ERROR IN getBySlug ❌❌❌');
      console.error('[CategoryController] Error message:', error.message);
      console.error('[CategoryController] Error stack:', error.stack);
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
  // GET BY PARENT FUNCTION: Lấy categories theo parent ID
  // ============================================
  /**
   * HTTP Handler: GET /categories/parent/:parentId
   * Lấy danh sách categories theo parent ID (categories con)
   * 
   * URL Params:
   * - parentId: ID của parent category (bắt buộc)
   * 
   * Response:
   * - 200: Success { success: true, data: [...] }
   * - 400: Bad Request (thiếu parentId)
   * - 500: Server Error
   * 
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Promise<void>} JSON response
   */
  const getByParent = async (req, res) => {
    // ============================================
    // BƯỚC 1: Logging - Ghi log thông tin request
    // ============================================
    console.log('========================================');
    console.log('[CategoryController] getByParent function called');
    console.log('[CategoryController] Request IP:', req.ip);
    console.log('[CategoryController] Params:', req.params);
    
    try {
      // ============================================
      // BƯỚC 2: Extract và validate parentId từ params
      // ============================================
      // Lấy parentId từ URL params
      const { parentId } = req.params;
      
      // Validation: parentId là bắt buộc
      if (!parentId) {
        console.log('[CategoryController] ❌ Validation failed: Missing parentId');
        return res.status(400).json({
          success: false,
          message: 'Parent ID là bắt buộc',
        });
      }

      // ============================================
      // BƯỚC 3: Tìm categories theo parent ID
      // ============================================
      console.log('[CategoryController] 🔍 Finding categories by parentId:', parentId);
      
      // Gọi category.findByParent để lấy tất cả categories con của parent
      const data = await category.findByParent(parentId);
      
      console.log('[CategoryController] ✅ Found categories:', data?.length || 0);
      console.log('========================================');

      // ============================================
      // BƯỚC 4: Trả về response thành công
      // ============================================
      // Trả về JSON response với status 200 (OK)
      return res.status(200).json({
        success: true,
        data,  // Mảng các categories con
      });
    } 
    // ============================================
    // ERROR HANDLING: Xử lý lỗi
    // ============================================
    catch (error) {
      // Log lỗi chi tiết để debug
      console.error('[CategoryController] ❌❌❌ ERROR IN getByParent ❌❌❌');
      console.error('[CategoryController] Error message:', error.message);
      console.error('[CategoryController] Error stack:', error.stack);
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
  // GET CATEGORY TREE FUNCTION: Lấy category tree (cây danh mục)
  // ============================================
  /**
   * HTTP Handler: GET /categories/tree
   * Lấy category tree (cây danh mục) với parent-child relationships
   * 
   * Response:
   * - 200: Success { success: true, data: [...] }
   * - 500: Server Error
   * 
   * Tối ưu:
   * - Fetch tất cả categories một lần, sau đó build tree trong memory
   * - Thay thế recursive SQL queries bằng single batch query
   * - Sử dụng SQL ORDER BY để sort (parent_id NULL first cho root categories)
   * - Build tree structure trong memory (không có additional SQL queries)
   * 
   * Cấu trúc tree:
   * - Root categories: parent_id = null
   * - Child categories: parent_id = parent's category_id
   * - Mỗi category có children array chứa các categories con
   * 
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Promise<void>} JSON response
   */
  const getCategoryTree = async (req, res) => {
    // ============================================
    // BƯỚC 1: Logging - Ghi log thông tin request
    // ============================================
    console.log('========================================');
    console.log('[CategoryController] getCategoryTree function called');
    console.log('[CategoryController] Request IP:', req.ip);
    
    try {
      // ============================================
      // BƯỚC 2: Fetch tất cả categories một lần bằng single SQL query
      // ============================================
      // Sử dụng SQL ORDER BY để sort theo parent_id (NULL first cho root categories) và name
      // Giảm JavaScript sorting operations
      console.log('[CategoryController] 🌳 Fetching all categories with single SQL query (sorted)...');
      
      // Gọi category.findAllSortedForTree để lấy tất cả categories đã được sort
      const categories = await category.findAllSortedForTree();
      
      console.log('[CategoryController] ✅ Fetched all categories:', categories?.length || 0);
      
      // ============================================
      // BƯỚC 3: Build tree structure trong memory
      // ============================================
      // Categories đã được sort bởi SQL ORDER BY (parent_id NULL first, sau đó name)
      // Không cần additional SQL queries
      console.log('[CategoryController] 🌳 Building category tree in memory...');
      
      // Tạo category map để dễ lookup (O(1) thay vì O(N))
      const categoryMap = {};
      
      // Mảng chứa root categories (parent_id = null)
      const rootCategories = [];
      
      // ============================================
      // BƯỚC 3.1: First pass - Tạo map của tất cả categories
      // ============================================
      // Categories đã được sort bởi SQL, nên có thể process theo thứ tự
      categories.forEach(cat => {
        // Tạo category object với children array rỗng
        categoryMap[cat.category_id] = {
          ...cat,        // Spread category data
          children: []   // Khởi tạo children array
        };
      });
      
      // ============================================
      // BƯỚC 3.2: Second pass - Build parent-child relationships
      // ============================================
      // Vì categories được sort theo parent_id (NULL first), root categories đến trước
      categories.forEach(cat => {
        // Nếu là root category (parent_id = null hoặc undefined)
        if (cat.parent_id === null || cat.parent_id === undefined) {
          // Thêm vào rootCategories
          rootCategories.push(categoryMap[cat.category_id]);
        } 
        // Nếu là child category (có parent_id)
        else {
          // Tìm parent trong map
          const parent = categoryMap[cat.parent_id];
          
          if (parent) {
            // Thêm vào children array của parent
            parent.children.push(categoryMap[cat.category_id]);
          } else {
            // Orphan category (parent không tìm thấy), treat as root
            // Trường hợp này xảy ra nếu parent bị xóa nhưng child vẫn còn
            rootCategories.push(categoryMap[cat.category_id]);
          }
        }
      });
      
      // Lưu ý: Categories đã được sort bởi SQL ORDER BY, nên children đã được sort
      // Chỉ cần sort root categories (đã được sort bởi SQL)
      
      console.log('[CategoryController] ✅ Category tree built successfully');
      console.log('[CategoryController] Root categories:', rootCategories?.length || 0);
      console.log('========================================');

      // ============================================
      // BƯỚC 4: Trả về response thành công
      // ============================================
      // Trả về JSON response với status 200 (OK)
      // data là mảng root categories, mỗi root có children array chứa các categories con
      return res.status(200).json({
        success: true,
        data: rootCategories,  // Mảng root categories với children đã được build
      });
    } 
    // ============================================
    // ERROR HANDLING: Xử lý lỗi
    // ============================================
    catch (error) {
      // Log lỗi chi tiết để debug
      console.error('[CategoryController] ❌❌❌ ERROR IN getCategoryTree ❌❌❌');
      console.error('[CategoryController] Error message:', error.message);
      console.error('[CategoryController] Error stack:', error.stack);
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
  // Sau đó thêm các handlers riêng của CategoryController
  return {
    ...baseController,    // Spread các handlers từ BaseController (getAll, getById, create, update, delete, count)
    getBySlug,            // Handler riêng: Lấy category theo slug
    getByParent,          // Handler riêng: Lấy categories theo parent ID
    getCategoryTree,      // Handler riêng: Lấy category tree (cây danh mục)
  };
};

// ============================================
// EXPORT MODULE
// ============================================
// Export CategoryController đã được khởi tạo (singleton pattern)
// Cách sử dụng: const categoryController = require('./CategoryController');
//               router.get('/tree', categoryController.getCategoryTree);
module.exports = createCategoryController();
