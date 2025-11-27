const createBaseController = require('./BaseController');
const { wishlist } = require('../Models');

const createWishlistController = () => {
  const baseController = createBaseController(wishlist);

  /**
   * Populate wishlist items with product data
   * Uses batch SQL query with WHERE IN instead of individual queries in loop
   */
  const populateWishlistWithProducts = async (wishlistItems) => {
    if (!Array.isArray(wishlistItems) || wishlistItems.length === 0) {
      return [];
    }

    const { product } = require('../Models');
    
    // Batch fetch all products using SQL WHERE IN (single query instead of N queries)
    // Note: product.findById uses 'id' (primary key), but wishlist stores product_id
    // We need to get product_ids first, then batch fetch by product_id
    const productIds = wishlistItems.map(item => item.product_id).filter(Boolean);
    const productMap = await product.findByProductIdsAsMap(productIds);
    console.log(`[WishlistController] 🔍 Batch fetched ${Object.keys(productMap).length} products for ${wishlistItems.length} wishlist items`);
    
    // Process each wishlist item with batch-fetched product data
    return (wishlistItems || []).map((item) => {
      try {
        // Use batch-fetched product data instead of individual query
        const productData = productMap[item.product_id];
          
          if (!productData) {
            return {
              ...item,
              product: null
            };
          }

          // Process images if product has images
          if (productData.images) {
            try {
              const parsedImages = product.parseImages(productData.images);
              productData.images = parsedImages;
              
              // Validate and set primary_image
              const existingPrimaryImageValid = productData.primary_image && 
                typeof productData.primary_image === 'string' && 
                productData.primary_image.trim() !== '' && 
                productData.primary_image !== '/placeholder.jpg';
              
              if (!existingPrimaryImageValid && parsedImages.length > 0) {
                // Find primary image from array
                const primaryImg = parsedImages.find(img => img.is_primary) || parsedImages[0];
                
                // Use url field, fallback to image_url if url doesn't exist
                const newPrimaryImage = primaryImg?.url || primaryImg?.image_url || null;
                
                if (newPrimaryImage && newPrimaryImage.trim() !== '') {
                  productData.primary_image = newPrimaryImage;
                }
              }
            } catch (parseError) {
              console.error('[WishlistController] Error parsing images for product:', item.product_id, parseError.message);
              productData.images = [];
            }
          }
          
          return {
            ...item,
            product: productData
          };
        } catch (error) {
          console.error('[WishlistController] Error processing wishlist item:', {
            wishlist_id: item.wishlist_id,
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

  /**
   * Lấy wishlist của user
   */
  const getByUser = async (req, res) => {
    console.log('========================================');
    console.log('[WishlistController] getByUser function called');
    console.log('[WishlistController] Request IP:', req.ip);
    console.log('[WishlistController] Params:', req.params);
    
    try {
      const { userId } = req.params;
      console.log('[WishlistController] 🔍 Fetching wishlist for userId:', userId);
      
      const wishlistItems = await wishlist.findByUserId(userId);
      console.log('[WishlistController] ✅ Wishlist fetched:', wishlistItems?.length || 0, 'items');
      
      // Populate with product data
      const data = await populateWishlistWithProducts(wishlistItems);
      console.log('[WishlistController] ✅ Wishlist populated with products');
      console.log('========================================');

      return res.status(200).json({
        success: true,
        data: {
          items: data
        },
      });
    } catch (error) {
      console.error('[WishlistController] ❌❌❌ ERROR IN getByUser ❌❌❌');
      console.error('[WishlistController] Error message:', error.message);
      console.error('[WishlistController] Error stack:', error.stack);
      console.log('========================================');
      
      return res.status(500).json({
        success: false,
        message: 'Lỗi khi lấy dữ liệu',
        error: error.message,
      });
    }
  };

  /**
   * Thêm vào wishlist
   */
  const addToWishlist = async (req, res) => {
    console.log('========================================');
    console.log('[WishlistController] addToWishlist function called');
    console.log('[WishlistController] Request IP:', req.ip);
    console.log('[WishlistController] Request body:', JSON.stringify(req.body, null, 2));
    
    try {
      const { userId, productId } = req.body;
      console.log('[WishlistController] Extracted data:', { userId, productId });

      if (!userId || !productId) {
        console.log('[WishlistController] ❌ Validation failed: Missing userId or productId');
        return res.status(400).json({
          success: false,
          message: 'userId và productId là bắt buộc',
        });
      }

      console.log('[WishlistController] ❤️ Adding to wishlist...');
      const data = await wishlist.addToWishlist(userId, productId);
      console.log('[WishlistController] ✅ Added to wishlist successfully');
      console.log('[WishlistController] Result:', data);
      console.log('========================================');

      return res.status(200).json({
        success: true,
        message: 'Thêm vào wishlist thành công',
        data,
      });
    } catch (error) {
      console.error('[WishlistController] ❌❌❌ ERROR IN addToWishlist ❌❌❌');
      console.error('[WishlistController] Error message:', error.message);
      console.error('[WishlistController] Error stack:', error.stack);
      console.log('========================================');
      
      return res.status(400).json({
        success: false,
        message: 'Lỗi khi thêm vào wishlist',
        error: error.message,
      });
    }
  };

  /**
   * Xóa khỏi wishlist
   */
  const removeFromWishlist = async (req, res) => {
    console.log('========================================');
    console.log('[WishlistController] removeFromWishlist function called');
    console.log('[WishlistController] Request IP:', req.ip);
    console.log('[WishlistController] Params:', req.params);
    
    try {
      const { userId, productId } = req.params;
      console.log('[WishlistController] Removing from wishlist:', { userId, productId });

      console.log('[WishlistController] 🗑️ Removing from wishlist...');
      await wishlist.removeFromWishlist(userId, productId);
      console.log('[WishlistController] ✅ Removed from wishlist successfully');
      console.log('========================================');

      return res.status(200).json({
        success: true,
        message: 'Xóa khỏi wishlist thành công',
      });
    } catch (error) {
      console.error('[WishlistController] ❌❌❌ ERROR IN removeFromWishlist ❌❌❌');
      console.error('[WishlistController] Error message:', error.message);
      console.error('[WishlistController] Error stack:', error.stack);
      console.log('========================================');
      
      return res.status(400).json({
        success: false,
        message: 'Lỗi khi xóa khỏi wishlist',
        error: error.message,
      });
    }
  };

  /**
   * Kiểm tra item có trong wishlist không
   */
  const checkItem = async (req, res) => {
    console.log('========================================');
    console.log('[WishlistController] checkItem function called');
    console.log('[WishlistController] Request IP:', req.ip);
    console.log('[WishlistController] Request method:', req.method);
    console.log('[WishlistController] Request URL:', req.originalUrl);
    console.log('[WishlistController] Params:', req.params);
    
    const startTime = Date.now();
    
    try {
      const { userId, productId } = req.params;
      console.log('[WishlistController] Extracted data:', { userId, productId });
      
      if (!userId || !productId) {
        console.log('[WishlistController] ❌ Validation failed: Missing userId or productId');
        return res.status(400).json({
          success: false,
          message: 'userId và productId là bắt buộc',
        });
      }

      console.log('[WishlistController] 🔍 Checking if item is in wishlist...');
      const data = await wishlist.findByUserAndProduct(userId, productId);
      const isInWishlist = !!data;
      console.log('[WishlistController] ✅ Check completed, isInWishlist:', isInWishlist);
      
      const duration = Date.now() - startTime;
      console.log('[WishlistController] ✅ checkItem completed successfully in', duration, 'ms');
      console.log('========================================');

      return res.status(200).json({
        success: true,
        isInWishlist: isInWishlist,
        data: data || null,
      });
    } catch (error) {
      console.error('[WishlistController] ❌❌❌ ERROR IN checkItem ❌❌❌');
      console.error('[WishlistController] Error message:', error.message);
      console.error('[WishlistController] Error stack:', error.stack);
      console.error('[WishlistController] Error details:', {
        name: error.name,
        message: error.message,
        code: error.code
      });
      console.log('========================================');
      
      return res.status(500).json({
        success: false,
        message: 'Lỗi khi kiểm tra',
        error: error.message,
      });
    }
  };

  /**
   * Get current user's wishlist (from token)
   */
  const getMyWishlist = async (req, res) => {
    if (!req.user || !req.user.userId) {
      return res.status(401).json({
        success: false,
        message: 'Vui lòng đăng nhập',
      });
    }
    req.params.userId = req.user.userId;
    return getByUser(req, res);
  };

  /**
   * Add to current user's wishlist (from token)
   */
  const addToMyWishlist = async (req, res) => {
    if (!req.user || !req.user.userId) {
      return res.status(401).json({
        success: false,
        message: 'Vui lòng đăng nhập',
      });
    }
    req.body.userId = req.user.userId;
    return addToWishlist(req, res);
  };

  /**
   * Remove from current user's wishlist (from token)
   */
  const removeFromMyWishlist = async (req, res) => {
    if (!req.user || !req.user.userId) {
      return res.status(401).json({
        success: false,
        message: 'Vui lòng đăng nhập',
      });
    }
    req.params.userId = req.user.userId;
    return removeFromWishlist(req, res);
  };

  /**
   * Check if product in current user's wishlist (from token)
   */
  const checkMyWishlist = async (req, res) => {
    if (!req.user || !req.user.userId) {
      return res.status(401).json({
        success: false,
        message: 'Vui lòng đăng nhập',
      });
    }
    req.params.userId = req.user.userId;
    return checkItem(req, res);
  };

  return {
    ...baseController,
    getByUser,
    addToWishlist,
    removeFromWishlist,
    checkItem,
    getMyWishlist,
    addToMyWishlist,
    removeFromMyWishlist,
    checkMyWishlist,
  };
};

module.exports = createWishlistController();
