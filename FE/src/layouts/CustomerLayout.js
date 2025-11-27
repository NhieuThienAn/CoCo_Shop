import React, { useState, useEffect, useCallback } from 'react';
import { Outlet, useNavigate, Link, useLocation, useSearchParams } from 'react-router-dom';
import {
  Layout,
  Menu,
  Badge,
  Avatar,
  Dropdown,
  Button,
  Drawer,
  Input,
  Space,
  Typography,
  Divider,
  message,
} from 'antd';
import {
  HomeOutlined,
  ShoppingOutlined,
  ShoppingCartOutlined,
  HeartOutlined,
  UserOutlined,
  LoginOutlined,
  LogoutOutlined,
  MenuOutlined,
  SearchOutlined,
  UserAddOutlined,
  GiftOutlined,
  FileTextOutlined,
} from '@ant-design/icons';
import { useAuth } from '../contexts/AuthContext.js';
import { cart, wishlist, category } from '../api/index.js';
import LoginModal from '../components/LoginModal.js';
import RegisterOTPModal from '../components/RegisterOTPModal.js';
import './CustomerLayout.scss';

const { Header, Content, Footer } = Layout;
const { Search } = Input;
const { Text } = Typography;

const CustomerLayout = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const [loginModalTab, setLoginModalTab] = useState('login');
  const [registerOTPModalOpen, setRegisterOTPModalOpen] = useState(false);
  const [registerOTPModalEmail, setRegisterOTPModalEmail] = useState('');

  // Listen for open login modal events from other components
  useEffect(() => {
    const handleOpenLoginModal = (event) => {
      const tab = event.detail?.tab || 'login';
      if (tab === 'register') {
        // Open RegisterOTPModal instead of LoginModal for registration
        setRegisterOTPModalEmail('');
        setRegisterOTPModalOpen(true);
      } else {
        setLoginModalTab(tab);
        setLoginModalOpen(true);
      }
    };

    const handleOpenRegisterOTPModal = (event) => {
      const email = event.detail?.email || '';
      setRegisterOTPModalEmail(email);
      setRegisterOTPModalOpen(true);
    };

    window.addEventListener('openLoginModal', handleOpenLoginModal);
    window.addEventListener('openRegisterOTPModal', handleOpenRegisterOTPModal);
    return () => {
      window.removeEventListener('openLoginModal', handleOpenLoginModal);
      window.removeEventListener('openRegisterOTPModal', handleOpenRegisterOTPModal);
    };
  }, []);
  const [cartCount, setCartCount] = useState(0);
  const [wishlistCount, setWishlistCount] = useState(0);
  const [categories, setCategories] = useState([]);
  const [searchValue, setSearchValue] = useState('');
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    if (user) {
      loadCartCount();
      loadWishlistCount();
    } else {
      setCartCount(0);
      setWishlistCount(0);
    }
    loadCategories();
  }, [user, location.pathname]);

  // Refresh cart count when login modal closes (in case user just logged in)
  useEffect(() => {
    if (!loginModalOpen && user) {
      loadCartCount();
      loadWishlistCount();
    }
  }, [loginModalOpen, user]);

  const loadCartCount = useCallback(async () => {
    try {
      const response = await cart.getCart();
      if (response.success && response.data) {
        const items = response.data.items || [];
        const count = items.reduce((sum, item) => sum + (item.quantity || 0), 0);
        setCartCount(count);
      }
    } catch (error) {
      setCartCount(0);
    }
  }, []);

  // Listen for cart update events from other components
  useEffect(() => {
    const handleCartUpdate = () => {
      if (user) {
        loadCartCount();
      }
    };

    window.addEventListener('cartUpdated', handleCartUpdate);
    return () => {
      window.removeEventListener('cartUpdated', handleCartUpdate);
    };
  }, [user, loadCartCount]);

  const loadWishlistCount = async () => {
    try {
      const response = await wishlist.getWishlist();
      if (response.success && response.data) {
        const items = response.data.items || [];
        setWishlistCount(items.length);
      }
    } catch (error) {
      setWishlistCount(0);
    }
  };

  const loadCategories = async () => {
    try {
      const response = await category.getCategoryTree();
      if (response.success) {
        setCategories(response.data || []);
      }
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/');
    setCartCount(0);
    setWishlistCount(0);
  };

  const handleSearch = (value) => {
    if (value.trim()) {
      navigate(`/products?search=${encodeURIComponent(value.trim())}`);
      setSearchOpen(false);
      setSearchValue('');
    }
  };

  const mainMenuItems = [
    {
      key: 'products',
      label: <Link to="/products">Sản phẩm</Link>,
    },
    {
      key: 'promotions',
      label: <Link to="/promotions">Khuyến mãi</Link>,
    },
    {
      key: 'blog',
      label: <Link to="/blog">Bài viết</Link>,
    },
  ];

  const userMenuItems = user
    ? [
        {
          key: 'profile',
          icon: <UserOutlined />,
          label: <Link to="/profile">Tài Khoản</Link>,
        },
        {
          key: 'orders',
          icon: <ShoppingCartOutlined />,
          label: <Link to="/orders">Đơn Hàng</Link>,
        },
        {
          key: 'wishlist',
          icon: <HeartOutlined />,
          label: (
            <Link to="/wishlist">
              Yêu Thích {wishlistCount > 0 && <Badge count={wishlistCount} size="small" />}
            </Link>
          ),
        },
        {
          type: 'divider',
        },
        {
          key: 'logout',
          icon: <LogoutOutlined />,
          label: 'Đăng Xuất',
          danger: true,
          onClick: handleLogout,
        },
      ]
    : [];

  const handleOpenLoginModal = (tab = 'login') => {
    if (tab === 'register') {
      // Open RegisterOTPModal instead of LoginModal for registration
      setRegisterOTPModalEmail('');
      setRegisterOTPModalOpen(true);
    } else {
      setLoginModalTab(tab);
      setLoginModalOpen(true);
    }
  };

  const handleCloseLoginModal = () => {
    setLoginModalOpen(false);
  };

  const handleCloseRegisterOTPModal = () => {
    setRegisterOTPModalOpen(false);
  };

  const handleRegisterOTPSuccess = () => {
    // After successful registration and OTP verification, open login modal
    setRegisterOTPModalOpen(false);
    setTimeout(() => {
      setLoginModalTab('login');
      setLoginModalOpen(true);
      message.success('Đăng ký thành công! Vui lòng đăng nhập để tiếp tục.');
    }, 500);
  };

  return (
    <Layout className="customer-layout">
      {/* Top Banner - Free Shipping */}
      <div className="top-banner">
        <Text style={{ color: '#fff', fontSize: 12, letterSpacing: '0.5px' }}>
          Tận hưởng giao hàng miễn phí toàn quốc với hoá đơn từ 99.000 đ
        </Text>
      </div>

      <Header className="customer-header">
        <div className="header-container">
          {/* Logo */}
          <Link to="/" className="logo">
            <Text strong style={{ fontSize: 24, color: '#000', letterSpacing: 2, fontWeight: 500 }}>
              coco
            </Text>
          </Link>

          {/* Main Navigation Menu */}
          <Menu
            mode="horizontal"
            items={mainMenuItems}
            selectedKeys={[]}
            className="main-menu"
            style={{ border: 'none', flex: 1, justifyContent: 'center' }}
          />

          {/* Right Actions */}
          <Space size="middle" className="header-actions">
            {/* Search Button */}
            <Button
              type="text"
              icon={<SearchOutlined />}
              size="large"
              onClick={() => setSearchOpen(true)}
              style={{ fontSize: '18px' }}
            />

            {/* Cart */}
            <Link to="/cart">
              <Badge count={cartCount} showZero={false} offset={[-2, 2]}>
                <Button 
                  type="text" 
                  icon={<ShoppingCartOutlined />} 
                  size="large"
                  style={{ fontSize: '18px' }}
                />
              </Badge>
            </Link>

            {/* Wishlist */}
            {user && (
              <Link to="/wishlist">
                <Badge count={wishlistCount} showZero={false} offset={[-2, 2]}>
                  <Button 
                    type="text" 
                    icon={<HeartOutlined />} 
                    size="large"
                    style={{ fontSize: '18px' }}
                  />
                </Badge>
              </Link>
            )}

            {/* User Menu */}
            {user ? (
              <Dropdown menu={{ items: userMenuItems }} placement="bottomRight" trigger={['click']}>
                <Button 
                  type="text" 
                  icon={<UserOutlined />}
                  size="large"
                  style={{ fontSize: '18px', padding: '0 8px' }}
                />
              </Dropdown>
            ) : (
              <Space size="small">
                <Button 
                  type="text" 
                  onClick={() => handleOpenLoginModal('login')}
                  style={{ fontSize: '14px', padding: '0 12px' }}
                >
                  Đăng Nhập
                </Button>
                <Button 
                  type="default" 
                  onClick={() => handleOpenLoginModal('register')}
                  style={{ fontSize: '14px', padding: '0 12px' }}
                >
                  Đăng Ký
                </Button>
              </Space>
            )}

            {/* Mobile Menu Button */}
            <Button
              type="text"
              icon={<MenuOutlined />}
              onClick={() => setMobileMenuOpen(true)}
              className="mobile-menu-btn"
              style={{ fontSize: '18px' }}
            />
          </Space>
        </div>
      </Header>

      {/* Search Drawer */}
      <Drawer
        title="Tìm kiếm"
        placement="top"
        onClose={() => {
          setSearchOpen(false);
          setSearchValue('');
        }}
        open={searchOpen}
        height={120}
        styles={{ body: { padding: '24px' } }}
      >
        <Search
          placeholder="Nhập từ khóa bạn muốn tìm kiếm"
          allowClear
          enterButton={<SearchOutlined />}
          size="large"
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          onSearch={handleSearch}
          autoFocus
        />
      </Drawer>

      <Content className="customer-content">
        <Outlet />
      </Content>

      <Footer className="customer-footer">
        <div className="footer-content">
          <div className="footer-section">
            <Text strong className="footer-section-title">
              Đặt hàng & Hỗ trợ
            </Text>
            <Space direction="vertical" size="small" className="footer-links">
              <Link to="#" className="footer-link">Hỏi đáp</Link>
              <Link to="#" className="footer-link">Hướng dẫn mua hàng</Link>
              <Link to="#" className="footer-link">Chính sách bán hàng</Link>
              <Link to="#" className="footer-link">Điều khoản bảo mật</Link>
              <Link to="#" className="footer-link">Điều kiện chung</Link>
              <Link to="#" className="footer-link">Liên hệ chúng tôi</Link>
            </Space>
          </div>
          <div className="footer-section">
            <Text strong className="footer-section-title">
              Shop
            </Text>
            <Space direction="vertical" size="small" className="footer-links">
              <Link to="/products?sort=new" className="footer-link">Sản Phẩm Mới</Link>
              <Link to="/products?category=skincare" className="footer-link">Dưỡng Da</Link>
              <Link to="/products?category=cleanser" className="footer-link">Sữa Rửa Mặt</Link>
              <Link to="/products?category=toner" className="footer-link">Toner / Nước Hoa Hồng</Link>
              <Link to="/products?category=serum" className="footer-link">Serum / Tinh Chất</Link>
              <Link to="/products?category=moisturizer" className="footer-link">Kem Dưỡng Ẩm</Link>
              <Link to="/products?category=sunscreen" className="footer-link">Kem Chống Nắng</Link>
              <Link to="/products?category=mask" className="footer-link">Mặt Nạ</Link>
            </Space>
          </div>
          <div className="footer-section">
            <Text strong className="footer-section-title">
              Về coco
            </Text>
            <Space direction="vertical" size="small" className="footer-links">
              <Link to="#" className="footer-link">Câu chuyện thương hiệu</Link>
              <Link to="#" className="footer-link">Giá trị cốt lõi</Link>
              <Link to="#" className="footer-link">Trách nhiệm cộng đồng</Link>
              <Link to="#" className="footer-link">Tìm hiểu nguyên liệu</Link>
            </Space>
          </div>
          <div className="footer-section">
            <Text strong className="footer-section-title">
              Mạng xã hội
            </Text>
            <Space direction="vertical" size="small" className="footer-links">
              <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" className="footer-link">
                Facebook
              </a>
              <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" className="footer-link">
                Instagram
              </a>
              <a href="https://youtube.com" target="_blank" rel="noopener noreferrer" className="footer-link">
                Youtube
              </a>
            </Space>
          </div>
        </div>
        <Divider style={{ borderColor: 'rgba(255,255,255,0.1)', margin: '32px 0' }} />
        <div className="footer-bottom">
          <div className="footer-company-info">
            <Text className="footer-company-title">
              WEBSITE THUỘC QUYỀN CÔNG TY CỔ PHẦN Y&B
            </Text>
            <Text className="footer-company-details">
              GCNĐKKD: 0315803699 | PHÒNG ĐĂNG KÝ KINH DOANH - SỞ TÀI CHÍNH THÀNH PHỐ HỒ CHÍ MINH CẤP LẦN THỨ 2 NGÀY 25/09/2025.
            </Text>
            <Text className="footer-company-details">
              14D1, KHU PHỐ 1A, ĐƯỜNG QUỐC LỘ 1A, PHƯỜNG TÂN THỚI HIỆP, TP. HỒ CHÍ MINH, VIỆT NAM
            </Text>
            <Text className="footer-company-details">
              ĐIỆN THOẠI: 19009300 – EMAIL: WE@cocoVIETNAM.COM
            </Text>
          </div>
          <div className="footer-company-info" style={{ marginTop: '24px' }}>
            <Text className="footer-company-title">
              SẢN XUẤT VÀ CHỊU TRÁCH NHIỆM VỀ HÀNG HOÁ
            </Text>
            <Text className="footer-company-title" style={{ marginTop: '8px' }}>
              CÔNG TY TNHH NATURE STORY
            </Text>
            <Text className="footer-company-details">
              GCNĐKKD: 1101983767 | PHÒNG ĐĂNG KÝ KINH DOANH - SỞ TÀI CHÍNH TỈNH TÂY NINH CẤP LẦN THỨ 4 NGÀY 15/09/2025.
            </Text>
            <Text className="footer-company-details">
              LÔ LF24A-LF25 ĐƯỜNG SỐ 2, KHU CÔNG NGHIỆP XUYÊN Á, XÃ ĐỨC LẬP, TỈNH TÂY NINH, VIỆT NAM
            </Text>
            <Text className="footer-company-details">
              ĐIỆN THOẠI: 19009300 – EMAIL: WE@cocoVIETNAM.COM
            </Text>
          </div>
          <Divider style={{ borderColor: 'rgba(255,255,255,0.1)', margin: '24px 0' }} />
          <div className="footer-copyright">
            <Text className="footer-copyright-text">
              © 2025 coco Vietnam. All rights reserved.
            </Text>
            <Link to="#" className="footer-link" style={{ marginLeft: '16px' }}>
              Liên hệ
            </Link>
          </div>
        </div>
      </Footer>

      {/* Mobile Drawer */}
      <Drawer
        title="Menu"
        placement="right"
        onClose={() => setMobileMenuOpen(false)}
        open={mobileMenuOpen}
        width={280}
      >
        <Menu
          mode="vertical"
          items={[
            {
              key: '/',
              icon: <HomeOutlined />,
              label: <Link to="/">Trang Chủ</Link>,
            },
            {
              key: 'products',
              icon: <ShoppingOutlined />,
              label: <Link to="/products">Sản phẩm</Link>,
            },
            {
              key: 'promotions',
              label: <Link to="/promotions">Khuyến mãi</Link>,
            },
            {
              key: 'blog',
              label: <Link to="/blog">Bài viết</Link>,
            },
          ]}
          selectedKeys={[location.pathname]}
          style={{ border: 'none' }}
        />
        <Divider />
        {user && (
          <>
            <Menu
              mode="vertical"
              items={[
                {
                  key: 'profile',
                  icon: <UserOutlined />,
                  label: <Link to="/profile">Tài Khoản</Link>,
                },
                {
                  key: 'orders',
                  icon: <ShoppingCartOutlined />,
                  label: <Link to="/orders">Đơn Hàng</Link>,
                },
                {
                  key: 'wishlist',
                  icon: <HeartOutlined />,
                  label: (
                    <Link to="/wishlist">
                      Yêu Thích {wishlistCount > 0 && <Badge count={wishlistCount} size="small" />}
                    </Link>
                  ),
                },
              ]}
              style={{ border: 'none' }}
            />
            <Divider />
            <Button
              type="text"
              danger
              icon={<LogoutOutlined />}
              onClick={handleLogout}
              block
              style={{ textAlign: 'left' }}
            >
              Đăng Xuất
            </Button>
          </>
        )}
        {!user && (
          <>
            <Button 
              type="primary" 
              block 
              icon={<LoginOutlined />}
              onClick={() => {
                setMobileMenuOpen(false);
                handleOpenLoginModal('login');
              }}
            >
              Đăng Nhập
            </Button>
            <div style={{ marginTop: '8px' }}>
              <Button 
                block 
                icon={<UserAddOutlined />}
                onClick={() => {
                  setMobileMenuOpen(false);
                  handleOpenLoginModal('register');
                }}
              >
                Đăng Ký
              </Button>
            </div>
          </>
        )}
      </Drawer>

      {/* Login Modal */}
      <LoginModal 
        open={loginModalOpen} 
        onClose={handleCloseLoginModal}
        defaultTab={loginModalTab}
      />

      {/* Register & OTP Verification Modal */}
      <RegisterOTPModal
        open={registerOTPModalOpen}
        onClose={handleCloseRegisterOTPModal}
        onSuccess={handleRegisterOTPSuccess}
        initialEmail={registerOTPModalEmail}
      />
    </Layout>
  );
};

export default CustomerLayout;


