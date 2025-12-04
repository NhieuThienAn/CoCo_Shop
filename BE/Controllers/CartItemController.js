const createBaseController = require('./BaseController');
const { cartItem } = require('../Models');
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
  const baseController = createBaseController(cartItem);
  /**
   * Helper function: Populate cart items với processed product data và images
   * 
   * Tối ưu: Sử dụng SQL JOIN để fetch cart items với product data trong 1 query
   * Thay thế separate queries cho cart items và products (tránh N+1 problem)
   * 
   * @param {Array<Object>} cartItems - Mảng các cart item objects
   * @returns {Promise<Array<Object>>} Mảng cart items đã được enrich với product data
   * 
   */

  const populateCartItemsWithProducts = async (cartItems) => {
    if (!Array.isArray(cartItems) || cartItems.length === 0) {
      return [];  
    }
    const { product } = require('../Models');
    const userId = cartItems[0]?.user_id;
    if (!userId) {
      console.warn('[CartItemController] No user_id found in cart items');
      return [];  
    }
    const sql = `
      SELECT 
        ci.*,
        p.product_id as product_product_id,
        p.id as product_db_id,
        p.name as product_name,
        p.slug as product_slug,
        p.price as product_price,
        p.stock_quantity as product_stock_quantity,
        p.is_active as product_is_active,
        p.deleted_at as product_deleted_at,
        p.images as product_images,
        p.description as product_description,
        p.category_id as product_category_id,
        p.brand as product_brand
      FROM \`cartitems\` ci
      LEFT JOIN \`products\` p ON ci.product_id = p.product_id
      WHERE ci.\`user_id\` = ?
      ORDER BY ci.\`created_at\` DESC
    `;
    const cartItemsWithProducts = await cartItem.execute(sql, [userId]);
    console.log(`[CartItemController] 🔍 Fetched ${cartItemsWithProducts.length} cart items with products using SQL JOIN`);
    
    const productMap = {};
    cartItemsWithProducts.forEach(row => {
      if (row.product_product_id && !productMap[row.product_product_id]) {
        let primaryImage = null;
        if (row.product_images) {
          try {
            const parsedImages = product.parseImages(row.product_images);
            primaryImage = parsedImages.find(img => img.is_primary === true) || parsedImages[0] || null;
          } catch (error) {
            console.error('[CartItemController] Error parsing product images:', error);
          }
        }
        productMap[row.product_product_id] = {
          id: row.product_db_id,
          product_id: row.product_product_id,
          name: row.product_name,                   
          slug: row.product_slug,                   
          price: row.product_price,                 
          stock_quantity: row.product_stock_quantity,  
          is_active: row.product_is_active,         
          deleted_at: row.product_deleted_at,
          images: row.product_images,               
          primary_image: primaryImage,
          description: row.product_description,     
          category_id: row.product_category_id,    
          brand: row.product_brand,                 
        };
      }
    });
    
    // Sử dụng dữ liệu từ JOIN query thay vì từ cartItems ban đầu để đảm bảo giá luôn được cập nhật
    return cartItemsWithProducts.map((row) => {
      const item = {
        cart_item_id: row.cart_item_id,
        user_id: row.user_id,
        product_id: row.product_id,
        quantity: row.quantity,
        unit_price: parseFloat(row.product_price) || row.unit_price || 0, // Luôn dùng giá từ products table
        unit_price_snapshot: row.unit_price_snapshot,
        product_snapshot: row.product_snapshot,
        created_at: row.created_at,
        updated_at: row.updated_at,
      };
      try {
        const productData = productMap[item.product_id];
          if (productData && productData.product_id !== item.product_id) {
            console.error('[CartItemController] ❌ CRITICAL: Product mismatch in populateCartItemsWithProducts!', {
              cartItemProductId: item.product_id,
              foundProductId: productData.product_id,
              foundProductName: productData.name,
              foundProductDbId: productData.id,
              cart_item_id: item.cart_item_id
            });
          }
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
          const mergedProduct = productData ? {
            ...productData,
            name: (productSnapshot?.name && productSnapshot.name.trim() !== '') ? productSnapshot.name : productData.name,
            price: productData.price, // Luôn dùng giá hiện tại từ products
            images: (productSnapshot?.images !== undefined && 
                     productSnapshot?.images !== null && 
                     (Array.isArray(productSnapshot.images) || 
                      typeof productSnapshot.images === 'string' ||
                      (typeof productSnapshot.images === 'object' && Object.keys(productSnapshot.images).length > 0))
                    ) ? productSnapshot.images : productData.images,
            primary_image: (productSnapshot?.primary_image && 
                           typeof productSnapshot.primary_image === 'string' && 
                           productSnapshot.primary_image.trim() !== '') 
                          ? productSnapshot.primary_image 
                          : productData.primary_image,
          } : (productSnapshot || {});
          if (mergedProduct && mergedProduct.images) {
            try {
              const parsedImages = product.parseImages(mergedProduct.images);
              mergedProduct.images = parsedImages;
              const existingPrimaryImageValid = mergedProduct.primary_image && 
                typeof mergedProduct.primary_image === 'string' && 
                mergedProduct.primary_image.trim() !== '' && 
                mergedProduct.primary_image !== '/placeholder.jpg';
              if (!existingPrimaryImageValid && parsedImages.length > 0) {
                const primaryImg = parsedImages.find(img => img.is_primary) || parsedImages[0];
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
          // Đảm bảo unit_price luôn là giá hiện tại từ products table
          if (productData && productData.price !== null && productData.price !== undefined) {
            item.unit_price = parseFloat(productData.price) || 0;
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
          return {
            ...item,
            product: null
          };
        }
    });
  };
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
      const { userId } = req.params;
      // Đồng bộ giá từ products trước khi lấy giỏ hàng
      await cartItem.syncPricesFromProducts(userId);
      const dataSql = `SELECT * FROM \`cartitems\` WHERE \`user_id\` = ? ORDER BY \`created_at\` DESC`;
      const data = await cartItem.execute(dataSql, [userId]);
      // Tính tổng từ giá hiện tại của products
      const total = await cartItem.getCartTotal(userId);
      return res.status(200).json({ 
        success: true, 
        data,      
        total      
      });
    } catch (error) {
      return res.status(500).json({ 
        success: false, 
        message: 'Lỗi khi lấy dữ liệu', 
        error: error.message 
      });
    }
  };
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
      const { userId, productId, quantity, unitPrice, productSnapshot } = req.body;
      if (!userId || !productId) {
        return res.status(400).json({ 
          success: false, 
          message: 'userId và productId là bắt buộc' 
        });
      }
      const finalQuantity = quantity || 1;
      const finalUnitPrice = unitPrice || 0;
      const snapshotJson = productSnapshot ? (typeof productSnapshot === 'string' ? productSnapshot : JSON.stringify(productSnapshot)) : null;
      
      const checkSql = `SELECT * FROM \`cartitems\` WHERE \`user_id\` = ? AND \`product_id\` = ? LIMIT 1`;
      const existing = await cartItem.execute(checkSql, [userId, productId]);
      
      let result;
      if (existing && existing.length > 0) {
        const existingItem = existing[0];
        const newQuantity = existingItem.quantity + finalQuantity;
        const updateSql = `UPDATE \`cartitems\` SET \`quantity\` = ?, \`unit_price\` = ?, \`unit_price_snapshot\` = ?, \`product_snapshot\` = ?, \`updated_at\` = NOW() WHERE \`cart_item_id\` = ?`;
        await cartItem.execute(updateSql, [newQuantity, finalUnitPrice, finalUnitPrice, snapshotJson, existingItem.cart_item_id]);
        const fetchSql = `SELECT * FROM \`cartitems\` WHERE \`cart_item_id\` = ?`;
        const updated = await cartItem.execute(fetchSql, [existingItem.cart_item_id]);
        result = updated[0] || null;
      } else {
        const insertSql = `INSERT INTO \`cartitems\` (\`user_id\`, \`product_id\`, \`quantity\`, \`unit_price\`, \`unit_price_snapshot\`, \`product_snapshot\`, \`created_at\`, \`updated_at\`) VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())`;
        await cartItem.execute(insertSql, [userId, productId, finalQuantity, finalUnitPrice, finalUnitPrice, snapshotJson]);
        const fetchSql = `SELECT * FROM \`cartitems\` WHERE \`user_id\` = ? AND \`product_id\` = ? ORDER BY \`cart_item_id\` DESC LIMIT 1`;
        const created = await cartItem.execute(fetchSql, [userId, productId]);
        result = created && created.length > 0 ? created[0] : null;
      }
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
      const { userId, productId } = req.body;
      if (!userId || !productId) {
        return res.status(400).json({ 
          success: false, 
          message: 'userId và productId là bắt buộc' 
        });
      }
      const checkSql = `SELECT * FROM \`cartitems\` WHERE \`user_id\` = ? AND \`product_id\` = ? LIMIT 1`;
      const existingResult = await cartItem.execute(checkSql, [userId, productId]);
      const existing = existingResult && existingResult.length > 0 ? existingResult[0] : null;
      if (!existing) {
        return res.status(404).json({ 
          success: false, 
          message: 'Không tìm thấy item trong giỏ hàng' 
        });
      }
      const deleteSql = `DELETE FROM \`cartitems\` WHERE \`cart_item_id\` = ?`;
      await cartItem.execute(deleteSql, [existing.cart_item_id]);
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
      const { userId } = req.params;
      const deleteSql = `DELETE FROM \`cartitems\` WHERE \`user_id\` = ?`;
      await cartItem.execute(deleteSql, [userId]);
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
  const getByUser = getUserCart;
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
      const { userId } = req.params;
      // Đồng bộ giá từ products trước khi tính tổng
      await cartItem.syncPricesFromProducts(userId);
      // Tính tổng từ giá hiện tại của products
      const total = await cartItem.getCartTotal(userId);
      return res.status(200).json({ 
        success: true, 
        total  
      });
    } catch (error) {
      return res.status(500).json({ 
        success: false, 
        message: 'Lỗi khi tính tổng tiền', 
        error: error.message 
      });
    }
  };
  const addOrUpdate = addOrUpdateItem;
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
      const { userId, productId } = req.params;
      const { quantity } = req.body;
      if (quantity === undefined || quantity < 0) {
        return res.status(400).json({ 
          success: false, 
          message: 'Số lượng không hợp lệ' 
        });
      }
      const checkSql = `SELECT * FROM \`cartitems\` WHERE \`user_id\` = ? AND \`product_id\` = ? LIMIT 1`;
      const itemResult = await cartItem.execute(checkSql, [userId, productId]);
      const item = itemResult && itemResult.length > 0 ? itemResult[0] : null;
      if (!item) {
        return res.status(404).json({ 
          success: false, 
          message: 'Không tìm thấy sản phẩm trong giỏ hàng' 
        });
      }
      if (quantity === 0) {
        const deleteSql = `DELETE FROM \`cartitems\` WHERE \`cart_item_id\` = ?`;
        await cartItem.execute(deleteSql, [item.cart_item_id]);
      } 
      else {
        const updateSql = `UPDATE \`cartitems\` SET \`quantity\` = ?, \`updated_at\` = NOW() WHERE \`cart_item_id\` = ?`;
        await cartItem.execute(updateSql, [quantity, item.cart_item_id]);
      }
      const cartSql = `SELECT * FROM \`cartitems\` WHERE \`user_id\` = ? ORDER BY \`created_at\` DESC`;
      const updatedCart = await cartItem.execute(cartSql, [userId]);
      const totalSql = `SELECT SUM(\`quantity\` * \`unit_price\`) as total FROM \`cartitems\` WHERE \`user_id\` = ?`;
      const totalResult = await cartItem.execute(totalSql, [userId]);
      const total = totalResult[0]?.total || 0;
      return res.status(200).json({ 
        success: true, 
        message: 'Cập nhật số lượng thành công', 
        data: { 
          items: updatedCart,  
          total                 
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
      if (!req.user?.userId) {
        return res.status(401).json({ 
          success: false, 
          message: 'Vui lòng đăng nhập' 
        });
      }
      const userId = req.user.userId;
      // Đồng bộ giá từ products trước khi lấy giỏ hàng
      await cartItem.syncPricesFromProducts(userId);
      const cartSql = `SELECT * FROM \`cartitems\` WHERE \`user_id\` = ? ORDER BY \`created_at\` DESC`;
      const cartItems = await cartItem.execute(cartSql, [userId]);
      const itemsWithProduct = await populateCartItemsWithProducts(cartItems);
      // Tính tổng từ giá hiện tại của products
      const total = await cartItem.getCartTotal(userId);
      return res.status(200).json({ 
        success: true, 
        data: { 
          items: itemsWithProduct,  
          total                      
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
      if (!req.user?.userId) {
        return res.status(401).json({ 
          success: false, 
          message: 'Vui lòng đăng nhập' 
        });
      }
      const userId = req.user.userId;
      // Đồng bộ giá từ products trước khi tính tổng
      await cartItem.syncPricesFromProducts(userId);
      // Tính tổng từ giá hiện tại của products
      const total = await cartItem.getCartTotal(userId);
      return res.status(200).json({ 
        success: true, 
        total  
      });
    } catch (error) {
      return res.status(500).json({ 
        success: false, 
        message: 'Lỗi khi tính tổng tiền', 
        error: error.message 
      });
    }
  };
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
      if (!req.user?.userId) {
        return res.status(401).json({ 
          success: false, 
          message: 'Vui lòng đăng nhập' 
        });
      }
      const { productId, quantity } = req.body;
      const userId = req.user.userId;
      console.log('[CartItemController] ➕ addToMyCart called:', {
        userId,
        productId,
        quantity
      });
      if (!productId) {
        return res.status(400).json({ success: false, message: 'productId là bắt buộc' });
      }
      const cartBefore = await cartItem.findByUserId(userId);
      console.log('[CartItemController] 📋 Cart before add:', {
        itemsCount: cartBefore.length,
        items: cartBefore.map(item => ({
          cart_item_id: item.cart_item_id,
          product_id: item.product_id,
          quantity: item.quantity
        }))
      });
      const { product } = require('../Models');
      console.log('[CartItemController] 🔍 addToMyCart: Searching for product with product_id:', productId);
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
      // Luôn lấy giá từ products (giá hiện tại)
      const finalUnitPrice = parseFloat(productData.price) || 0;
      const productSnapshot = {
        name: productData.name,
        price: productData.price,
        images: null,
        primary_image: null,
      };
      const result = await cartItem.addOrUpdate(req.user.userId, productId, quantity || 1, finalUnitPrice, productSnapshot);
      const cartAfter = await cartItem.findByUserId(userId);
      console.log('[CartItemController] 📋 Cart after add:', {
        itemsCount: cartAfter.length,
        items: cartAfter.map(item => ({
          cart_item_id: item.cart_item_id,
          product_id: item.product_id,
          quantity: item.quantity
        }))
      });
      const addedItem = await cartItem.findByUserAndProduct(userId, productId);
      if (addedItem) {
        // Kiểm tra số lượng đã được cập nhật đúng
        // Nếu sản phẩm đã có trong giỏ, số lượng sẽ được cộng dồn
        // Nếu sản phẩm chưa có, số lượng sẽ bằng quantity gửi lên
        const cartBeforeItem = cartBefore.find(item => item.product_id === productId);
        const expectedQuantity = cartBeforeItem 
          ? cartBeforeItem.quantity + (quantity || 1)  // Đã có: cộng dồn
          : (quantity || 1);                            // Chưa có: số lượng mới
        
        console.log('[CartItemController] ✅ Verified added/updated item:', {
          cart_item_id: addedItem.cart_item_id,
          product_id: addedItem.product_id,
          quantity: addedItem.quantity,
          expectedQuantity: expectedQuantity,
          wasExisting: !!cartBeforeItem,
          previousQuantity: cartBeforeItem?.quantity || 0,
          addedQuantity: quantity || 1
        });
        
        // Verify số lượng đã được cập nhật đúng
        if (addedItem.quantity !== expectedQuantity) {
          console.error('[CartItemController] ⚠️ Quantity mismatch!', {
            current: addedItem.quantity,
            expected: expectedQuantity,
            wasExisting: !!cartBeforeItem
          });
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
      if (!req.user?.userId) {
        return res.status(401).json({ 
          success: false, 
          message: 'Vui lòng đăng nhập' 
        });
      }
      const { productId } = req.params;
      const { quantity } = req.body;
      const userId = req.user.userId;
      if (quantity === undefined || quantity < 0) {
        return res.status(400).json({ 
          success: false, 
          message: 'Số lượng không hợp lệ' 
        });
      }
      const item = await cartItem.findByUserAndProduct(userId, productId);
      if (!item) {
        return res.status(404).json({ 
          success: false, 
          message: 'Không tìm thấy sản phẩm trong giỏ hàng' 
        });
      }
      // Lấy giá hiện tại từ products
      const { product } = require('../Models');
      const productData = await product.findFirstByProductId(productId);
      const currentPrice = productData ? parseFloat(productData.price) || 0 : item.unit_price || 0;
      
      if (quantity === 0) {
        await cartItem.delete(item.cart_item_id);
      } 
      else {
        await cartItem.update(item.cart_item_id, { 
          quantity,
          unit_price: currentPrice, // Cập nhật giá từ products
          updated_at: new Date() 
        });
      }
      const updatedCart = await cartItem.findByUserId(userId);
      const itemsWithProduct = await populateCartItemsWithProducts(updatedCart);
      const total = await cartItem.getCartTotal(userId);
      return res.status(200).json({ 
        success: true, 
        message: 'Cập nhật số lượng thành công', 
        data: { 
          items: itemsWithProduct,  
          total                      
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
      if (!req.user?.userId) {
        return res.status(401).json({ 
          success: false, 
          message: 'Vui lòng đăng nhập' 
        });
      }
      const { productId } = req.params;
      const userId = req.user.userId;
      const existing = await cartItem.findByUserAndProduct(userId, productId);
      if (!existing) {
        return res.status(404).json({ 
          success: false, 
          message: 'Không tìm thấy item trong giỏ hàng' 
        });
      }
      await cartItem.delete(existing.cart_item_id);
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
      if (!req.user?.userId) {
        return res.status(401).json({ 
          success: false, 
          message: 'Vui lòng đăng nhập' 
        });
      }
      const userId = req.user.userId;
      console.log('[CartItemController] 🗑️ clearMyCart called for userId:', userId);
      const cartBefore = await cartItem.findByUserId(userId);
      console.log('[CartItemController] 📋 Cart before clear:', {
        itemsCount: cartBefore.length,
        items: cartBefore.map(item => ({
          cart_item_id: item.cart_item_id,
          product_id: item.product_id,
          quantity: item.quantity
        }))
      });
      const result = await cartItem.clearUserCart(userId);
      console.log('[CartItemController] ✅ Cart cleared, result:', result);
      const cartAfter = await cartItem.findByUserId(userId);
      console.log('[CartItemController] 🔍 Cart after clear:', {
        itemsCount: cartAfter.length,
        isEmpty: cartAfter.length === 0
      });
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
      console.log('[CartItemController] 🗑️ Clearing cart for buy now...');
      await cartItem.clearUserCart(userId);
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
      const { product } = require('../Models');
      console.log('[CartItemController] 🔍 Searching for product with product_id:', productId);
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
      const finalUnitPrice = parseFloat(productData.price) || 0;
      const finalQuantity = quantity || 1;
      const productSnapshot = {
        name: productData.name,
        price: productData.price,
        images: null,
        primary_image: null,
      };
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
      if (!createResult?.insertId) {
        console.error('[CartItemController] ❌ CRITICAL: No insertId returned from create!', createResult);
        return res.status(500).json({ 
          success: false, 
          message: 'Lỗi: Không thể tạo cart item' 
        });
      }
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
      if (createdCartItem.product_id !== productId) {
        console.error('[CartItemController] ❌ CRITICAL: Created cart item has wrong product_id!', {
          expected: productId,
          actual: createdCartItem.product_id,
          cart_item_id: createdCartItem.cart_item_id
        });
        await cartItem.delete(createdCartItem.cart_item_id);
        return res.status(500).json({ 
          success: false, 
          message: 'Lỗi: Sản phẩm không khớp sau khi tạo' 
        });
      }
      const result = createdCartItem;
      const cartAfterAdd = await cartItem.findByUserId(userId);
      console.log('[CartItemController] 📋 Cart after buy now:', {
        itemsCount: cartAfterAdd.length,
        items: cartAfterAdd.map(item => ({
          cart_item_id: item.cart_item_id,
          product_id: item.product_id,
          quantity: item.quantity
        }))
      });
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
  const getAllCarts = async (req, res) => {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20;
      const offset = (page - 1) * limit;
      const filters = {};
      if (req.query.userId) filters.user_id = req.query.userId;
      if (req.query.productId) filters.product_id = req.query.productId;
      const allItems = await cartItem.findAll({ 
        filters, 
        limit, 
        offset,
        orderBy: 'created_at DESC'
      });
      const totalCount = await cartItem.count(filters);
      const { product } = require('../Models');
      const { user } = require('../Models');
      const enrichedData = await Promise.all((allItems || []).map(async (item) => {
        const [productData, userData] = await Promise.all([
          product.findById(item.product_id),
          user.findById(item.user_id)
        ]);
        return {
          ...item,
          product: productData || null,
          user: userData ? {
            user_id: userData.user_id,
            username: userData.username,
            email: userData.email
          } : null
        };
      }));
      return res.status(200).json({
        success: true,
        data: enrichedData,
        total: totalCount || 0,
        page,
        limit
      });
    } catch (error) {
      console.error('[CartItemController] Error in getAllCarts:', error.message);
      return res.status(500).json({
        success: false,
        message: 'Lỗi khi lấy danh sách giỏ hàng',
        error: error.message
      });
    }
  };
  const getCartByUserIdWithDetails = async (req, res) => {
    try {
      const { userId } = req.params;
      const { user } = require('../Models');
      const userData = await user.findById(userId);
      if (!userData) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy người dùng'
        });
      }
      const cartItems = await cartItem.findByUserId(userId);
      const itemsWithProduct = await populateCartItemsWithProducts(cartItems);
      const total = await cartItem.getCartTotal(userId);
      return res.status(200).json({
        success: true,
        data: {
          items: itemsWithProduct,
          total,
          user: {
            user_id: userData.user_id,
            username: userData.username,
            email: userData.email,
            full_name: userData.full_name
          }
        }
      });
    } catch (error) {
      console.error('[CartItemController] Error in getCartByUserIdWithDetails:', error.message);
      return res.status(500).json({
        success: false,
        message: 'Lỗi khi lấy giỏ hàng',
        error: error.message
      });
    }
  };
  const deleteCartItemByAdmin = async (req, res) => {
    try {
      const { id } = req.params;
      const item = await cartItem.findById(id);
      if (!item) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy sản phẩm trong giỏ hàng'
        });
      }
      await cartItem.delete(id);
      return res.status(200).json({
        success: true,
        message: 'Đã xóa sản phẩm khỏi giỏ hàng thành công'
      });
    } catch (error) {
      console.error('[CartItemController] Error in deleteCartItemByAdmin:', error.message);
      return res.status(500).json({
        success: false,
        message: 'Lỗi khi xóa sản phẩm khỏi giỏ hàng',
        error: error.message
      });
    }
  };
  const updateCartItemByAdmin = async (req, res) => {
    try {
      const { id } = req.params;
      const { quantity } = req.body;
      if (quantity === undefined || quantity === null) {
        return res.status(400).json({
          success: false,
          message: 'Số lượng không được để trống'
        });
      }
      const quantityNum = parseInt(quantity);
      if (isNaN(quantityNum) || quantityNum < 0) {
        return res.status(400).json({
          success: false,
          message: 'Số lượng phải là số nguyên dương hoặc 0'
        });
      }
      const item = await cartItem.findById(id);
      if (!item) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy sản phẩm trong giỏ hàng'
        });
      }
      if (quantityNum === 0) {
        await cartItem.delete(id);
        return res.status(200).json({
          success: true,
          message: 'Đã xóa sản phẩm khỏi giỏ hàng'
        });
      }
      await cartItem.update(id, {
        quantity: quantityNum,
        updated_at: new Date()
      });
      const updatedItem = await cartItem.findById(id);
      const itemsWithProduct = await populateCartItemsWithProducts([updatedItem]);
      return res.status(200).json({
        success: true,
        message: 'Cập nhật số lượng thành công',
        data: itemsWithProduct[0] || null
      });
    } catch (error) {
      console.error('[CartItemController] Error in updateCartItemByAdmin:', error.message);
      return res.status(500).json({
        success: false,
        message: 'Lỗi khi cập nhật số lượng',
        error: error.message
      });
    }
  };
  const clearUserCartByAdmin = async (req, res) => {
    try {
      const { userId } = req.params;
      const cartItems = await cartItem.findByUserId(userId);
      const deletedCount = cartItems.length;
      await cartItem.clearUserCart(userId);
      return res.status(200).json({
        success: true,
        message: `Đã xóa ${deletedCount} sản phẩm khỏi giỏ hàng`,
        deletedCount
      });
    } catch (error) {
      console.error('[CartItemController] Error in clearUserCartByAdmin:', error.message);
      return res.status(500).json({
        success: false,
        message: 'Lỗi khi xóa giỏ hàng',
        error: error.message
      });
    }
  };
  const getCartStatistics = async (req, res) => {
    try {
      const allItems = await cartItem.findAll({ filters: {} });
      const itemsArray = Array.isArray(allItems) ? allItems : [];
      const totalItems = itemsArray.length;
      const uniqueUsers = new Set(itemsArray.map(item => item.user_id)).size;
      const uniqueProducts = new Set(itemsArray.map(item => item.product_id)).size;
      let totalValue = 0;
      for (const item of itemsArray) {
        const price = parseFloat(item.unit_price || 0);
        const qty = parseInt(item.quantity || 0);
        totalValue += price * qty;
      }
      const avgItemsPerUser = uniqueUsers > 0 ? (totalItems / uniqueUsers).toFixed(2) : 0;
      const avgValuePerCart = uniqueUsers > 0 ? (totalValue / uniqueUsers).toFixed(2) : 0;
      return res.status(200).json({
        success: true,
        data: {
          totalCarts: uniqueUsers,
          totalItems,
          totalValue: totalValue.toFixed(2),
          uniqueProducts,
          avgItemsPerUser: parseFloat(avgItemsPerUser),
          avgValuePerCart: parseFloat(avgValuePerCart)
        }
      });
    } catch (error) {
      console.error('[CartItemController] Error in getCartStatistics:', error.message);
      return res.status(500).json({
        success: false,
        message: 'Lỗi khi lấy thống kê',
        error: error.message
      });
    }
  };
  return {
    ...baseController,
    getUserCart,              
    getByUser,                
    getTotal,                 
    addOrUpdateItem,          
    addOrUpdate,              
    updateQuantity,          
    removeItem,               
    clearCart,                
    getMyCart,                
    getMyCartTotal,           
    addToMyCart,              
    updateMyCartItem,         
    removeFromMyCart,         
    clearMyCart,              
    buyNow,                   
    getAllCarts,               
    getCartByUserIdWithDetails, 
    deleteCartItemByAdmin,    
    updateCartItemByAdmin,     
    clearUserCartByAdmin,     
    getCartStatistics,        
  };
};
module.exports = createCartItemController();
