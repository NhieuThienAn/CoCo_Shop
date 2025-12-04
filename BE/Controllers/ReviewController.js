const createBaseController = require('./BaseController');
const { review } = require('../Models');
const createReviewController = () => {
  const baseController = createBaseController(review);
  const getByProduct = async (req, res) => {
    console.log('========================================');
    console.log('[ReviewController] getByProduct function called');
    console.log('[ReviewController] Request IP:', req.ip);
    console.log('[ReviewController] Params:', req.params);
    console.log('[ReviewController] Query:', req.query);
    try {
      const { productId } = req.params;
      const { page = 1, limit = 10 } = req.query;
      const offset = (parseInt(page) - 1) * parseInt(limit);
      console.log('[ReviewController] 🔍 Fetching reviews for productId:', productId);
      console.log('[ReviewController] Pagination:', { page, limit, offset });
      const data = await review.findByProductId(productId, {
        limit: parseInt(limit),
        offset,
      });
      console.log('[ReviewController] ✅ Reviews fetched:', data?.length || 0);
      console.log('========================================');
      return res.status(200).json({
        success: true,
        data,
      });
    } catch (error) {
      console.error('[ReviewController] ❌❌❌ ERROR IN getByProduct ❌❌❌');
      console.error('[ReviewController] Error message:', error.message);
      console.error('[ReviewController] Error stack:', error.stack);
      console.log('========================================');
      return res.status(500).json({
        success: false,
        message: 'Lỗi khi lấy dữ liệu',
        error: error.message,
      });
    }
  };
  const getByUser = async (req, res) => {
    console.log('========================================');
    console.log('[ReviewController] getByUser function called');
    console.log('[ReviewController] Request IP:', req.ip);
    console.log('[ReviewController] Request method:', req.method);
    console.log('[ReviewController] Request URL:', req.originalUrl);
    console.log('[ReviewController] Params:', req.params);
    const startTime = Date.now();
    try {
      const { userId } = req.params;
      console.log('[ReviewController] Extracted userId:', userId);
      if (!userId) {
        console.log('[ReviewController] ❌ Validation failed: Missing userId');
        return res.status(400).json({
          success: false,
          message: 'userId là bắt buộc',
        });
      }
      console.log('[ReviewController] 🔍 Fetching reviews for userId:', userId);
      const data = await review.findByUserId(userId);
      console.log('[ReviewController] ✅ Reviews found:', data?.length || 0);
      const duration = Date.now() - startTime;
      console.log('[ReviewController] ✅ getByUser completed successfully in', duration, 'ms');
      console.log('========================================');
      return res.status(200).json({
        success: true,
        data,
      });
    } catch (error) {
      console.error('[ReviewController] ❌❌❌ ERROR IN getByUser ❌❌❌');
      console.error('[ReviewController] Error message:', error.message);
      console.error('[ReviewController] Error stack:', error.stack);
      console.error('[ReviewController] Error details:', {
        name: error.name,
        message: error.message,
        code: error.code
      });
      console.log('========================================');
      return res.status(500).json({
        success: false,
        message: 'Lỗi khi lấy dữ liệu',
        error: error.message,
      });
    }
  };
  const getProductRating = async (req, res) => {
    console.log('========================================');
    console.log('[ReviewController] getProductRating function called');
    console.log('[ReviewController] Request IP:', req.ip);
    console.log('[ReviewController] Request method:', req.method);
    console.log('[ReviewController] Request URL:', req.originalUrl);
    console.log('[ReviewController] Params:', req.params);
    const startTime = Date.now();
    try {
      const { productId } = req.params;
      console.log('[ReviewController] Extracted productId:', productId);
      if (!productId) {
        console.log('[ReviewController] ❌ Validation failed: Missing productId');
        return res.status(400).json({
          success: false,
          message: 'productId là bắt buộc',
        });
      }
      console.log('[ReviewController] ⭐ Calculating product rating for productId:', productId);
      const data = await review.getProductRating(productId);
      console.log('[ReviewController] ✅ Product rating calculated:', data);
      const duration = Date.now() - startTime;
      console.log('[ReviewController] ✅ getProductRating completed successfully in', duration, 'ms');
      console.log('========================================');
      return res.status(200).json({
        success: true,
        data,
      });
    } catch (error) {
      console.error('[ReviewController] ❌❌❌ ERROR IN getProductRating ❌❌❌');
      console.error('[ReviewController] Error message:', error.message);
      console.error('[ReviewController] Error stack:', error.stack);
      console.error('[ReviewController] Error details:', {
        name: error.name,
        message: error.message,
        code: error.code
      });
      console.log('========================================');
      return res.status(500).json({
        success: false,
        message: 'Lỗi khi lấy dữ liệu',
        error: error.message,
      });
    }
  };
  const createOrUpdate = async (req, res) => {
    console.log('========================================');
    console.log('[ReviewController] createOrUpdate function called');
    console.log('[ReviewController] Request IP:', req.ip);
    console.log('[ReviewController] Request body:', JSON.stringify(req.body, null, 2));
    try {
      const { userId, productId, rating, comment } = req.body;
      console.log('[ReviewController] Extracted data:', { userId, productId, rating, hasComment: !!comment });
      if (!userId || !productId || !rating) {
        console.log('[ReviewController] ❌ Validation failed: Missing required fields');
        return res.status(400).json({
          success: false,
          message: 'userId, productId và rating là bắt buộc',
        });
      }
      console.log('[ReviewController] 🔍 Checking if review exists...');
      const existing = await review.findByUserAndProduct(userId, productId);
      if (existing) {
        console.log('[ReviewController] ✅ Review exists, updating...');
        await review.update(existing.review_id, {
          rating,
          comment,
          updated_at: new Date(),
        });
        const updated = await review.findById(existing.review_id);
        console.log('[ReviewController] ✅ Review updated successfully');
        console.log('========================================');
        return res.status(200).json({
          success: true,
          message: 'Cập nhật review thành công',
          data: updated,
        });
      } else {
        console.log('[ReviewController] 📝 Review does not exist, creating new...');
        const result = await review.create({
          user_id: userId,
          product_id: productId,
          rating,
          comment,
        });
        const newReview = await review.findById(result.insertId);
        console.log('[ReviewController] ✅ Review created successfully with ID:', result.insertId);
        console.log('========================================');
        return res.status(201).json({
          success: true,
          message: 'Tạo review thành công',
          data: newReview,
        });
      }
    } catch (error) {
      console.error('[ReviewController] ❌❌❌ ERROR IN createOrUpdate ❌❌❌');
      console.error('[ReviewController] Error message:', error.message);
      console.error('[ReviewController] Error stack:', error.stack);
      console.log('========================================');
      return res.status(400).json({
        success: false,
        message: 'Lỗi khi tạo/cập nhật review',
        error: error.message,
      });
    }
  };
  const getMyReviews = async (req, res) => {
    if (!req.user || !req.user.userId) {
      return res.status(401).json({
        success: false,
        message: 'Vui lòng đăng nhập',
      });
    }
    req.params.userId = req.user.userId;
    return getByUser(req, res);
  };
  const createMyReview = async (req, res) => {
    if (!req.user || !req.user.userId) {
      return res.status(401).json({
        success: false,
        message: 'Vui lòng đăng nhập',
      });
    }
    req.body.userId = req.user.userId;
    return createOrUpdate(req, res);
  };
  const updateMyReview = async (req, res) => {
    console.log('========================================');
    console.log('[ReviewController] updateMyReview function called');
    console.log('[ReviewController] Request IP:', req.ip);
    console.log('[ReviewController] Request method:', req.method);
    console.log('[ReviewController] Request URL:', req.originalUrl);
    console.log('[ReviewController] Params:', req.params);
    console.log('[ReviewController] Request body:', JSON.stringify(req.body, null, 2));
    console.log('[ReviewController] User from token:', req.user ? { userId: req.user.userId, roleId: req.user.roleId } : 'No user');
    const startTime = Date.now();
    try {
      if (!req.user || !req.user.userId) {
        console.log('[ReviewController] ❌ Unauthorized: No user in token');
        return res.status(401).json({
          success: false,
          message: 'Vui lòng đăng nhập',
        });
      }
      const { id } = req.params;
      console.log('[ReviewController] Extracted reviewId:', id);
      console.log('[ReviewController] User ID from token:', req.user.userId);
      console.log('[ReviewController] 🔍 Checking if review exists...');
      const reviewData = await review.findById(id);
      if (!reviewData) {
        console.log('[ReviewController] ❌ Review not found');
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy review',
        });
      }
      console.log('[ReviewController] ✅ Review found:', {
        reviewId: reviewData.review_id,
        userId: reviewData.user_id,
        productId: reviewData.product_id
      });
      if (reviewData.user_id !== req.user.userId) {
        console.log('[ReviewController] ❌ Unauthorized: Review does not belong to user');
        return res.status(403).json({
          success: false,
          message: 'Bạn không có quyền cập nhật review này',
        });
      }
      console.log('[ReviewController] ✅ Authorization check passed');
      console.log('[ReviewController] ✏️ Updating review...');
      return baseController.update(req, res);
    } catch (error) {
      console.error('[ReviewController] ❌❌❌ ERROR IN updateMyReview ❌❌❌');
      console.error('[ReviewController] Error message:', error.message);
      console.error('[ReviewController] Error stack:', error.stack);
      console.error('[ReviewController] Error details:', {
        name: error.name,
        message: error.message,
        code: error.code
      });
      console.log('========================================');
      return res.status(500).json({
        success: false,
        message: 'Lỗi khi cập nhật review',
        error: error.message,
      });
    }
  };
  const deleteMyReview = async (req, res) => {
    console.log('========================================');
    console.log('[ReviewController] deleteMyReview function called');
    console.log('[ReviewController] Request IP:', req.ip);
    console.log('[ReviewController] Request method:', req.method);
    console.log('[ReviewController] Request URL:', req.originalUrl);
    console.log('[ReviewController] Params:', req.params);
    console.log('[ReviewController] User from token:', req.user ? { userId: req.user.userId, roleId: req.user.roleId } : 'No user');
    const startTime = Date.now();
    try {
      if (!req.user || !req.user.userId) {
        console.log('[ReviewController] ❌ Unauthorized: No user in token');
        return res.status(401).json({
          success: false,
          message: 'Vui lòng đăng nhập',
        });
      }
      const { id } = req.params;
      console.log('[ReviewController] Extracted reviewId:', id);
      console.log('[ReviewController] User ID from token:', req.user.userId);
      console.log('[ReviewController] 🔍 Checking if review exists...');
      const reviewData = await review.findById(id);
      if (!reviewData) {
        console.log('[ReviewController] ❌ Review not found');
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy review',
        });
      }
      console.log('[ReviewController] ✅ Review found:', {
        reviewId: reviewData.review_id,
        userId: reviewData.user_id,
        productId: reviewData.product_id
      });
      if (reviewData.user_id !== req.user.userId) {
        console.log('[ReviewController] ❌ Unauthorized: Review does not belong to user');
        return res.status(403).json({
          success: false,
          message: 'Bạn không có quyền xóa review này',
        });
      }
      console.log('[ReviewController] ✅ Authorization check passed');
      console.log('[ReviewController] 🗑️ Deleting review...');
      return baseController.delete(req, res);
    } catch (error) {
      console.error('[ReviewController] ❌❌❌ ERROR IN deleteMyReview ❌❌❌');
      console.error('[ReviewController] Error message:', error.message);
      console.error('[ReviewController] Error stack:', error.stack);
      console.error('[ReviewController] Error details:', {
        name: error.name,
        message: error.message,
        code: error.code
      });
      console.log('========================================');
      return res.status(500).json({
        success: false,
        message: 'Lỗi khi xóa review',
        error: error.message,
      });
    }
  };
  const createOrUpdateMyReview = async (req, res) => {
    if (!req.user || !req.user.userId) {
      return res.status(401).json({
        success: false,
        message: 'Vui lòng đăng nhập',
      });
    }
    req.body.userId = req.user.userId;
    return createOrUpdate(req, res);
  };
  return {
    ...baseController,
    getByProduct,
    getByUser,
    getProductRating,
    createOrUpdate,
    getMyReviews,
    createMyReview,
    updateMyReview,
    deleteMyReview,
    createOrUpdateMyReview,
  };
};
module.exports = createReviewController();
