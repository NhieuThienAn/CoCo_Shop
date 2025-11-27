const createBaseController = require('./BaseController');
const { coupon } = require('../Models');

const createCouponController = () => {
  const baseController = createBaseController(coupon);

  /**
   * Lấy coupon theo code
   */
  const getByCode = async (req, res) => {
    console.log('========================================');
    console.log('[CouponController] getByCode function called');
    console.log('[CouponController] Request IP:', req.ip);
    console.log('[CouponController] Request method:', req.method);
    console.log('[CouponController] Request URL:', req.originalUrl);
    console.log('[CouponController] Params:', req.params);
    
    const startTime = Date.now();
    
    try {
      const { code } = req.params;
      console.log('[CouponController] Extracted code:', code);
      
      if (!code || !code.trim()) {
        console.log('[CouponController] ❌ Validation failed: Missing coupon code');
        return res.status(400).json({
          success: false,
          message: 'Coupon code là bắt buộc',
        });
      }

      console.log('[CouponController] 🔍 Finding coupon by code:', code.trim());
      const data = await coupon.findByCode(code.trim());

      if (!data) {
        console.log('[CouponController] ❌ Coupon not found');
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy coupon',
        });
      }
      console.log('[CouponController] ✅ Coupon found:', data.coupon_id);
      
      const duration = Date.now() - startTime;
      console.log('[CouponController] ✅ getByCode completed successfully in', duration, 'ms');
      console.log('========================================');

      return res.status(200).json({
        success: true,
        data,
      });
    } catch (error) {
      console.error('[CouponController] ❌❌❌ ERROR IN getByCode ❌❌❌');
      console.error('[CouponController] Error message:', error.message);
      console.error('[CouponController] Error stack:', error.stack);
      console.error('[CouponController] Error details:', {
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

  /**
   * Lấy active coupons
   */
  const getActiveCoupons = async (req, res) => {
    console.log('========================================');
    console.log('[CouponController] getActiveCoupons function called');
    console.log('[CouponController] Request IP:', req.ip);
    console.log('[CouponController] Request method:', req.method);
    console.log('[CouponController] Request URL:', req.originalUrl);
    console.log('[CouponController] Query:', req.query);
    
    const startTime = Date.now();
    
    try {
      console.log('[CouponController] 🔍 Fetching active coupons...');
      const data = await coupon.findActiveCoupons();
      console.log('[CouponController] ✅ Active coupons found:', data?.length || 0);
      
      const duration = Date.now() - startTime;
      console.log('[CouponController] ✅ getActiveCoupons completed successfully in', duration, 'ms');
      console.log('========================================');

      return res.status(200).json({
        success: true,
        data,
      });
    } catch (error) {
      console.error('[CouponController] ❌❌❌ ERROR IN getActiveCoupons ❌❌❌');
      console.error('[CouponController] Error message:', error.message);
      console.error('[CouponController] Error stack:', error.stack);
      console.error('[CouponController] Error details:', {
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

  /**
   * Validate coupon
   */
  const validateCoupon = async (req, res) => {
    console.log('========================================');
    console.log('[CouponController] validateCoupon function called');
    console.log('[CouponController] Request IP:', req.ip);
    console.log('[CouponController] Request body:', JSON.stringify(req.body, null, 2));
    
    try {
      const { code, cartValue = 0 } = req.body;
      console.log('[CouponController] Validating coupon:', { code, cartValue });

      if (!code) {
        console.log('[CouponController] ❌ Validation failed: Missing coupon code');
        return res.status(400).json({
          success: false,
          message: 'Vui lòng cung cấp mã coupon',
        });
      }

      console.log('[CouponController] 🎫 Validating coupon code...');
      const result = await coupon.validateCoupon(code, parseFloat(cartValue));
      console.log('[CouponController] Validation result:', {
        valid: result.valid,
        message: result.message,
        hasCoupon: !!result.coupon
      });
      console.log('========================================');

      return res.status(result.valid ? 200 : 400).json({
        success: result.valid,
        message: result.message,
        ...(result.valid && { data: result.coupon }),
      });
    } catch (error) {
      console.error('[CouponController] ❌❌❌ ERROR IN validateCoupon ❌❌❌');
      console.error('[CouponController] Error message:', error.message);
      console.error('[CouponController] Error stack:', error.stack);
      console.log('========================================');
      
      return res.status(500).json({
        success: false,
        message: 'Lỗi khi validate coupon',
        error: error.message,
      });
    }
  };

  return {
    ...baseController,
    getByCode,
    getActiveCoupons,
    validateCoupon,
  };
};

module.exports = createCouponController();
