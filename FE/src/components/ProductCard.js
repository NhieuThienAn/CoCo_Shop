import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Card, Button, Tag, Rate, Image, Space, message, Typography, Badge } from 'antd';
import {
  ShoppingCartOutlined,
  HeartOutlined,
  HeartFilled,
  ThunderboltOutlined,
} from '@ant-design/icons';
import { cart, wishlist } from '../api/index.js';
import { useAuth } from '../contexts/AuthContext.js';
import './ProductCard.scss';

const { Meta } = Card;
const { Text } = Typography;

// Helper function to parse product image - memoized outside component
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

const ProductCard = ({ product, showActions = true, onWishlistChange }) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isInWishlist, setIsInWishlist] = useState(false);
  const [loadingCart, setLoadingCart] = useState(false);
  const [loadingWishlist, setLoadingWishlist] = useState(false);
  const [loadingBuyNow, setLoadingBuyNow] = useState(false);

  // IMPORTANT: Always use product_id, not id
  // product_id is the business identifier, id is the database primary key
  // Backend cart operations use product_id, not id
  // Check if product_id exists and is a valid number (not 0, undefined, or null)
  const productId = (product.product_id !== undefined && product.product_id !== null && product.product_id !== 0)
    ? product.product_id 
    : (product.id !== undefined && product.id !== null ? product.id : null);
  
  // Log productId để debug
  useEffect(() => {
    if (productId === null || productId === 0) {
      console.warn('[ProductCard] ⚠️ Invalid productId:', {
        productId,
        product_id: product.product_id,
        id: product.id,
        name: product.name,
        hasProduct: !!product
      });
    } else {
      console.log('[ProductCard] 🔍 ProductCard mounted/updated:', {
        productId,
        product_id: product.product_id,
        id: product.id,
        name: product.name,
        hasProduct: !!product
      });
    }
  }, [productId, product.product_id, product.id, product.name]);

  // Memoize image parsing
  const primaryImage = useMemo(() => parseProductImage(product), [product.primary_image, product.images, product.image]);
  
  // Memoize computed values
  const averageRating = useMemo(() => product.rating?.average_rating || 0, [product.rating?.average_rating]);
  const totalReviews = useMemo(() => product.rating?.total_reviews || 0, [product.rating?.total_reviews]);
  const isOutOfStock = useMemo(() => product.stock_quantity === 0, [product.stock_quantity]);
  const discountPercent = useMemo(() => {
    return product.msrp && product.msrp > product.price 
      ? Math.round(((product.msrp - product.price) / product.msrp) * 100) 
      : 0;
  }, [product.msrp, product.price]);

  // Check wishlist status
  const checkWishlistStatus = useCallback(async () => {
    if (!user || !productId) return;
    try {
      const wishlistRes = await wishlist.checkWishlist(productId);
      if (wishlistRes.success) {
        setIsInWishlist(wishlistRes.data?.inWishlist || false);
      }
    } catch (error) {
      // Silently fail - wishlist check is optional
    }
  }, [user, productId]);

  useEffect(() => {
    checkWishlistStatus();
  }, [checkWishlistStatus]);

  const handleAddToCart = useCallback(async (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!user) {
      message.warning('Vui lòng đăng nhập để thêm vào giỏ hàng');
      window.dispatchEvent(new CustomEvent('openLoginModal', { detail: { tab: 'login' } }));
      return;
    }

    if (isOutOfStock) {
      message.warning('Sản phẩm đã hết hàng');
      return;
    }

    setLoadingCart(true);
    try {
      // Ensure we have a valid productId
      let finalProductId;
      if (product.product_id !== undefined && product.product_id !== null && product.product_id !== 0) {
        finalProductId = parseInt(product.product_id);
      } else if (product.id !== undefined && product.id !== null) {
        finalProductId = parseInt(product.id);
      } else {
        console.error('[ProductCard] ❌ No valid productId or id found:', product);
        message.error('Lỗi: Không thể xác định sản phẩm');
        setLoadingCart(false);
        return;
      }
      
      if (isNaN(finalProductId) || finalProductId <= 0) {
        console.error('[ProductCard] ❌ Invalid productId in handleAddToCart:', {
          finalProductId,
          product_id: product.product_id,
          id: product.id,
          product
        });
        message.error('Lỗi: Không thể xác định sản phẩm');
        setLoadingCart(false);
        return;
      }
      
      console.log('[ProductCard] ➕ Adding to cart:', { productId: finalProductId, productName: product.name });
      await cart.addToCart(finalProductId, 1);
      message.success('Đã thêm vào giỏ hàng');
      // CartContext will automatically dispatch cartUpdated event with detail
    } catch (error) {
      console.error('[ProductCard] ❌ Error adding to cart:', error);
      message.error(error.message || 'Có lỗi xảy ra khi thêm vào giỏ hàng');
    } finally {
      setLoadingCart(false);
    }
  }, [user, isOutOfStock, productId, navigate, product.name]);

  const handleBuyNow = useCallback(async (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (!user) {
      message.warning('Vui lòng đăng nhập để mua hàng');
      window.dispatchEvent(new CustomEvent('openLoginModal', { detail: { tab: 'login' } }));
      return;
    }

    if (isOutOfStock) {
      message.warning('Sản phẩm đã hết hàng');
      return;
    }

    setLoadingBuyNow(true);
    try {
      // IMPORTANT: Use product_id, not id
      // Backend expects product_id field, not id field
      let finalProductId;
      if (product.product_id !== undefined && product.product_id !== null) {
        finalProductId = parseInt(product.product_id);
      } else if (product.id !== undefined && product.id !== null) {
        // Fallback: if product_id is missing, use id but log warning
        console.warn('[ProductCard] ⚠️ product_id missing, using id as fallback:', {
          product_id: product.product_id,
          id: product.id,
          name: product.name
        });
        finalProductId = parseInt(product.id);
      } else {
        console.error('[ProductCard] ❌ No product_id or id found:', product);
        message.error('Lỗi: Không thể xác định sản phẩm');
        return;
      }
      
      if (isNaN(finalProductId)) {
        console.error('[ProductCard] ❌ Invalid productId after parse:', {
          product_id: product.product_id,
          id: product.id,
          parsed: finalProductId
        });
        message.error('Lỗi: Không thể xác định sản phẩm');
        return;
      }
      
      console.log('[ProductCard] 🚀 handleBuyNow called', {
        originalProductId: productId,
        finalProductId: finalProductId,
        productName: product.name,
        product: {
          product_id: product.product_id,
          id: product.id,
          name: product.name
        },
        usingProductId: product.product_id !== undefined && product.product_id !== null
      });
      
      // Lấy giỏ hàng hiện tại để lưu lại (để khôi phục sau)
      const cartRes = await cart.getCart();
      let savedCartItems = [];
      
      if (cartRes.success) {
        const items = cartRes.data.items || [];
        console.log('[ProductCard] 📋 Current cart items:', items.length, items.map(item => ({
          product_id: item.product_id || item.product?.product_id || item.product?.id,
          name: item.product?.name || 'Unknown'
        })));
        
        // Lưu danh sách sản phẩm hiện tại (trừ sản phẩm "Mua ngay" nếu có)
        savedCartItems = items.filter(item => {
          const itemProductId = parseInt(item.product_id || item.product?.product_id || item.product?.id);
          const shouldKeep = itemProductId !== finalProductId;
          console.log('[ProductCard] 🔍 Filtering cart item:', {
            itemProductId,
            finalProductId,
            shouldKeep
          });
          return shouldKeep;
        });
        
        console.log('[ProductCard] 💾 Saving cart items to restore later:', savedCartItems.length, savedCartItems.map(item => ({
          product_id: item.product_id || item.product?.product_id || item.product?.id,
          name: item.product?.name || 'Unknown'
        })));
        
        // Lưu vào sessionStorage để khôi phục sau
        sessionStorage.setItem('savedCartItems', JSON.stringify(savedCartItems));
      }
      
      // Lưu thông tin "Mua ngay" vào sessionStorage
      const buyNowData = {
        productId: finalProductId,
        quantity: 1,
        timestamp: Date.now(), // Track when buyNow was called to prevent race conditions
      };
      sessionStorage.setItem('buyNowProduct', JSON.stringify(buyNowData));
      
      // Sử dụng API buyNow để clear cart và add sản phẩm trong một request
      const buyNowResult = await cart.buyNow(finalProductId, 1);
      
      if (!buyNowResult.success) {
        throw new Error(buyNowResult.message || 'Không thể mua ngay');
      }
      
      // Verify sản phẩm đã được thêm vào giỏ hàng
      await new Promise(resolve => setTimeout(resolve, 200));
      const verifyCartRes = await cart.getCart();
      if (verifyCartRes.success) {
        const verifyItems = verifyCartRes.data.items || [];
        console.log('[ProductCard] 🔍 Verifying cart after buy now:', {
          itemsCount: verifyItems.length,
          items: verifyItems.map(item => ({
            product_id: item.product_id || item.product?.product_id || item.product?.id,
            name: item.product?.name || 'Unknown',
            quantity: item.quantity
          })),
          expectedProductId: finalProductId
        });
        
        const verifyItem = verifyItems.find(item => {
          const itemProductId = parseInt(item.product_id || item.product?.product_id || item.product?.id);
          const match = itemProductId === finalProductId;
          console.log('[ProductCard] 🔍 Checking item:', {
            itemProductId,
            finalProductId,
            match
          });
          return match;
        });
        
        if (!verifyItem) {
          console.error('[ProductCard] ❌ Product not found in cart after buy now');
          message.error('Không thể thêm sản phẩm vào giỏ hàng. Vui lòng thử lại.');
          return;
        }
        
        // Verify quantity
        if (verifyItem.quantity !== 1) {
          console.log('[ProductCard] ⚠️ Quantity mismatch, updating:', {
            current: verifyItem.quantity,
            expected: 1
          });
          await cart.updateCartItem(finalProductId, 1);
        }
        
        console.log('[ProductCard] ✅ Verified product in cart:', {
          product_id: verifyItem.product_id || verifyItem.product?.product_id || verifyItem.product?.id,
          name: verifyItem.product?.name || 'Unknown',
          quantity: verifyItem.quantity
        });
      }
      
      // CartContext will automatically dispatch cartUpdated event with detail
      // Navigate to checkout
      navigate('/checkout');
    } catch (error) {
      console.error('Error in buy now:', error);
      message.error(error.message || 'Có lỗi xảy ra');
    } finally {
      setLoadingBuyNow(false);
    }
  }, [user, isOutOfStock, productId, navigate]);

  const handleWishlistToggle = useCallback(async (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (!user) {
      message.warning('Vui lòng đăng nhập để thêm vào yêu thích');
      window.dispatchEvent(new CustomEvent('openLoginModal', { detail: { tab: 'login' } }));
      return;
    }

    setLoadingWishlist(true);
    try {
      if (isInWishlist) {
        await wishlist.removeFromWishlist(productId);
        setIsInWishlist(false);
        message.success('Đã xóa khỏi danh sách yêu thích');
        if (onWishlistChange) {
          onWishlistChange(productId, false);
        }
      } else {
        await wishlist.addToWishlist(productId);
        setIsInWishlist(true);
        message.success('Đã thêm vào danh sách yêu thích');
        if (onWishlistChange) {
          onWishlistChange(productId, true);
        }
      }
    } catch (error) {
      console.error('Error updating wishlist:', error);
      message.error(error.message || 'Có lỗi xảy ra');
    } finally {
      setLoadingWishlist(false);
    }
  }, [user, isInWishlist, productId, navigate, onWishlistChange]);

  return (
    <div className="product-card-wrapper">
      <Link to={`/products/${productId}`} style={{ textDecoration: 'none', color: 'inherit' }}>
        <Card
          hoverable
          className="product-card"
          cover={
            <Badge.Ribbon 
              text={discountPercent > 0 ? `-${discountPercent}%` : null} 
              color="red"
              style={{ display: discountPercent > 0 ? 'block' : 'none' }}
            >
              <div style={{ position: 'relative', width: '100%', paddingTop: '100%', overflow: 'hidden', background: '#f5f5f5' }}>
                {primaryImage && primaryImage.startsWith('data:') ? (
                  // Use native img tag for base64 images to avoid Ant Design Image component issues
                  <img
                    alt={product.name || 'Sản phẩm'}
                    src={primaryImage}
                    loading="lazy"
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      display: 'block',
                    }}
                    onError={(e) => {
                      if (e.target && e.target.src !== '/placeholder.jpg') {
                        e.target.src = '/placeholder.jpg';
                      }
                    }}
                  />
                ) : (
                  // Use Ant Design Image for non-base64 images (URLs)
                  <Image
                    alt={product.name || 'Sản phẩm'}
                    src={primaryImage}
                    preview={false}
                    fallback="/placeholder.jpg"
                    loading="lazy"
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      display: 'block',
                    }}
                    onError={(e) => {
                      if (e.target && e.target.src !== '/placeholder.jpg') {
                        e.target.src = '/placeholder.jpg';
                      }
                    }}
                  />
                )}
                {isOutOfStock && (
                  <Tag 
                    color="error" 
                    style={{
                      position: 'absolute',
                      top: 8,
                      right: 8,
                      zIndex: 2,
                    }}
                  >
                    Hết hàng
                  </Tag>
                )}
                {showActions && (
                  <Button
                    type={isInWishlist ? 'primary' : 'default'}
                    danger={isInWishlist}
                    shape="circle"
                    icon={isInWishlist ? <HeartFilled /> : <HeartOutlined />}
                    size="large"
                    loading={loadingWishlist}
                    onClick={handleWishlistToggle}
                    style={{
                      position: 'absolute',
                      top: 8,
                      left: 8,
                      zIndex: 2,
                      boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                    }}
                  />
                )}
              </div>
            </Badge.Ribbon>
          }
        >
      <Meta
        title={
          <Text 
            ellipsis={{ tooltip: product.name }} 
            style={{ 
              fontSize: 16, 
              fontWeight: 500,
              display: 'block',
              marginBottom: 8,
            }}
          >
            {product.name}
          </Text>
        }
        description={
          <Space direction="vertical" size="small" style={{ width: '100%' }}>
            <Space size="small">
              <Rate disabled value={averageRating} allowHalf size="small" />
              <Text type="secondary" style={{ fontSize: 12 }}>
                ({totalReviews})
              </Text>
            </Space>
            
            <Space direction="vertical" size={4} style={{ width: '100%' }}>
              <Space size="small" wrap>
                {product.msrp && product.msrp > product.price && (
                  <Text delete type="secondary" style={{ fontSize: 14 }}>
                    {new Intl.NumberFormat('vi-VN', {
                      style: 'currency',
                      currency: 'VND',
                    }).format(product.msrp)}
                  </Text>
                )}
                <Text strong style={{ fontSize: 18, color: '#ff4d4f' }}>
                  {new Intl.NumberFormat('vi-VN', {
                    style: 'currency',
                    currency: 'VND',
                  }).format(product.price || 0)}
                </Text>
              </Space>
              
              <Space size="small">
                {!isOutOfStock ? (
                  <Tag color="success">Còn hàng</Tag>
                ) : (
                  <Tag color="error">Hết hàng</Tag>
                )}
              </Space>
            </Space>
          </Space>
        }
      />
        </Card>
      </Link>
      
      {showActions && (
        <div style={{ marginTop: 12 }}>
          <Space direction="vertical" size="small" style={{ width: '100%' }}>
            <Button
              type="primary"
              icon={<ThunderboltOutlined />}
              block
              loading={loadingBuyNow}
              onClick={handleBuyNow}
              disabled={isOutOfStock}
            >
              Mua ngay
            </Button>
            <Button
              icon={<ShoppingCartOutlined />}
              block
              loading={loadingCart}
              onClick={handleAddToCart}
              disabled={isOutOfStock}
            >
              Thêm giỏ hàng
            </Button>
          </Space>
        </div>
      )}
    </div>
  );
};

// Memoize component to prevent unnecessary re-renders
export default React.memo(ProductCard, (prevProps, nextProps) => {
  // Custom comparison function for better performance
  return (
    prevProps.product.product_id === nextProps.product.product_id &&
    prevProps.product.primary_image === nextProps.product.primary_image &&
    prevProps.product.price === nextProps.product.price &&
    prevProps.product.stock_quantity === nextProps.product.stock_quantity &&
    prevProps.showActions === nextProps.showActions &&
    prevProps.product.rating?.average_rating === nextProps.product.rating?.average_rating
  );
});
