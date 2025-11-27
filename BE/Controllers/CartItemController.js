// ============================================
// IMPORT MODULES
// ============================================
// Import BaseController factory function
// BaseController cung cấp các HTTP handlers cơ bản (getAll, getById, create, update, delete, count)
const createBaseController = require('./BaseController');

// Import cartItem model từ Models/index.js
// cartItem là instance của CartItem model đã được khởi tạo
const { cartItem } = require('../Models');

// ============================================
// CART ITEM CONTROLLER FACTORY FUNCTION
// ============================================
/**
 * Tạo CartItemController với các HTTP handlers cho quản lý cart items
 * CartItemController kế thừa tất cả handlers từ BaseController và thêm các handlers riêng
 * 
 * @returns {Object} CartItemController object với các handlers:
 * - Từ BaseController: getAll, getById, create, update, delete, count
 * - Riêng CartItem: getUserCart, getByUser, getTotal, addOrUpdateItem, updateQuantity, 
 *   removeItem, clearCart, getMyCart, getMyCartTotal, addToMyCart, updateMyCartItem, 
 *   removeFromMyCart, clearMyCart, buyNow
 */
const createCartItemController = () => {
  // Tạo baseController từ BaseController với cartItem model
  // baseController sẽ có các handlers cơ bản: getAll, getById, create, update, delete, count
  const baseController = createBaseController(cartItem);

  // ============================================
  // HELPER FUNCTIONS
  // ============================================
  
  // ============================================
  // POPULATE CART ITEMS WITH PRODUCTS HELPER: Enrich cart items với product data
  // ============================================
  /**
   * Helper function: Populate cart items với processed product data và images
   * 
   * Tối ưu: Sử dụng SQL JOIN để fetch cart items với product data trong 1 query
   * Thay thế separate queries cho cart items và products (tránh N+1 problem)
   * 
   * @param {Array<Object>} cartItems - Mảng các cart item objects
   * @returns {Promise<Array<Object>>} Mảng cart items đã được enrich với product data
   * 
   * Enrich data bao gồm:
   * - product: Product object với đầy đủ thông tin
   * - product.images: Mảng images đã parse
   * - product.primary_image: Primary image URL
   * - Merge product_snapshot với product data hiện tại (snapshot cho historical data)
   */
  const populateCartItemsWithProducts = async (cartItems) => {
    // ============================================
    // BƯỚC 1: Validate input
    // ============================================
    // Kiểm tra cartItems có phải là array và không rỗng
    if (!Array.isArray(cartItems) || cartItems.length === 0) {
      return [];  // Trả về empty array nếu không có cart items
    }

    // ============================================
    // BƯỚC 2: Extract user_id và import product model
    // ============================================
    // Import product model (dynamic require để tránh circular dependency)
    const { product } = require('../Models');
    
    // Extract user_id từ cart item đầu tiên (tất cả items thuộc về cùng 1 user)
    const userId = cartItems[0]?.user_id;
    
    // Kiểm tra user_id có tồn tại không
    if (!userId) {
      console.warn('[CartItemController] No user_id found in cart items');
      return [];  // Trả về empty array nếu không có user_id
    }
    
    // ============================================
    // BƯỚC 3: Fetch cart items với product data bằng SQL JOIN
    // ============================================
    // Sử dụng SQL JOIN để fetch cart items với product data trong 1 query
    // Tối ưu hơn so với separate queries: cart items + batch product fetch
    // Tránh N+1 problem
    const cartItemsWithProducts = await cartItem.findByUserIdWithProducts(userId);
    console.log(`[CartItemController] 🔍 Fetched ${cartItemsWithProducts.length} cart items with products using SQL JOIN`);
    
    // ============================================
    // BƯỚC 4: Tạo product map từ JOIN results để dễ lookup
    // ============================================
    // Tạo map: { product_id: productObject }
    // Giúp lookup O(1) thay vì O(N) khi tìm product theo ID
    const productMap = {};
    
    // Duyệt qua từng row từ JOIN result
    cartItemsWithProducts.forEach(row => {
      // Chỉ thêm vào map nếu chưa có (tránh duplicate)
      // row.product_product_id: product_id từ JOIN result (có prefix product_ để tránh conflict)
      if (row.product_product_id && !productMap[row.product_product_id]) {
        // ============================================
        // BƯỚC 4.1: Parse images JSON để lấy primary image
        // ============================================
        let primaryImage = null;
        if (row.product_images) {
          try {
            // Parse images từ JSON string thành array
            const parsedImages = product.parseImages(row.product_images);
            
            // Tìm primary image (is_primary = true) hoặc lấy image đầu tiên
            primaryImage = parsedImages.find(img => img.is_primary === true) || parsedImages[0] || null;
          } catch (error) {
            console.error('[CartItemController] Error parsing product images:', error);
          }
        }
        
        // ============================================
        // BƯỚC 4.2: Tạo product object từ JOIN result
        // ============================================
        // Map các fields từ JOIN result (có prefix product_) vào product object
        productMap[row.product_product_id] = {
          id: row.product_db_id,                    // Database ID (id field)
          product_id: row.product_product_id,       // Product ID (product_id field)
          name: row.product_name,                   // Tên sản phẩm
          slug: row.product_slug,                   // Slug
          price: row.product_price,                 // Giá
          stock_quantity: row.product_stock_quantity,  // Số lượng tồn kho
          is_active: row.product_is_active,         // Trạng thái active
          deleted_at: row.product_deleted_at,       // Thời gian xóa (soft delete)
          images: row.product_images,               // Images JSON string
          primary_image: primaryImage,              // Primary image URL (đã parse)
          description: row.product_description,     // Mô tả
          category_id: row.product_category_id,    // ID danh mục
          brand: row.product_brand,                 // Thương hiệu
        };
      }
    });
    
    // Process each cart item with product data from JOIN
    return (cartItems || []).map((item) => {
      try {
        // Use batch-fetched product data instead of individual query
        const productData = productMap[item.product_id];
          
          // Verify the found product matches the cart item's product_id
          if (productData && productData.product_id !== item.product_id) {
            console.error('[CartItemController] ❌ CRITICAL: Product mismatch in populateCartItemsWithProducts!', {
              cartItemProductId: item.product_id,
              foundProductId: productData.product_id,
              foundProductName: productData.name,
              foundProductDbId: productData.id,
              cart_item_id: item.cart_item_id
            });
            // Still return the item but with a warning
          }
          
          // Parse product_snapshot if exists
          let productSnapshot = null;
          if (item.product_snapshot) {
            try {
              productSnapshot = typeof item.product_snapshot === 'string' 
                ? JSON.parse(item.product_snapshot) 
                : item.product_snapshot;
            } catch (e) {
              console.warn('[CartItemController] Failed to parse product_snapshot:', e);
            }
          }
          
          // Merge product data with snapshot (snapshot takes precedence for historical data)
          // Only use snapshot values if they are valid (not null/undefined)
          const mergedProduct = productData ? {
            ...productData,
            name: (productSnapshot?.name && productSnapshot.name.trim() !== '') ? productSnapshot.name : productData.name,
            price: (productSnapshot?.price !== undefined && productSnapshot.price !== null) ? productSnapshot.price : productData.price,
            // Only use snapshot images if they are valid (not null/undefined/empty)
            images: (productSnapshot?.images !== undefined && 
                     productSnapshot?.images !== null && 
                     (Array.isArray(productSnapshot.images) || 
                      typeof productSnapshot.images === 'string' ||
                      (typeof productSnapshot.images === 'object' && Object.keys(productSnapshot.images).length > 0))
                    ) ? productSnapshot.images : productData.images,
            // Only use snapshot primary_image if it's a valid string (not null/undefined/empty)
            primary_image: (productSnapshot?.primary_image && 
                           typeof productSnapshot.primary_image === 'string' && 
                           productSnapshot.primary_image.trim() !== '') 
                          ? productSnapshot.primary_image 
                          : productData.primary_image,
          } : (productSnapshot || {});
          
          // Process images if product has images
          if (mergedProduct && mergedProduct.images) {
            try {
              const parsedImages = product.parseImages(mergedProduct.images);
              mergedProduct.images = parsedImages;
              
              // Validate and set primary_image
              const existingPrimaryImageValid = mergedProduct.primary_image && 
                typeof mergedProduct.primary_image === 'string' && 
                mergedProduct.primary_image.trim() !== '' && 
                mergedProduct.primary_image !== '/placeholder.jpg';
              
              if (!existingPrimaryImageValid && parsedImages.length > 0) {
                // Find primary image from array
                const primaryImg = parsedImages.find(img => img.is_primary) || parsedImages[0];
                
                // Use url field, fallback to image_url if url doesn't exist
                const newPrimaryImage = primaryImg?.url || primaryImg?.image_url || null;
                
                if (newPrimaryImage && newPrimaryImage.trim() !== '') {
                  mergedProduct.primary_image = newPrimaryImage;
                }
              }
            } catch (parseError) {
              console.error('[CartItemController] Error parsing images for product:', item.product_id, parseError.message);
              mergedProduct.images = [];
            }
          }
          
          return {
            ...item,
            product: mergedProduct
          };
        } catch (error) {
          console.error('[CartItemController] Error processing cart item:', {
            cart_item_id: item.cart_item_id,
            product_id: item.product_id,
            error: error.message,
          });
          // Return item without product data if there's an error
          return {
            ...item,
            product: null
          };
        }
    });
  };

  // ============================================
  // GET USER CART FUNCTION: Lấy cart của user
  // ============================================
  /**
   * HTTP Handler: GET /cart-items/user/:userId
   * Lấy cart items của user theo userId
   * 
   * URL Params:
   * - userId: ID của user (bắt buộc)
   * 
   * Response:
   * - 200: Success { success: true, data: [...], total: N }
   * - 500: Server Error
   * 
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Promise<void>} JSON response
   */
  const getUserCart = async (req, res) => {
    try {
      // ============================================
      // BƯỚC 1: Extract userId từ params
      // ============================================
      const { userId } = req.params;
      
      // ============================================
      // BƯỚC 2: Fetch cart items và total
      // ============================================
      // Fetch cart items của user
      const data = await cartItem.findByUserId(userId);
      
      // Tính tổng tiền của cart
      const total = await cartItem.getCartTotal(userId);
      
      // ============================================
      // BƯỚC 3: Trả về response
      // ============================================
      return res.status(200).json({ 
        success: true, 
        data,      // Mảng cart items
        total      // Tổng tiền
      });
    } catch (error) {
      return res.status(500).json({ 
        success: false, 
        message: 'Lỗi khi lấy dữ liệu', 
        error: error.message 
      });
    }
  };

  // ============================================
  // ADD OR UPDATE ITEM FUNCTION: Thêm hoặc cập nhật cart item
  // ============================================
  /**
   * HTTP Handler: POST /cart-items/add-or-update
   * Thêm hoặc cập nhật cart item
   * 
   * Request Body:
   * - userId: ID của user (bắt buộc)
   * - productId: ID của product (bắt buộc)
   * - quantity: Số lượng (mặc định: 1)
   * - unitPrice: Giá đơn vị (mặc định: 0)
   * - productSnapshot: Snapshot của product (tùy chọn)
   * 
   * Response:
   * - 200: Success { success: true, message: "...", data: {...} }
   * - 400: Bad Request (thiếu userId/productId, hoặc lỗi validation)
   * 
   * Đặc biệt:
   * - Nếu item đã tồn tại: Cập nhật quantity (cộng dồn)
   * - Nếu item chưa tồn tại: Tạo mới
   * 
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Promise<void>} JSON response
   */
  const addOrUpdateItem = async (req, res) => {
    try {
      // ============================================
      // BƯỚC 1: Extract và validate data từ request body
      // ============================================
      const { userId, productId, quantity, unitPrice, productSnapshot } = req.body;
      
      // Validation: userId và productId là bắt buộc
      if (!userId || !productId) {
        return res.status(400).json({ 
          success: false, 
          message: 'userId và productId là bắt buộc' 
        });
      }
      
      // ============================================
      // BƯỚC 2: Gọi cartItem.addOrUpdate
      // ============================================
      // addOrUpdate: Thêm mới nếu chưa có, cập nhật quantity nếu đã có (cộng dồn)
      const result = await cartItem.addOrUpdate(
        userId, 
        productId, 
        quantity || 1,      // Mặc định: 1
        unitPrice || 0,    // Mặc định: 0
        productSnapshot    // Snapshot của product (tùy chọn)
      );
      
      // ============================================
      // BƯỚC 3: Trả về response thành công
      // ============================================
      return res.status(200).json({ 
        success: true, 
        message: 'Thêm vào giỏ hàng thành công', 
        data: result 
      });
    } catch (error) {
      return res.status(400).json({ 
        success: false, 
        message: 'Lỗi khi thêm vào giỏ hàng', 
        error: error.message 
      });
    }
  };

  // ============================================
  // REMOVE ITEM FUNCTION: Xóa cart item
  // ============================================
  /**
   * HTTP Handler: DELETE /cart-items/remove
   * Xóa cart item khỏi giỏ hàng
   * 
   * Request Body:
   * - userId: ID của user (bắt buộc)
   * - productId: ID của product (bắt buộc)
   * 
   * Response:
   * - 200: Success { success: true, message: "Xóa khỏi giỏ hàng thành công" }
   * - 400: Bad Request (thiếu userId/productId)
   * - 404: Not Found (không tìm thấy item trong giỏ hàng)
   * 
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Promise<void>} JSON response
   */
  const removeItem = async (req, res) => {
    try {
      // ============================================
      // BƯỚC 1: Extract và validate data từ request body
      // ============================================
      const { userId, productId } = req.body;
      
      // Validation: userId và productId là bắt buộc
      if (!userId || !productId) {
        return res.status(400).json({ 
          success: false, 
          message: 'userId và productId là bắt buộc' 
        });
      }
      
      // ============================================
      // BƯỚC 2: Tìm cart item
      // ============================================
      // Tìm cart item theo userId và productId
      const existing = await cartItem.findByUserAndProduct(userId, productId);
      
      // Kiểm tra item có tồn tại không
      if (!existing) {
        return res.status(404).json({ 
          success: false, 
          message: 'Không tìm thấy item trong giỏ hàng' 
        });
      }
      
      // ============================================
      // BƯỚC 3: Xóa cart item
      // ============================================
      // Xóa cart item bằng cart_item_id
      await cartItem.delete(existing.cart_item_id);
      
      // ============================================
      // BƯỚC 4: Trả về response thành công
      // ============================================
      return res.status(200).json({ 
        success: true, 
        message: 'Xóa khỏi giỏ hàng thành công' 
      });
    } catch (error) {
      return res.status(400).json({ 
        success: false, 
        message: 'Lỗi khi xóa khỏi giỏ hàng', 
        error: error.message 
      });
    }
  };

  // ============================================
  // CLEAR CART FUNCTION: Xóa toàn bộ giỏ hàng
  // ============================================
  /**
   * HTTP Handler: DELETE /cart-items/user/:userId
   * Xóa toàn bộ cart items của user
   * 
   * URL Params:
   * - userId: ID của user (bắt buộc)
   * 
   * Response:
   * - 200: Success { success: true, message: "Xóa giỏ hàng thành công" }
   * - 400: Bad Request (lỗi khi xóa)
   * 
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Promise<void>} JSON response
   */
  const clearCart = async (req, res) => {
    try {
      // ============================================
      // BƯỚC 1: Extract userId từ params
      // ============================================
      const { userId } = req.params;
      
      // ============================================
      // BƯỚC 2: Xóa toàn bộ cart items của user
      // ============================================
      // Gọi cartItem.clearUserCart để xóa tất cả items của user
      await cartItem.clearUserCart(userId);
      
      // ============================================
      // BƯỚC 3: Trả về response thành công
      // ============================================
      return res.status(200).json({ 
        success: true, 
        message: 'Xóa giỏ hàng thành công' 
      });
    } catch (error) {
      return res.status(400).json({ 
        success: false, 
        message: 'Lỗi khi xóa giỏ hàng', 
        error: error.message 
      });
    }
  };

  // ============================================
  // GET BY USER FUNCTION: Alias cho getUserCart
  // ============================================
  /**
   * Alias cho getUserCart function
   * Giữ lại để backward compatibility
   */
  const getByUser = getUserCart;
  
  // ============================================
  // GET TOTAL FUNCTION: Lấy tổng tiền của cart
  // ============================================
  /**
   * HTTP Handler: GET /cart-items/user/:userId/total
   * Lấy tổng tiền của cart (không lấy danh sách items)
   * 
   * URL Params:
   * - userId: ID của user (bắt buộc)
   * 
   * Response:
   * - 200: Success { success: true, total: N }
   * - 500: Server Error
   * 
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Promise<void>} JSON response
   */
  const getTotal = async (req, res) => {
    try {
      // ============================================
      // BƯỚC 1: Extract userId từ params
      // ============================================
      const { userId } = req.params;
      
      // ============================================
      // BƯỚC 2: Tính tổng tiền của cart
      // ============================================
      // Gọi cartItem.getCartTotal để tính tổng tiền
      const total = await cartItem.getCartTotal(userId);
      
      // ============================================
      // BƯỚC 3: Trả về response
      // ============================================
      return res.status(200).json({ 
        success: true, 
        total  // Tổng tiền
      });
    } catch (error) {
      return res.status(500).json({ 
        success: false, 
        message: 'Lỗi khi tính tổng tiền', 
        error: error.message 
      });
    }
  };
  
  // ============================================
  // ADD OR UPDATE FUNCTION: Alias cho addOrUpdateItem
  // ============================================
  /**
   * Alias cho addOrUpdateItem function
   * Giữ lại để backward compatibility
   */
  const addOrUpdate = addOrUpdateItem;
  
  // ============================================
  // UPDATE QUANTITY FUNCTION: Cập nhật số lượng cart item
  // ============================================
  /**
   * HTTP Handler: PUT /cart-items/user/:userId/product/:productId
   * Cập nhật số lượng của cart item
   * 
   * URL Params:
   * - userId: ID của user (bắt buộc)
   * - productId: ID của product (bắt buộc)
   * 
   * Request Body:
   * - quantity: Số lượng mới (bắt buộc, >= 0)
   * 
   * Response:
   * - 200: Success { success: true, message: "...", data: { items: [...], total: N } }
   * - 400: Bad Request (quantity không hợp lệ)
   * - 404: Not Found (không tìm thấy item trong giỏ hàng)
   * 
   * Đặc biệt:
   * - Nếu quantity = 0: Xóa item khỏi cart
   * - Nếu quantity > 0: Cập nhật quantity
   * - Trả về toàn bộ cart sau khi update
   * 
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Promise<void>} JSON response
   */
  const updateQuantity = async (req, res) => {
    try {
      // ============================================
      // BƯỚC 1: Extract data từ request
      // ============================================
      // Lấy userId và productId từ URL params
      const { userId, productId } = req.params;
      
      // Lấy quantity từ request body
      const { quantity } = req.body;
      
      // ============================================
      // BƯỚC 2: Validate quantity
      // ============================================
      // Kiểm tra quantity có hợp lệ không (>= 0)
      if (quantity === undefined || quantity < 0) {
        return res.status(400).json({ 
          success: false, 
          message: 'Số lượng không hợp lệ' 
        });
      }
      
      // ============================================
      // BƯỚC 3: Tìm cart item
      // ============================================
      // Tìm cart item theo userId và productId
      const item = await cartItem.findByUserAndProduct(userId, productId);
      
      // Kiểm tra item có tồn tại không
      if (!item) {
        return res.status(404).json({ 
          success: false, 
          message: 'Không tìm thấy sản phẩm trong giỏ hàng' 
        });
      }
      
      // ============================================
      // BƯỚC 4: Cập nhật hoặc xóa item
      // ============================================
      // Nếu quantity = 0: Xóa item khỏi cart
      if (quantity === 0) {
        await cartItem.delete(item.cart_item_id);
      } 
      // Nếu quantity > 0: Cập nhật quantity
      else {
        await cartItem.update(item.cart_item_id, { 
          quantity, 
          updated_at: new Date() 
        });
      }
      
      // ============================================
      // BƯỚC 5: Fetch cart sau khi update
      // ============================================
      // Lấy toàn bộ cart sau khi update
      const updatedCart = await cartItem.findByUserId(userId);
      
      // Tính tổng tiền
      const total = await cartItem.getCartTotal(userId);
      
      // ============================================
      // BƯỚC 6: Trả về response
      // ============================================
      return res.status(200).json({ 
        success: true, 
        message: 'Cập nhật số lượng thành công', 
        data: { 
          items: updatedCart,  // Toàn bộ cart items
          total                 // Tổng tiền
        } 
      });
    } catch (error) {
      return res.status(400).json({ 
        success: false, 
        message: 'Lỗi khi cập nhật số lượng', 
        error: error.message 
      });
    }
  };

  // ============================================
  // GET MY CART FUNCTION: Lấy cart của user hiện tại
  // ============================================
  /**
   * HTTP Handler: GET /cart-items/my-cart
   * Lấy cart của user hiện tại (từ JWT token)
   * 
   * Response:
   * - 200: Success { success: true, data: { items: [...], total: N } }
   * - 401: Unauthorized (chưa đăng nhập)
   * - 500: Server Error
   * 
   * Đặc biệt:
   * - Tự động lấy userId từ JWT token (req.user.userId)
   * - Tự động enrich cart items với product data và images
   * - Sử dụng SQL JOIN để tối ưu (1 query thay vì N queries)
   * 
   * @param {Object} req - Express request object (có req.user từ JWT middleware)
   * @param {Object} res - Express response object
   * @returns {Promise<void>} JSON response
   */
  const getMyCart = async (req, res) => {
    try {
      // ============================================
      // BƯỚC 1: Kiểm tra authentication
      // ============================================
      // Kiểm tra user đã đăng nhập chưa
      if (!req.user?.userId) {
        return res.status(401).json({ 
          success: false, 
          message: 'Vui lòng đăng nhập' 
        });
      }
      
      // ============================================
      // BƯỚC 2: Lấy userId từ JWT token
      // ============================================
      // Lấy userId từ req.user (được set bởi JWT middleware)
      const userId = req.user.userId;
      
      // ============================================
      // BƯỚC 3: Fetch cart items
      // ============================================
      // Lấy cart items của user
      const cartItems = await cartItem.findByUserId(userId);
      
      // ============================================
      // BƯỚC 4: Enrich cart items với product data
      // ============================================
      // Sử dụng helper function để populate cart items với product data và images
      // Sử dụng SQL JOIN để tối ưu (1 query thay vì N queries)
      const itemsWithProduct = await populateCartItemsWithProducts(cartItems);
      
      // ============================================
      // BƯỚC 5: Tính tổng tiền
      // ============================================
      // Tính tổng tiền của cart
      const total = await cartItem.getCartTotal(userId);
      
      // ============================================
      // BƯỚC 6: Trả về response
      // ============================================
      return res.status(200).json({ 
        success: true, 
        data: { 
          items: itemsWithProduct,  // Cart items đã enrich với product data
          total                      // Tổng tiền
        } 
      });
    } catch (error) {
      console.error('[CartItemController] Error in getMyCart:', error.message);
      return res.status(500).json({ 
        success: false, 
        message: 'Lỗi khi lấy dữ liệu', 
        error: error.message 
      });
    }
  };

  // ============================================
  // GET MY CART TOTAL FUNCTION: Lấy tổng tiền cart của user hiện tại
  // ============================================
  /**
   * HTTP Handler: GET /cart-items/my-cart/total
   * Lấy tổng tiền cart của user hiện tại (từ JWT token)
   * 
   * Response:
   * - 200: Success { success: true, total: N }
   * - 401: Unauthorized (chưa đăng nhập)
   * - 500: Server Error
   * 
   * Đặc biệt:
   * - Tự động lấy userId từ JWT token (req.user.userId)
   * - Chỉ trả về total, không lấy danh sách items (nhanh hơn)
   * 
   * @param {Object} req - Express request object (có req.user từ JWT middleware)
   * @param {Object} res - Express response object
   * @returns {Promise<void>} JSON response
   */
  const getMyCartTotal = async (req, res) => {
    try {
      // ============================================
      // BƯỚC 1: Kiểm tra authentication
      // ============================================
      // Kiểm tra user đã đăng nhập chưa
      if (!req.user?.userId) {
        return res.status(401).json({ 
          success: false, 
          message: 'Vui lòng đăng nhập' 
        });
      }
      
      // ============================================
      // BƯỚC 2: Lấy userId từ JWT token
      // ============================================
      // Lấy userId từ req.user (được set bởi JWT middleware)
      const userId = req.user.userId;
      
      // ============================================
      // BƯỚC 3: Tính tổng tiền
      // ============================================
      // Tính tổng tiền của cart
      const total = await cartItem.getCartTotal(userId);
      
      // ============================================
      // BƯỚC 4: Trả về response
      // ============================================
      return res.status(200).json({ 
        success: true, 
        total  // Tổng tiền
      });
    } catch (error) {
      return res.status(500).json({ 
        success: false, 
        message: 'Lỗi khi tính tổng tiền', 
        error: error.message 
      });
    }
  };

  // ============================================
  // ADD TO MY CART FUNCTION: Thêm sản phẩm vào cart của user hiện tại
  // ============================================
  /**
   * HTTP Handler: POST /cart-items/my-cart
   * Thêm sản phẩm vào cart của user hiện tại (từ JWT token)
   * 
   * Request Body:
   * - productId: ID của product (bắt buộc)
   * - quantity: Số lượng (mặc định: 1)
   * - unitPrice: Giá đơn vị (tùy chọn, sẽ lấy từ product nếu không có)
   * 
   * Response:
   * - 200: Success { success: true, message: "...", data: {...} }
   * - 401: Unauthorized (chưa đăng nhập)
   * - 400: Bad Request (thiếu productId, sản phẩm không tồn tại)
   * - 404: Not Found (sản phẩm không tồn tại)
   * 
   * Quy trình:
   * 1. Kiểm tra authentication
   * 2. Validate productId
   * 3. Tìm product để lấy giá và tạo snapshot
   * 4. Verify product match (safety check)
   * 5. Tạo product snapshot (không lưu full base64 images)
   * 6. Thêm vào cart (addOrUpdate - cộng dồn quantity)
   * 7. Verify item đã được thêm đúng
   * 
   * Đặc biệt:
   * - Tự động lấy userId từ JWT token
   * - Tự động lấy giá từ product nếu không có unitPrice
   * - Product snapshot không lưu full base64 images (tránh max_allowed_packet error)
   * - Verify quantity sau khi thêm (fix nếu sai)
   * 
   * @param {Object} req - Express request object (có req.user từ JWT middleware)
   * @param {Object} res - Express response object
   * @returns {Promise<void>} JSON response
   */
  const addToMyCart = async (req, res) => {
    try {
      // ============================================
      // BƯỚC 1: Kiểm tra authentication
      // ============================================
      // Kiểm tra user đã đăng nhập chưa
      if (!req.user?.userId) {
        return res.status(401).json({ 
          success: false, 
          message: 'Vui lòng đăng nhập' 
        });
      }
      
      // ============================================
      // BƯỚC 2: Extract data từ request
      // ============================================
      // Lấy productId và quantity từ request body
      const { productId, quantity } = req.body;
      
      // Lấy userId từ JWT token
      const userId = req.user.userId;
      
      console.log('[CartItemController] ➕ addToMyCart called:', {
        userId,
        productId,
        quantity
      });
      
      if (!productId) {
        return res.status(400).json({ success: false, message: 'productId là bắt buộc' });
      }
      
      // Check current cart state before adding
      const cartBefore = await cartItem.findByUserId(userId);
      console.log('[CartItemController] 📋 Cart before add:', {
        itemsCount: cartBefore.length,
        items: cartBefore.map(item => ({
          cart_item_id: item.cart_item_id,
          product_id: item.product_id,
          quantity: item.quantity
        }))
      });
      
      // Get product data to get price and create snapshot
      // IMPORTANT: productId from request is actually product_id field, not id field
      // We need to find by product_id field, not id field
      const { product } = require('../Models');
      console.log('[CartItemController] 🔍 addToMyCart: Searching for product with product_id:', productId);
      
      // Use SQL LIMIT 1 instead of JavaScript array access
      const productData = await product.findFirstByProductId(productId);
      
      console.log('[CartItemController] 🔍 addToMyCart: Product search results:', {
        requestedProductId: productId,
        found: !!productData,
        productData: productData ? {
          id: productData.id,
          product_id: productData.product_id,
          name: productData.name
        } : null
      });
      
      if (!productData) {
        console.error('[CartItemController] ❌ Product not found by product_id:', productId);
        return res.status(404).json({ success: false, message: 'Sản phẩm không tồn tại' });
      }
      
      // Verify the found product matches the requested product_id
      if (productData.product_id !== productId) {
        console.error('[CartItemController] ❌ CRITICAL: Product ID mismatch in addToMyCart!', {
          requestedProductId: productId,
          foundProductId: productData.product_id,
          foundProductName: productData.name,
          foundProductDbId: productData.id
        });
        return res.status(400).json({ 
          success: false, 
          message: `Sản phẩm không khớp. Yêu cầu: ${productId}, Tìm thấy: ${productData.product_id}` 
        });
      }
      
      console.log('[CartItemController] 📦 Product found and verified:', {
        id: productData.id,
        product_id: productData.product_id,
        name: productData.name,
        price: productData.price,
        matches: productData.product_id === productId
      });
      
      // Use product price if unitPrice not provided
      const finalUnitPrice = req.body.unitPrice || parseFloat(productData.price) || 0;
      
      // Create product snapshot - only store essential data, not full base64 images
      // Setting images and primary_image to null prevents max_allowed_packet errors
      const productSnapshot = {
        name: productData.name,
        price: productData.price,
        images: null, // Don't store full base64 images - too large for MySQL
        primary_image: null, // Don't store full base64 images - too large for MySQL
      };
      
      const result = await cartItem.addOrUpdate(req.user.userId, productId, quantity || 1, finalUnitPrice, productSnapshot);
      
      // Check cart state after adding
      const cartAfter = await cartItem.findByUserId(userId);
      console.log('[CartItemController] 📋 Cart after add:', {
        itemsCount: cartAfter.length,
        items: cartAfter.map(item => ({
          cart_item_id: item.cart_item_id,
          product_id: item.product_id,
          quantity: item.quantity
        }))
      });
      
      // Verify the added product - Use SQL query instead of JavaScript find()
      const addedItem = await cartItem.findByUserAndProduct(userId, productId);
      if (addedItem) {
        console.log('[CartItemController] ✅ Verified added item:', {
          cart_item_id: addedItem.cart_item_id,
          product_id: addedItem.product_id,
          quantity: addedItem.quantity,
          expectedQuantity: quantity || 1
        });
        
        // If quantity is wrong (should be exactly what was requested, not accumulated), fix it
        if (addedItem.quantity !== (quantity || 1)) {
          console.log('[CartItemController] ⚠️ Quantity mismatch detected! Fixing...', {
            current: addedItem.quantity,
            expected: quantity || 1
          });
          await cartItem.update(addedItem.cart_item_id, {
            quantity: quantity || 1,
            updated_at: new Date()
          });
          console.log('[CartItemController] ✅ Quantity fixed');
        }
      } else {
        console.error('[CartItemController] ❌ Added item not found in cart!');
      }
      
      console.log('[CartItemController] ✅ addToMyCart completed:', {
        result: result ? {
          cart_item_id: result.cart_item_id,
          product_id: result.product_id,
          quantity: result.quantity
        } : 'null'
      });
      
      return res.status(200).json({ success: true, message: 'Thêm vào giỏ hàng thành công', data: result });
    } catch (error) {
      console.error('[CartItemController] Error in addToMyCart:', error.message);
      return res.status(400).json({ success: false, message: 'Lỗi khi thêm vào giỏ hàng', error: error.message });
    }
  };

  // ============================================
  // UPDATE MY CART ITEM FUNCTION: Cập nhật số lượng cart item của user hiện tại
  // ============================================
  /**
   * HTTP Handler: PUT /cart-items/my-cart/:productId
   * Cập nhật số lượng cart item của user hiện tại (từ JWT token)
   * 
   * URL Params:
   * - productId: ID của product (bắt buộc)
   * 
   * Request Body:
   * - quantity: Số lượng mới (bắt buộc, >= 0)
   * 
   * Response:
   * - 200: Success { success: true, message: "...", data: { items: [...], total: N } }
   * - 401: Unauthorized (chưa đăng nhập)
   * - 400: Bad Request (quantity không hợp lệ)
   * - 404: Not Found (không tìm thấy item trong giỏ hàng)
   * 
   * Đặc biệt:
   * - Tự động lấy userId từ JWT token
   * - Nếu quantity = 0: Xóa item khỏi cart
   * - Nếu quantity > 0: Cập nhật quantity
   * - Tự động enrich cart items với product data sau khi update
   * 
   * @param {Object} req - Express request object (có req.user từ JWT middleware)
   * @param {Object} res - Express response object
   * @returns {Promise<void>} JSON response
   */
  const updateMyCartItem = async (req, res) => {
    try {
      // ============================================
      // BƯỚC 1: Kiểm tra authentication
      // ============================================
      // Kiểm tra user đã đăng nhập chưa
      if (!req.user?.userId) {
        return res.status(401).json({ 
          success: false, 
          message: 'Vui lòng đăng nhập' 
        });
      }
      
      // ============================================
      // BƯỚC 2: Extract data từ request
      // ============================================
      // Lấy productId từ URL params
      const { productId } = req.params;
      
      // Lấy quantity từ request body
      const { quantity } = req.body;
      
      // Lấy userId từ JWT token
      const userId = req.user.userId;
      
      // ============================================
      // BƯỚC 3: Validate quantity
      // ============================================
      // Kiểm tra quantity có hợp lệ không (>= 0)
      if (quantity === undefined || quantity < 0) {
        return res.status(400).json({ 
          success: false, 
          message: 'Số lượng không hợp lệ' 
        });
      }
      
      // ============================================
      // BƯỚC 4: Tìm cart item
      // ============================================
      // Tìm cart item theo userId và productId
      const item = await cartItem.findByUserAndProduct(userId, productId);
      
      // Kiểm tra item có tồn tại không
      if (!item) {
        return res.status(404).json({ 
          success: false, 
          message: 'Không tìm thấy sản phẩm trong giỏ hàng' 
        });
      }
      
      // ============================================
      // BƯỚC 5: Cập nhật hoặc xóa item
      // ============================================
      // Nếu quantity = 0: Xóa item khỏi cart
      if (quantity === 0) {
        await cartItem.delete(item.cart_item_id);
      } 
      // Nếu quantity > 0: Cập nhật quantity
      else {
        await cartItem.update(item.cart_item_id, { 
          quantity, 
          updated_at: new Date() 
        });
      }
      
      // ============================================
      // BƯỚC 6: Fetch cart sau khi update
      // ============================================
      // Lấy toàn bộ cart sau khi update
      const updatedCart = await cartItem.findByUserId(userId);
      
      // ============================================
      // BƯỚC 7: Enrich cart items với product data
      // ============================================
      // Sử dụng helper function để populate cart items với product data và images
      // Sử dụng SQL JOIN để tối ưu (1 query thay vì N queries)
      const itemsWithProduct = await populateCartItemsWithProducts(updatedCart);
      
      // ============================================
      // BƯỚC 8: Tính tổng tiền
      // ============================================
      // Tính tổng tiền của cart
      const total = await cartItem.getCartTotal(userId);
      
      // ============================================
      // BƯỚC 9: Trả về response
      // ============================================
      return res.status(200).json({ 
        success: true, 
        message: 'Cập nhật số lượng thành công', 
        data: { 
          items: itemsWithProduct,  // Cart items đã enrich với product data
          total                      // Tổng tiền
        } 
      });
    } catch (error) {
      console.error('[CartItemController] Error in updateMyCartItem:', error.message);
      return res.status(400).json({ 
        success: false, 
        message: 'Lỗi khi cập nhật số lượng', 
        error: error.message 
      });
    }
  };

  // ============================================
  // REMOVE FROM MY CART FUNCTION: Xóa cart item của user hiện tại
  // ============================================
  /**
   * HTTP Handler: DELETE /cart-items/my-cart/:productId
   * Xóa cart item khỏi cart của user hiện tại (từ JWT token)
   * 
   * URL Params:
   * - productId: ID của product (bắt buộc)
   * 
   * Response:
   * - 200: Success { success: true, message: "Xóa khỏi giỏ hàng thành công" }
   * - 401: Unauthorized (chưa đăng nhập)
   * - 404: Not Found (không tìm thấy item trong giỏ hàng)
   * - 400: Bad Request (lỗi khi xóa)
   * 
   * Đặc biệt:
   * - Tự động lấy userId từ JWT token
   * 
   * @param {Object} req - Express request object (có req.user từ JWT middleware)
   * @param {Object} res - Express response object
   * @returns {Promise<void>} JSON response
   */
  const removeFromMyCart = async (req, res) => {
    try {
      // ============================================
      // BƯỚC 1: Kiểm tra authentication
      // ============================================
      // Kiểm tra user đã đăng nhập chưa
      if (!req.user?.userId) {
        return res.status(401).json({ 
          success: false, 
          message: 'Vui lòng đăng nhập' 
        });
      }
      
      // ============================================
      // BƯỚC 2: Extract data từ request
      // ============================================
      // Lấy productId từ URL params
      const { productId } = req.params;
      
      // Lấy userId từ JWT token
      const userId = req.user.userId;
      
      // ============================================
      // BƯỚC 3: Tìm cart item
      // ============================================
      // Tìm cart item theo userId và productId
      const existing = await cartItem.findByUserAndProduct(userId, productId);
      
      // Kiểm tra item có tồn tại không
      if (!existing) {
        return res.status(404).json({ 
          success: false, 
          message: 'Không tìm thấy item trong giỏ hàng' 
        });
      }
      
      // ============================================
      // BƯỚC 4: Xóa cart item
      // ============================================
      // Xóa cart item bằng cart_item_id
      await cartItem.delete(existing.cart_item_id);
      
      // ============================================
      // BƯỚC 5: Trả về response thành công
      // ============================================
      return res.status(200).json({ 
        success: true, 
        message: 'Xóa khỏi giỏ hàng thành công' 
      });
    } catch (error) {
      return res.status(400).json({ 
        success: false, 
        message: 'Lỗi khi xóa khỏi giỏ hàng', 
        error: error.message 
      });
    }
  };

  // ============================================
  // CLEAR MY CART FUNCTION: Xóa toàn bộ cart của user hiện tại
  // ============================================
  /**
   * HTTP Handler: DELETE /cart-items/my-cart
   * Xóa toàn bộ cart items của user hiện tại (từ JWT token)
   * 
   * Response:
   * - 200: Success { success: true, message: "Xóa giỏ hàng thành công" }
   * - 401: Unauthorized (chưa đăng nhập)
   * - 400: Bad Request (lỗi khi xóa)
   * 
   * Đặc biệt:
   * - Tự động lấy userId từ JWT token
   * - Log cart state trước và sau khi xóa (để debug)
   * - Verify cart đã được xóa sạch
   * 
   * @param {Object} req - Express request object (có req.user từ JWT middleware)
   * @param {Object} res - Express response object
   * @returns {Promise<void>} JSON response
   */
  const clearMyCart = async (req, res) => {
    try {
      // ============================================
      // BƯỚC 1: Kiểm tra authentication
      // ============================================
      // Kiểm tra user đã đăng nhập chưa
      if (!req.user?.userId) {
        return res.status(401).json({ 
          success: false, 
          message: 'Vui lòng đăng nhập' 
        });
      }
      
      // ============================================
      // BƯỚC 2: Lấy userId từ JWT token
      // ============================================
      // Lấy userId từ req.user (được set bởi JWT middleware)
      const userId = req.user.userId;
      
      console.log('[CartItemController] 🗑️ clearMyCart called for userId:', userId);
      
      // ============================================
      // BƯỚC 3: Lấy cart trước khi xóa để log (debugging)
      // ============================================
      const cartBefore = await cartItem.findByUserId(userId);
      console.log('[CartItemController] 📋 Cart before clear:', {
        itemsCount: cartBefore.length,
        items: cartBefore.map(item => ({
          cart_item_id: item.cart_item_id,
          product_id: item.product_id,
          quantity: item.quantity
        }))
      });
      
      // ============================================
      // BƯỚC 4: Xóa toàn bộ cart items
      // ============================================
      // Gọi cartItem.clearUserCart để xóa tất cả items của user
      const result = await cartItem.clearUserCart(userId);
      console.log('[CartItemController] ✅ Cart cleared, result:', result);
      
      // ============================================
      // BƯỚC 5: Verify cart đã được xóa sạch
      // ============================================
      // Kiểm tra cart đã empty chưa
      const cartAfter = await cartItem.findByUserId(userId);
      console.log('[CartItemController] 🔍 Cart after clear:', {
        itemsCount: cartAfter.length,
        isEmpty: cartAfter.length === 0
      });
      
      // ============================================
      // BƯỚC 6: Trả về response thành công
      // ============================================
      return res.status(200).json({ 
        success: true, 
        message: 'Xóa giỏ hàng thành công' 
      });
    } catch (error) {
      console.error('[CartItemController] ❌ Error in clearMyCart:', error.message);
      return res.status(400).json({ 
        success: false, 
        message: 'Lỗi khi xóa giỏ hàng', 
        error: error.message 
      });
    }
  };

  const buyNow = async (req, res) => {
    try {
      if (!req.user?.userId) {
        return res.status(401).json({ success: false, message: 'Vui lòng đăng nhập' });
      }
      const { productId, quantity } = req.body;
      const userId = req.user.userId;
      
      console.log('[CartItemController] 🚀 buyNow called:', {
        userId,
        productId,
        quantity
      });
      
      if (!productId) {
        return res.status(400).json({ success: false, message: 'productId là bắt buộc' });
      }
      
      // Step 1: Clear cart first
      console.log('[CartItemController] 🗑️ Clearing cart for buy now...');
      await cartItem.clearUserCart(userId);
      
      // Step 2: Verify cart is empty
      const cartAfterClear = await cartItem.findByUserId(userId);
      if (cartAfterClear.length > 0) {
        console.error('[CartItemController] ❌ Cart not empty after clear, retrying...');
        await cartItem.clearUserCart(userId);
        await new Promise(resolve => setTimeout(resolve, 100));
        const cartAfterRetry = await cartItem.findByUserId(userId);
        if (cartAfterRetry.length > 0) {
          return res.status(500).json({ success: false, message: 'Không thể xóa giỏ hàng' });
        }
      }
      console.log('[CartItemController] ✅ Cart cleared successfully');
      
      // Step 3: Get product data
      const { product } = require('../Models');
      console.log('[CartItemController] 🔍 Searching for product with product_id:', productId);
      
      // Use SQL LIMIT 1 instead of JavaScript array access
      const productData = await product.findFirstByProductId(productId);
      
      console.log('[CartItemController] 🔍 Product search results:', {
        requestedProductId: productId,
        found: !!productData,
        productData: productData ? {
          id: productData.id,
          product_id: productData.product_id,
          name: productData.name
        } : null
      });
      
      if (!productData) {
        console.error('[CartItemController] ❌ Product not found by product_id:', productId);
        // Try to find by id as fallback (for debugging)
        const productById = await product.findById(productId);
        if (productById) {
          console.error('[CartItemController] ⚠️ Found product by id instead:', {
            id: productById.id,
            product_id: productById.product_id,
            name: productById.name,
            message: 'This indicates a mismatch - cart uses product_id but product was found by id'
          });
        }
        return res.status(404).json({ success: false, message: 'Sản phẩm không tồn tại' });
      }
      
      // Verify the found product matches the requested product_id
      if (productData.product_id !== productId) {
        console.error('[CartItemController] ❌ CRITICAL: Product ID mismatch!', {
          requestedProductId: productId,
          foundProductId: productData.product_id,
          foundProductName: productData.name,
          foundProductDbId: productData.id
        });
        return res.status(400).json({ 
          success: false, 
          message: `Sản phẩm không khớp. Yêu cầu: ${productId}, Tìm thấy: ${productData.product_id}` 
        });
      }
      
      console.log('[CartItemController] 📦 Product found and verified:', {
        id: productData.id,
        product_id: productData.product_id,
        name: productData.name,
        price: productData.price,
        matches: productData.product_id === productId
      });
      
      // Step 4: Create cart item with exact quantity (not addOrUpdate to avoid accumulation)
      const finalUnitPrice = parseFloat(productData.price) || 0;
      const finalQuantity = quantity || 1;
      
      const productSnapshot = {
        name: productData.name,
        price: productData.price,
        images: null,
        primary_image: null,
      };
      
      // Use create directly instead of addOrUpdate to ensure exact quantity
      console.log('[CartItemController] ➕ Creating cart item:', {
        user_id: userId,
        product_id: productId,
        quantity: finalQuantity,
        unit_price: finalUnitPrice,
        productName: productData.name
      });
      
      const createResult = await cartItem.create({
        user_id: userId,
        product_id: productId,
        quantity: finalQuantity,
        unit_price: finalUnitPrice,
        unit_price_snapshot: finalUnitPrice,
        product_snapshot: JSON.stringify(productSnapshot),
      });
      
      console.log('[CartItemController] 📝 Create result:', {
        insertId: createResult?.insertId,
        affectedRows: createResult?.affectedRows,
        resultType: typeof createResult,
        resultKeys: createResult ? Object.keys(createResult) : []
      });
      
      // BaseModel.create() returns ResultSetHeader, not the created object
      // We need to fetch the created item using insertId
      if (!createResult?.insertId) {
        console.error('[CartItemController] ❌ CRITICAL: No insertId returned from create!', createResult);
        return res.status(500).json({ 
          success: false, 
          message: 'Lỗi: Không thể tạo cart item' 
        });
      }
      
      // Fetch the created cart item to verify
      const createdCartItem = await cartItem.findById(createResult.insertId);
      
      if (!createdCartItem) {
        console.error('[CartItemController] ❌ CRITICAL: Created cart item not found after create!', {
          insertId: createResult.insertId
        });
        return res.status(500).json({ 
          success: false, 
          message: 'Lỗi: Không thể tìm thấy cart item sau khi tạo' 
        });
      }
      
      console.log('[CartItemController] ✅ Buy now item created and fetched:', {
        cart_item_id: createdCartItem.cart_item_id,
        product_id: createdCartItem.product_id,
        quantity: createdCartItem.quantity,
        expectedProductId: productId,
        matches: createdCartItem.product_id === productId
      });
      
      // Verify the created item has correct product_id
      if (createdCartItem.product_id !== productId) {
        console.error('[CartItemController] ❌ CRITICAL: Created cart item has wrong product_id!', {
          expected: productId,
          actual: createdCartItem.product_id,
          cart_item_id: createdCartItem.cart_item_id
        });
        // Delete the wrong item
        await cartItem.delete(createdCartItem.cart_item_id);
        return res.status(500).json({ 
          success: false, 
          message: 'Lỗi: Sản phẩm không khớp sau khi tạo' 
        });
      }
      
      // Use createdCartItem as result for response
      const result = createdCartItem;
      
      // Step 5: Verify cart state
      const cartAfterAdd = await cartItem.findByUserId(userId);
      console.log('[CartItemController] 📋 Cart after buy now:', {
        itemsCount: cartAfterAdd.length,
        items: cartAfterAdd.map(item => ({
          cart_item_id: item.cart_item_id,
          product_id: item.product_id,
          quantity: item.quantity
        }))
      });
      
      // Populate with product data for response
      const itemsWithProduct = await populateCartItemsWithProducts([result]);
      const total = await cartItem.getCartTotal(userId);
      
      return res.status(200).json({ 
        success: true, 
        message: 'Mua ngay thành công', 
        data: {
          items: itemsWithProduct,
          total
        }
      });
    } catch (error) {
      console.error('[CartItemController] ❌ Error in buyNow:', error.message);
      return res.status(400).json({ 
        success: false, 
        message: 'Lỗi khi mua ngay', 
        error: error.message 
      });
    }
  };

  // ============================================
  // RETURN CONTROLLER OBJECT
  // ============================================
  // Trả về object chứa tất cả HTTP handlers
  // Spread baseController để lấy các handlers cơ bản
  // Sau đó thêm các handlers riêng của CartItemController
  return {
    ...baseController,        // Spread các handlers từ BaseController (getAll, getById, create, update, delete, count)
    getUserCart,              // Handler: Lấy cart của user
    getByUser,                // Alias cho getUserCart
    getTotal,                 // Handler: Lấy tổng tiền cart
    addOrUpdateItem,          // Handler: Thêm hoặc cập nhật cart item
    addOrUpdate,              // Alias cho addOrUpdateItem
    updateQuantity,          // Handler: Cập nhật số lượng cart item
    removeItem,               // Handler: Xóa cart item
    clearCart,                // Handler: Xóa toàn bộ cart
    getMyCart,                // Handler: Lấy cart của user hiện tại (từ token)
    getMyCartTotal,           // Handler: Lấy tổng tiền cart của user hiện tại (từ token)
    addToMyCart,              // Handler: Thêm sản phẩm vào cart của user hiện tại (từ token)
    updateMyCartItem,         // Handler: Cập nhật số lượng cart item của user hiện tại (từ token)
    removeFromMyCart,         // Handler: Xóa cart item của user hiện tại (từ token)
    clearMyCart,              // Handler: Xóa toàn bộ cart của user hiện tại (từ token)
    buyNow,                   // Handler: Mua ngay (clear cart và thêm 1 sản phẩm)
  };
};

// ============================================
// EXPORT MODULE
// ============================================
// Export CartItemController đã được khởi tạo (singleton pattern)
// Cách sử dụng: const cartItemController = require('./CartItemController');
//               router.get('/my-cart', cartItemController.getMyCart);
module.exports = createCartItemController();
