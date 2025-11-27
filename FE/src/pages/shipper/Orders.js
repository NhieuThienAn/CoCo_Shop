import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Card,
  Row,
  Col,
  Tag,
  Space,
  Button,
  Typography,
  message,
  Spin,
  Input,
  Select,
  Popconfirm,
  Tooltip,
  Pagination,
  Empty,
  Descriptions,
  Image,
  Divider,
} from 'antd';
import {
  EyeOutlined,
  CheckCircleOutlined,
  TruckOutlined,
  UserOutlined,
  DollarOutlined,
  ShoppingOutlined,
  CalendarOutlined,
  EnvironmentOutlined,
  ArrowLeftOutlined,
  CheckOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import { order, support, payment, user } from '../../api/index.js';
import { useAuth } from '../../contexts/AuthContext.js';

const { Title, Text } = Typography;
const { Search } = Input;

const ShipperOrders = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { user: currentUser } = useAuth();
  const [orders, setOrders] = useState([]);
  const [orderDetail, setOrderDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0 });
  const [filters, setFilters] = useState({
    statusId: '',
    searchText: '',
  });
  const [myOrders, setMyOrders] = useState([]); // Đơn hàng shipper đã nhận

  useEffect(() => {
    if (id) {
      loadOrderDetail();
    } else {
      loadOrders();
      loadMyOrders();
    }
  }, [id, pagination.page, pagination.limit, filters.statusId]);

  const loadOrders = async () => {
    setLoading(true);
    try {
      // Lấy orders với status confirmed (status_id = 2) - đơn hàng chờ shipper nhận
      const confirmedRes = await order.getOrdersByStatus(2, pagination.page, pagination.limit).catch(() => ({ success: false, data: [] }));
      const confirmedOrders = confirmedRes.success ? (confirmedRes.data || []) : [];
      
      // Lọc các đơn hàng chưa có shipper nhận (chưa có shipment hoặc shipment chưa có shipper_id)
      const availableOrders = [];
      for (const orderItem of confirmedOrders) {
        try {
          const shipmentRes = await support.getShipmentsByOrder(orderItem.order_id).catch(() => ({ success: false, data: [] }));
          const shipments = shipmentRes.success ? (shipmentRes.data || []) : [];
          const hasShipper = shipments.some(s => s.shipper_id);
          if (!hasShipper) {
            availableOrders.push(orderItem);
          }
        } catch (error) {
          // Nếu không lấy được shipment, coi như đơn hàng chưa có shipper
          availableOrders.push(orderItem);
        }
      }
      
      setOrders(availableOrders);
      setPagination(prev => ({
        ...prev,
        total: availableOrders.length,
      }));
    } catch (error) {
      console.error('Error loading orders:', error);
      message.error('Có lỗi xảy ra khi tải đơn hàng');
    } finally {
      setLoading(false);
    }
  };

  const loadMyOrders = async () => {
    try {
      // Lấy shipments của shipper hiện tại
      const shipmentsRes = await support.getMyShipments().catch(() => ({ success: false, data: [] }));
      const shipments = shipmentsRes.success ? (shipmentsRes.data || []) : [];
      
      // Lấy thông tin orders từ shipments
      const myOrdersList = [];
      for (const shipmentItem of shipments) {
        try {
          const orderRes = await order.getOrderById(shipmentItem.order_id).catch(() => ({ success: false }));
          if (orderRes.success && orderRes.data) {
            const orderData = orderRes.data;
            orderData.shipment = shipmentItem;
            myOrdersList.push(orderData);
          }
        } catch (error) {
          console.error('Error loading order for shipment:', shipmentItem.order_id, error);
        }
      }
      
      setMyOrders(myOrdersList);
    } catch (error) {
      console.error('Error loading my orders:', error);
    }
  };

  const loadOrderDetail = async () => {
    setLoading(true);
    try {
      const [orderResponse, shipmentResponse, paymentResponse] = await Promise.all([
        order.getOrderById(id),
        support.getShipmentsByOrder(id).catch(() => ({ success: false, data: [] })),
        payment.getPaymentByOrder(id).catch(() => ({ success: false, data: null })),
      ]);
      
      if (orderResponse.success) {
        const orderData = orderResponse.data;
        if (orderData.items && !orderData.order_items) {
          orderData.order_items = orderData.items;
        }
        if (shipmentResponse.success && shipmentResponse.data && shipmentResponse.data.length > 0) {
          orderData.shipments = shipmentResponse.data;
          orderData.shipment = shipmentResponse.data[0];
        }
        if (paymentResponse.success && paymentResponse.data) {
          const paymentData = Array.isArray(paymentResponse.data) ? paymentResponse.data[0] : paymentResponse.data;
          orderData.payment = paymentData;
        } else if (orderData.payments && Array.isArray(orderData.payments) && orderData.payments.length > 0) {
          orderData.payment = orderData.payments[0];
        }
        
        if (orderData.shipping_address_id && !orderData.shipping_address) {
          console.log('Shipping address ID exists but address not populated:', orderData.shipping_address_id);
        }
        
        if (orderData.user_id && !orderData.user) {
          try {
            const userResponse = await user.getUserById(orderData.user_id);
            if (userResponse.success && userResponse.data) {
              orderData.user = userResponse.data;
            }
          } catch (error) {
            console.error('Error fetching user info:', error);
          }
        }
        
        setOrderDetail(orderData);
      } else {
        message.error(orderResponse.message || 'Không tìm thấy đơn hàng');
      }
    } catch (error) {
      console.error('Error loading order detail:', error);
      message.error('Có lỗi xảy ra khi tải chi tiết đơn hàng');
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptOrder = async (orderId) => {
    try {
      const response = await support.acceptOrder(orderId);
      
      if (response.success) {
        message.success(response.message || 'Nhận đơn hàng thành công. Vui lòng cập nhật trạng thái "Đang giao hàng" khi bắt đầu giao.');
        loadOrders();
        loadMyOrders();
        // Reload order detail nếu đang xem chi tiết đơn hàng này
        if (id && id === orderId.toString()) {
          loadOrderDetail();
        }
      } else {
        message.error(response.message || 'Có lỗi xảy ra khi nhận đơn hàng');
      }
    } catch (error) {
      console.error('Error accepting order:', error);
      const errorMessage = error.message || error.response?.data?.message || 'Có lỗi xảy ra khi nhận đơn hàng';
      message.error(errorMessage);
    }
  };

  /**
   * Shipper: Cập nhật trạng thái đơn hàng sang "Đang giao hàng" (SHIPPING)
   * Chỉ cho phép khi đơn hàng ở trạng thái CONFIRMED (status_id = 2)
   */
  const handleStartShipping = async (orderId) => {
    try {
      const response = await order.updateOrderToShipping(orderId);
      if (response.success !== false) {
        message.success('Cập nhật trạng thái "Đang giao hàng" thành công');
        loadMyOrders();
        if (id) {
          loadOrderDetail();
        } else {
          loadOrders();
        }
      } else {
        message.error(response.message || 'Có lỗi xảy ra khi cập nhật trạng thái');
      }
    } catch (error) {
      console.error('Error updating to shipping:', error);
      const errorMessage = error.message || error.response?.data?.message || 'Có lỗi xảy ra khi cập nhật trạng thái';
      message.error(errorMessage);
    }
  };

  /**
   * Shipper: Cập nhật trạng thái đơn hàng sang "Đã giao hàng" (DELIVERED)
   * Chỉ cho phép khi đơn hàng ở trạng thái SHIPPING (status_id = 3)
   */
  const handleMarkDelivered = async (orderId) => {
    try {
      const response = await order.updateOrderToDelivered(orderId);
      if (response.success !== false) {
        message.success('Cập nhật trạng thái "Đã giao hàng" thành công');
        loadMyOrders();
        if (id) {
          loadOrderDetail();
        } else {
          loadOrders();
        }
      } else {
        message.error(response.message || 'Có lỗi xảy ra khi cập nhật trạng thái');
      }
    } catch (error) {
      console.error('Error updating to delivered:', error);
      const errorMessage = error.message || error.response?.data?.message || 'Có lỗi xảy ra khi cập nhật trạng thái';
      message.error(errorMessage);
    }
  };

  const getStatusTag = (statusId, statusName) => {
    // Backend trả về order_status với status_name (không phải name)
    // Nếu có statusName từ backend, ưu tiên sử dụng
    if (statusName) {
      const statusMap = {
        1: { color: 'orange' },
        2: { color: 'blue' },
        3: { color: 'cyan' },
        4: { color: 'green' },
        8: { color: 'green' }, // Hoàn thành
      };
      const color = statusMap[statusId]?.color || 'default';
      return <Tag color={color}>{statusName}</Tag>;
    }
    
    // Fallback nếu không có statusName
    const statusMap = {
      1: { color: 'orange', text: 'Chờ Xác Nhận' },
      2: { color: 'blue', text: 'Đã Xác Nhận' },
      3: { color: 'cyan', text: 'Đang Giao Hàng' },
      4: { color: 'green', text: 'Đã Giao Hàng' },
      5: { color: 'red', text: 'Đã Hủy' },
      6: { color: 'purple', text: 'Trả Hàng' },
      8: { color: 'green', text: 'Hoàn Thành' },
    };
    const statusInfo = statusMap[statusId] || { color: 'default', text: 'N/A' };
    return <Tag color={statusInfo.color}>{statusInfo.text}</Tag>;
  };

  const getPaymentStatusTag = (payment) => {
    if (!payment || !payment.payment_status_id) {
      return <Tag color="default">Chưa có thanh toán</Tag>;
    }
    
    const paymentStatusId = parseInt(payment.payment_status_id);
    const gateway = payment.gateway?.toUpperCase() || 'N/A';
    
    if (paymentStatusId === 2) {
      return <Tag color="green">Đã Thanh Toán ({gateway})</Tag>;
    } else if (paymentStatusId === 1) {
      return <Tag color="orange">Chờ Thanh Toán ({gateway})</Tag>;
    } else {
      return <Tag color="default">{gateway}</Tag>;
    }
  };

  if (loading && !orderDetail && orders.length === 0) {
    return (
      <div style={{ padding: '24px', textAlign: 'center' }}>
        <Spin size="large">
          <div style={{ marginTop: '16px' }}>Đang tải đơn hàng...</div>
        </Spin>
      </div>
    );
  }

  // Chi tiết đơn hàng
  if (id && orderDetail) {
    return (
      <div style={{ padding: '24px' }}>
        <div style={{ marginBottom: '24px' }}>
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/shipper/orders')} style={{ marginBottom: '16px' }}>
            Quay Lại
          </Button>
          <Title level={2}>Chi Tiết Đơn Hàng #{orderDetail.order_number}</Title>
        </div>

        <Card title="Thông Tin Đơn Hàng" style={{ marginBottom: '16px' }}>
          <Descriptions column={2}>
            <Descriptions.Item label="Mã đơn">{orderDetail.order_number}</Descriptions.Item>
            <Descriptions.Item label="Ngày đặt">
              {new Date(orderDetail.order_date || orderDetail.created_at).toLocaleString('vi-VN')}
            </Descriptions.Item>
            <Descriptions.Item label="Trạng thái">
              {getStatusTag(
                orderDetail.status_id || orderDetail.order_status_id, 
                orderDetail.order_status?.status_name || orderDetail.order_status?.name
              )}
            </Descriptions.Item>
            <Descriptions.Item label="Khách hàng">
              {orderDetail.user?.username || orderDetail.user?.email || 'N/A'}
            </Descriptions.Item>
            <Descriptions.Item label="Tổng tiền">
              <strong style={{ fontSize: '18px', color: '#1890ff' }}>
                {new Intl.NumberFormat('vi-VN', {
                  style: 'currency',
                  currency: 'VND',
                }).format(orderDetail.total_amount || 0)}
              </strong>
            </Descriptions.Item>
            {orderDetail.payment && (
              <Descriptions.Item label="Thanh toán">
                <Space>
                  <Text>{orderDetail.payment.gateway || 'N/A'}</Text>
                  {getPaymentStatusTag(orderDetail.payment)}
                </Space>
              </Descriptions.Item>
            )}
          </Descriptions>
        </Card>

        <Card title="Địa Chỉ Giao Hàng" style={{ marginBottom: '16px' }}>
          {orderDetail.shipping_address ? (
            <Descriptions column={1}>
              <Descriptions.Item label="Người nhận">
                <strong>{orderDetail.shipping_address.full_name}</strong>
              </Descriptions.Item>
              <Descriptions.Item label="Địa chỉ">
                {orderDetail.shipping_address.address_line1}
                {orderDetail.shipping_address.address_line2 && `, ${orderDetail.shipping_address.address_line2}`}
              </Descriptions.Item>
              <Descriptions.Item label="Phường/Xã">{orderDetail.shipping_address.ward || 'N/A'}</Descriptions.Item>
              <Descriptions.Item label="Quận/Huyện">{orderDetail.shipping_address.district || 'N/A'}</Descriptions.Item>
              <Descriptions.Item label="Tỉnh/Thành phố">
                {orderDetail.shipping_address.city || 'N/A'}
                {orderDetail.shipping_address.province && `, ${orderDetail.shipping_address.province}`}
              </Descriptions.Item>
              <Descriptions.Item label="Điện thoại">{orderDetail.shipping_address.phone}</Descriptions.Item>
            </Descriptions>
          ) : (
            <p>Chưa có địa chỉ</p>
          )}
        </Card>

        <Card title="Sản Phẩm" style={{ marginBottom: '16px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {(orderDetail.order_items || orderDetail.items || []).map((item) => {
              let product = item.product || {};
              let productName = product.name || 'Sản phẩm';
              let images = [];
              let snapshot = null;
              
              if (item.product_snapshot) {
                try {
                  snapshot = typeof item.product_snapshot === 'string' 
                    ? JSON.parse(item.product_snapshot) 
                    : item.product_snapshot;
                  if (snapshot.name || snapshot.product_name) {
                    productName = snapshot.name || snapshot.product_name;
                  }
                  if (snapshot.images) {
                    images = Array.isArray(snapshot.images) ? snapshot.images : [];
                  }
                } catch (e) {}
              }
              
              if (images.length === 0 && product.images) {
                try {
                  if (typeof product.images === 'string') {
                    images = JSON.parse(product.images);
                  } else if (Array.isArray(product.images)) {
                    images = product.images;
                  }
                } catch (e) {
                  images = [];
                }
              }
              
              const primaryImageData = images.find(img => img.is_primary) || images[0];
              const primaryImage = product.primary_image || primaryImageData?.url || '/placeholder.jpg';
              const priceValue = item.unit_price || item.unit_price_snapshot || 0;
              const quantity = item.quantity || 0;
              const total = priceValue * quantity;
              
              return (
                <div key={item.order_item_id} style={{ display: 'flex', gap: '16px', padding: '12px', border: '1px solid #f0f0f0', borderRadius: '8px' }}>
                  <Image
                    src={primaryImage}
                    alt={productName}
                    width={80}
                    height={80}
                    preview={false}
                    style={{ objectFit: 'cover', borderRadius: '4px' }}
                  />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 500, marginBottom: '8px' }}>{productName}</div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <Text type="secondary">Giá: </Text>
                        <Text strong>
                          {new Intl.NumberFormat('vi-VN', {
                            style: 'currency',
                            currency: 'VND',
                          }).format(priceValue)}
                        </Text>
                        <Text type="secondary" style={{ marginLeft: '16px' }}>Số lượng: </Text>
                        <Text strong>{quantity}</Text>
                      </div>
                      <div>
                        <Text strong style={{ fontSize: '16px', color: '#1890ff' }}>
                          {new Intl.NumberFormat('vi-VN', {
                            style: 'currency',
                            currency: 'VND',
                          }).format(total)}
                        </Text>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        {(orderDetail.status_id === 2 || orderDetail.status_id === 3) && (
          <div style={{ marginTop: '24px', textAlign: 'right' }}>
            <Space>
              {orderDetail.status_id === 2 && !orderDetail.shipment?.shipper_id && (
                <Popconfirm
                  title="Bạn có chắc muốn nhận đơn hàng này?"
                  onConfirm={() => handleAcceptOrder(orderDetail.order_id)}
                  okText="Xác nhận"
                  cancelText="Hủy"
                >
                  <Button type="primary" icon={<CheckOutlined />}>
                    Nhận Đơn Hàng
                  </Button>
                </Popconfirm>
              )}
              {orderDetail.status_id === 2 && orderDetail.shipment?.shipper_id && (
                <Popconfirm
                  title="Cập nhật trạng thái đơn hàng sang 'Đang giao hàng'?"
                  description="Đơn hàng sẽ chuyển sang trạng thái đang giao hàng"
                  onConfirm={() => handleStartShipping(orderDetail.order_id)}
                  okText="Xác nhận"
                  cancelText="Hủy"
                >
                  <Button type="primary" icon={<TruckOutlined />}>
                    Cập Nhật: Đang Giao Hàng
                  </Button>
                </Popconfirm>
              )}
              {orderDetail.status_id === 3 && orderDetail.shipment?.shipper_id && (
                <Popconfirm
                  title="Cập nhật trạng thái đơn hàng sang 'Đã giao hàng'?"
                  description="Đơn hàng sẽ chuyển sang trạng thái đã giao hàng. Admin sẽ cập nhật sang 'Hoàn thành' sau đó."
                  onConfirm={() => handleMarkDelivered(orderDetail.order_id)}
                  okText="Xác nhận"
                  cancelText="Hủy"
                >
                  <Button type="primary" icon={<CheckCircleOutlined />}>
                    Cập Nhật: Đã Giao Hàng
                  </Button>
                </Popconfirm>
              )}
            </Space>
          </div>
        )}
      </div>
    );
  }

  // Danh sách đơn hàng
  return (
    <div style={{ padding: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <Title level={2} style={{ margin: 0 }}>Quản Lý Đơn Hàng</Title>
        <Button icon={<ReloadOutlined />} onClick={() => { loadOrders(); loadMyOrders(); }} loading={loading}>
          Làm Mới
        </Button>
      </div>

      <div style={{ marginBottom: '16px' }}>
        <Space>
          <Search
            placeholder="Tìm kiếm theo mã đơn, tên khách hàng..."
            allowClear
            style={{ width: 300 }}
            onSearch={(value) => {
              setFilters((prev) => ({ ...prev, searchText: value }));
            }}
          />
        </Space>
      </div>

      {/* Đơn hàng của tôi */}
      {myOrders.length > 0 && (
        <div style={{ marginBottom: '32px' }}>
          <Title level={4} style={{ marginBottom: '16px' }}>Đơn Hàng Của Tôi ({myOrders.length})</Title>
          <Row gutter={[16, 16]}>
            {myOrders.map((record) => {
              const orderId = record.order_id;
              const statusId = record.status_id || record.order_status_id;
              const user = record.user || {};
              const paymentData = record.payment || record.payments?.[0];
              const shippingAddress = record.shipping_address;

              return (
                <Col key={orderId} xs={24} sm={12} lg={8} xl={6}>
                  <Card
                    hoverable
                    style={{ height: '100%' }}
                    actions={[
                      <Tooltip title="Xem chi tiết" key="view">
                        <Button
                          type="text"
                          icon={<EyeOutlined />}
                          onClick={() => navigate(`/shipper/orders/${orderId}`)}
                        >
                          Xem
                        </Button>
                      </Tooltip>,
                      statusId === 2 && (
                        <Tooltip title="Cập nhật sang Đang giao hàng" key="shipping">
                          <Popconfirm
                            title="Cập nhật trạng thái sang 'Đang giao hàng'?"
                            onConfirm={() => handleStartShipping(orderId)}
                            okText="Xác nhận"
                            cancelText="Hủy"
                          >
                            <Button
                              type="text"
                              icon={<TruckOutlined />}
                              style={{ color: '#1890ff' }}
                            >
                              Đang Giao
                            </Button>
                          </Popconfirm>
                        </Tooltip>
                      ),
                      statusId === 3 && (
                        <Tooltip title="Cập nhật sang Đã giao hàng" key="delivered">
                          <Popconfirm
                            title="Cập nhật trạng thái sang 'Đã giao hàng'?"
                            onConfirm={() => handleMarkDelivered(orderId)}
                            okText="Xác nhận"
                            cancelText="Hủy"
                          >
                            <Button
                              type="text"
                              icon={<CheckCircleOutlined />}
                              style={{ color: '#52c41a' }}
                            >
                              Đã Giao
                            </Button>
                          </Popconfirm>
                        </Tooltip>
                      ),
                    ].filter(Boolean)}
                  >
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                        <Button
                          type="link"
                          onClick={() => navigate(`/shipper/orders/${orderId}`)}
                          style={{ padding: 0, height: 'auto', fontSize: '16px', fontWeight: 'bold' }}
                        >
                          {record.order_number || `#${orderId}`}
                        </Button>
                        {getStatusTag(
                          statusId, 
                          record.order_status?.status_name || record.order_status?.name
                        )}
                      </div>

                      <Space direction="vertical" size="small" style={{ width: '100%' }}>
                        <div>
                          <UserOutlined style={{ marginRight: '8px', color: '#1890ff' }} />
                          <Text strong>Khách hàng:</Text>
                          <div style={{ marginLeft: '24px', marginTop: '4px' }}>
                            <div>{user.username || 'N/A'}</div>
                            <div style={{ fontSize: '12px', color: '#999' }}>{user.email || ''}</div>
                          </div>
                        </div>

                        {shippingAddress && (
                          <div>
                            <EnvironmentOutlined style={{ marginRight: '8px', color: '#52c41a' }} />
                            <Text strong>Địa chỉ:</Text>
                            <div style={{ marginLeft: '24px', marginTop: '4px', fontSize: '12px', color: '#666' }}>
                              <div>{shippingAddress.address_line1}</div>
                              <div>
                                {[shippingAddress.ward, shippingAddress.district, shippingAddress.city]
                                  .filter(Boolean)
                                  .join(', ')}
                              </div>
                            </div>
                          </div>
                        )}

                        <div>
                          <DollarOutlined style={{ marginRight: '8px', color: '#52c41a' }} />
                          <Text strong>Tổng tiền:</Text>
                          <div style={{ marginLeft: '24px', marginTop: '4px', fontSize: '16px', fontWeight: 'bold', color: '#1890ff' }}>
                            {new Intl.NumberFormat('vi-VN', {
                              style: 'currency',
                              currency: 'VND',
                            }).format(record.total_amount || 0)}
                          </div>
                        </div>

                        <div>
                          <ShoppingOutlined style={{ marginRight: '8px', color: '#722ed1' }} />
                          <Text strong>Số sản phẩm:</Text>
                          <Text style={{ marginLeft: '8px' }}>{record.items_count || record.order_items?.length || 0}</Text>
                        </div>

                        {record.created_at && (
                          <div>
                            <CalendarOutlined style={{ marginRight: '8px', color: '#fa8c16' }} />
                            <Text strong>Ngày tạo:</Text>
                            <div style={{ marginLeft: '24px', marginTop: '4px', fontSize: '12px', color: '#666' }}>
                              {new Date(record.created_at).toLocaleString('vi-VN', {
                                year: 'numeric',
                                month: '2-digit',
                                day: '2-digit',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </div>
                          </div>
                        )}
                      </Space>
                    </div>
                  </Card>
                </Col>
              );
            })}
          </Row>
        </div>
      )}

      {/* Đơn hàng có sẵn để nhận */}
      <div>
        <Title level={4} style={{ marginBottom: '16px' }}>Đơn Hàng Có Sẵn ({orders.length})</Title>
        {orders.length === 0 ? (
          <Empty description="Không có đơn hàng nào cần giao" />
        ) : (
          <>
            <Row gutter={[16, 16]}>
              {orders
                .filter(orderItem => {
                  if (!filters.searchText) return true;
                  const searchLower = filters.searchText.toLowerCase();
                  return (
                    orderItem.order_number?.toLowerCase().includes(searchLower) ||
                    orderItem.user?.username?.toLowerCase().includes(searchLower) ||
                    orderItem.user?.email?.toLowerCase().includes(searchLower)
                  );
                })
                .map((record) => {
                  const orderId = record.order_id;
                  const statusId = record.status_id || record.order_status_id;
                  const user = record.user || {};
                  const paymentData = record.payment || record.payments?.[0];
                  const shippingAddress = record.shipping_address;

                  return (
                    <Col key={orderId} xs={24} sm={12} lg={8} xl={6}>
                      <Card
                        hoverable
                        style={{ height: '100%' }}
                        actions={[
                          <Tooltip title="Xem chi tiết" key="view">
                            <Button
                              type="text"
                              icon={<EyeOutlined />}
                              onClick={() => navigate(`/shipper/orders/${orderId}`)}
                            >
                              Xem
                            </Button>
                          </Tooltip>,
                          <Tooltip title="Nhận đơn hàng" key="accept">
                            <Popconfirm
                              title="Bạn có chắc muốn nhận đơn hàng này?"
                              onConfirm={() => handleAcceptOrder(orderId)}
                              okText="Xác nhận"
                              cancelText="Hủy"
                            >
                              <Button
                                type="text"
                                icon={<CheckOutlined />}
                                style={{ color: '#52c41a' }}
                              >
                                Nhận Đơn
                              </Button>
                            </Popconfirm>
                          </Tooltip>,
                        ]}
                      >
                        <div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                            <Button
                              type="link"
                              onClick={() => navigate(`/shipper/orders/${orderId}`)}
                              style={{ padding: 0, height: 'auto', fontSize: '16px', fontWeight: 'bold' }}
                            >
                              {record.order_number || `#${orderId}`}
                            </Button>
                            {getStatusTag(
                          statusId, 
                          record.order_status?.status_name || record.order_status?.name
                        )}
                          </div>

                          <Space direction="vertical" size="small" style={{ width: '100%' }}>
                            <div>
                              <UserOutlined style={{ marginRight: '8px', color: '#1890ff' }} />
                              <Text strong>Khách hàng:</Text>
                              <div style={{ marginLeft: '24px', marginTop: '4px' }}>
                                <div>{user.username || 'N/A'}</div>
                                <div style={{ fontSize: '12px', color: '#999' }}>{user.email || ''}</div>
                              </div>
                            </div>

                            {shippingAddress && (
                              <div>
                                <EnvironmentOutlined style={{ marginRight: '8px', color: '#52c41a' }} />
                                <Text strong>Địa chỉ:</Text>
                                <div style={{ marginLeft: '24px', marginTop: '4px', fontSize: '12px', color: '#666' }}>
                                  <div>{shippingAddress.address_line1}</div>
                                  <div>
                                    {[shippingAddress.ward, shippingAddress.district, shippingAddress.city]
                                      .filter(Boolean)
                                      .join(', ')}
                                  </div>
                                </div>
                              </div>
                            )}

                            <div>
                              <DollarOutlined style={{ marginRight: '8px', color: '#52c41a' }} />
                              <Text strong>Tổng tiền:</Text>
                              <div style={{ marginLeft: '24px', marginTop: '4px', fontSize: '16px', fontWeight: 'bold', color: '#1890ff' }}>
                                {new Intl.NumberFormat('vi-VN', {
                                  style: 'currency',
                                  currency: 'VND',
                                }).format(record.total_amount || 0)}
                              </div>
                            </div>

                            <div>
                              <Text strong>Thanh toán:</Text>
                              <div style={{ marginTop: '4px' }}>
                                {getPaymentStatusTag(paymentData)}
                              </div>
                            </div>

                            <div>
                              <ShoppingOutlined style={{ marginRight: '8px', color: '#722ed1' }} />
                              <Text strong>Số sản phẩm:</Text>
                              <Text style={{ marginLeft: '8px' }}>{record.items_count || record.order_items?.length || 0}</Text>
                            </div>

                            {record.created_at && (
                              <div>
                                <CalendarOutlined style={{ marginRight: '8px', color: '#fa8c16' }} />
                                <Text strong>Ngày tạo:</Text>
                                <div style={{ marginLeft: '24px', marginTop: '4px', fontSize: '12px', color: '#666' }}>
                                  {new Date(record.created_at).toLocaleString('vi-VN', {
                                    year: 'numeric',
                                    month: '2-digit',
                                    day: '2-digit',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })}
                                </div>
                              </div>
                            )}
                          </Space>
                        </div>
                      </Card>
                    </Col>
                  );
                })}
            </Row>
          </>
        )}
      </div>
    </div>
  );
};

export default ShipperOrders;
