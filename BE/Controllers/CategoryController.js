const createBaseController = require('./BaseController');

const { category } = require('../Models');

/**
 * Tạo CategoryController với các HTTP handlers cho quản lý categories
 * CategoryController kế thừa tất cả handlers từ BaseController và thêm các handlers riêng
 * 
 * @returns {Object} CategoryController object với các handlers:
 * - Từ BaseController: getAll, getById, create, update, delete, count
 * - Riêng Category: getBySlug, getByParent, getCategoryTree
 */

const createCategoryController = () => {

  const baseController = createBaseController(category);

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

    console.log('========================================');
    console.log('[CategoryController] getBySlug function called');
    console.log('[CategoryController] Request IP:', req.ip);
    console.log('[CategoryController] Params:', req.params);

    try {

      const { slug } = req.params;

      if (!slug || !slug.trim()) {
        console.log('[CategoryController] ❌ Validation failed: Missing slug');
        return res.status(400).json({
          success: false,
          message: 'Slug là bắt buộc',
        });
      }

      console.log('[CategoryController] 🔍 Finding category by slug:', slug.trim());

      const data = await category.findBySlug(slug.trim());

      if (!data) {
        console.log('[CategoryController] ❌ Category not found');
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy category',
        });
      }

      console.log('[CategoryController] ✅ Category found:', data.category_id);
      console.log('========================================');

      return res.status(200).json({
        success: true,
        data,  
      });
    } 

    catch (error) {

      console.error('[CategoryController] ❌❌❌ ERROR IN getBySlug ❌❌❌');
      console.error('[CategoryController] Error message:', error.message);
      console.error('[CategoryController] Error stack:', error.stack);
      console.log('========================================');

      return res.status(500).json({
        success: false,
        message: 'Lỗi khi lấy dữ liệu',
        error: error.message,
      });
    }
  };

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

    console.log('========================================');
    console.log('[CategoryController] getByParent function called');
    console.log('[CategoryController] Request IP:', req.ip);
    console.log('[CategoryController] Params:', req.params);

    try {

      const { parentId } = req.params;

      if (!parentId) {
        console.log('[CategoryController] ❌ Validation failed: Missing parentId');
        return res.status(400).json({
          success: false,
          message: 'Parent ID là bắt buộc',
        });
      }

      console.log('[CategoryController] 🔍 Finding categories by parentId:', parentId);

      const data = await category.findByParent(parentId);

      console.log('[CategoryController] ✅ Found categories:', data?.length || 0);
      console.log('========================================');

      return res.status(200).json({
        success: true,
        data,  
      });
    } 

    catch (error) {

      console.error('[CategoryController] ❌❌❌ ERROR IN getByParent ❌❌❌');
      console.error('[CategoryController] Error message:', error.message);
      console.error('[CategoryController] Error stack:', error.stack);
      console.log('========================================');

      return res.status(500).json({
        success: false,
        message: 'Lỗi khi lấy dữ liệu',
        error: error.message,
      });
    }
  };

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

    console.log('========================================');
    console.log('[CategoryController] getCategoryTree function called');
    console.log('[CategoryController] Request IP:', req.ip);

    try {

      console.log('[CategoryController] 🌳 Fetching all categories with single SQL query (sorted)...');

      const categories = await category.findAllSortedForTree();

      console.log('[CategoryController] ✅ Fetched all categories:', categories?.length || 0);

      console.log('[CategoryController] 🌳 Building category tree in memory...');

      const categoryMap = {};

      const rootCategories = [];

      categories.forEach(cat => {

        categoryMap[cat.category_id] = {
          ...cat,        
          children: []   
        };
      });

      categories.forEach(cat => {

        if (cat.parent_id === null || cat.parent_id === undefined) {

          rootCategories.push(categoryMap[cat.category_id]);
        } 

        else {

          const parent = categoryMap[cat.parent_id];

          if (parent) {

            parent.children.push(categoryMap[cat.category_id]);
          } else {

            rootCategories.push(categoryMap[cat.category_id]);
          }
        }
      });

      console.log('[CategoryController] ✅ Category tree built successfully');
      console.log('[CategoryController] Root categories:', rootCategories?.length || 0);
      console.log('========================================');

      return res.status(200).json({
        success: true,
        data: rootCategories,  
      });
    } 

    catch (error) {

      console.error('[CategoryController] ❌❌❌ ERROR IN getCategoryTree ❌❌❌');
      console.error('[CategoryController] Error message:', error.message);
      console.error('[CategoryController] Error stack:', error.stack);
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
    getBySlug,            
    getByParent,          
    getCategoryTree,      
  };
};

module.exports = createCategoryController();
