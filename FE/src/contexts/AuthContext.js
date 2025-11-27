import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { auth, user } from '../api/index.js';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [userState, setUserState] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      if (token) {
        const response = await user.getCurrentUser();
        if (response.success) {
          setUserState(response.data);
        }
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
    } finally {
      setLoading(false);
    }
  }, []);

  const login = useCallback(async (credentials) => {
    try {
      const response = await auth.login(credentials);
      if (response.success && response.user) {
        setUserState(response.user);
        return { 
          success: true, 
          user: response.user,
          roleId: response.user.role_id || response.user.roleId,
        };
      }
      return { success: false, message: response.message || 'Đăng nhập thất bại' };
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, message: error.message || 'Có lỗi xảy ra khi đăng nhập' };
    }
  }, []);

  const register = useCallback(async (userData) => {
    try {
      const response = await auth.register(userData);
      
      // ⚠️ WORKFLOW MỚI: Không tạo user ngay, chỉ trả về thông tin cần verify email
      // Không set user state vì user chưa được tạo
      
      // ASSERTION: Không được có user trong response
      if (response.user || response.data?.user) {
        console.error('[AuthContext] ❌❌❌ CRITICAL ERROR: Registration response contains user! ❌❌❌');
        console.error('[AuthContext] User should NOT be created during registration!');
        console.error('[AuthContext] User data:', response.user || response.data?.user);
        // Không return user, chỉ log error
      }
      
      if (response.success) {
        // ASSERTION: Phải có requiresEmailVerification
        if (!response.requiresEmailVerification) {
          console.warn('[AuthContext] ⚠️  Warning: requiresEmailVerification is false');
        }
        
        // Trả về response (KHÔNG có user data)
        const result = {
          success: true,
          message: response.message || 'Đăng ký thành công',
          requiresEmailVerification: response.requiresEmailVerification || false,
          otpSent: response.otpSent || false,
          email: response.email,
        };
        
        // Đảm bảo không có user trong result
        if (result.user || result.data?.user) {
          delete result.user;
          delete result.data;
        }
        
        return result;
      }
      
      return { 
        success: false, 
        message: response.message || response.error || 'Đăng ký thất bại',
        requiresEmailVerification: response.requiresEmailVerification || false,
        otpSent: response.otpSent || false,
      };
    } catch (error) {
      console.error('Registration error:', error);
      return { 
        success: false, 
        message: error.message || error.response?.data?.message || 'Có lỗi xảy ra khi đăng ký',
        requiresEmailVerification: false,
        otpSent: false,
      };
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await auth.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setUserState(null);
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
    }
  }, []);

  const value = useMemo(() => ({
    user: userState,
    loading,
    login,
    register,
    logout,
    checkAuth,
  }), [userState, loading, login, register, logout, checkAuth]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
