import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Layout, Menu, Button, Avatar, Dropdown, Spin, message } from 'antd';
import {
  DashboardOutlined,
  ShoppingOutlined,
  FolderOutlined,
  ShoppingCartOutlined,
  UserOutlined,
  BarChartOutlined,
  LogoutOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  BankOutlined,
  LineChartOutlined,
  ShopOutlined,
} from '@ant-design/icons';
import { useAuth } from '../contexts/AuthContext.js';
import './AdminLayout.scss';

const { Header, Sider, Content } = Layout;

const AdminLayout = () => {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout, loading } = useAuth();

  // Role-based protection: Only allow admin (role_id = 1)
  // This is a secondary check (primary check is in PrivateRoute)
  useEffect(() => {
    if (!loading) {
      if (!user) {
        message.warning('Vui lòng đăng nhập để tiếp tục');
        navigate('/');
        return;
      }

      const roleId = user.role_id || user.roleId;
      if (roleId !== 1) {
        message.error('Bạn không có quyền truy cập trang này');
        // Redirect based on role
        if (roleId === 2) {
          navigate('/shipper/dashboard');
        } else {
          navigate('/');
        }
      }
    }
  }, [user, loading, navigate]);

  const menuItems = [
    {
      key: '/admin/dashboard',
      icon: React.createElement(DashboardOutlined),
      label: 'Dashboard',
    },
    {
      key: '/admin/products',
      icon: React.createElement(ShoppingOutlined),
      label: 'Sản Phẩm',
    },
    {
      key: '/admin/categories',
      icon: React.createElement(FolderOutlined),
      label: 'Danh Mục',
    },
    {
      key: '/admin/orders',
      icon: React.createElement(ShoppingCartOutlined),
      label: 'Đơn Hàng',
    },
    {
      key: '/admin/carts',
      icon: React.createElement(ShopOutlined),
      label: 'Giỏ Hàng',
    },
    {
      key: '/admin/users',
      icon: React.createElement(UserOutlined),
      label: 'Người Dùng',
    },
    {
      key: '/admin/bank',
      icon: React.createElement(BankOutlined),
      label: 'Ngân Hàng',
    },
    {
      key: '/admin/statistics',
      icon: React.createElement(LineChartOutlined),
      label: 'Thống Kê',
    },
    {
      key: '/admin/warehouse',
      icon: React.createElement(BarChartOutlined),
      label: 'Quản Lý Kho',
    },
  ];

  const handleMenuClick = ({ key }) => {
    navigate(key);
  };

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const userMenuItems = [
    {
      key: 'profile',
      label: 'Thông Tin Cá Nhân',
      icon: React.createElement(UserOutlined),
    },
    {
      type: 'divider',
    },
    {
      key: 'logout',
      label: 'Đăng Xuất',
      icon: React.createElement(LogoutOutlined),
      danger: true,
      onClick: handleLogout,
    },
  ];

  // Show loading spinner while checking auth
  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <Spin size="large" />
      </div>
    );
  }

  // Don't render if user is not admin
  const roleId = user?.role_id || user?.roleId;
  if (!user || roleId !== 1) {
    return null;
  }

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider
        trigger={null}
        collapsible
        collapsed={collapsed}
        width={250}
        style={{
          overflow: 'auto',
          height: '100vh',
          position: 'fixed',
          left: 0,
          top: 0,
          bottom: 0,
        }}
      >
        <div className="admin-logo" style={{ padding: '16px', textAlign: 'center', color: '#fff', fontSize: '18px', fontWeight: 'bold' }}>
          {collapsed ? 'AC' : 'Admin Panel'}
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[location.pathname]}
          items={menuItems}
          onClick={handleMenuClick}
        />
      </Sider>
      <Layout style={{ marginLeft: collapsed ? 80 : 250, transition: 'margin-left 0.2s' }}>
        <Header
          style={{
            padding: '0 24px',
            background: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          }}
        >
          <Button
            type="text"
            icon={collapsed ? React.createElement(MenuUnfoldOutlined) : React.createElement(MenuFoldOutlined)}
            onClick={() => setCollapsed(!collapsed)}
            style={{ fontSize: '16px', width: 64, height: 64 }}
          />
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <Avatar icon={React.createElement(UserOutlined)} />
                <span>{user?.username || 'Admin'}</span>
              </div>
            </Dropdown>
          </div>
        </Header>
        <Content
          style={{
            margin: '24px 16px',
            padding: 24,
            minHeight: 280,
            background: '#fff',
            borderRadius: '8px',
          }}
        >
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
};

export default AdminLayout;
