import React, { useEffect, useState, useRef } from 'react';
import { useParams, Link, useNavigate, useLocation } from 'react-router-dom';
import {
  Card,
  Tag,
  Button,
  Space,
  Typography,
  Descriptions,
  Spin,
  Empty,
  Popconfirm,
  message,
  Row,
  Col,
  Image,
  Timeline,
  Divider,
  Table,
  Pagination,
  Tabs,
} from 'antd';
import {
  ArrowLeftOutlined,
  ShoppingOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  TruckOutlined,
  HomeOutlined,
  DollarOutlined,
} from '@ant-design/icons';
import { order, payment } from '../../api/index.js';
import { useAuth } from '../../contexts/AuthContext.js';
import './Orders.scss';

const { Title, Text } = Typography;

const Orders = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [allOrders, setAllOrders] = useState([]); // Store all orders for filtering
  const [orderDetail, setOrderDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0 });
  const [addressData, setAddressData] = useState(null); // Store vn-addresses.json data
  const [activeStatusId, setActiveStatusId] = useState(null); // null = all orders
  // Use sessionStorage to track reload across page reloads (persists until tab closes)
  const getReloadKey = (orderId) => `momo_reload_${orderId}`;
  const hasReloaded = (orderId) => {
    if (!orderId) return false;
    return sessionStorage.getItem(getReloadKey(orderId)) === 'true';
  };
  const setReloaded = (orderId) => {
    if (orderId) {
      sessionStorage.setItem(getReloadKey(orderId), 'true');
    }
  };

  useEffect(() => {
    if (!user) {
      window.dispatchEvent(new CustomEvent('openLoginModal', { detail: { tab: 'login' } }));
      navigate('/');
      return;
    }
    
    // Load address data for province/city name conversion
    loadAddressData();
    
    if (id) {
      loadOrderDetail();
    } else {
      loadOrders();
    }
  }, [id, user, location.search]);

  // Filter orders when activeStatusId or allOrders changes and apply pagination
  useEffect(() => {
    if (id) return; // Don't filter if viewing order detail
    
    let filteredOrders = allOrders;
    if (activeStatusId !== null && allOrders.length > 0) {
      filteredOrders = allOrders.filter(item => {
        const statusId = item.order_status_id || item.status_id;
        return statusId === activeStatusId;
      });
    }
    
    // Apply pagination to filtered orders
    const startIndex = (pagination.page - 1) * pagination.limit;
    const endIndex = startIndex + pagination.limit;
    const paginatedOrders = filteredOrders.slice(startIndex, endIndex);
    
    setOrders(paginatedOrders);
    setPagination((prev) => ({
      ...prev,
      total: filteredOrders.length,
    }));
  }, [activeStatusId, allOrders, pagination.page, pagination.limit, id]);

  // Load Vietnamese address data for converting codes to names
  const loadAddressData = async () => {
    try {
      const response = await fetch('/assets/vn-addresses.json');
      if (response.ok) {
        const data = await response.json();
        setAddressData(data);
      }
    } catch (error) {
      console.error('[Orders] Error loading address data:', error);
    }
  };

  // Convert province/city/ward code to name
  const getAddressName = (code, type = 'province') => {
    if (!code || !addressData) return code;
    
    try {
      if (type === 'province') {
        const province = addressData.find(p => p.Code === code);
        return province ? province.FullName : code;
      } else if (type === 'ward') {
        // Find ward across all provinces
        for (const province of addressData) {
          if (province.Wards) {
            const ward = province.Wards.find(w => w.Code === code);
            if (ward) {
              return ward.FullName;
            }
          }
        }
        return code;
      } else if (type === 'city') {
        // City might be the same as province code, or a separate code
        // Try to find as province first
        const province = addressData.find(p => p.Code === code);
        if (province) {
          return province.FullName;
        }
        // If not found, return as-is (might be a city name already)
        return code;
      }
    } catch (error) {
      console.error('[Orders] Error converting address code:', error);
    }
    
    return code;
  };

  const loadOrders = async () => {
    setLoading(true);
    try {
      // Load all orders with a high limit for filtering on client side
      const response = await order.getMyOrders(1, 1000);
      
      if (response.success) {
        const ordersData = response.data || [];
        
        // Store all orders for filtering
        setAllOrders(ordersData);
        
        // Auto-query MoMo payment status for Pending MoMo payments
        // This handles the case when user returns from MoMo payment before IPN callback completes
        const pendingMoMoOrders = ordersData.filter(orderItem => 
          orderItem.payment && 
          (orderItem.payment.gateway === 'momo' || orderItem.payment.gateway === 'MOMO') &&
          parseInt(orderItem.payment.payment_status_id) === 1
        );
        
        if (pendingMoMoOrders.length > 0) {
          // Add a small delay to allow IPN callback to complete if it's in progress
          setTimeout(() => {
            // Query status for all pending MoMo payments in parallel (but don't block UI)
            let hasStatusUpdate = false;
            Promise.all(
              pendingMoMoOrders.map(async (orderItem) => {
                try {
                  // Validate order_id before querying
                  if (!orderItem.order_id) {
                    return;
                  }
                  
                  const queryResult = await payment.queryMoMoStatus(orderItem.order_id);
                  
                  // Check if query was successful and payment status is paid
                  // Use paymentStatusId from response (more reliable than status string)
                  const responsePaymentStatusId = queryResult?.data?.paymentStatusId;
                  const paidStatusId = 2; // Default Paid status ID (backend will ensure this exists)
                  const isPaid = responsePaymentStatusId === paidStatusId || parseInt(responsePaymentStatusId) === paidStatusId;
                  
                  if (queryResult?.success && (queryResult?.data?.status === 'paid' || isPaid)) {
                    hasStatusUpdate = true;
                  }
                } catch (queryError) {
                  // Don't throw - just continue with other orders
                }
              })
            ).then(() => {
              // Only refresh once after all queries complete if any status was updated
              if (hasStatusUpdate) {
                // Add a small delay to ensure database transaction has committed
                setTimeout(() => {
                  order.getMyOrders(1, 1000).then(refreshResponse => {
                    if (refreshResponse.success && refreshResponse.data) {
                      setAllOrders(refreshResponse.data);
                      message.success('Trạng thái thanh toán đã được cập nhật');
                    }
                  }).catch(() => {
                    // Silently fail - user can manually refresh
                  });
                }, 300); // Small delay to ensure DB transaction committed
              }
              }).catch(() => {
                // Silently fail
              });
          }, 500); // Small delay to allow IPN callback to complete
        }
        // Pagination will be updated in useEffect after filtering
      } else {
        message.error(response.message || 'Có lỗi xảy ra khi tải đơn hàng');
      }
    } catch (error) {
      const errorMessage = error.message || 'Có lỗi xảy ra khi tải đơn hàng';
      message.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const loadOrderDetail = async () => {
    setLoading(true);
    try {
      const [orderResponse, paymentResponse] = await Promise.all([
        order.getMyOrderById(id),
        payment.getPaymentByOrder(id).catch(() => ({ success: false, data: null })), // Fetch payment, ignore if fails
      ]);
      
      if (orderResponse.success) {
        // Normalize items field - backend may return 'items' or 'order_items'
        const orderData = orderResponse.data;
        if (orderData.items && !orderData.order_items) {
          orderData.order_items = orderData.items;
        }
        
        // Debug: Log order items to check image data
        const items = orderData.order_items || orderData.items || [];
        console.log('[Orders] 📦 Order items received:', {
          itemsCount: items.length,
          firstItem: items[0] ? {
            order_item_id: items[0].order_item_id,
            product_id: items[0].product_id,
            hasProduct: !!items[0].product,
            productName: items[0].product?.name,
            hasPrimaryImage: !!items[0].product?.primary_image,
            primaryImageType: typeof items[0].product?.primary_image,
            hasImages: !!items[0].product?.images,
            imagesType: typeof items[0].product?.images,
            imagesIsArray: Array.isArray(items[0].product?.images),
            hasProductSnapshot: !!items[0].product_snapshot,
          } : 'no items',
        });
        
        // Fetch payment if not included in order response
        if (!orderData.payment && !orderData.payments) {
          if (paymentResponse.success && paymentResponse.data) {
            // Normalize payment - backend may return array or single object
            const paymentData = Array.isArray(paymentResponse.data) ? paymentResponse.data[0] : paymentResponse.data;
            orderData.payment = paymentData;
          }
        } else if (orderData.payments && Array.isArray(orderData.payments) && orderData.payments.length > 0) {
          // Select primary payment: prefer paid payment (status_id = 2), otherwise use most recent
          const paidPayment = orderData.payments.find(p => parseInt(p.payment_status_id) === 2);
          orderData.payment = paidPayment || orderData.payments[0];
        } else if (orderData.payment) {
          // Ensure payment_status_id is properly parsed
          if (orderData.payment.payment_status_id && typeof orderData.payment.payment_status_id === 'string') {
            orderData.payment.payment_status_id = parseInt(orderData.payment.payment_status_id);
          }
        }
        
        // [REQUIREMENT] Reload page once when MoMo payment is successful
        // Check if this is a return from MoMo payment and reload page once
        // IMPORTANT: Check hasReloaded FIRST to prevent multiple reloads
        if (orderData.payment && 
            (orderData.payment.gateway === 'momo' || orderData.payment.gateway === 'MOMO')) {
          
          // Early return if already reloaded
          if (hasReloaded(id)) {
          } else {
            const paymentStatusId = parseInt(orderData.payment.payment_status_id);
            const isPaid = paymentStatusId === 2;
            const isPending = paymentStatusId === 1;
            
            
            // Case 1: Payment is already paid (IPN callback completed before user returned)
            if (isPaid) {
              // Set reloaded flag IMMEDIATELY to prevent race condition
              setReloaded(id);
              message.success('Thanh toán thành công!');
              setTimeout(() => {
                window.location.reload();
              }, 1000);
            }
            // Case 2: Payment is still pending (need to query status)
            else if (isPending) {
              try {
                // Add a small delay to allow IPN callback to complete if it's in progress
                await new Promise(resolve => setTimeout(resolve, 500));
                
                // Double-check: if already reloaded during the delay, skip
                if (hasReloaded(id)) {
                  return;
                }
                
                const queryResult = await payment.queryMoMoStatus(id);
                
                // Triple-check: if already reloaded during query, skip
                if (hasReloaded(id)) {
                  return;
                }
                
                // Use paymentStatusId from response (more reliable than status string)
                const responsePaymentStatusId = queryResult.data?.paymentStatusId;
                const paidStatusId = 2; // Default Paid status ID (backend will ensure this exists)
                const isPaid = responsePaymentStatusId === paidStatusId || parseInt(responsePaymentStatusId) === paidStatusId;
                const statusIsPaid = queryResult.data?.status === 'paid';
                
                if (queryResult.success && (statusIsPaid || isPaid)) {
                  // Set reloaded flag IMMEDIATELY to prevent race condition
                  setReloaded(id);
                  
                  // Reload order to get updated payment status from backend
                  const updatedOrderResponse = await order.getMyOrderById(id);
                  if (updatedOrderResponse.success) {
                    const updatedOrderData = updatedOrderResponse.data;
                    if (updatedOrderData.items && !updatedOrderData.order_items) {
                      updatedOrderData.order_items = updatedOrderData.items;
                    }
                    
                    // Re-fetch payment to ensure we have the latest status
                    const updatedPaymentResponse = await payment.getPaymentByOrder(id).catch(() => ({ success: false, data: null }));
                    if (updatedPaymentResponse.success && updatedPaymentResponse.data) {
                      const updatedPaymentData = Array.isArray(updatedPaymentResponse.data) ? updatedPaymentResponse.data[0] : updatedPaymentResponse.data;
                      // Ensure payment_status_id is properly set
                      if (updatedPaymentData.payment_status_id) {
                        updatedPaymentData.payment_status_id = parseInt(updatedPaymentData.payment_status_id);
                      }
                      // If payment is paid, ensure status_id is 2
                      if (isPaid && updatedPaymentData.payment_status_id !== 2) {
                        updatedPaymentData.payment_status_id = 2;
                      }
                      updatedOrderData.payment = updatedPaymentData;
                    } else if (updatedOrderData.payment) {
                      // If payment fetch failed but we have payment from order, ensure status is correct
                      if (isPaid && updatedOrderData.payment.payment_status_id !== 2) {
                        updatedOrderData.payment.payment_status_id = 2;
                      }
                    }
                    
                    // Update orderData with the refreshed data
                    Object.assign(orderData, updatedOrderData);
                    
                    // Update state immediately before reload to show correct status
                    setOrderDetail(orderData);
                    
                    message.success('Thanh toán thành công!');
                    setTimeout(() => {
                      window.location.reload();
                    }, 1000);
                  }
                }
              } catch (queryError) {
                // Silently fail - user can manually refresh
              }
            }
          }
        }
        
        setOrderDetail(orderData);
      } else {
        message.error(orderResponse.message || 'Không tìm thấy đơn hàng');
        navigate('/orders');
      }
    } catch (error) {
      const errorMessage = error.message || 'Có lỗi xảy ra khi tải chi tiết đơn hàng';
      message.error(errorMessage);
      navigate('/orders');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelOrder = async (orderId) => {
    try {
      await order.cancelMyOrder(orderId);
      message.success('Hủy đơn hàng thành công');
      if (id) {
        loadOrderDetail();
      } else {
        // Reload all orders to get updated status
        loadOrders();
      }
    } catch (error) {
      console.error('Error canceling order:', error);
      message.error('Có lỗi xảy ra');
    }
  };

  const handleRetryMoMoPayment = async (orderId) => {
    try {
      message.loading({ content: 'Đang tạo yêu cầu thanh toán...', key: 'retryPayment' });
      
      const paymentRes = await payment.createMoMoPayment({
        orderId,
        returnUrl: `${window.location.origin}/orders/${orderId}`,
        notifyUrl: `${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/payments/momo/ipn`,
      });
      
      if (paymentRes.success && paymentRes.data?.payUrl) {
        message.success({ content: 'Đang chuyển hướng đến trang thanh toán...', key: 'retryPayment' });
        // Redirect to MoMo payment page
        window.location.href = paymentRes.data.payUrl;
      } else {
        message.error({ 
          content: paymentRes.message || 'Có lỗi xảy ra khi tạo yêu cầu thanh toán', 
          key: 'retryPayment',
          duration: 5 
        });
      }
    } catch (paymentError) {
      console.error('[Orders] Error retrying MoMo payment:', paymentError);
      message.error({ 
        content: 'Có lỗi xảy ra khi tạo yêu cầu thanh toán. Vui lòng thử lại sau.', 
        key: 'retryPayment',
        duration: 5 
      });
    }
  };

  // Check if order has failed MoMo payment (MoMo gateway + Pending status)
  const hasFailedMoMoPayment = (orderItem) => {
    if (!orderItem.payment) return false;
    const gateway = orderItem.payment.gateway;
    const paymentStatusId = parseInt(orderItem.payment.payment_status_id);
    return (gateway === 'momo' || gateway === 'MOMO') && paymentStatusId === 1;
  };

  const getStatusConfig = (statusId, statusName, orderStatus) => {
    // Support both status_id and order_status_id
    const actualStatusId = statusId || (orderStatus?.status_id);
    const actualStatusName = statusName || orderStatus?.name || orderStatus?.status_name || 'Không xác định';
    
    const statusMap = {
      1: { color: 'warning', text: 'Chờ Xác Nhận', icon: <CheckCircleOutlined /> },
      2: { color: 'processing', text: 'Đã Xác Nhận', icon: <CheckCircleOutlined /> },
      3: { color: 'blue', text: 'Đang Giao', icon: <TruckOutlined /> },
      4: { color: 'success', text: 'Đã Giao', icon: <HomeOutlined /> },
      5: { color: 'error', text: 'Đã Hủy', icon: <CloseCircleOutlined /> },
      6: { color: 'default', text: 'Đã Trả', icon: <CloseCircleOutlined /> },
    };
    return statusMap[actualStatusId] || { color: 'default', text: actualStatusName, icon: null };
  };

  // Helper function to parse product image - same logic as Cart.js and ProductCard.js
  const parseProductImage = (product, productSnapshot = null) => {
    // Merge product with snapshot (snapshot takes precedence only if it has valid values)
    let mergedProduct = { ...product };
    if (productSnapshot) {
      mergedProduct = {
        ...mergedProduct,
        name: (productSnapshot.name && productSnapshot.name.trim() !== '') ? productSnapshot.name : mergedProduct.name,
        price: (productSnapshot.price !== undefined && productSnapshot.price !== null) ? productSnapshot.price : mergedProduct.price,
        // Only use snapshot images if they are valid (not null/undefined/empty)
        images: (productSnapshot.images !== undefined && 
                 productSnapshot.images !== null && 
                 (Array.isArray(productSnapshot.images) || 
                  typeof productSnapshot.images === 'string' ||
                  (typeof productSnapshot.images === 'object' && Object.keys(productSnapshot.images).length > 0))
                ) ? productSnapshot.images : mergedProduct.images,
        // Only use snapshot primary_image if it's a valid string (not null/undefined/empty)
        primary_image: (productSnapshot.primary_image && 
                       typeof productSnapshot.primary_image === 'string' && 
                       productSnapshot.primary_image.trim() !== '') 
                      ? productSnapshot.primary_image 
                      : mergedProduct.primary_image,
      };
    }
    
    let primaryImage = '/placeholder.jpg';
    
    try {
      // Try primary_image first
      if (mergedProduct.primary_image && typeof mergedProduct.primary_image === 'string' && mergedProduct.primary_image.trim() !== '') {
        primaryImage = mergedProduct.primary_image;
      } else {
        // Parse images array only if primary_image is not available
        let images = [];
        if (mergedProduct.images) {
          if (typeof mergedProduct.images === 'string') {
            try {
              images = JSON.parse(mergedProduct.images);
            } catch (e) {
              // Silently fail
            }
          } else if (Array.isArray(mergedProduct.images)) {
            images = mergedProduct.images;
          } else if (typeof mergedProduct.images === 'object' && mergedProduct.images !== null) {
            // Try to convert object to array if it has numeric keys
            const keys = Object.keys(mergedProduct.images);
            if (keys.length > 0) {
              // Check if keys are numeric (array-like object)
              const numericKeys = keys.filter(k => !isNaN(parseInt(k)));
              if (numericKeys.length === keys.length) {
                images = keys.map(k => mergedProduct.images[k]).filter(Boolean);
              } else {
                // Try to extract values as array
                images = Object.values(mergedProduct.images).filter(v => v !== null && v !== undefined);
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
          if (mergedProduct.image && typeof mergedProduct.image === 'string' && mergedProduct.image.trim() !== '') {
            primaryImage = mergedProduct.image;
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

  const orderItemColumns = [
    {
      title: 'Sản Phẩm',
      key: 'product',
      render: (_, record) => {
        // Try to get product from product_snapshot if product is not populated
        let product = record.product || {};
        let productName = product.name || 'Sản phẩm';
        let productSku = product.sku || '';
        
        // Parse product_snapshot
        let productSnapshot = null;
        if (record.product_snapshot) {
          try {
            productSnapshot = typeof record.product_snapshot === 'string' 
              ? JSON.parse(record.product_snapshot) 
              : record.product_snapshot;
            if (productSnapshot) {
              if (productSnapshot.name || productSnapshot.product_name) {
                productName = productSnapshot.name || productSnapshot.product_name;
              }
              if (productSnapshot.sku) {
                productSku = productSnapshot.sku;
              }
            }
          } catch (e) {
            // Ignore parse errors
          }
        }
        
        // Parse image using helper function
        const primaryImage = parseProductImage(product, productSnapshot);
        
        return (
          <div className="order-item-product">
            <Image
              src={primaryImage}
              alt={productName}
              width={60}
              height={60}
              preview={false}
              className="product-thumbnail"
              fallback="/placeholder.jpg"
              loading="lazy"
              onError={(e) => {
                if (e.target && e.target.src !== '/placeholder.jpg') {
                  e.target.src = '/placeholder.jpg';
                }
              }}
            />
            <div className="product-info">
              <Text strong>{productName}</Text>
              {productSku && (
                <>
                  <br />
                  <Text type="secondary" style={{ fontSize: '12px' }}>SKU: {productSku}</Text>
                </>
              )}
            </div>
          </div>
        );
      },
    },
    {
      title: 'Giá',
      dataIndex: 'unit_price',
      key: 'unit_price',
      render: (price, record) => {
        const priceValue = price || record.unit_price_snapshot || 0;
        return new Intl.NumberFormat('vi-VN', {
          style: 'currency',
          currency: 'VND',
        }).format(priceValue);
      },
    },
    {
      title: 'Số Lượng',
      dataIndex: 'quantity',
      key: 'quantity',
    },
    {
      title: 'Thành Tiền',
      dataIndex: 'total_price',
      key: 'total_price',
      render: (total, record) => {
        const calculatedTotal = total || record.total_price_snapshot || (record.unit_price || record.unit_price_snapshot || 0) * (record.quantity || 0);
        return new Intl.NumberFormat('vi-VN', {
          style: 'currency',
          currency: 'VND',
        }).format(calculatedTotal);
      },
    },
  ];

  if (loading) {
    return (
      <div className="orders-loading">
        <Spin size="large" />
      </div>
    );
  }

  if (id && orderDetail) {
    const statusConfig = getStatusConfig(
      orderDetail.order_status_id || orderDetail.status_id,
      orderDetail.order_status?.name || orderDetail.order_status?.status_name,
      orderDetail.order_status
    );

    return (
      <div className="orders-page">
        <div className="container">
          <div className="order-detail-header">
            <Button
              icon={<ArrowLeftOutlined />}
              onClick={() => navigate('/orders')}
              style={{ marginBottom: '16px' }}
            >
              Quay Lại
            </Button>
            <Title level={2} className="page-title">
              Chi Tiết Đơn Hàng #{orderDetail.order_number}
            </Title>
          </div>

          <Row gutter={[24, 24]}>
            <Col xs={24} lg={16}>
              <Card title="Sản Phẩm" className="order-detail-card">
                <Table
                  columns={orderItemColumns}
                  dataSource={orderDetail.order_items || orderDetail.items || []}
                  rowKey="order_item_id"
                  pagination={false}
                />
              </Card>

              {orderDetail.status_history && (
                <Card title="Lịch Sử Trạng Thái" className="order-detail-card" style={{ marginTop: '24px' }}>
                  <Timeline>
                    {(() => {
                      try {
                        const history = typeof orderDetail.status_history === 'string'
                          ? JSON.parse(orderDetail.status_history)
                          : orderDetail.status_history;
                        return Array.isArray(history) ? history : [];
                      } catch (e) {
                        return [];
                      }
                    })().map((item, index) => {
                      const statusConfig = getStatusConfig(item.status_id);
                      return (
                        <Timeline.Item
                          key={index}
                          color={statusConfig.color}
                          dot={statusConfig.icon}
                        >
                          <Text strong>{statusConfig.text}</Text>
                          <br />
                          <Text type="secondary">
                            {new Date(item.changed_at).toLocaleString('vi-VN')}
                          </Text>
                        </Timeline.Item>
                      );
                    })}
                  </Timeline>
                </Card>
              )}
            </Col>

            <Col xs={24} lg={8}>
              <Card title="Thông Tin Đơn Hàng" className="order-detail-card">
                <Descriptions column={1} size="small" bordered>
                  <Descriptions.Item label="Mã đơn">
                    <Text strong>{orderDetail.order_number}</Text>
                  </Descriptions.Item>
                  <Descriptions.Item label="Ngày đặt">
                    {new Date(orderDetail.created_at).toLocaleString('vi-VN')}
                  </Descriptions.Item>
                  <Descriptions.Item label="Trạng thái">
                    <Tag color={statusConfig.color} icon={statusConfig.icon}>
                      {statusConfig.text}
                    </Tag>
                  </Descriptions.Item>
                  <Descriptions.Item label="Tổng tiền">
                    <Text strong style={{ fontSize: '20px', color: '#ff4d4f' }}>
                      {new Intl.NumberFormat('vi-VN', {
                        style: 'currency',
                        currency: 'VND',
                      }).format(orderDetail.total_amount || 0)}
                    </Text>
                  </Descriptions.Item>
                  {orderDetail.discount_amount > 0 && (
                    <Descriptions.Item label="Giảm giá">
                      <Text type="success">
                        -{new Intl.NumberFormat('vi-VN', {
                          style: 'currency',
                          currency: 'VND',
                        }).format(orderDetail.discount_amount || 0)}
                      </Text>
                    </Descriptions.Item>
                  )}
                  {orderDetail.shipping_fee > 0 && (
                    <Descriptions.Item label="Phí vận chuyển">
                      {new Intl.NumberFormat('vi-VN', {
                        style: 'currency',
                        currency: 'VND',
                      }).format(orderDetail.shipping_fee || 0)}
                    </Descriptions.Item>
                  )}
                  {orderDetail.tax_amount > 0 && (
                    <Descriptions.Item label="Thuế">
                      {new Intl.NumberFormat('vi-VN', {
                        style: 'currency',
                        currency: 'VND',
                      }).format(orderDetail.tax_amount || 0)}
                    </Descriptions.Item>
                  )}
                  {orderDetail.coupon_id && (
                    <Descriptions.Item label="Mã giảm giá">
                      {orderDetail.coupon?.code || `ID: ${orderDetail.coupon_id}`}
                    </Descriptions.Item>
                  )}
                  {orderDetail.payment && (() => {
                    // Determine payment status text and color based on payment_status_id
                    const paymentStatusId = parseInt(orderDetail.payment.payment_status_id);
                    const isPaid = paymentStatusId === 2;
                    const isPending = paymentStatusId === 1;
                    
                    // Get status text from payment_status object if available, otherwise determine from status_id
                    let statusText = orderDetail.payment.payment_status?.name || 
                                    orderDetail.payment.payment_status?.status_name || 
                                    orderDetail.payment.status?.name || 
                                    orderDetail.payment.status?.status_name;
                    
                    // Fallback: Determine text from status_id if payment_status object is missing
                    if (!statusText) {
                      if (isPaid) {
                        statusText = 'Đã thanh toán';
                      } else if (isPending) {
                        statusText = 'Chưa thanh toán';
                      } else {
                        statusText = 'Chưa thanh toán';
                      }
                    }
                    
                    return (
                      <Descriptions.Item label="Thanh toán">
                        <Space direction="vertical" size="small">
                          <Text>{orderDetail.payment.gateway || 'N/A'}</Text>
                          <Tag color={isPaid ? 'success' : 'warning'}>
                            {statusText}
                          </Tag>
                        {hasFailedMoMoPayment(orderDetail) && (
                          <Button
                            type="primary"
                            icon={<DollarOutlined />}
                            onClick={() => handleRetryMoMoPayment(orderDetail.order_id)}
                            size="small"
                            style={{ marginTop: '8px' }}
                          >
                            Thanh Toán Lại
                          </Button>
                        )}
                      </Space>
                    </Descriptions.Item>
                    );
                  })()}
                </Descriptions>
              </Card>

              <Card 
                title={
                  <Space>
                    <HomeOutlined />
                    <span>Địa Chỉ Giao Hàng</span>
                  </Space>
                } 
                className="order-detail-card" 
                style={{ marginTop: '24px' }}
              >
                {orderDetail.shipping_address ? (
                  <Descriptions column={1} size="small" bordered>
                    <Descriptions.Item label="Người nhận">
                      <Text strong>{orderDetail.shipping_address.full_name || 'N/A'}</Text>
                    </Descriptions.Item>
                    <Descriptions.Item label="Điện thoại">
                      {orderDetail.shipping_address.phone || 'N/A'}
                    </Descriptions.Item>
                    <Descriptions.Item label="Địa chỉ">
                      <div>
                        {orderDetail.shipping_address.address_line1 || ''}
                        {orderDetail.shipping_address.address_line2 && (
                          <div style={{ marginTop: '4px', color: '#666' }}>
                            {orderDetail.shipping_address.address_line2}
                          </div>
                        )}
                      </div>
                    </Descriptions.Item>
                    <Descriptions.Item label="Thành phố/Tỉnh">
                      {(() => {
                        const addressParts = [];
                        
                        // Ward (Phường/Xã)
                        if (orderDetail.shipping_address.ward) {
                          const wardName = getAddressName(orderDetail.shipping_address.ward, 'ward');
                          addressParts.push(wardName);
                        }
                        
                        // District (Quận/Huyện)
                        if (orderDetail.shipping_address.district) {
                          addressParts.push(orderDetail.shipping_address.district);
                        }
                        
                        // City (Thành phố)
                        if (orderDetail.shipping_address.city) {
                          const cityName = getAddressName(orderDetail.shipping_address.city, 'city');
                          addressParts.push(cityName);
                        }
                        
                        // Province (Tỉnh) - only add if different from city
                        if (orderDetail.shipping_address.province) {
                          const provinceName = getAddressName(orderDetail.shipping_address.province, 'province');
                          // Only add province if it's different from city
                          if (!orderDetail.shipping_address.city || provinceName !== getAddressName(orderDetail.shipping_address.city, 'city')) {
                            addressParts.push(provinceName);
                          }
                        }
                        
                        const addressText = addressParts.length > 0 
                          ? addressParts.join(', ')
                          : 'N/A';
                        
                        return (
                          <>
                            {addressText}
                            {orderDetail.shipping_address.postal_code && ` - ${orderDetail.shipping_address.postal_code}`}
                          </>
                        );
                      })()}
                    </Descriptions.Item>
                    {orderDetail.shipping_address.country && (
                      <Descriptions.Item label="Quốc gia">
                        {orderDetail.shipping_address.country}
                      </Descriptions.Item>
                    )}
                  </Descriptions>
                ) : (
                  <Empty description="Chưa có địa chỉ giao hàng" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                )}
              </Card>

              {/* Hiển thị nút thanh toán lại nếu đơn hàng thanh toán MoMo thất bại */}
              {hasFailedMoMoPayment(orderDetail) && (
                <Card className="order-detail-card" style={{ marginTop: '24px' }}>
                  <Button
                    type="primary"
                    block
                    size="large"
                    icon={<DollarOutlined />}
                    onClick={() => handleRetryMoMoPayment(orderDetail.order_id)}
                  >
                    Thanh Toán Lại Bằng MoMo
                  </Button>
                </Card>
              )}
              {/* [REQUIREMENT] Chỉ hiển thị nút hủy khi order ở trạng thái PENDING (chờ xác nhận) */}
              {(orderDetail.order_status_id === 1 || orderDetail.status_id === 1) && (
                <Card className="order-detail-card" style={{ marginTop: '24px' }}>
                  <Popconfirm
                    title="Bạn có chắc muốn hủy đơn hàng này?"
                    onConfirm={() => handleCancelOrder(orderDetail.order_id)}
                    okText="Hủy"
                    cancelText="Không"
                  >
                    <Button danger block size="large" icon={<CloseCircleOutlined />}>
                      Hủy Đơn Hàng
                    </Button>
                  </Popconfirm>
                </Card>
              )}
            </Col>
          </Row>
        </div>
      </div>
    );
  }

  // Tab items for order status filtering
  const statusTabs = [
    { key: 'all', label: 'Tất Cả', statusId: null },
    { key: '1', label: 'Chờ Xác Nhận', statusId: 1 },
    { key: '2', label: 'Đã Xác Nhận', statusId: 2 },
    { key: '3', label: 'Đang Giao', statusId: 3 },
    { key: '4', label: 'Đã Giao', statusId: 4 },
    { key: '5', label: 'Đã Hủy', statusId: 5 },
    { key: '6', label: 'Trả Hàng', statusId: 6 },
    { key: '8', label: 'Hoàn Thành', statusId: 8 },
  ];

  const handleTabChange = (key) => {
    const selectedTab = statusTabs.find(tab => tab.key === key);
    if (selectedTab) {
      setActiveStatusId(selectedTab.statusId);
      // Reset pagination to page 1 when changing tabs
      setPagination((prev) => ({ ...prev, page: 1 }));
    }
  };

  // Get current tab key based on activeStatusId
  const getCurrentTabKey = () => {
    const currentTab = statusTabs.find(tab => tab.statusId === activeStatusId);
    return currentTab ? currentTab.key : 'all';
  };

  // Orders are already filtered in useEffect, just use them directly

  return (
    <div className="orders-page">
      <div className="container">
        <Title level={2} className="page-title">
          <ShoppingOutlined /> Đơn Hàng Của Tôi
        </Title>

        <Tabs
          activeKey={getCurrentTabKey()}
          onChange={handleTabChange}
          items={statusTabs.map(tab => ({
            key: tab.key,
            label: tab.label,
          }))}
          style={{ marginBottom: '24px' }}
        />

        {orders.length === 0 ? (
          <Card className="empty-orders-card">
            <Empty
              description={
                activeStatusId === null 
                  ? "Bạn chưa có đơn hàng nào"
                  : `Không có đơn hàng ở trạng thái "${statusTabs.find(t => t.statusId === activeStatusId)?.label || ''}"`
              }
              image={Empty.PRESENTED_IMAGE_SIMPLE}
            >
              <Link to="/products">
                <Button type="primary" size="large" icon={<ShoppingOutlined />}>
                  Mua Sắm Ngay
                </Button>
              </Link>
            </Empty>
          </Card>
        ) : (
          <Space direction="vertical" style={{ width: '100%' }} size="large">
            {orders.map((item) => {
              const statusConfig = getStatusConfig(
                item.order_status_id || item.status_id,
                item.order_status?.name || item.order_status?.status_name,
                item.order_status
              );
              return (
                <Card
                  key={item.order_id}
                  className="order-card"
                  title={
                    <Space>
                      <ShoppingOutlined />
                      <span>Đơn Hàng #{item.order_number}</span>
                    </Space>
                  }
                  extra={
                    <Tag color={statusConfig.color} icon={statusConfig.icon}>
                      {statusConfig.text}
                    </Tag>
                  }
                >
                  <Row gutter={[16, 16]}>
                    <Col xs={24} sm={12}>
                      <div className="order-info">
                        <Text type="secondary">Ngày đặt:</Text>
                        <Text strong style={{ marginLeft: '8px' }}>
                          {new Date(item.created_at).toLocaleDateString('vi-VN', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </Text>
                      </div>
                      <div className="order-info" style={{ marginTop: '8px' }}>
                        <Text type="secondary">Số lượng sản phẩm:</Text>
                        <Text strong style={{ marginLeft: '8px' }}>
                          {item.order_items_count || item.order_items?.length || 0}
                        </Text>
                      </div>
                      {item.payment && (() => {
                        // Determine payment status text and color based on payment_status_id
                        const paymentStatusId = parseInt(item.payment.payment_status_id);
                        const isPaid = paymentStatusId === 2;
                        const isPending = paymentStatusId === 1;
                        
                        // Get status text from payment_status object if available, otherwise determine from status_id
                        let statusText = item.payment.payment_status?.name || 
                                        item.payment.payment_status?.status_name || 
                                        item.payment.status?.name || 
                                        item.payment.status?.status_name;
                        
                        // Fallback: Determine text from status_id if payment_status object is missing
                        if (!statusText) {
                          if (isPaid) {
                            statusText = 'Đã thanh toán';
                          } else if (isPending) {
                            statusText = 'Chưa thanh toán';
                          } else {
                            statusText = 'Chưa thanh toán';
                          }
                        }
                        
                        return (
                          <div className="order-info" style={{ marginTop: '8px' }}>
                            <Text type="secondary">Thanh toán:</Text>
                            <Tag 
                              color={isPaid ? 'success' : 'warning'} 
                              style={{ marginLeft: '8px' }}
                            >
                              {statusText}
                            </Tag>
                          </div>
                        );
                      })()}
                    </Col>
                    <Col xs={24} sm={12} style={{ textAlign: 'right' }}>
                      <Text type="secondary" style={{ display: 'block', marginBottom: '8px' }}>
                        Tổng tiền:
                      </Text>
                      <Text strong style={{ fontSize: '24px', color: '#ff4d4f' }}>
                        {new Intl.NumberFormat('vi-VN', {
                          style: 'currency',
                          currency: 'VND',
                        }).format(item.total_amount || 0)}
                      </Text>
                    </Col>
                  </Row>
                  <Divider />
                  <div style={{ textAlign: 'right' }}>
                    <Space>
                      <Link to={`/orders/${item.order_id}`}>
                        <Button type="primary">Xem Chi Tiết</Button>
                      </Link>
                      {/* Hiển thị nút thanh toán lại nếu đơn hàng thanh toán MoMo thất bại */}
                      {hasFailedMoMoPayment(item) && (
                        <Button
                          type="primary"
                          icon={<DollarOutlined />}
                          onClick={() => handleRetryMoMoPayment(item.order_id)}
                        >
                          Thanh Toán Lại
                        </Button>
                      )}
                      {/* [REQUIREMENT] Chỉ hiển thị nút hủy khi order ở trạng thái PENDING (chờ xác nhận) */}
                      {(item.order_status_id === 1 || item.status_id === 1) && (
                        <Popconfirm
                          title="Bạn có chắc muốn hủy đơn hàng này?"
                          onConfirm={() => handleCancelOrder(item.order_id)}
                          okText="Hủy"
                          cancelText="Không"
                        >
                          <Button danger icon={<CloseCircleOutlined />}>
                            Hủy Đơn
                          </Button>
                        </Popconfirm>
                      )}
                    </Space>
                  </div>
                </Card>
              );
            })}
          </Space>
        )}
        {pagination.total > pagination.limit && (
          <div style={{ marginTop: '24px', textAlign: 'center' }}>
            <Pagination
              current={pagination.page}
              total={pagination.total}
              pageSize={pagination.limit}
              onChange={(page) => {
                setPagination((prev) => ({ ...prev, page }));
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              showSizeChanger={false}
              showTotal={(total, range) => 
                `${range[0]}-${range[1]} của ${total} đơn hàng`
              }
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default Orders;
