import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Card,
  Form,
  Radio,
  Input,
  Button,
  Space,
  Typography,
  Spin,
  message,
  Row,
  Col,
  Divider,
  Empty,
  Tag,
  Image,
  Steps,
  List,
  Descriptions,
  Alert,
} from 'antd';
import {
  ShoppingCartOutlined,
  CheckOutlined,
  EnvironmentOutlined,
  CreditCardOutlined,
  TagOutlined,
  ArrowLeftOutlined,
  PlusOutlined,
} from '@ant-design/icons';
import { cart, address, coupon, order, payment } from '../../api/index.js';
import { useAuth } from '../../contexts/AuthContext.js';
import AddressFormWithMap from '../../components/AddressFormWithMap.js';
import './Checkout.scss';

const { Title, Text } = Typography;
const { Step } = Steps;

const Checkout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [form] = Form.useForm();
  const [addressForm] = Form.useForm();
  const [cartItems, setCartItems] = useState([]);
  const [addresses, setAddresses] = useState([]);
  const [couponCode, setCouponCode] = useState('');
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [couponData, setCouponData] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('momo');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [applyingCoupon, setApplyingCoupon] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const isMountedRef = useRef(true);
  const hasOrderBeenCreatedRef = useRef(false);

  // Effect để load data khi mount
  useEffect(() => {
    if (!user) {
      window.dispatchEvent(new CustomEvent('openLoginModal', { detail: { tab: 'login' } }));
      navigate('/');
      return;
    }
    loadData();
  }, [user]);

  // Effect riêng để handle cleanup khi rời khỏi checkout
  useEffect(() => {
    // Cleanup: Khôi phục giỏ hàng khi rời khỏi checkout
    return () => {
      // Sử dụng setTimeout để đảm bảo location đã được cập nhật
      setTimeout(() => {
        const currentPath = window.location.pathname;
        const buyNowProductStr = sessionStorage.getItem('buyNowProduct');
        
        // Chỉ restore khi:
        // 1. Đã rời khỏi checkout (currentPath !== '/checkout')
        // 2. Chưa tạo đơn hàng (hasOrderBeenCreatedRef.current === false)
        // 3. Có buyNowProduct trong sessionStorage
        if (currentPath !== '/checkout' && !hasOrderBeenCreatedRef.current && buyNowProductStr) {
          console.log('[Checkout] 🧹 Cleanup: Restoring cart on unmount (left checkout)');
          // Khôi phục giỏ hàng trong background
          const restoreCart = async () => {
            // BUG FIX: Only restore savedCartItems if NOT in buyNow flow
            // During buyNow flow, restoring would call addToCart which causes the bug
            const buyNowProductStr = sessionStorage.getItem('buyNowProduct');
            const isInBuyNowFlow = !!buyNowProductStr;
            
            if (!isInBuyNowFlow) {
              // Only restore saved cart items if we're NOT in a buyNow flow
              try {
                const savedCartItemsStr = sessionStorage.getItem('savedCartItems');
                if (savedCartItemsStr) {
                  const savedCartItems = JSON.parse(savedCartItemsStr);
                  console.log('[Checkout] 🧹 Restoring', savedCartItems.length, 'items (NOT in buyNow flow)');
                  
                  // Xóa giỏ hàng hiện tại
                  await cart.clearCart();
                  
                  // Khôi phục các sản phẩm đã lưu
                  for (const item of savedCartItems) {
                    const productId = item.product_id || item.product?.product_id || item.product?.id;
                    const quantity = item.quantity || 1;
                    if (productId) {
                      await cart.addToCart(productId, quantity);
                    }
                  }
                  
                  console.log('[Checkout] 🧹 Cart restored');
                  window.dispatchEvent(new CustomEvent('cartUpdated'));
                }
              } catch (e) {
                console.error('[Checkout] 🧹 Error restoring cart:', e);
              }
            } else {
              console.log('[Checkout] 🧹 Skipping cart restore - in buyNow flow');
            }
            
            // Xóa sessionStorage (only after processing)
            if (!isInBuyNowFlow) {
              sessionStorage.removeItem('buyNowProduct');
              sessionStorage.removeItem('savedCartItems');
            }
          };
          restoreCart();
        } else {
          console.log('[Checkout] 🧹 Cleanup: Skipping restore', {
            currentPath,
            isCheckout: currentPath === '/checkout',
            orderCreated: hasOrderBeenCreatedRef.current,
            hasBuyNow: !!buyNowProductStr
          });
        }
      }, 100);
    };
  }, [location.pathname]);

  const loadData = async () => {
    try {
      console.log('[Checkout] 🔄 loadData called');
      
      const [cartRes, addressesRes] = await Promise.all([
        cart.getCart(),
        address.getMyAddresses(),
      ]);

      if (cartRes.success) {
        const items = cartRes.data.items || [];
        console.log('[Checkout] 📦 Cart items loaded:', items.length);
        
        // Kiểm tra xem có sản phẩm "Mua ngay" không
        const buyNowProductStr = sessionStorage.getItem('buyNowProduct');
        if (buyNowProductStr) {
          try {
            const buyNowProduct = JSON.parse(buyNowProductStr);
            console.log('[Checkout] 🛒 Buy now product found:', buyNowProduct);
            
            // Đảm bảo giỏ hàng chỉ chứa sản phẩm "Mua ngay"
            // Xóa tất cả sản phẩm không phải "Mua ngay"
            const itemsToRemove = items.filter(item => {
              const itemProductId = item.product_id || item.product?.product_id || item.product?.id;
              return itemProductId !== buyNowProduct.productId;
            });
            
            if (itemsToRemove.length > 0) {
              console.log('[Checkout] 🗑️ Removing', itemsToRemove.length, 'non-buy-now items from cart');
              for (const item of itemsToRemove) {
                const itemProductId = item.product_id || item.product?.product_id || item.product?.id;
                if (itemProductId) {
                  await cart.removeFromCart(itemProductId);
                }
              }
              // Reload cart sau khi xóa
              const cleanedCartRes = await cart.getCart();
              if (cleanedCartRes.success) {
                const cleanedItems = cleanedCartRes.data.items || [];
                items = cleanedItems;
              }
            }
            
            // Chỉ hiển thị sản phẩm "Mua ngay" trong checkout
            const buyNowItem = items.find(item => {
              const itemProductId = item.product_id || item.product?.product_id || item.product?.id;
              const match = itemProductId === buyNowProduct.productId;
              console.log('[Checkout] 🔍 Checking item:', { itemProductId, buyNowProductId: buyNowProduct.productId, match });
              return match;
            });
            
            if (buyNowItem) {
              console.log('[Checkout] ✅ Found buy now item in cart');
              
              // Cập nhật số lượng nếu cần
              if (buyNowItem.quantity !== buyNowProduct.quantity) {
                console.log('[Checkout] 🔄 Updating quantity:', { current: buyNowItem.quantity, needed: buyNowProduct.quantity });
                await cart.updateCartItem(buyNowProduct.productId, buyNowProduct.quantity);
                // Reload cart để lấy số lượng mới
                const updatedCartRes = await cart.getCart();
                if (updatedCartRes.success) {
                  const updatedItems = updatedCartRes.data.items || [];
                  const updatedBuyNowItem = updatedItems.find(item => {
                    const itemProductId = item.product_id || item.product?.product_id || item.product?.id;
                    return itemProductId === buyNowProduct.productId;
                  });
                  console.log('[Checkout] ✅ Updated buy now item:', updatedBuyNowItem);
                  setCartItems(updatedBuyNowItem ? [updatedBuyNowItem] : [buyNowItem]);
                } else {
                  setCartItems([buyNowItem]);
                }
              } else {
                console.log('[Checkout] ✅ Quantity already correct, setting cart items');
                setCartItems([buyNowItem]);
              }
            } else {
              console.log('[Checkout] ⚠️ Buy now item not found in cart');
              
              // Check if buyNow was just called (within last 3 seconds)
              // This prevents race condition where checkout loads before buyNow API completes
              const buyNowTimestamp = buyNowProduct.timestamp || 0;
              const timeSinceBuyNow = Date.now() - buyNowTimestamp;
              const buyNowJustCalled = timeSinceBuyNow < 3000; // 3 seconds
              
              // Wait a bit for buyNow API to complete if it was just called
              if (buyNowJustCalled) {
                console.log('[Checkout] ⚠️ BuyNow was just called, waiting for API to complete...');
                await new Promise(resolve => setTimeout(resolve, 500));
              }
              
              // Check cart again after waiting
              const retryCartRes = await cart.getCart();
              if (retryCartRes.success) {
                const retryItems = retryCartRes.data.items || [];
                const retryBuyNowItem = retryItems.find(item => {
                  const itemProductId = item.product_id || item.product?.product_id || item.product?.id;
                  return itemProductId === buyNowProduct.productId;
                });
                
                if (retryBuyNowItem) {
                  console.log('[Checkout] ✅ Found buy now item after waiting');
                  setCartItems([retryBuyNowItem]);
                } else {
                  // BUG FIX: Only call addToCart if buyNow was NOT just called
                  // If buyNow was just called (< 3 seconds ago), it's still processing, don't call addToCart
                  const timeSinceBuyNow = Date.now() - buyNowTimestamp;
                  const buyNowStillProcessing = timeSinceBuyNow < 3000;
                  
                  if (buyNowStillProcessing) {
                    console.log('[Checkout] ⚠️ BuyNow still processing, NOT calling addToCart to avoid duplicate');
                    message.error('Đang xử lý đơn hàng, vui lòng đợi...');
                    // Clear buyNowProduct to prevent further issues
                    sessionStorage.removeItem('buyNowProduct');
                    sessionStorage.removeItem('savedCartItems');
                    setCartItems([]);
                  } else {
                    console.log('[Checkout] ⚠️ Buy now item still not found, attempting to add as fallback');
                    // Only add to cart as a last resort if buyNow API seems to have failed
                    try {
                      await cart.addToCart(buyNowProduct.productId, buyNowProduct.quantity);
                      console.log('[Checkout] ✅ Re-added buy now product to cart');
                      
                      // Reload cart để lấy sản phẩm vừa thêm
                      const finalCartRes = await cart.getCart();
                      if (finalCartRes.success) {
                        const finalItems = finalCartRes.data.items || [];
                        const finalBuyNowItem = finalItems.find(item => {
                          const itemProductId = item.product_id || item.product?.product_id || item.product?.id;
                          return itemProductId === buyNowProduct.productId;
                        });
                        
                        if (finalBuyNowItem) {
                          console.log('[Checkout] ✅ Found buy now item after addToCart fallback');
                          setCartItems([finalBuyNowItem]);
                        } else {
                          console.error('[Checkout] ❌ Still cannot find buy now item after addToCart fallback');
                          // Xóa buyNowProduct và hiển thị tất cả items
                          sessionStorage.removeItem('buyNowProduct');
                          sessionStorage.removeItem('savedCartItems');
                          setCartItems(finalItems);
                        }
                      } else {
                        console.error('[Checkout] ❌ Failed to reload cart after addToCart fallback');
                        sessionStorage.removeItem('buyNowProduct');
                        sessionStorage.removeItem('savedCartItems');
                        setCartItems(items);
                      }
                    } catch (retryError) {
                      console.error('[Checkout] ❌ Error in addToCart fallback:', retryError);
                      // Xóa buyNowProduct và hiển thị tất cả items
                      sessionStorage.removeItem('buyNowProduct');
                      sessionStorage.removeItem('savedCartItems');
                      setCartItems(items);
                    }
                  }
                }
              } else {
                console.error('[Checkout] ❌ Failed to reload cart after waiting');
                sessionStorage.removeItem('buyNowProduct');
                sessionStorage.removeItem('savedCartItems');
                setCartItems(items);
              }
            }
          } catch (e) {
            console.error('[Checkout] ❌ Error parsing buyNowProduct:', e);
            sessionStorage.removeItem('buyNowProduct');
            sessionStorage.removeItem('savedCartItems');
            setCartItems(items);
          }
        } else {
          console.log('[Checkout] ℹ️ No buy now product, showing all cart items');
          // Không có "Mua ngay", hiển thị tất cả sản phẩm trong giỏ hàng
          setCartItems(items);
        }
      }

      if (addressesRes.success) {
        const addrList = addressesRes.data || [];
        setAddresses(addrList);
        const defaultAddr = addrList.find((a) => a.is_default_shipping) || addrList[0];
        if (defaultAddr) {
          form.setFieldsValue({ addressId: defaultAddr.address_id });
          setCurrentStep(1);
        }
      }
    } catch (error) {
      console.error('[Checkout] Error loading checkout data:', error);
      message.error('Có lỗi xảy ra khi tải dữ liệu');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Clean address data - remove fields not in backend schema
   * Backend expects: full_name, phone, address_line1, address_line2, city, district, ward, province, postal_code, country
   * Remove: latitude, longitude, fullAddress, provinceName, wardName, address_id, user_id, is_default_shipping, created_at, updated_at
   * Note: address_line2 and postal_code are optional (DEFAULT NULL) - only include if provided
   * Note: Backend requires 'city' but form uses 'province'. If city is missing, use province value.
   */
  const cleanAddressData = (data) => {
    // Required fields that must be included
    const requiredFields = [
      'full_name',
      'phone',
      'address_line1',
      'city',
      'country',
    ];
    
    // Optional fields - only include if they have values
    const optionalFields = [
      'address_line2',
      'district',
      'ward',
      'province',
      'postal_code',
    ];
    
    const cleaned = {};
    
    // Add required fields
    requiredFields.forEach(field => {
      if (data[field] !== undefined && data[field] !== null && data[field] !== '') {
        cleaned[field] = data[field];
      }
    });
    
    // Add optional fields only if they have values (don't send empty/null/undefined)
    optionalFields.forEach(field => {
      if (data[field] !== undefined && data[field] !== null && data[field] !== '') {
        cleaned[field] = data[field];
      }
    });
    
    // Backend requires 'city' field. If not provided, use province value or empty string
    if (!cleaned.city && cleaned.province) {
      // Try to get province name from code if possible, otherwise use code
      cleaned.city = cleaned.province;
    } else if (!cleaned.city) {
      // If no city and no province, set empty string (backend will handle validation)
      cleaned.city = '';
    }
    
    // Ensure required fields have default values
    if (!cleaned.country) {
      cleaned.country = 'Việt Nam';
    }
    
    // Remove any fields that are not in the allowed list (extra safety check)
    const allAllowedFields = [...requiredFields, ...optionalFields];
    Object.keys(cleaned).forEach(key => {
      if (!allAllowedFields.includes(key)) {
        delete cleaned[key];
      }
    });
    
    return cleaned;
  };

  const handleAddAddress = async (values) => {
    try {
      // Clean data - remove unnecessary fields
      const cleanedData = cleanAddressData(values);
      
      // Check address limit before creating
      if (addresses.length >= 5) {
        message.error('Bạn chỉ có thể tạo tối đa 5 địa chỉ giao hàng. Vui lòng xóa một địa chỉ trước khi thêm mới.');
        return;
      }
      
      const response = await address.createAddress(cleanedData);
      
      if (response.success) {
        message.success('Thêm địa chỉ thành công');
        setShowAddressForm(false);
        addressForm.resetFields();
        
        // Reload addresses
        const addressesRes = await address.getMyAddresses();
        if (addressesRes.success) {
          const addrList = addressesRes.data || [];
          setAddresses(addrList);
          
          // Auto-select the newly created address
          // Try to find by address_id from response, otherwise use the last one (newest)
          const newAddressId = response.data?.address_id || response.data?.data?.address_id;
          const newAddress = newAddressId 
            ? addrList.find(a => a.address_id === newAddressId)
            : addrList[addrList.length - 1]; // Fallback to last address (newest)
          
          if (newAddress) {
            form.setFieldsValue({ addressId: newAddress.address_id });
            setCurrentStep(1);
          }
        }
      } else {
        message.error(response.message || 'Có lỗi xảy ra khi thêm địa chỉ');
      }
    } catch (error) {
      console.error('Error saving address:', error);
      // Check if error is about address limit
      const errorMessage = error?.message || error?.error || 'Có lỗi xảy ra';
      if (errorMessage.includes('tối đa') || errorMessage.includes('5 địa chỉ')) {
        message.error(errorMessage);
      } else {
        message.error('Có lỗi xảy ra khi thêm địa chỉ');
      }
    }
  };

  const handleApplyCoupon = async () => {
    if (!couponCode) {
      message.warning('Vui lòng nhập mã giảm giá');
      return;
    }
    
    setApplyingCoupon(true);
    try {
      // Calculate subtotal using unit_price (matching backend calculation)
      const total = cartItems.reduce((sum, item) => {
        const unitPrice = item.unit_price || 0;
        const quantity = item.quantity || 0;
        return sum + (unitPrice * quantity);
      }, 0);
      
      const response = await coupon.validateCoupon(couponCode, total);
      
      if (response.success && response.data) {
        const couponData = response.data;
        let discountAmount = 0;
        if (couponData.discount_percent > 0) {
          discountAmount = (total * parseFloat(couponData.discount_percent)) / 100;
          if (couponData.max_discount && discountAmount > couponData.max_discount) {
            discountAmount = couponData.max_discount;
          }
        } else {
          discountAmount = parseFloat(couponData.discount_amount || 0);
        }
        
        setCouponDiscount(discountAmount);
        setCouponData(couponData);
        message.success('Áp dụng mã giảm giá thành công');
      } else {
        message.error(response.message || 'Mã giảm giá không hợp lệ');
        setCouponDiscount(0);
        setCouponData(null);
      }
    } catch (error) {
      console.error('Error applying coupon:', error);
      message.error('Có lỗi xảy ra khi áp dụng mã giảm giá');
      setCouponDiscount(0);
      setCouponData(null);
    } finally {
      setApplyingCoupon(false);
    }
  };

  const handleSubmitOrder = async (values) => {
    if (!values.addressId) {
      message.error('Vui lòng chọn địa chỉ giao hàng');
      return;
    }
    
    if (cartItems.length === 0) {
      message.error('Giỏ hàng của bạn đang trống');
      navigate('/cart');
      return;
    }
    
    setSubmitting(true);
    try {
      // Payment method ID mapping: 1 = MOMO, 2 = COD
      const paymentMethodId = paymentMethod === 'momo' ? 1 : 2;
      
      const orderData = {
        shippingAddressId: values.addressId,
        paymentMethodId,
        couponCode: couponCode || null,
      };

      const orderRes = await order.createOrderFromCart(orderData);
      
      if (orderRes.success && orderRes.data) {
        console.log('[Checkout] ✅ Order created successfully');
        
        // Đánh dấu đã tạo đơn hàng để cleanup không restore cart
        hasOrderBeenCreatedRef.current = true;
        
        // Khôi phục giỏ hàng sau khi đặt hàng thành công (only if buyNow was used)
        // This is safe because order is already created, so restoring cart won't interfere
        const buyNowProductStr = sessionStorage.getItem('buyNowProduct');
        if (buyNowProductStr) {
          console.log('[Checkout] 🔄 Restoring saved cart items after order creation');
          try {
            const savedCartItemsStr = sessionStorage.getItem('savedCartItems');
            if (savedCartItemsStr) {
              const savedCartItems = JSON.parse(savedCartItemsStr);
              console.log('[Checkout] 📋 Restoring', savedCartItems.length, 'items');
              
              // Xóa giỏ hàng hiện tại
              await cart.clearCart();
              
              // Khôi phục các sản phẩm đã lưu
              for (const item of savedCartItems) {
                const productId = item.product_id || item.product?.product_id || item.product?.id;
                const quantity = item.quantity || 1;
                if (productId) {
                  await cart.addToCart(productId, quantity);
                }
              }
              
              console.log('[Checkout] ✅ Cart restored after order');
              window.dispatchEvent(new CustomEvent('cartUpdated'));
            }
          } catch (e) {
            console.error('[Checkout] ❌ [BUG-FIX] Error restoring cart:', e);
          }
        }
        
        // Xóa "buyNowProduct" và "savedCartItems" khỏi sessionStorage sau khi tạo đơn hàng thành công
        sessionStorage.removeItem('buyNowProduct');
        sessionStorage.removeItem('savedCartItems');
        
        // Handle both response structures: orderRes.data.order_id or orderRes.data.data.order_id
        const orderId = orderRes.data.order_id || orderRes.data.data?.order_id || orderRes.data.id;
        
        if (!orderId) {
          console.error('[Checkout] Order ID not found in response:', orderRes.data);
          message.error('Không thể lấy ID đơn hàng. Vui lòng thử lại.');
          return;
        }
        
        if (paymentMethod === 'momo') {
          // For MOMO: Create payment and redirect to payment URL
          try {
            const paymentRes = await payment.createMoMoPayment({
              orderId,
              returnUrl: `${window.location.origin}/orders/${orderId}`,
              notifyUrl: `${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/payments/momo/ipn`,
            });
            
            if (paymentRes.success && paymentRes.data?.payUrl) {
              // Redirect to MoMo payment page
              window.location.href = paymentRes.data.payUrl;
            } else {
              console.error('[Checkout] Failed to create payment request:', {
                resultCode: paymentRes.resultCode,
                message: paymentRes.message,
              });
              
              const errorMessage = paymentRes.message || 
                (paymentRes.resultCode ? `Lỗi từ MoMo (Code: ${paymentRes.resultCode})` : 'Có lỗi xảy ra khi tạo payment request');
              message.error(errorMessage);
              navigate(`/orders/${orderId}`);
            }
          } catch (paymentError) {
            console.error('[Checkout] Error creating MoMo payment:', paymentError);
            message.error('Có lỗi xảy ra khi tạo payment request. Đơn hàng đã được tạo.');
            navigate(`/orders/${orderId}`);
          }
        } else {
          // For COD: Order is created with PENDING status, navigate to order page
          message.success('Đặt hàng thành công');
          navigate(`/orders/${orderId}`);
        }
      } else {
        console.error('[Checkout] Order creation failed:', orderRes.message || orderRes.error);
        message.error(orderRes.message || 'Có lỗi xảy ra khi đặt hàng');
      }
    } catch (error) {
      console.error('Error submitting order:', error);
      const errorMessage = error.message || 'Có lỗi xảy ra khi đặt hàng';
      message.error(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 100 }}>
        <Spin size="large" />
      </div>
    );
  }

  // Calculate subtotal using unit_price (matching backend calculation)
  const subtotal = cartItems.reduce((sum, item) => {
    const unitPrice = item.unit_price || 0;
    const quantity = item.quantity || 0;
    return sum + (unitPrice * quantity);
  }, 0);
  const total = Math.max(0, subtotal - couponDiscount);

  return (
    <div className="checkout-page">
      <div className="container">
        <Space direction="vertical" size="large" style={{ width: '100%', marginBottom: 32 }}>
          <Button
            icon={<ArrowLeftOutlined />}
            onClick={() => navigate('/cart')}
          >
            Quay Lại Giỏ Hàng
          </Button>
          <Title level={2} style={{ margin: 0 }}>
            <ShoppingCartOutlined /> Thanh Toán
          </Title>
        </Space>

        <Card style={{ marginBottom: 24 }}>
          <Steps current={currentStep}>
            <Step title="Giỏ Hàng" icon={<ShoppingCartOutlined />} />
            <Step title="Địa Chỉ" icon={<EnvironmentOutlined />} />
            <Step title="Thanh Toán" icon={<CreditCardOutlined />} />
          </Steps>
        </Card>

        <Row gutter={[24, 24]}>
          <Col xs={24} lg={16}>
            <Form form={form} layout="vertical" onFinish={handleSubmitOrder}>
              <Card
                title={
                  <Space>
                    <EnvironmentOutlined />
                    <span>Địa Chỉ Giao Hàng</span>
                  </Space>
                }
                extra={
                  <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={() => {
                      if (addresses.length >= 5) {
                        message.warning('Bạn chỉ có thể tạo tối đa 5 địa chỉ giao hàng. Vui lòng xóa một địa chỉ trước khi thêm mới.');
                        return;
                      }
                      setShowAddressForm(!showAddressForm);
                      addressForm.resetFields();
                    }}
                    disabled={addresses.length >= 5 && !showAddressForm}
                  >
                    {showAddressForm ? 'Hủy' : 'Thêm Địa Chỉ'}
                  </Button>
                }
                style={{ marginBottom: 16 }}
              >
                {showAddressForm && (
                  <Card style={{ marginBottom: '24px', background: '#f8f9fa' }}>
                    <Form form={addressForm} layout="vertical">
                      <Form.Item name="full_name" label="Họ Tên" rules={[{ required: true, message: 'Vui lòng nhập họ tên' }]}>
                        <Input placeholder="Nhập họ tên" />
                      </Form.Item>
                      <Form.Item name="phone" label="Điện Thoại" rules={[{ required: true, message: 'Vui lòng nhập số điện thoại' }]}>
                        <Input placeholder="Nhập số điện thoại" />
                      </Form.Item>
                      <Form.Item name="country" label="Quốc Gia" rules={[{ required: true, message: 'Vui lòng nhập quốc gia' }]} initialValue="Việt Nam">
                        <Input placeholder="Nhập quốc gia" />
                      </Form.Item>
                      <AddressFormWithMap
                        form={addressForm}
                        onFinish={handleAddAddress}
                        onCancel={() => {
                          setShowAddressForm(false);
                          addressForm.resetFields();
                        }}
                        initialValues={{}}
                        showMap={true}
                        showSteps={true}
                      />
                    </Form>
                  </Card>
                )}

                {addresses.length >= 5 && !showAddressForm && (
                  <Alert
                    message="Bạn đã đạt giới hạn 5 địa chỉ giao hàng"
                    description="Để thêm địa chỉ mới, vui lòng xóa một địa chỉ hiện có trước."
                    type="info"
                    showIcon
                    style={{ marginBottom: '16px' }}
                  />
                )}

                {addresses.length === 0 && !showAddressForm ? (
                  <Empty
                    description="Bạn chưa có địa chỉ nào"
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                  >
                    <Button 
                      type="primary"
                      icon={<PlusOutlined />}
                      onClick={() => setShowAddressForm(true)}
                    >
                      Thêm Địa Chỉ
                    </Button>
                  </Empty>
                ) : addresses.length > 0 ? (
                  <Form.Item
                    name="addressId"
                    rules={[{ required: true, message: 'Vui lòng chọn địa chỉ giao hàng' }]}
                  >
                    <Radio.Group
                      onChange={(e) => {
                        form.setFieldsValue({ addressId: e.target.value });
                        setCurrentStep(1);
                      }}
                    >
                      <Space direction="vertical" style={{ width: '100%' }} size="middle">
                        {addresses.map((addr) => (
                          <Radio key={addr.address_id} value={addr.address_id}>
                            <Card size="small" style={{ marginTop: 8, backgroundColor: addr.is_default_shipping ? '#f6ffed' : '#fafafa' }}>
                              <Space direction="vertical" size="small" style={{ width: '100%' }}>
                                <Space>
                                  <Text strong>{addr.full_name}</Text>
                                  {addr.is_default_shipping && (
                                    <Tag color="green">Mặc định</Tag>
                                  )}
                                </Space>
                                <Text type="secondary">{addr.address_line1}</Text>
                                {addr.address_line2 && (
                                  <Text type="secondary">{addr.address_line2}</Text>
                                )}
                                <Text type="secondary">
                                  {[
                                    addr.ward,
                                    addr.district,
                                    addr.city,
                                    addr.province,
                                  ].filter(Boolean).join(', ')}
                                  {addr.postal_code && ` - ${addr.postal_code}`}
                                </Text>
                                {addr.country && (
                                  <Text type="secondary">{addr.country}</Text>
                                )}
                                <Text type="secondary">Điện thoại: {addr.phone}</Text>
                              </Space>
                            </Card>
                          </Radio>
                        ))}
                      </Space>
                    </Radio.Group>
                  </Form.Item>
                ) : null}
              </Card>

              <Card
                title={
                  <Space>
                    <CreditCardOutlined />
                    <span>Phương Thức Thanh Toán</span>
                  </Space>
                }
                style={{ marginBottom: 16 }}
              >
                <Radio.Group
                  value={paymentMethod}
                  onChange={(e) => {
                    setPaymentMethod(e.target.value);
                    setCurrentStep(2);
                  }}
                  style={{ width: '100%' }}
                >
                  <Space direction="vertical" style={{ width: '100%' }} size="middle">
                    <Radio.Button value="momo" style={{ width: '100%', height: 'auto', padding: '16px' }}>
                      <Space size="middle" style={{ width: '100%', justifyContent: 'space-between' }}>
                        <Space>
                          <img
                            src="https://developers.momo.vn/v3/web/images/logo.png"
                            alt="MoMo"
                            style={{ width: 32, height: 32, objectFit: 'contain' }}
                          />
                          <Text strong>Thanh toán qua MoMo</Text>
                        </Space>
                        <Tag color="processing">Khuyến nghị</Tag>
                      </Space>
                    </Radio.Button>
                    <Radio.Button value="cod" style={{ width: '100%', height: 'auto', padding: '16px' }}>
                      <Space size="middle">
                        <CreditCardOutlined style={{ fontSize: 24 }} />
                        <Text strong>Thanh toán khi nhận hàng (COD)</Text>
                      </Space>
                    </Radio.Button>
                  </Space>
                </Radio.Group>
              </Card>

              <Card
                title={
                  <Space>
                    <TagOutlined />
                    <span>Mã Giảm Giá</span>
                  </Space>
                }
              >
                <Space.Compact style={{ width: '100%' }}>
                  <Input
                    placeholder="Nhập mã giảm giá"
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value)}
                    disabled={!!couponData}
                  />
                  <Button
                    type="primary"
                    onClick={handleApplyCoupon}
                    loading={applyingCoupon}
                    disabled={!!couponData}
                  >
                    {couponData ? 'Đã Áp Dụng' : 'Áp Dụng'}
                  </Button>
                </Space.Compact>
                {couponData && (
                  <Space style={{ marginTop: 12, width: '100%' }} align="center">
                    <Tag color="success">
                      Đã áp dụng: {couponData.code} - Giảm{' '}
                      {new Intl.NumberFormat('vi-VN', {
                        style: 'currency',
                        currency: 'VND',
                      }).format(couponDiscount)}
                    </Tag>
                    <Button
                      type="link"
                      size="small"
                      onClick={() => {
                        setCouponCode('');
                        setCouponDiscount(0);
                        setCouponData(null);
                      }}
                    >
                      Xóa
                    </Button>
                  </Space>
                )}
              </Card>
            </Form>
          </Col>

          <Col xs={24} lg={8}>
            <Card
              title="Đơn Hàng"
              style={{ position: 'sticky', top: 100 }}
            >
              <List
                dataSource={cartItems}
                style={{ maxHeight: 400, overflowY: 'auto', marginBottom: 16 }}
                renderItem={(item) => {
                  // Use product_snapshot if product is not fully populated
                  let product = item.product || {};
                  let productSnapshot = null;
                  try {
                    if (item.product_snapshot) {
                      productSnapshot = typeof item.product_snapshot === 'string' 
                        ? JSON.parse(item.product_snapshot) 
                        : item.product_snapshot;
                      if (productSnapshot) {
                        product = {
                          ...product,
                          name: productSnapshot.name || product.name,
                          images: productSnapshot.images || product.images,
                          primary_image: productSnapshot.primary_image || product.primary_image,
                        };
                      }
                    }
                  } catch (e) {
                    console.warn('[Checkout] Error parsing product_snapshot:', e);
                  }
                  
                  // Parse images if needed
                  let images = [];
                  let primaryImage = '/placeholder.jpg';
                  
                  try {
                    // Try primary_image first
                    if (product.primary_image && typeof product.primary_image === 'string' && product.primary_image.trim() !== '') {
                      primaryImage = product.primary_image;
                    } else {
                      // Parse images array
                      if (product.images) {
                        if (typeof product.images === 'string') {
                          try {
                            images = JSON.parse(product.images);
                          } catch (e) {
                            console.warn('[Checkout] Failed to parse images JSON:', e);
                            images = [];
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
                          
                          if (primaryImageData) {
                            if (typeof primaryImageData === 'string' && primaryImageData.trim() !== '') {
                              primaryImage = primaryImageData;
                            } else if (primaryImageData.url && typeof primaryImageData.url === 'string' && primaryImageData.url.trim() !== '') {
                              primaryImage = primaryImageData.url;
                            } else if (primaryImageData.image_url && typeof primaryImageData.image_url === 'string' && primaryImageData.image_url.trim() !== '') {
                              primaryImage = primaryImageData.image_url;
                            }
                          }
                        }
                      }
                    }
                  } catch (e) {
                    console.error('[Checkout] Error parsing product images:', e);
                  }
                  
                  const productName = product.name || productSnapshot?.name || 'Sản phẩm';
                  const itemTotal = (item.unit_price || 0) * (item.quantity || 0);
                  
                  return (
                    <List.Item key={item.cart_item_id}>
                      <List.Item.Meta
                        avatar={
                          primaryImage && primaryImage.startsWith('data:') ? (
                            <img
                              src={primaryImage}
                              alt={productName}
                              style={{
                                width: 60,
                                height: 60,
                                objectFit: 'cover',
                                borderRadius: 8,
                                border: '1px solid #e8e8e8',
                              }}
                              onError={(e) => {
                                if (e.target && e.target.src !== '/placeholder.jpg') {
                                  e.target.src = '/placeholder.jpg';
                                }
                              }}
                            />
                          ) : (
                            <Image
                              src={primaryImage}
                              alt={productName}
                              width={60}
                              height={60}
                              preview={false}
                              style={{ borderRadius: 8 }}
                              fallback="/placeholder.jpg"
                            />
                          )
                        }
                        title={<Text strong>{productName}</Text>}
                        description={<Text type="secondary">Số lượng: x{item.quantity}</Text>}
                      />
                      <div>
                        <Text strong style={{ fontSize: 16, color: '#ff4d4f' }}>
                          {new Intl.NumberFormat('vi-VN', {
                            style: 'currency',
                            currency: 'VND',
                          }).format(itemTotal)}
                        </Text>
                      </div>
                    </List.Item>
                  );
                }}
              />
              <Divider />
              <Descriptions column={1} size="small" bordered>
                <Descriptions.Item label="Tạm tính">
                  <Text>
                    {new Intl.NumberFormat('vi-VN', {
                      style: 'currency',
                      currency: 'VND',
                    }).format(subtotal)}
                  </Text>
                </Descriptions.Item>
                {couponDiscount > 0 && (
                  <Descriptions.Item label="Giảm giá">
                    <Text type="success" strong>
                      -{new Intl.NumberFormat('vi-VN', {
                        style: 'currency',
                        currency: 'VND',
                      }).format(couponDiscount)}
                    </Text>
                  </Descriptions.Item>
                )}
                <Descriptions.Item label="Phí vận chuyển">
                  <Text type="success" strong>Miễn phí</Text>
                </Descriptions.Item>
                <Descriptions.Item label="Tổng cộng">
                  <Text strong style={{ fontSize: 18, color: '#ff4d4f' }}>
                    {new Intl.NumberFormat('vi-VN', {
                      style: 'currency',
                      currency: 'VND',
                    }).format(total)}
                  </Text>
                </Descriptions.Item>
              </Descriptions>
              <Button
                type="primary"
                block
                size="large"
                icon={<CheckOutlined />}
                onClick={() => form.submit()}
                loading={submitting}
                disabled={addresses.length === 0}
                style={{ marginTop: 16, height: 50, fontSize: 16, fontWeight: 600 }}
              >
                Đặt Hàng
              </Button>
            </Card>
          </Col>
        </Row>
      </div>
    </div>
  );
};

export default Checkout;
