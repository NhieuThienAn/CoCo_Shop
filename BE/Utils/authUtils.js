const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const jwtConfig = require('../Config/jwtConfig');
const hashPassword = async (password) => {
  const saltRounds = 10;
  return await bcrypt.hash(password, saltRounds);
};
const verifyPassword = async (password, hash) => {
  return await bcrypt.compare(password, hash);
};
const generateToken = (payload) => {
  return jwt.sign(payload, jwtConfig.jwtSecret, {
    expiresIn: jwtConfig.jwtExpiresIn,
    issuer: jwtConfig.issuer,
    audience: jwtConfig.audience,
  });
};
const generateRefreshToken = (payload) => {
  return jwt.sign(payload, jwtConfig.jwtRefreshSecret, {
    expiresIn: jwtConfig.jwtRefreshExpiresIn,
    issuer: jwtConfig.issuer,
    audience: jwtConfig.audience,
  });
};
const verifyToken = (token) => {
  try {
    return jwt.verify(token, jwtConfig.jwtSecret, {
      issuer: jwtConfig.issuer,
      audience: jwtConfig.audience,
    });
  } catch (error) {
    return null;
  }
};
const verifyRefreshToken = (token) => {
  try {
    return jwt.verify(token, jwtConfig.jwtRefreshSecret, {
      issuer: jwtConfig.issuer,
      audience: jwtConfig.audience,
    });
  } catch (error) {
    return null;
  }
};
const decodeToken = (token) => {
  return jwt.decode(token);
};

/**
 * Validate password strength
 * @param {string} password - Password to validate
 * @returns {Object} - { valid: boolean, errors: string[] }
 */
const validatePassword = (password) => {
  const errors = [];
  
  if (!password || typeof password !== 'string') {
    return { valid: false, errors: ['Mật khẩu không được để trống'] };
  }
  
  // Minimum length
  if (password.length < 8) {
    errors.push('Mật khẩu phải có ít nhất 8 ký tự');
  }
  
  // Maximum length
  if (password.length > 128) {
    errors.push('Mật khẩu không được vượt quá 128 ký tự');
  }
  
  // At least one uppercase letter
  if (!/[A-Z]/.test(password)) {
    errors.push('Mật khẩu phải có ít nhất một chữ cái viết hoa');
  }
  
  // At least one lowercase letter
  if (!/[a-z]/.test(password)) {
    errors.push('Mật khẩu phải có ít nhất một chữ cái viết thường');
  }
  
  // At least one number
  if (!/[0-9]/.test(password)) {
    errors.push('Mật khẩu phải có ít nhất một chữ số');
  }
  
  // At least one special character
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push('Mật khẩu phải có ít nhất một ký tự đặc biệt');
  }
  
  return {
    valid: errors.length === 0,
    errors: errors.length > 0 ? errors : []
  };
};

module.exports = {
  hashPassword,
  verifyPassword,
  generateToken,
  generateRefreshToken,
  verifyToken,
  verifyRefreshToken,
  decodeToken,
  validatePassword,
};
