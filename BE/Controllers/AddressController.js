const createBaseController = require('./BaseController');
const { address } = require('../Models');

const createAddressController = () => {
  const baseController = createBaseController(address);

  /**
   * Lấy addresses của user
   */
  const getByUserId = async (req, res) => {
    console.log('========================================');
    console.log('[AddressController] getByUserId function called');
    console.log('[AddressController] Request IP:', req.ip);
    console.log('[AddressController] Params:', req.params);
    
    try {
      const { userId } = req.params;
      console.log('[AddressController] 🔍 Fetching addresses for userId:', userId);
      
      const data = await address.findByUserId(userId);
      console.log('[AddressController] ✅ Addresses fetched:', data?.length || 0);
      console.log('========================================');

      return res.status(200).json({
        success: true,
        data,
      });
    } catch (error) {
      console.error('[AddressController] ❌❌❌ ERROR IN getByUserId ❌❌❌');
      console.error('[AddressController] Error message:', error.message);
      console.error('[AddressController] Error stack:', error.stack);
      console.log('========================================');
      
      return res.status(500).json({
        success: false,
        message: 'Lỗi khi lấy dữ liệu',
        error: error.message,
      });
    }
  };

  /**
   * Lấy default shipping address
   */
  const getDefaultShipping = async (req, res) => {
    console.log('========================================');
    console.log('[AddressController] getDefaultShipping function called');
    console.log('[AddressController] Request IP:', req.ip);
    console.log('[AddressController] Request method:', req.method);
    console.log('[AddressController] Request URL:', req.originalUrl);
    console.log('[AddressController] Params:', req.params);
    
    const startTime = Date.now();
    
    try {
      const { userId } = req.params;
      console.log('[AddressController] Extracted userId:', userId);
      
      if (!userId) {
        console.log('[AddressController] ❌ Validation failed: Missing userId');
        return res.status(400).json({
          success: false,
          message: 'userId là bắt buộc',
        });
      }

      console.log('[AddressController] 🔍 Fetching default shipping address for userId:', userId);
      const data = await address.findDefaultShipping(userId);

      if (!data) {
        console.log('[AddressController] ❌ Default shipping address not found');
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy địa chỉ mặc định',
        });
      }
      console.log('[AddressController] ✅ Default shipping address found:', data.address_id);
      
      const duration = Date.now() - startTime;
      console.log('[AddressController] ✅ getDefaultShipping completed successfully in', duration, 'ms');
      console.log('========================================');

      return res.status(200).json({
        success: true,
        data,
      });
    } catch (error) {
      console.error('[AddressController] ❌❌❌ ERROR IN getDefaultShipping ❌❌❌');
      console.error('[AddressController] Error message:', error.message);
      console.error('[AddressController] Error stack:', error.stack);
      console.error('[AddressController] Error details:', {
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
   * Set default shipping address
   */
  const setDefaultShipping = async (req, res) => {
    console.log('========================================');
    console.log('[AddressController] setDefaultShipping function called');
    console.log('[AddressController] Request IP:', req.ip);
    console.log('[AddressController] Request body:', JSON.stringify(req.body, null, 2));
    
    try {
      const { addressId, userId } = req.body;
      console.log('[AddressController] Setting default shipping address:', { addressId, userId });

      if (!addressId || !userId) {
        console.log('[AddressController] ❌ Validation failed: Missing addressId or userId');
        return res.status(400).json({
          success: false,
          message: 'addressId và userId là bắt buộc',
        });
      }

      console.log('[AddressController] 📍 Setting default shipping address...');
      await address.setDefaultShipping(addressId, userId);
      const updated = await address.findById(addressId);
      console.log('[AddressController] ✅ Default shipping address set successfully');
      console.log('========================================');

      return res.status(200).json({
        success: true,
        message: 'Đặt địa chỉ mặc định thành công',
        data: updated,
      });
    } catch (error) {
      console.error('[AddressController] ❌❌❌ ERROR IN setDefaultShipping ❌❌❌');
      console.error('[AddressController] Error message:', error.message);
      console.error('[AddressController] Error stack:', error.stack);
      console.log('========================================');
      
      return res.status(400).json({
        success: false,
        message: 'Lỗi khi đặt địa chỉ mặc định',
        error: error.message,
      });
    }
  };

  /**
   * Alias for compatibility
   */
  const getByUser = getByUserId;

  /**
   * Methods for /me routes (using token)
   */
  const getMyAddresses = async (req, res) => {
    if (!req.user?.userId) {
      return res.status(401).json({ success: false, message: 'Vui lòng đăng nhập' });
    }
    req.params.userId = req.user.userId;
    return getByUserId(req, res);
  };

  const getMyDefaultAddress = async (req, res) => {
    if (!req.user?.userId) {
      return res.status(401).json({ success: false, message: 'Vui lòng đăng nhập' });
    }
    req.params.userId = req.user.userId;
    return getDefaultShipping(req, res);
  };

  const createMyAddress = async (req, res) => {
    if (!req.user?.userId) {
      return res.status(401).json({ success: false, message: 'Vui lòng đăng nhập' });
    }
    
    try {
      const userId = req.user.userId;
      
      // Check current address count using SQL COUNT instead of JavaScript .length
      const addressCount = await address.countByUserId(userId);
      
      // Limit to 5 addresses
      const MAX_ADDRESSES = 5;
      if (addressCount >= MAX_ADDRESSES) {
        return res.status(400).json({
          success: false,
          message: `Bạn chỉ có thể tạo tối đa ${MAX_ADDRESSES} địa chỉ giao hàng. Vui lòng xóa một địa chỉ trước khi thêm mới.`,
        });
      }
      
      req.body.user_id = userId;
      return baseController.create(req, res);
    } catch (error) {
      console.error('[AddressController] Error in createMyAddress:', error);
      return res.status(500).json({
        success: false,
        message: 'Lỗi khi tạo địa chỉ',
        error: error.message,
      });
    }
  };

  const updateMyAddress = async (req, res) => {
    try {
      if (!req.user?.userId) {
        return res.status(401).json({ success: false, message: 'Vui lòng đăng nhập' });
      }
      const { id } = req.params;
      const addressData = await address.findById(id);
      if (!addressData) {
        return res.status(404).json({ success: false, message: 'Không tìm thấy địa chỉ' });
      }
      if (addressData.user_id !== req.user.userId) {
        return res.status(403).json({ success: false, message: 'Bạn không có quyền cập nhật địa chỉ này' });
      }
      return baseController.update(req, res);
    } catch (error) {
      return res.status(500).json({ success: false, message: 'Lỗi khi cập nhật địa chỉ', error: error.message });
    }
  };

  const deleteMyAddress = async (req, res) => {
    try {
      if (!req.user?.userId) {
        return res.status(401).json({ success: false, message: 'Vui lòng đăng nhập' });
      }
      const { id } = req.params;
      const addressData = await address.findById(id);
      if (!addressData) {
        return res.status(404).json({ success: false, message: 'Không tìm thấy địa chỉ' });
      }
      if (addressData.user_id !== req.user.userId) {
        return res.status(403).json({ success: false, message: 'Bạn không có quyền xóa địa chỉ này' });
      }
      return baseController.delete(req, res);
    } catch (error) {
      return res.status(500).json({ success: false, message: 'Lỗi khi xóa địa chỉ', error: error.message });
    }
  };

  const setMyDefaultAddress = async (req, res) => {
    if (!req.user?.userId) {
      return res.status(401).json({ success: false, message: 'Vui lòng đăng nhập' });
    }
    req.body.userId = req.user.userId;
    req.body.addressId = req.params.id;
    return setDefaultShipping(req, res);
  };

  return {
    ...baseController,
    getByUserId,
    getByUser,
    getDefaultShipping,
    setDefaultShipping,
    getMyAddresses,
    getMyDefaultAddress,
    createMyAddress,
    updateMyAddress,
    deleteMyAddress,
    setMyDefaultAddress,
  };
};

module.exports = createAddressController();
