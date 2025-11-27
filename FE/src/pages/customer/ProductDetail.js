import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Row,
  Col,
  Card,
  Button,
  InputNumber,
  Spin,
  Typography,
  Tag,
  Rate,
  Divider,
  Image,
  message,
  Space,
  Empty,
  Tabs,
  Form,
  Input,
  Avatar,
  List,
} from 'antd';
import {
  ShoppingCartOutlined,
  HeartOutlined,
  HeartFilled,
  MinusOutlined,
  PlusOutlined,
  StarFilled,
  UserOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons';
import { product, review, cart, wishlist } from '../../api/index.js';
import { useAuth } from '../../contexts/AuthContext.js';
import './ProductDetail.scss';

const { Title, Paragraph, Text } = Typography;
const { TextArea } = Input;
const { TabPane } = Tabs;

const ProductDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [productData, setProductData] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [ratingStats, setRatingStats] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(true);
  const [isInWishlist, setIsInWishlist] = useState(false);
  const [reviewForm] = Form.useForm();
  const [reviewLoading, setReviewLoading] = useState(false);
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  useEffect(() => {
    loadProductData();
  }, [id]);

  useEffect(() => {
    if (user && productData) {
      checkWishlist();
    }
  }, [user, productData]);

  const loadProductData = async () => {
    setLoading(true);
    try {
      const productId = parseInt(id);
      const [productRes, reviewsRes, ratingRes] = await Promise.all([
        product.getProductById(productId),
        review.getReviewsByProduct(productId, 1, 10),
        review.getProductRating(productId),
      ]);

      if (productRes.success) {
        setProductData(productRes.data);
      }
      if (reviewsRes.success) {
        setReviews(reviewsRes.data || []);
      }
      if (ratingRes.success) {
        setRatingStats(ratingRes.data);
      }
    } catch (error) {
      console.error('Error loading product:', error);
      message.error('Có lỗi xảy ra khi tải sản phẩm');
    } finally {
      setLoading(false);
    }
  };

  const checkWishlist = async () => {
    try {
      const productId = parseInt(id);
      const wishlistRes = await wishlist.getWishlist();
      if (wishlistRes.success) {
        const items = wishlistRes.data.items || [];
        setIsInWishlist(items.some((item) => (item.product_id || item.id) === productId));
      }
    } catch (error) {
      console.error('Error checking wishlist:', error);
    }
  };

  const handleAddToCart = async () => {
    if (!user) {
      window.dispatchEvent(new CustomEvent('openLoginModal', { detail: { tab: 'login' } }));
      return;
    }
    try {
      const productId = parseInt(id);
      await cart.addToCart(productId, quantity);
      message.success('Đã thêm vào giỏ hàng');
      // Dispatch custom event to update cart count in header
      window.dispatchEvent(new CustomEvent('cartUpdated'));
    } catch (error) {
      console.error('[ProductDetail] ❌ Error adding to cart:', error);
      message.error('Có lỗi xảy ra');
    }
  };

  const handleBuyNow = async () => {
    if (!user) {
      window.dispatchEvent(new CustomEvent('openLoginModal', { detail: { tab: 'login' } }));
      return;
    }
    if (productData.stock_quantity === 0) {
      message.warning('Sản phẩm đã hết hàng');
      return;
    }
    try {
      // IMPORTANT: Use product_id from productData, not id from URL
      // URL id is the database primary key, but backend cart operations need product_id
      let productId;
      if (productData.product_id !== undefined && productData.product_id !== null) {
        productId = parseInt(productData.product_id);
      } else if (productData.id !== undefined && productData.id !== null) {
        // Fallback: if product_id is missing, use id but log warning
        console.warn('[ProductDetail] ⚠️ product_id missing, using id as fallback:', {
          product_id: productData.product_id,
          id: productData.id,
          name: productData.name
        });
        productId = parseInt(productData.id);
      } else {
        console.error('[ProductDetail] ❌ No product_id or id found in productData:', productData);
        message.error('Lỗi: Không thể xác định sản phẩm');
        return;
      }
      
      if (isNaN(productId)) {
        console.error('[ProductDetail] ❌ Invalid productId after parse:', {
          urlId: id,
          product_id: productData.product_id,
          id: productData.id,
          parsed: productId
        });
        message.error('Lỗi: Không thể xác định sản phẩm');
        return;
      }
      
      console.log('[ProductDetail] 📦 Buy now product:', {
        urlId: id,
        finalProductId: productId,
        quantity: quantity,
        productData: {
          id: productData.id,
          product_id: productData.product_id,
          name: productData.name
        },
        usingProductId: productData.product_id !== undefined && productData.product_id !== null
      });
      
      // Lấy giỏ hàng hiện tại để lưu lại (để khôi phục sau)
      const cartRes = await cart.getCart();
      let savedCartItems = [];
      
      if (cartRes.success) {
        const items = cartRes.data.items || [];
        console.log('[ProductDetail] 📋 Current cart items:', items.length);
        
        // Lưu danh sách sản phẩm hiện tại (trừ sản phẩm "Mua ngay" nếu có)
        savedCartItems = items.filter(item => {
          const itemProductId = parseInt(item.product_id || item.product?.product_id || item.product?.id);
          const shouldKeep = itemProductId !== productId;
          console.log('[ProductDetail] 🔍 Filtering cart item:', {
            itemProductId,
            productId,
            shouldKeep
          });
          return shouldKeep;
        });
        
        console.log('[ProductDetail] 💾 Saving cart items to restore later:', savedCartItems.length);
        
        // Lưu vào sessionStorage để khôi phục sau
        sessionStorage.setItem('savedCartItems', JSON.stringify(savedCartItems));
      }
      
      // Lưu thông tin "Mua ngay" vào sessionStorage
      const buyNowData = {
        productId: productId,
        quantity: quantity,
        timestamp: Date.now(), // Track when buyNow was called to prevent race conditions
      };
      sessionStorage.setItem('buyNowProduct', JSON.stringify(buyNowData));
      
      // Sử dụng API buyNow để clear cart và add sản phẩm trong một request
      const buyNowResult = await cart.buyNow(productId, quantity);
      
      if (!buyNowResult.success) {
        throw new Error(buyNowResult.message || 'Không thể mua ngay');
      }
      
      // Đợi một chút để đảm bảo giỏ hàng được cập nhật
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Verify sản phẩm đã được thêm vào giỏ hàng
      await new Promise(resolve => setTimeout(resolve, 200));
      const verifyCartRes = await cart.getCart();
      if (verifyCartRes.success) {
        const verifyItems = verifyCartRes.data.items || [];
        console.log('[ProductDetail] 🔍 Verifying cart after buy now:', {
          itemsCount: verifyItems.length,
          items: verifyItems.map(item => ({
            product_id: item.product_id || item.product?.product_id || item.product?.id,
            name: item.product?.name || 'Unknown',
            quantity: item.quantity
          })),
          expectedProductId: productId,
          expectedQuantity: quantity
        });
        
        const verifyItem = verifyItems.find(item => {
          const itemProductId = parseInt(item.product_id || item.product?.product_id || item.product?.id);
          const match = itemProductId === productId;
          console.log('[ProductDetail] 🔍 Checking item:', {
            itemProductId,
            productId,
            match
          });
          return match;
        });
        
        if (!verifyItem) {
          console.error('[ProductDetail] ❌ Product not found in cart after buy now');
          message.error('Không thể thêm sản phẩm vào giỏ hàng. Vui lòng thử lại.');
          return;
        }
        
        // Verify quantity
        if (verifyItem.quantity !== quantity) {
          console.log('[ProductDetail] ⚠️ Quantity mismatch, updating:', {
            current: verifyItem.quantity,
            expected: quantity
          });
          await cart.updateCartItem(productId, quantity);
        }
        
        console.log('[ProductDetail] ✅ Verified product in cart:', {
          product_id: verifyItem.product_id || verifyItem.product?.product_id || verifyItem.product?.id,
          name: verifyItem.product?.name || 'Unknown',
          quantity: verifyItem.quantity
        });
      }
      
      // Dispatch custom event to update cart count in header
      window.dispatchEvent(new CustomEvent('cartUpdated'));
      navigate('/checkout');
    } catch (error) {
      console.error('[ProductDetail] ❌ Error in buy now:', error);
      message.error('Có lỗi xảy ra');
    }
  };

  const handleWishlistToggle = async () => {
    if (!user) {
      window.dispatchEvent(new CustomEvent('openLoginModal', { detail: { tab: 'login' } }));
      return;
    }
    try {
      const productId = parseInt(id);
      if (isInWishlist) {
        await wishlist.removeFromWishlist(productId);
        setIsInWishlist(false);
        message.success('Đã xóa khỏi danh sách yêu thích');
      } else {
        await wishlist.addToWishlist(productId);
        setIsInWishlist(true);
        message.success('Đã thêm vào danh sách yêu thích');
      }
    } catch (error) {
      console.error('Error updating wishlist:', error);
      message.error('Có lỗi xảy ra');
    }
  };

  const handleSubmitReview = async (values) => {
    if (!user) {
      window.dispatchEvent(new CustomEvent('openLoginModal', { detail: { tab: 'login' } }));
      return;
    }
    setReviewLoading(true);
    try {
      await review.createOrUpdateReview({
        productId: parseInt(id),
        rating: values.rating,
        comment: values.comment || '',
      });
      message.success('Đánh giá thành công');
      reviewForm.resetFields();
      loadProductData();
    } catch (error) {
      console.error('Error submitting review:', error);
      message.error('Có lỗi xảy ra khi đánh giá');
    } finally {
      setReviewLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="product-detail-loading">
        <Spin size="large" />
      </div>
    );
  }

  if (!productData) {
    return (
      <div className="product-detail-error">
        <Title level={3}>Không tìm thấy sản phẩm</Title>
      </div>
    );
  }

  // Parse images from JSON string or array
  let images = [];
  try {
    if (typeof productData.images === 'string') {
      images = JSON.parse(productData.images);
    } else if (Array.isArray(productData.images)) {
      images = productData.images;
    }
  } catch (e) {
    console.error('Error parsing images:', e);
    images = [];
  }

  // Get primary image
  const primaryImageData = images.find(img => img.is_primary) || images[0];
  const primaryImage = productData.primary_image || primaryImageData?.url || '/placeholder.jpg';
  const displayImages = images.length > 0 ? images : [{ url: primaryImage, is_primary: true }];

  return (
    <div className="product-detail-page">
      <div className="container">
        <div style={{ paddingTop: '80px' }}>
          <Row gutter={[48, 48]}>
          {/* Product Images */}
          <Col xs={24} md={12}>
            <div className="product-images">
              <div className="main-image">
                <Image
                  src={typeof displayImages[activeImageIndex] === 'string' 
                    ? displayImages[activeImageIndex] 
                    : displayImages[activeImageIndex]?.url || primaryImage}
                  alt={productData.name}
                  className="main-image-content"
                  preview={{
                    mask: 'Xem ảnh lớn',
                  }}
                />
              </div>
              {displayImages.length > 1 && (
                <div className="thumbnail-images">
                  {displayImages.map((img, index) => {
                    const imageUrl = typeof img === 'string' ? img : img.url;
                    return (
                      <div
                        key={index}
                        className={`thumbnail-item ${activeImageIndex === index ? 'active' : ''}`}
                        onClick={() => setActiveImageIndex(index)}
                      >
                        <Image
                          src={imageUrl}
                          alt={`${productData.name} ${index + 1}`}
                          preview={false}
                        />
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </Col>

          {/* Product Info */}
          <Col xs={24} md={12}>
            <div className="product-info">
              <Title level={2} className="product-name">{productData.name}</Title>
              
              <Space style={{ marginBottom: '16px' }} wrap>
                <Tag>SKU: {productData.sku}</Tag>
                {productData.stock_quantity > 0 ? (
                  <Tag color="green">Còn hàng</Tag>
                ) : (
                  <Tag color="red">Hết hàng</Tag>
                )}
              </Space>

              {ratingStats && (
                <div className="product-rating-summary">
                  <Space>
                    <Rate disabled value={ratingStats.average_rating || 0} allowHalf />
                    <Text strong>{ratingStats.average_rating?.toFixed(1) || 0}</Text>
                    <Text type="secondary">({ratingStats.total_reviews || 0} đánh giá)</Text>
                  </Space>
                </div>
              )}

              <div className="product-price">
                <Space direction="vertical" size="small" style={{ width: '100%' }}>
                  {productData.msrp && productData.msrp > productData.price && (
                    <div>
                      <Text delete style={{ color: '#999', fontSize: '18px' }}>
                        {new Intl.NumberFormat('vi-VN', {
                          style: 'currency',
                          currency: 'VND',
                        }).format(productData.msrp)}
                      </Text>
                      <Tag color="black" style={{ marginLeft: '12px', borderRadius: 0 }}>
                        Giảm {Math.round(((productData.msrp - productData.price) / productData.msrp) * 100)}%
                      </Tag>
                    </div>
                  )}
                  <Text strong style={{ fontSize: '32px', color: '#000' }}>
                    {new Intl.NumberFormat('vi-VN', {
                      style: 'currency',
                      currency: 'VND',
                    }).format(productData.price || 0)}
                  </Text>
                </Space>
              </div>

              {productData.short_description && (
                <Paragraph className="product-short-description" style={{ fontSize: '16px', color: '#666' }}>
                  {productData.short_description}
                </Paragraph>
              )}
              
              <Paragraph className="product-description">
                {productData.description || 'Không có mô tả'}
              </Paragraph>

              {/* Product Additional Info */}
              {(productData.msrp || productData.origin || productData.manufacturer || productData.volume_ml || productData.barcode) && (
                <div className="product-additional-info" style={{ marginTop: '16px' }}>
                  <Divider orientation="left">Thông Tin Sản Phẩm</Divider>
                  <Row gutter={[16, 8]}>
                    {productData.msrp && (
                      <Col xs={24} sm={12}>
                        <Text type="secondary">Giá gốc: </Text>
                        <Text delete style={{ color: '#999' }}>
                          {new Intl.NumberFormat('vi-VN', {
                            style: 'currency',
                            currency: 'VND',
                          }).format(productData.msrp)}
                        </Text>
                      </Col>
                    )}
                    {productData.origin && (
                      <Col xs={24} sm={12}>
                        <Text type="secondary">Xuất xứ: </Text>
                        <Text strong>{productData.origin}</Text>
                      </Col>
                    )}
                    {productData.manufacturer && (
                      <Col xs={24} sm={12}>
                        <Text type="secondary">Nhà sản xuất: </Text>
                        <Text strong>{productData.manufacturer}</Text>
                      </Col>
                    )}
                    {productData.volume_ml && (
                      <Col xs={24} sm={12}>
                        <Text type="secondary">Dung tích: </Text>
                        <Text strong>{productData.volume_ml}ml</Text>
                      </Col>
                    )}
                    {productData.barcode && (
                      <Col xs={24} sm={12}>
                        <Text type="secondary">Mã vạch: </Text>
                        <Text strong>{productData.barcode}</Text>
                      </Col>
                    )}
                  </Row>
                </div>
              )}

              <Divider />

              <div className="product-actions">
                <div className="quantity-selector">
                  <Text strong>Số lượng:</Text>
                  <Space>
                    <Button
                      icon={<MinusOutlined />}
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    />
                    <InputNumber
                      min={1}
                      max={productData.stock_quantity}
                      value={quantity}
                      onChange={(value) => setQuantity(value || 1)}
                      style={{ width: '80px' }}
                    />
                    <Button
                      icon={<PlusOutlined />}
                      onClick={() => setQuantity(Math.min(productData.stock_quantity, quantity + 1))}
                    />
                  </Space>
                </div>

                <Space size="large" className="action-buttons" style={{ width: '100%' }}>
                  <Button
                    type="primary"
                    size="large"
                    icon={<ThunderboltOutlined />}
                    onClick={handleBuyNow}
                    disabled={productData.stock_quantity === 0}
                    className="buy-now-btn"
                  >
                    Mua ngay
                  </Button>
                  <Button
                    type="default"
                    size="large"
                    icon={<ShoppingCartOutlined />}
                    onClick={handleAddToCart}
                    disabled={productData.stock_quantity === 0}
                    className="add-to-cart-btn"
                  >
                    Thêm vào giỏ hàng
                  </Button>
                  <Button
                    size="large"
                    icon={isInWishlist ? <HeartFilled /> : <HeartOutlined />}
                    onClick={handleWishlistToggle}
                    danger={isInWishlist}
                    className="wishlist-btn"
                  >
                    {isInWishlist ? 'Đã yêu thích' : 'Yêu thích'}
                  </Button>
                </Space>
              </div>
            </div>
          </Col>
        </Row>

        <Divider />

        {/* Product Details Tabs */}
        <Card>
          <Tabs defaultActiveKey="reviews">
            <TabPane tab="Đánh giá" key="reviews">
              <div className="reviews-section">
                {ratingStats && (
                  <div className="rating-overview">
                    <Row gutter={[32, 32]}>
                      <Col xs={24} md={8}>
                        <div className="rating-summary">
                          <div className="rating-score">
                            {ratingStats.average_rating?.toFixed(1) || 0}
                          </div>
                          <Rate disabled value={ratingStats.average_rating || 0} allowHalf />
                          <Text type="secondary">
                            {ratingStats.total_reviews || 0} đánh giá
                          </Text>
                        </div>
                      </Col>
                      <Col xs={24} md={16}>
                        <div className="rating-breakdown">
                          {[5, 4, 3, 2, 1].map((star) => {
                            const count = ratingStats[`rating_${star}`] || 0;
                            const percentage = ratingStats.total_reviews
                              ? (count / ratingStats.total_reviews) * 100
                              : 0;
                            return (
                              <div key={star} className="rating-bar">
                                <Text>{star} sao</Text>
                                <div className="bar-container">
                                  <div
                                    className="bar-fill"
                                    style={{ width: `${percentage}%` }}
                                  />
                                </div>
                                <Text type="secondary">{count}</Text>
                              </div>
                            );
                          })}
                        </div>
                      </Col>
                    </Row>
                  </div>
                )}

                {user && (
                  <Card title="Viết đánh giá" style={{ marginTop: '24px', borderRadius: 0, border: '1px solid #e8e8e8' }}>
                    <Form form={reviewForm} layout="vertical" onFinish={handleSubmitReview}>
                      <Form.Item
                        name="rating"
                        label="Đánh giá"
                        rules={[{ required: true, message: 'Vui lòng chọn số sao' }]}
                      >
                        <Rate />
                      </Form.Item>
                      <Form.Item name="comment" label="Nhận xét">
                        <TextArea rows={4} placeholder="Chia sẻ cảm nhận của bạn về sản phẩm..." style={{ borderRadius: 0 }} />
                      </Form.Item>
                      <Form.Item>
                        <Button type="primary" htmlType="submit" loading={reviewLoading} style={{ borderRadius: 0, background: '#000', borderColor: '#000', textTransform: 'lowercase', letterSpacing: '0.5px' }}>
                          Gửi đánh giá
                        </Button>
                      </Form.Item>
                    </Form>
                  </Card>
                )}

                <Divider />

                <div className="reviews-list">
                  {reviews.length === 0 ? (
                    <Empty description="Chưa có đánh giá nào" />
                  ) : (
                    <List
                      dataSource={reviews}
                      renderItem={(rev) => (
                        <List.Item>
                          <List.Item.Meta
                            avatar={<Avatar icon={<UserOutlined />} />}
                            title={
                              <Space wrap>
                                <Text strong>{rev.user?.username || rev.user?.first_name || 'Khách hàng'}</Text>
                                <Rate disabled value={rev.rating || 0} allowHalf size="small" />
                                {rev.created_at && (
                                  <Text type="secondary" style={{ fontSize: '12px' }}>
                                    {new Date(rev.created_at).toLocaleDateString('vi-VN', {
                                      year: 'numeric',
                                      month: 'long',
                                      day: 'numeric',
                                    })}
                                  </Text>
                                )}
                              </Space>
                            }
                            description={
                              <div>
                                {rev.comment ? (
                                  <Paragraph style={{ marginBottom: 0, whiteSpace: 'pre-wrap' }}>
                                    {rev.comment}
                                  </Paragraph>
                                ) : (
                                  <Text type="secondary" italic>Không có nhận xét</Text>
                                )}
                              </div>
                            }
                          />
                        </List.Item>
                      )}
                    />
                  )}
                </div>
              </div>
            </TabPane>
            <TabPane tab="Thông tin sản phẩm" key="details">
              <div className="product-details">
                <Paragraph>{productData.description || 'Không có mô tả chi tiết'}</Paragraph>
                {productData.specifications && (
                  <div className="specifications">
                    <Title level={4} style={{ textTransform: 'lowercase', letterSpacing: '0.5px', fontWeight: 400 }}>Thông số kỹ thuật</Title>
                    <pre>{JSON.stringify(productData.specifications, null, 2)}</pre>
                  </div>
                )}
              </div>
            </TabPane>
          </Tabs>
        </Card>
        </div>
      </div>
    </div>
  );
};

export default ProductDetail;
