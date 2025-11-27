import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.js';
import { Spin, message } from 'antd';

/**
 * PrivateRoute - Protect routes that require authentication
 * STRICTLY enforce role-based access control
 * @param {React.ReactNode} children - The component to render if authorized
 * @param {number|number[]} allowedRoles - REQUIRED for role-based routes: role ID(s) that can access this route
 *                                        1 = Admin, 2 = Shipper, 3 = Customer
 *                                        If null, any authenticated user can access
 */
const PrivateRoute = ({ children, allowedRoles = null }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  // Logging for debugging
  console.log('[PrivateRoute] 🔒 Route protection check:', {
    path: location.pathname,
    allowedRoles,
    hasUser: !!user,
    userRoleId: user?.role_id || user?.roleId || 'N/A',
    loading,
  });

  if (loading) {
    console.log('[PrivateRoute] ⏳ Loading user data...');
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <Spin size="large" />
      </div>
    );
  }

  // STRICT: No user = open login modal and redirect to home
  if (!user) {
    console.log('[PrivateRoute] ❌ No user found, opening login modal');
    message.warning('Vui lòng đăng nhập để tiếp tục');
    // Dispatch event to open login modal
    window.dispatchEvent(new CustomEvent('openLoginModal', { detail: { tab: 'login', from: location.pathname } }));
    return <Navigate to="/" replace state={{ from: location }} />;
  }

  const userRoleId = user.role_id || user.roleId;
  console.log('[PrivateRoute] 👤 User role check:', {
    userRoleId,
    allowedRoles,
    roleName: userRoleId === 1 ? 'Admin' : userRoleId === 2 ? 'Shipper' : userRoleId === 3 ? 'Customer' : 'Unknown',
  });

  // STRICT: If allowedRoles is specified, user MUST have one of those roles
  if (allowedRoles !== null) {
    const allowedRolesArray = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
    const hasAccess = allowedRolesArray.includes(userRoleId);

    console.log('[PrivateRoute] 🔐 Role access check:', {
      userRoleId,
      allowedRoles: allowedRolesArray,
      hasAccess,
    });

    if (!hasAccess) {
      console.log('[PrivateRoute] 🚫 ACCESS DENIED - Role mismatch:', {
        userRoleId,
        requiredRoles: allowedRolesArray,
        currentPath: location.pathname,
      });
      
      message.error('Bạn không có quyền truy cập trang này. Vui lòng đăng nhập với tài khoản phù hợp.');
      
      // STRICT: Clear invalid session and open login modal
      // This ensures users must re-login with correct role
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
      
      // Dispatch event to open login modal
      window.dispatchEvent(new CustomEvent('openLoginModal', { 
        detail: { 
          tab: 'login', 
          from: location.pathname,
          message: 'Bạn không có quyền truy cập trang này. Vui lòng đăng nhập lại với tài khoản phù hợp.' 
        } 
      }));
      
      // Redirect to home
      return <Navigate to="/" replace state={{ 
        from: location,
        message: 'Bạn không có quyền truy cập trang này. Vui lòng đăng nhập lại với tài khoản phù hợp.' 
      }} />;
    }
  }

  console.log('[PrivateRoute] ✅ Access granted');
  return children;
};

export default PrivateRoute;

