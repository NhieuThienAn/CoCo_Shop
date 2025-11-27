/**
 * Authentication Middleware
 * Verify JWT token and attach user info to request
 */
const { verifyToken } = require('../Utils/authUtils');
const { logger } = require('./errorHandler');

/**
 * Middleware to verify JWT token
 */
const authenticate = (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      return res.status(401).json({
        success: false,
        message: 'Không tìm thấy token. Vui lòng đăng nhập.',
      });
    }

    // Extract token from "Bearer <token>"
    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      return res.status(401).json({
        success: false,
        message: 'Token không hợp lệ. Format: Bearer <token>',
      });
    }

    const token = parts[1];

    // Verify token
    const decoded = verifyToken(token);
    
    if (!decoded) {
      logger.warn(`Invalid token attempt from IP ${req.ip}`);
      return res.status(401).json({
        success: false,
        message: 'Token không hợp lệ hoặc đã hết hạn. Vui lòng đăng nhập lại.',
      });
    }

    // Attach user info to request
    req.user = {
      userId: decoded.userId,
      username: decoded.username,
      email: decoded.email,
      roleId: decoded.roleId,
    };

    next();
  } catch (error) {
    logger.error(`Authentication middleware error: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Lỗi xác thực. Vui lòng thử lại.',
    });
  }
};

/**
 * Optional authentication - doesn't fail if no token
 */
const optionalAuthenticate = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (authHeader) {
      const parts = authHeader.split(' ');
      if (parts.length === 2 && parts[0] === 'Bearer') {
        const token = parts[1];
        const decoded = verifyToken(token);
        
        if (decoded) {
          req.user = {
            userId: decoded.userId,
            username: decoded.username,
            email: decoded.email,
            roleId: decoded.roleId,
          };
        }
      }
    }
    
    next();
  } catch (error) {
    // Continue even if optional auth fails
    next();
  }
};

/**
 * Middleware to check if user has required role
 * STRICTLY enforces role-based access control
 * Supports: authorize(1), authorize(1, 2), authorize([1, 2])
 */
const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    // Flatten array if passed as single array argument
    const roles = allowedRoles.length === 1 && Array.isArray(allowedRoles[0]) 
      ? allowedRoles[0] 
      : allowedRoles;
    
    console.log('[AuthMiddleware] 🔐 authorize() called:', {
      path: req.path,
      method: req.method,
      allowedRoles: roles,
      hasUser: !!req.user,
      userRoleId: req.user?.roleId || 'N/A',
    });

    if (!req.user) {
      console.log('[AuthMiddleware] ❌ No user in request, authentication required');
      logger.warn(`Unauthorized access attempt: No user found for ${req.method} ${req.path} from IP ${req.ip}`);
      return res.status(401).json({
        success: false,
        message: 'Vui lòng đăng nhập để tiếp tục.',
      });
    }

    const userRoleId = req.user.roleId;
    const roleName = userRoleId === 1 ? 'Admin' : userRoleId === 2 ? 'Shipper' : userRoleId === 3 ? 'Customer' : 'Unknown';
    
    console.log('[AuthMiddleware] 👤 User role check:', {
      userId: req.user.userId,
      username: req.user.username,
      userRoleId,
      roleName,
      allowedRoles: roles,
      hasAccess: roles.includes(userRoleId),
    });

    if (!roles.includes(userRoleId)) {
      console.log('[AuthMiddleware] 🚫 ACCESS DENIED - Role mismatch:', {
        userRoleId,
        roleName,
        requiredRoles: allowedRoles,
        path: req.path,
        method: req.method,
      });
      
      logger.warn(`Unauthorized access attempt: User ${req.user.userId} (Role: ${userRoleId} - ${roleName}) tried to access ${req.method} ${req.path} requiring roles: ${roles.join(', ')} from IP ${req.ip}`);
      
      return res.status(403).json({
        success: false,
        message: `Bạn không có quyền truy cập tài nguyên này. Yêu cầu vai trò: ${roles.map(r => r === 1 ? 'Admin' : r === 2 ? 'Shipper' : 'Customer').join(', ')}. Vai trò hiện tại: ${roleName}.`,
      });
    }

    console.log('[AuthMiddleware] ✅ Access granted');
    next();
  };
};

module.exports = {
  authenticate,
  optionalAuthenticate,
  authorize,
};

