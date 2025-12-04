import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Card,
  Button,
  InputNumber,
  Space,
  Typography,
  Empty,
  Popconfirm,
  message,
  Spin,
  Row,
  Col,
  Image,
  Tag,
  Divider,
} from 'antd';
import {
  ShoppingCartOutlined,
  DeleteOutlined,
  MinusOutlined,
  PlusOutlined,
  ClearOutlined,
  ShoppingOutlined,
  ArrowRightOutlined,
} from '@ant-design/icons';
import { useAuth } from '../../contexts/AuthContext.js';
import { useCart } from '../../contexts/CartContext.js';
import './Cart.scss';

const { Title, Text } = Typography;

const Cart = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const {
    cartItems,
    total,
    loading,
    updateCartItem,
    removeFromCart,
    clearCart,
    syncCartWithBackend,
  } = useCart();
  const [updating, setUpdating] = useState({});

  useEffect(() => {
    if (!user) {
      window.dispatchEvent(new CustomEvent('openLoginModal', { detail: { tab: 'login' } }));
      navigate('/');
      return;
    }
    // Sync cart with backend on mount để lấy giá mới nhất từ products table
    // Điều này đảm bảo giá trong giỏ hàng luôn phản ánh giá hiện tại của sản phẩm
    syncCartWithBackend();
  }, [user, syncCartWithBackend, navigate]);
  
  // Sync lại giỏ hàng khi trang được focus để đảm bảo có giá mới nhất
  useEffect(() => {
    if (!user) return;
    
    const handleFocus = () => {
      // Sync lại khi user quay lại tab/window
      syncCartWithBackend(true); // Silent sync
    };
    
    window.addEventListener('focus', handleFocus);
    return () => {
      window.removeEventListener('focus', handleFocus);
    };
  }, [user, syncCartWithBackend]);

  const handleUpdateQuantity = async (productId, newQuantity) => {
    if (newQuantity <= 0) {
      await handleRemoveItem(productId);
      return;
    }
    
    // Check stock availability
    const cartItem = cartItems.find(item => (item.product_id || item.id) === productId);
    if (cartItem?.product?.stock_quantity !== undefined && newQuantity > cartItem.product.stock_quantity) {
      message.warning(`Chỉ còn ${cartItem.product.stock_quantity} sản phẩm trong kho`);
      return;
    }
    
    setUpdating((prev) => ({ ...prev, [productId]: true }));
    try {
      const result = await updateCartItem(productId, newQuantity);
      if (result.success) {
        message.success(result.message || 'Cập nhật số lượng thành công');
      } else {
        message.error(result.message || 'Có lỗi xảy ra khi cập nhật số lượng');
      }
    } catch (error) {
      console.error('Error updating cart:', error);
      message.error('Có lỗi xảy ra khi cập nhật số lượng');
    } finally {
      setUpdating((prev) => ({ ...prev, [productId]: false }));
    }
  };

  const handleRemoveItem = async (productId) => {
    setUpdating((prev) => ({ ...prev, [productId]: true }));
    try {
      const result = await removeFromCart(productId);
      if (result.success) {
        message.success(result.message || 'Đã xóa sản phẩm khỏi giỏ hàng');
      } else {
        message.error(result.message || 'Có lỗi xảy ra');
      }
    } catch (error) {
      console.error('Error removing item:', error);
      message.error('Có lỗi xảy ra');
    } finally {
      setUpdating((prev) => ({ ...prev, [productId]: false }));
    }
  };

  const handleClearCart = async () => {
    try {
      const result = await clearCart();
      if (result.success) {
        message.success(result.message || 'Đã xóa tất cả sản phẩm');
      } else {
        message.error(result.message || 'Có lỗi xảy ra');
      }
    } catch (error) {
      console.error('Error clearing cart:', error);
      message.error('Có lỗi xảy ra');
    }
  };

  if (loading) {
    return (
      <div className="cart-loading">
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div className="cart-page">
      <div className="container">
        <Title level={2} className="page-title">
          <ShoppingCartOutlined /> Giỏ Hàng
        </Title>

        {cartItems.length === 0 ? (
          <Card className="empty-cart-card">
            <Empty
              description="Giỏ hàng của bạn đang trống"
              image={Empty.PRESENTED_IMAGE_SIMPLE}
            >
              <Link to="/products">
                <Button type="primary" size="large" icon={<ShoppingOutlined />}>
                  Tiếp Tục Mua Sắm
                </Button>
              </Link>
            </Empty>
          </Card>
        ) : (
          <Row gutter={[24, 24]}>
            <Col xs={24} lg={16}>
              <Card
                title={
                  <Space>
                    <ShoppingCartOutlined />
                    <span>Sản Phẩm ({cartItems.length})</span>
                  </Space>
                }
                extra={
                  <Popconfirm
                    title="Bạn có chắc muốn xóa tất cả sản phẩm?"
                    onConfirm={handleClearCart}
                    okText="Xóa"
                    cancelText="Hủy"
                  >
                    <Button danger icon={<ClearOutlined />} size="small">
                      Xóa Tất Cả
                    </Button>
                  </Popconfirm>
                }
                className="cart-items-card"
              >
                <div className="cart-items-list">
                  {cartItems.map((item) => {
                    const productId = item.product_id || item.id;
                    console.log('[Cart] 🔍 Processing cart item for rendering:', {
                      cart_item_id: item.cart_item_id,
                      productId,
                      hasProduct: !!item.product,
                      hasProductSnapshot: !!item.product_snapshot,
                    });
                    
                    // Use product_snapshot if product is not fully populated
                    let product = item.product || {};
                    let productSnapshot = null;
                    try {
                      if (item.product_snapshot) {
                        productSnapshot = typeof item.product_snapshot === 'string' 
                          ? JSON.parse(item.product_snapshot) 
                          : item.product_snapshot;
                        
                        // Debug: Log snapshot structure
                        console.log('[Cart] 📸 Product snapshot structure:', {
                          productId,
                          snapshotKeys: productSnapshot ? Object.keys(productSnapshot) : null,
                          hasPrimaryImage: !!productSnapshot?.primary_image,
                          primaryImageType: typeof productSnapshot?.primary_image,
                          hasImages: !!productSnapshot?.images,
                          imagesType: typeof productSnapshot?.images,
                          imagesIsArray: Array.isArray(productSnapshot?.images),
                          imagesKeys: productSnapshot?.images && typeof productSnapshot.images === 'object' ? Object.keys(productSnapshot.images) : null,
                        });
                        
                        // Merge snapshot with product data
                        // Lưu ý: Giá luôn lấy từ product.price (giá hiện tại), không dùng snapshot
                        if (productSnapshot) {
                          product = {
                            ...product,
                            name: productSnapshot.name || product.name,
                            price: product.price, // Luôn dùng giá hiện tại từ products table
                            // Only override images if snapshot has valid images (not empty object/null)
                            images: (productSnapshot.images && 
                              (Array.isArray(productSnapshot.images) || 
                               typeof productSnapshot.images === 'string' ||
                               (typeof productSnapshot.images === 'object' && productSnapshot.images !== null && Object.keys(productSnapshot.images).length > 0))
                            ) ? productSnapshot.images : product.images,
                            // Only override primary_image if snapshot has a valid string value
                            primary_image: (productSnapshot.primary_image && 
                              typeof productSnapshot.primary_image === 'string' && 
                              productSnapshot.primary_image.trim() !== '') 
                              ? productSnapshot.primary_image 
                              : product.primary_image,
                          };
                        }
                      }
                    } catch (e) {
                      console.error('[Cart] Error parsing product_snapshot:', e);
                    }
                    
                    // Parse images using the same logic as ProductCard
                    const parseProductImage = (product) => {
                      let primaryImage = '/placeholder.jpg';
                      
                      try {
                        // Try primary_image first
                        if (product.primary_image && typeof product.primary_image === 'string' && product.primary_image.trim() !== '') {
                          primaryImage = product.primary_image;
                        } else {
                          // Parse images array only if primary_image is not available
                          let images = [];
                          if (product.images) {
                            if (typeof product.images === 'string') {
                              try {
                                images = JSON.parse(product.images);
                              } catch (e) {
                                // Silently fail
                              }
                            } else if (Array.isArray(product.images)) {
                              images = product.images;
                            } else if (typeof product.images === 'object' && product.images !== null) {
                              // Try to convert object to array if it has numeric keys
                              const keys = Object.keys(product.images);
                              if (keys.length > 0) {
                                // Check if keys are numeric (array-like object)
                                const numericKeys = keys.filter(k => !isNaN(parseInt(k)));
                                if (numericKeys.length === keys.length) {
                                  images = keys.map(k => product.images[k]).filter(Boolean);
                                } else {
                                  // Try to extract values as array
                                  images = Object.values(product.images).filter(v => v !== null && v !== undefined);
                                }
                              }
                            }
                            
                            // Find primary image from array
                            if (images.length > 0) {
                              const primaryImageData = images.find(img => 
                                img.is_primary === true || 
                                img.is_primary === 1 || 
                                img.is_primary === '1'
                              ) || images[0];
                              
                              // Extract URL from image object
                              if (primaryImageData) {
                                if (typeof primaryImageData === 'string' && primaryImageData.trim() !== '') {
                                  primaryImage = primaryImageData;
                                } else if (primaryImageData.url && typeof primaryImageData.url === 'string' && primaryImageData.url.trim() !== '') {
                                  primaryImage = primaryImageData.url;
                                } else if (primaryImageData.image_url && typeof primaryImageData.image_url === 'string' && primaryImageData.image_url.trim() !== '') {
                                  primaryImage = primaryImageData.image_url;
                                } else {
                                  // Try to find any string value in the object
                                  const stringValue = Object.values(primaryImageData).find(v => typeof v === 'string' && v.trim() !== '' && v.length > 0);
                                  if (stringValue) {
                                    primaryImage = stringValue;
                                  }
                                }
                              }
                            }
                          }
                          
                          // Fallback to placeholder if no valid image found
                          if (!primaryImage || primaryImage === '/placeholder.jpg' || primaryImage.trim() === '') {
                            // Try to find any image URL in the product object
                            if (product.image && typeof product.image === 'string' && product.image.trim() !== '') {
                              primaryImage = product.image;
                            }
                          }
                        }
                      } catch (e) {
                        // Silently fail and use placeholder
                      }
                      
                      // Final fallback
                      if (!primaryImage || primaryImage === '/placeholder.jpg' || primaryImage.trim() === '') {
                        primaryImage = '/placeholder.jpg';
                      }
                      
                      return primaryImage;
                    };
                    
                    const primaryImage = parseProductImage(product);
                    
                    // Debug log (can be removed in production)
                    if (primaryImage === '/placeholder.jpg') {
                      console.log('[Cart] ⚠️ Using placeholder for product:', {
                        productId,
                        hasPrimaryImage: !!product.primary_image,
                        hasImages: !!product.images,
                        imagesType: typeof product.images,
                        productSnapshotKeys: productSnapshot ? Object.keys(productSnapshot) : null,
                      });
                    }
                    
                    // Luôn dùng giá hiện tại từ product.price (giá từ products table)
                    // Giá này sẽ thay đổi khi giá sản phẩm trong hệ thống thay đổi
                    const unitPrice = product.price || item.unit_price || 0;
                    const quantity = item.quantity || 0;
                    const itemTotal = unitPrice * quantity;
                    const isUpdating = updating[productId];

                    return (
                      <div key={item.cart_item_id} className="cart-item">
                        <div className="cart-item-content">
                          <Link to={`/products/${productId}`} className="cart-item-image">
                            <Image
                              src={primaryImage}
                              alt={product.name || productSnapshot?.name || 'Sản phẩm'}
                              preview={false}
                              className="product-thumbnail"
                              fallback="/placeholder.jpg"
                              style={{
                                width: '100%',
                                height: '100%',
                                objectFit: 'cover',
                              }}
                              onError={(e) => {
                                if (e.target && e.target.src !== '/placeholder.jpg') {
                                  e.target.src = '/placeholder.jpg';
                                }
                              }}
                            />
                          </Link>
                          <div className="cart-item-info">
                            <Link to={`/products/${productId}`}>
                              <Title level={5} className="product-name">
                                {product.name || productSnapshot?.name || 'Sản phẩm'}
                              </Title>
                            </Link>
                            <div className="product-price">
                              {new Intl.NumberFormat('vi-VN', {
                                style: 'currency',
                                currency: 'VND',
                              }).format(unitPrice)}
                            </div>
                            {product.stock_quantity !== undefined && (
                              <Tag color={product.stock_quantity > 0 ? 'green' : 'red'}>
                                {product.stock_quantity > 0 ? 'Còn hàng' : 'Hết hàng'}
                              </Tag>
                            )}
                          </div>
                        </div>
                        <div className="cart-item-actions">
                          <div className="quantity-control">
                            <Text strong>Số lượng:</Text>
                            <Space>
                              <Button
                                icon={<MinusOutlined />}
                                size="small"
                                onClick={() => handleUpdateQuantity(productId, (item.quantity || 1) - 1)}
                                disabled={isUpdating || item.quantity <= 1}
                              />
                              <InputNumber
                                min={1}
                                max={product.stock_quantity || 999}
                                value={item.quantity}
                                onChange={(value) => handleUpdateQuantity(productId, value || 1)}
                                disabled={isUpdating}
                                style={{ width: '70px' }}
                              />
                              <Button
                                icon={<PlusOutlined />}
                                size="small"
                                onClick={() => handleUpdateQuantity(productId, (item.quantity || 1) + 1)}
                                disabled={isUpdating || (product.stock_quantity && item.quantity >= product.stock_quantity)}
                              />
                            </Space>
                          </div>
                          <div className="item-total">
                            <Text strong className="total-price">
                              {new Intl.NumberFormat('vi-VN', {
                                style: 'currency',
                                currency: 'VND',
                              }).format(itemTotal)}
                            </Text>
                          </div>
                          <Popconfirm
                            title="Bạn có chắc muốn xóa sản phẩm này?"
                            onConfirm={() => handleRemoveItem(productId)}
                            okText="Xóa"
                            cancelText="Hủy"
                          >
                            <Button
                              danger
                              icon={<DeleteOutlined />}
                              size="small"
                              loading={isUpdating}
                            >
                              Xóa
                            </Button>
                          </Popconfirm>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Card>
            </Col>

            <Col xs={24} lg={8}>
              <Card title="Tổng Kết" className="cart-summary-card" style={{ position: 'sticky', top: '100px' }}>
                <Space direction="vertical" style={{ width: '100%' }} size="large">
                  <div className="summary-row">
                    <Text>Tạm tính:</Text>
                    <Text strong>
                      {new Intl.NumberFormat('vi-VN', {
                        style: 'currency',
                        currency: 'VND',
                      }).format(total)}
                    </Text>
                  </div>
                  <div className="summary-row">
                    <Text>Phí vận chuyển:</Text>
                    <Text type="success" strong>Miễn phí</Text>
                  </div>
                  <Divider />
                  <div className="summary-row total-row">
                    <Text strong>Tổng cộng:</Text>
                    <Text strong className="final-total">
                      {new Intl.NumberFormat('vi-VN', {
                        style: 'currency',
                        currency: 'VND',
                      }).format(total)}
                    </Text>
                  </div>
                  <Link to="/checkout" style={{ width: '100%', display: 'block' }}>
                    <Button
                      type="primary"
                      block
                      size="large"
                      icon={<ArrowRightOutlined />}
                      className="checkout-button"
                    >
                      Thanh Toán
                    </Button>
                  </Link>
                  <Link to="/products">
                    <Button block size="large" icon={<ShoppingOutlined />}>
                      Tiếp Tục Mua Sắm
                    </Button>
                  </Link>
                </Space>
              </Card>
            </Col>
          </Row>
        )}
      </div>
    </div>
  );
};

export default Cart;
