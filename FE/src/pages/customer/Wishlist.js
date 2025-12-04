import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Row,
  Col,
  Card,
  Button,
  Spin,
  Typography,
  Empty,
  Popconfirm,
  message,
  Image,
  Tag,
  Rate,
} from 'antd';
import { HeartOutlined, DeleteOutlined, ShoppingOutlined, ShoppingCartOutlined } from '@ant-design/icons';
import { wishlist, cart } from '../../api/index.js';
import { useAuth } from '../../contexts/AuthContext.js';
import './Wishlist.scss';

const { Title } = Typography;
const { Meta } = Card;

const Wishlist = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [wishlistItems, setWishlistItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [addingToCart, setAddingToCart] = useState({});

  useEffect(() => {
    if (!user) {
      window.dispatchEvent(new CustomEvent('openLoginModal', { detail: { tab: 'login' } }));
      navigate('/');
      return;
    }
    loadWishlist();
  }, [user]);

  const loadWishlist = async () => {
    setLoading(true);
    try {
      const response = await wishlist.getWishlist();
      console.log('[Wishlist] Response:', response);
      if (response.success) {
        const items = response.data?.items || response.data || [];
        console.log('[Wishlist] Items:', items);
        setWishlistItems(items);
      } else {
        console.error('[Wishlist] API returned success: false');
        message.error(response.message || 'Có lỗi xảy ra khi tải danh sách yêu thích');
      }
    } catch (error) {
      console.error('Error loading wishlist:', error);
      message.error('Có lỗi xảy ra khi tải danh sách yêu thích');
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async (productId) => {
    try {
      await wishlist.removeFromWishlist(productId);
      message.success('Đã xóa khỏi danh sách yêu thích');
      loadWishlist();
    } catch (error) {
      console.error('Error removing from wishlist:', error);
      message.error('Có lỗi xảy ra');
    }
  };

  const handleAddToCart = async (productId) => {
    const item = wishlistItems.find(item => (item.product_id || item.id) === productId);
    const productData = item?.product;
    
    if (!productData) {
      message.error('Không tìm thấy thông tin sản phẩm');
      return;
    }
    
    if (productData.stock_quantity === 0) {
      message.warning('Sản phẩm đã hết hàng');
      return;
    }
    
    setAddingToCart((prev) => ({ ...prev, [productId]: true }));
    try {
      await cart.addToCart(parseInt(productId), 1);
      message.success('Đã thêm vào giỏ hàng');
      // CartContext will automatically dispatch cartUpdated event with detail
    } catch (error) {
      console.error('Error adding to cart:', error);
      const errorMessage = error.message || 'Có lỗi xảy ra khi thêm vào giỏ hàng';
      message.error(errorMessage);
    } finally {
      setAddingToCart((prev) => ({ ...prev, [productId]: false }));
    }
  };

  if (loading) {
    return (
      <div className="wishlist-loading">
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div className="wishlist-page">
      <div className="container">
        <Title level={2} className="page-title">
          <HeartOutlined /> Danh sách yêu thích
        </Title>

        {wishlistItems.length === 0 ? (
          <Card className="empty-wishlist-card">
            <Empty
              description="Danh sách yêu thích của bạn đang trống"
              image={Empty.PRESENTED_IMAGE_SIMPLE}
            >
              <Link to="/products">
                <Button type="primary" size="large" icon={<ShoppingOutlined />}>
                  Mua sắm ngay
                </Button>
              </Link>
            </Empty>
          </Card>
        ) : (
          <Row gutter={[24, 24]}>
            {wishlistItems.map((item) => {
              const productId = item.product_id || item.id;
              const productData = item.product || {};
              
              // Skip items without product data
              if (!productData || !productData.id) {
                console.warn('[Wishlist] Item missing product data:', item);
                return null;
              }
              
              // Parse images if needed
              let images = [];
              try {
                if (typeof productData.images === 'string') {
                  images = JSON.parse(productData.images);
                } else if (Array.isArray(productData.images)) {
                  images = productData.images;
                }
              } catch (e) {
                images = [];
              }
              const primaryImageData = images.find(img => img.is_primary) || images[0];
              const primaryImage = productData.primary_image || primaryImageData?.url || '/placeholder.jpg';
              const isAddingToCart = addingToCart[productId];

              return (
                <Col xs={12} sm={8} md={6} key={item.wishlist_id || productId}>
                  <Card
                    hoverable
                    className="wishlist-card"
                    cover={
                      <Link to={`/products/${productId}`}>
                        <div className="product-image-wrapper">
                          <Image
                            alt={productData.name || 'Sản phẩm'}
                            src={primaryImage}
                            preview={false}
                            className="product-image"
                            fallback="/placeholder.jpg"
                          />
                          {productData.stock_quantity === 0 && (
                            <div className="out-of-stock-badge">Hết hàng</div>
                          )}
                        </div>
                      </Link>
                    }
                    actions={[
                      <Button
                        type="primary"
                        icon={<ShoppingCartOutlined />}
                        size="small"
                        onClick={() => handleAddToCart(productId)}
                        loading={isAddingToCart}
                        disabled={productData.stock_quantity === 0}
                        block
                      >
                        Thêm vào giỏ
                      </Button>,
                      <Popconfirm
                        title="Bạn có chắc muốn xóa sản phẩm này khỏi danh sách yêu thích?"
                        onConfirm={() => handleRemove(productId)}
                        okText="Xóa"
                        cancelText="Hủy"
                      >
                        <Button
                          type="text"
                          danger
                          icon={<DeleteOutlined />}
                          size="small"
                          block
                        >
                          Xóa
                        </Button>
                      </Popconfirm>,
                    ]}
                  >
                    <Link to={`/products/${productId}`}>
                      <Meta
                        title={<div className="product-title">{productData.name || 'Sản phẩm'}</div>}
                        description={
                          <div className="product-info">
                            <div className="product-price">
                              {new Intl.NumberFormat('vi-VN', {
                                style: 'currency',
                                currency: 'VND',
                              }).format(productData.price || 0)}
                            </div>
                            {productData.stock_quantity > 0 ? (
                              <Tag color="green" className="stock-tag">Còn hàng</Tag>
                            ) : (
                              <Tag color="red" className="stock-tag">Hết hàng</Tag>
                            )}
                          </div>
                        }
                      />
                    </Link>
                  </Card>
                </Col>
              );
            }).filter(Boolean)}
          </Row>
        )}
      </div>
    </div>
  );
};

export default Wishlist;
