const createBaseController = require('./BaseController');
const { wishlist } = require('../Models');
const createWishlistController = () => {
  const baseController = createBaseController(wishlist);
  const populateWishlistWithProducts = async (wishlistItems) => {
    if (!Array.isArray(wishlistItems) || wishlistItems.length === 0) {
      return [];
    }
    const { product } = require('../Models');
    const productIds = wishlistItems.map(item => item.product_id).filter(Boolean);
    const productMap = await product.findByProductIdsAsMap(productIds);
    console.log(`[WishlistController] 🔍 Batch fetched ${Object.keys(productMap).length} products for ${wishlistItems.length} wishlist items`);
    return (wishlistItems || []).map((item) => {
      try {
        const productData = productMap[item.product_id];
          if (!productData) {
            return {
              ...item,
              product: null
            };
          }
          if (productData.images) {
            try {
              const parsedImages = product.parseImages(productData.images);
              productData.images = parsedImages;
              const existingPrimaryImageValid = productData.primary_image && 
                typeof productData.primary_image === 'string' && 
                productData.primary_image.trim() !== '' && 
                productData.primary_image !== '/placeholder.jpg';
              if (!existingPrimaryImageValid && parsedImages.length > 0) {
                const primaryImg = parsedImages.find(img => img.is_primary) || parsedImages[0];
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
          return {
            ...item,
            product: null
          };
        }
    });
  };
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
