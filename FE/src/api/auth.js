/**
 * Authentication API
 * Dựa trên routes: /api/auth
 */

import { apiCall, setTokens, clearTokens } from './config';

/**
 * Login
 * POST /api/auth/login
 */
export const login = async (credentials) => {
  const response = await apiCall('/auth/login', {
    method: 'POST',
    body: credentials,
  });

  if (response.success && response.data && response.data.token) {
    setTokens(response.data.token, response.data.refreshToken);
    return {
      success: true,
      user: response.data.user,
      token: response.data.token,
      refreshToken: response.data.refreshToken,
    };
  }

  return {
    success: false,
    message: response.message || 'Đăng nhập thất bại',
  };
};

/**
 * Register
 * POST /api/auth/register
 */
export const register = async (userData) => {
  console.log('[auth.js] 📤 Registering user...');
  const response = await apiCall('/auth/register', {
    method: 'POST',
    body: userData,
  });

  console.log('[auth.js] 📥 Raw response from backend:', {
    success: response.success,
    requiresEmailVerification: response.requiresEmailVerification,
    otpSent: response.otpSent,
    email: response.email,
    hasUser: !!(response.data?.user || response.user),
    hasToken: !!(response.data?.token),
  });

  // ⚠️ WORKFLOW OTP: Đăng ký KHÔNG tạo user ngay, chỉ gửi OTP
  // Backend sẽ trả về requiresEmailVerification: true và KHÔNG có user/token
  
  // ASSERTION: Nếu có token/user trong response, đó là lỗi workflow
  if (response.success && response.data && response.data.token) {
    console.error('[auth.js] ❌❌❌ ERROR: Registration response contains token! ❌❌❌');
    console.error('[auth.js] This should NOT happen in OTP workflow!');
    console.error('[auth.js] Response:', response);
    // Không set tokens, chỉ log error
  }
  
  if (response.success && (response.data?.user || response.user)) {
    console.error('[auth.js] ❌❌❌ ERROR: Registration response contains user! ❌❌❌');
    console.error('[auth.js] This should NOT happen in OTP workflow!');
    console.error('[auth.js] User should only be created after OTP verification!');
    // Không return user, chỉ log error
  }

  // Trường hợp đăng ký thành công nhưng cần xác thực email (WORKFLOW ĐÚNG)
  if (response.success && response.requiresEmailVerification) {
    // ASSERTION: Không được có user trong response
    const hasUser = !!(response.data?.user || response.user);
    if (hasUser) {
      console.error('[auth.js] ❌❌❌ CRITICAL: Response has user but requiresEmailVerification=true! ❌❌❌');
    }
    
    const result = {
      success: true,
      // Không trả về user data
      message: response.message || 'Đăng ký thành công. Vui lòng xác thực email.',
      requiresEmailVerification: true,
      otpSent: response.otpSent || false,
      email: response.email || response.data?.email,
    };
    
    console.log('[auth.js] ✅ Returning result:', result);
    return result;
  }

  // Fallback: Nếu không có requiresEmailVerification nhưng success = true
  if (response.success) {
    console.warn('[auth.js] ⚠️  Warning: success=true but requiresEmailVerification is missing or false');
    console.warn('[auth.js] Response:', response);
  }

  const fallbackResult = {
    success: response.success || false,
    message: response.message || response.error || 'Đăng ký thất bại',
    error: response.error,
    requiresEmailVerification: response.requiresEmailVerification || false,
    otpSent: response.otpSent || false,
    email: response.email || response.data?.email,
  };
  
  console.log('[auth.js] 📤 Returning fallback result:', fallbackResult);
  return fallbackResult;
};

/**
 * Refresh Token
 * POST /api/auth/refresh-token
 */
export const refreshToken = async (refreshTokenValue) => {
  const response = await apiCall('/auth/refresh-token', {
    method: 'POST',
    body: { refreshToken: refreshTokenValue },
  });

  if (response.success && response.data.token) {
    setTokens(response.data.token, response.data.refreshToken);
  }

  return response.data;
};

/**
 * Logout
 * POST /api/auth/logout
 */
