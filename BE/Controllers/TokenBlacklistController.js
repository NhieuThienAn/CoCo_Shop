const createBaseController = require('./BaseController');
const { tokenBlacklist } = require('../Models');

const createTokenBlacklistController = () => {
  const baseController = createBaseController(tokenBlacklist);

  const checkToken = async (req, res) => {
    console.log('========================================');
    console.log('[TokenBlacklistController] checkToken function called');
    console.log('[TokenBlacklistController] Request IP:', req.ip);
    console.log('[TokenBlacklistController] Request body:', JSON.stringify({
      ...req.body,
      token: req.body.token ? '[HIDDEN]' : undefined
    }, null, 2));
    
    try {
      const { token } = req.body;
      console.log('[TokenBlacklistController] Checking if token is blacklisted...');

      if (!token) {
        console.log('[TokenBlacklistController] ❌ Validation failed: Missing token');
        return res.status(400).json({
          success: false,
          message: 'Vui lòng cung cấp token',
        });
      }

      console.log('[TokenBlacklistController] 🔍 Checking token in blacklist...');
      const isBlacklisted = await tokenBlacklist.isTokenBlacklisted(token);
      console.log('[TokenBlacklistController] ✅ Token check completed. Is blacklisted:', isBlacklisted);
      console.log('========================================');

      return res.status(200).json({
        success: true,
        isBlacklisted,
      });
    } catch (error) {
      console.error('[TokenBlacklistController] ❌❌❌ ERROR IN checkToken ❌❌❌');
      console.error('[TokenBlacklistController] Error message:', error.message);
      console.error('[TokenBlacklistController] Error stack:', error.stack);
      console.log('========================================');
      
      return res.status(500).json({
        success: false,
        message: 'Lỗi khi kiểm tra token',
        error: error.message,
      });
    }
  };

  const addToBlacklist = async (req, res) => {
    console.log('========================================');
    console.log('[TokenBlacklistController] addToBlacklist function called');
    console.log('[TokenBlacklistController] Request IP:', req.ip);
    console.log('[TokenBlacklistController] Request body:', JSON.stringify({
      ...req.body,
      token: req.body.token ? '[HIDDEN]' : undefined
    }, null, 2));
    
    try {
      const { token, tokenType = 'access', expiresAt } = req.body;
      console.log('[TokenBlacklistController] Adding token to blacklist:', {
        tokenType,
        expiresAt,
        hasToken: !!token
      });

      if (!token) {
        console.log('[TokenBlacklistController] ❌ Validation failed: Missing token');
        return res.status(400).json({
          success: false,
          message: 'Vui lòng cung cấp token',
        });
      }

      console.log('[TokenBlacklistController] 🚫 Adding token to blacklist...');
      const result = await tokenBlacklist.addToBlacklist(token, tokenType, expiresAt);
      console.log('[TokenBlacklistController] ✅✅✅ TOKEN ADDED TO BLACKLIST SUCCESSFULLY ✅✅✅');
      console.log('[TokenBlacklistController] Result ID:', result?.insertId || result?.id);
      console.log('========================================');

      return res.status(201).json({
        success: true,
        message: 'Thêm vào blacklist thành công',
        data: result,
      });
    } catch (error) {
      console.error('[TokenBlacklistController] ❌❌❌ ERROR IN addToBlacklist ❌❌❌');
      console.error('[TokenBlacklistController] Error message:', error.message);
      console.error('[TokenBlacklistController] Error stack:', error.stack);
      console.log('========================================');
      
      return res.status(400).json({
        success: false,
        message: 'Lỗi khi thêm vào blacklist',
        error: error.message,
      });
    }
  };

  const cleanupExpired = async (req, res) => {
    console.log('========================================');
    console.log('[TokenBlacklistController] cleanupExpired function called');
    console.log('[TokenBlacklistController] Request IP:', req.ip);
    
    try {
      console.log('[TokenBlacklistController] 🧹 Cleaning up expired tokens...');
      const result = await tokenBlacklist.cleanupExpiredTokens();
      console.log('[TokenBlacklistController] ✅✅✅ CLEANUP COMPLETED SUCCESSFULLY ✅✅✅');
      console.log('[TokenBlacklistController] Cleanup result:', result);
      console.log('========================================');

      return res.status(200).json({
        success: true,
        message: 'Dọn dẹp token hết hạn thành công',
      });
    } catch (error) {
      console.error('[TokenBlacklistController] ❌❌❌ ERROR IN cleanupExpired ❌❌❌');
      console.error('[TokenBlacklistController] Error message:', error.message);
      console.error('[TokenBlacklistController] Error stack:', error.stack);
      console.log('========================================');
      
      return res.status(500).json({
        success: false,
        message: 'Lỗi khi dọn dẹp',
        error: error.message,
      });
    }
  };

  return {
    ...baseController,
    checkToken,
    addToBlacklist,
    cleanupExpired,
  };
};

module.exports = createTokenBlacklistController();
