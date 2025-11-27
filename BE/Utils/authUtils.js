/**
 * Authentication Utilities
 */
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const jwtConfig = require('../Config/jwtConfig');

/**
 * Hash password
 */
const hashPassword = async (password) => {
  const saltRounds = 10;
  return await bcrypt.hash(password, saltRounds);
};

/**
 * Verify password
 */
const verifyPassword = async (password, hash) => {
  return await bcrypt.compare(password, hash);
};

/**
 * Generate JWT token
 */
const generateToken = (payload) => {
  return jwt.sign(payload, jwtConfig.jwtSecret, {
    expiresIn: jwtConfig.jwtExpiresIn,
    issuer: jwtConfig.issuer,
    audience: jwtConfig.audience,
  });
};

/**
 * Generate refresh token
 */
const generateRefreshToken = (payload) => {
  return jwt.sign(payload, jwtConfig.jwtRefreshSecret, {
    expiresIn: jwtConfig.jwtRefreshExpiresIn,
    issuer: jwtConfig.issuer,
    audience: jwtConfig.audience,
  });
};

/**
 * Verify JWT token
 * Note: expiresIn is not needed in verify, it's automatically checked
 */
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

/**
 * Verify refresh token
 * Note: expiresIn is not needed in verify, it's automatically checked
 */
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

/**
 * Decode token without verification (for debugging)
 */
const decodeToken = (token) => {
  return jwt.decode(token);
};

module.exports = {
  hashPassword,
  verifyPassword,
  generateToken,
  generateRefreshToken,
  verifyToken,
  verifyRefreshToken,
  decodeToken,
};