export const logout = async () => {
  try {
    const refreshTokenValue = localStorage.getItem('refreshToken');
    await apiCall('/auth/logout', {
      method: 'POST',
      body: { refreshToken: refreshTokenValue },
    });
  } catch (error) {
    console.error('Logout error:', error);
  } finally {
    clearTokens();
  }
};

// Admin only functions - Token Blacklist Management
/**
 * Check if token is blacklisted (Admin only)
 * POST /api/auth/token/check
 */
export const checkToken = (token) =>
  apiCall('/auth/token/check', {
    method: 'POST',
    body: { token },
  });

/**
 * Add token to blacklist (Admin only)
 * POST /api/auth/token/blacklist
 */
export const addTokenToBlacklist = (tokenData) =>
  apiCall('/auth/token/blacklist', {
    method: 'POST',
    body: tokenData,
  });

/**
 * Cleanup expired tokens (Admin only)
 * POST /api/auth/token/cleanup
 */
export const cleanupExpiredTokens = () =>
  apiCall('/auth/token/cleanup', {
    method: 'POST',
  });

/**
 * Get all blacklisted tokens (Admin only)
 * GET /api/auth/tokens
 */
export const getBlacklistedTokens = (page = 1, limit = 10) => {
  const params = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
  });
  return apiCall(`/auth/tokens?${params}`);
};

/**
 * Get blacklisted token by ID (Admin only)
 * GET /api/auth/tokens/:id
 */
export const getBlacklistedTokenById = (id) => apiCall(`/auth/tokens/${id}`);

/**
 * Delete blacklisted token (Admin only)
 * DELETE /api/auth/tokens/:id
 */
export const deleteBlacklistedToken = (id) =>
  apiCall(`/auth/tokens/${id}`, {
    method: 'DELETE',
  });

/**
 * Send OTP to email
 * POST /api/auth/send-otp
 */
export const sendOTP = async (email, purpose = 'email_verification') => {
  const response = await apiCall('/auth/send-otp', {
    method: 'POST',
    body: { email, purpose },
  });

  return {
    success: response.success || false,
    message: response.message || 'Có lỗi xảy ra khi gửi mã OTP',
  };
};

/**
 * Verify OTP
 * POST /api/auth/verify-otp
 */
export const verifyOTP = async (email, otp, purpose = 'email_verification') => {
  const response = await apiCall('/auth/verify-otp', {
    method: 'POST',
    body: { email, otp, purpose },
  });

  return {
    success: response.success || false,
    message: response.message || 'Có lỗi xảy ra khi xác thực OTP',
    data: response.data,
  };
};

/**
 * Forgot Password - Send OTP
 * POST /api/auth/forgot-password
 */
export const forgotPassword = async (email) => {
  const response = await apiCall('/auth/forgot-password', {
    method: 'POST',
    body: { email },
  });

  return {
    success: response.success || false,
    message: response.message || 'Có lỗi xảy ra khi gửi mã OTP',
    email: response.email,
  };
};

/**
 * Verify Forgot Password OTP
 * POST /api/auth/verify-forgot-password-otp
 */
export const verifyForgotPasswordOTP = async (email, otp) => {
  const response = await apiCall('/auth/verify-forgot-password-otp', {
    method: 'POST',
    body: { email, otp },
  });

  return {
    success: response.success || false,
    message: response.message || 'Có lỗi xảy ra khi xác thực OTP',
    data: response.data,
  };
};

/**
 * Reset Password
 * POST /api/auth/reset-password
 */
export const resetPassword = async (email, otp, newPassword) => {
  const response = await apiCall('/auth/reset-password', {
    method: 'POST',
    body: { email, otp, newPassword },
  });

  return {
    success: response.success || false,
    message: response.message || 'Có lỗi xảy ra khi đặt lại mật khẩu',
    errors: response.errors,
  };
};

export default {
  login,
  register,
  refreshToken,
  logout,
  sendOTP,
  verifyOTP,
  forgotPassword,
  verifyForgotPasswordOTP,
  resetPassword,
  checkToken,
  addTokenToBlacklist,
  cleanupExpiredTokens,
  getBlacklistedTokens,
  getBlacklistedTokenById,
  deleteBlacklistedToken,
};

