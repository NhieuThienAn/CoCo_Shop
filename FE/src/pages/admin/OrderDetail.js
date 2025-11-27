import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Card,
  Table,
  Tag,
  Button,
  Space,
  Typography,
  Descriptions,
  Spin,
  message,
  Row,
  Col,
  Popconfirm,
} from 'antd';
import {
  ArrowLeftOutlined,
  CheckOutlined,
  TruckOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  DollarOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons';
import { order, payment } from '../../api/index.js';
import { getAddressById } from '../../api/address.js';
import { getCouponById } from '../../api/coupon.js';
import { getUserById } from '../../api/user.js';

const { Title } = Typography;

const AdminOrderDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [orderData, setOrderData] = useState(null);
  const [paymentData, setPaymentData] = useState(null);
  const [loading, setLoading] = useState(true);
  // Fallback map mặc định để đảm bảo luôn có tên trạng thái
  const defaultStatusMap = {
    1: 'Chờ Xác Nhận',
    2: 'Đã Xác Nhận',
    3: 'Đang Giao',
    4: 'Đã Giao',
    5: 'Đã Hủy',
    6: 'Trả Hàng',
    7: 'Hoàn Trả',
    8: 'Hoàn Thành',
  };
  const [statusMap, setStatusMap] = useState(defaultStatusMap);

  useEffect(() => {
    loadOrderStatuses();
    loadOrderDetail();
  }, [id]);

  const loadOrderStatuses = async () => {
    try {
      // Sử dụng API từ order.js thay vì support.js
      const response = await order.getOrderStatuses();
      if (response.success && response.data) {
        const statuses = Array.isArray(response.data) ? response.data : [];
        // Bắt đầu với default map để đảm bảo luôn có fallback
        const map = { ...defaultStatusMap };
        statuses.forEach(status => {
          // Map cả số và chuỗi để đảm bảo tìm thấy
          const statusId = parseInt(status.status_id);
          if (statusId && status.status_name) {
            map[statusId] = status.status_name;
            map[statusId.toString()] = status.status_name;
          }
        });
        setStatusMap(map);
      } else {
        // Nếu API không trả về data, vẫn giữ default map
        setStatusMap(defaultStatusMap);
      }
    } catch (error) {
      console.warn('Could not load order statuses:', error);
      // Fallback: Sử dụng mapping cố định nếu API fail
      setStatusMap(defaultStatusMap);
    }
  };

  const loadOrderDetail = async () => {
    setLoading(true);
    try {
      const orderRes = await order.getOrderById(id);
      
      if (orderRes.success) {
        let enrichedOrder = { ...orderRes.data };
        
        // Enrich shipping address nếu chỉ có ID
        if (enrichedOrder.shipping_address_id && !enrichedOrder.shipping_address) {
          try {
            const addressRes = await getAddressById(enrichedOrder.shipping_address_id);
            if (addressRes.success && addressRes.data) {
              enrichedOrder.shipping_address = addressRes.data;
            }
          } catch (addressError) {
            console.warn('Could not load shipping address:', addressError);
          }
        }
        
        // Enrich billing address nếu chỉ có ID và khác shipping address
        if (enrichedOrder.billing_address_id && 
            enrichedOrder.billing_address_id !== enrichedOrder.shipping_address_id && 
            !enrichedOrder.billing_address) {
          try {
            const addressRes = await getAddressById(enrichedOrder.billing_address_id);
            if (addressRes.success && addressRes.data) {
              enrichedOrder.billing_address = addressRes.data;
            }
          } catch (addressError) {
            console.warn('Could not load billing address:', addressError);
          }
        }
        
        // Enrich coupon nếu chỉ có ID
        if (enrichedOrder.coupon_id && !enrichedOrder.coupon) {
          try {
            const couponRes = await getCouponById(enrichedOrder.coupon_id);
            if (couponRes.success && couponRes.data) {
              enrichedOrder.coupon = couponRes.data;
            }
          } catch (couponError) {
            console.warn('Could not load coupon:', couponError);
          }
        }
        
        // Enrich user nếu chỉ có ID
        if (enrichedOrder.user_id && !enrichedOrder.user) {
          try {
            const userRes = await getUserById(enrichedOrder.user_id);
            if (userRes.success && userRes.data) {
              enrichedOrder.user = userRes.data;
            }
          } catch (userError) {
            console.warn('Could not load user:', userError);
          }
        }
        
        // Enrich processed_by user nếu chỉ có ID
        if (enrichedOrder.processed_by && !enrichedOrder.processed_by_user) {
          try {
            const userRes = await getUserById(enrichedOrder.processed_by);
            if (userRes.success && userRes.data) {
              enrichedOrder.processed_by_user = userRes.data;
            }
          } catch (userError) {
            console.warn('Could not load processed_by user:', userError);
          }
        }
        
        setOrderData(enrichedOrder);
        
        // Backend trả về payments trong order data
        // Ưu tiên sử dụng payments từ order data, nếu không có thì gọi API riêng
        if (enrichedOrder.payments && Array.isArray(enrichedOrder.payments) && enrichedOrder.payments.length > 0) {
          // Tìm payment đã thanh toán (status_id = 2) hoặc payment mới nhất
          const paidPayment = enrichedOrder.payments.find(p => parseInt(p.payment_status_id) === 2);
          setPaymentData(paidPayment || enrichedOrder.payments[0]);
        } else if (enrichedOrder.payment) {
          // Nếu có payment object trực tiếp
          setPaymentData(enrichedOrder.payment);
        } else {
          // Fallback: Gọi API riêng nếu không có trong order data
          try {
            const paymentRes = await payment.getPaymentsByOrder(id);
            if (paymentRes.success && paymentRes.data) {
              const payments = Array.isArray(paymentRes.data) ? paymentRes.data : [paymentRes.data];
              const paidPayment = payments.find(p => parseInt(p.payment_status_id) === 2);
              setPaymentData(paidPayment || payments[0] || null);
            }
          } catch (paymentError) {
            console.warn('Could not load payment separately:', paymentError);
            setPaymentData(null);
          }
        }
      } else {
        message.error(orderRes.message || 'Không tìm thấy đơn hàng');
        navigate('/admin/orders');
      }
    } catch (error) {
      console.error('Error loading order detail:', error);
      const errorMessage = error.message || 'Có lỗi xảy ra khi tải đơn hàng';
      message.error(errorMessage);
      navigate('/admin/orders');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (action) => {
    try {
      let response;
      switch (action) {
        case 'confirm':
          response = await order.confirmOrder(id);
          if (response.success) {
            message.success('Xác nhận đơn hàng thành công');
          } else {
            message.error(response.message || 'Có lỗi xảy ra khi xác nhận đơn hàng');
            return;
          }
          break;
        case 'shipping':
          response = await order.startShipping(id);
          if (response.success) {
            message.success('Bắt đầu giao hàng thành công');
          } else {
            message.error(response.message || 'Có lỗi xảy ra khi bắt đầu giao hàng');
            return;
          }
          break;
        case 'delivered':
          response = await order.markAsDelivered(id);
          if (response.success) {
            message.success('Đánh dấu đã giao thành công');
          } else {
            message.error(response.message || 'Có lỗi xảy ra khi đánh dấu đã giao');
            return;
          }
          break;
        case 'cancel':
          response = await order.cancelOrder(id);
          if (response.success) {
            message.success('Hủy đơn hàng thành công');
          } else {
            message.error(response.message || 'Có lỗi xảy ra khi hủy đơn hàng');
            return;
          }
          break;
        case 'confirm-payment-paid':
          response = await order.confirmPayment(id, true);
          if (response.success) {
            message.success('Xác nhận thanh toán thành công. Đơn hàng đã hoàn thành.');
            // Cập nhật payment data từ response nếu có
            if (response.data?.payment) {
              setPaymentData(response.data.payment);
            }
            if (response.data?.payments && response.data.payments.length > 0) {
              setPaymentData(response.data.payments[0]);
            }
          } else {
            message.error(response.message || 'Có lỗi xảy ra khi xác nhận thanh toán');
            return;
          }
          break;
        case 'confirm-payment-pending':
          response = await order.confirmPayment(id, false);
          if (response.success) {
            message.success('Đã cập nhật trạng thái thanh toán');
            // Cập nhật payment data từ response nếu có
            if (response.data?.payment) {
              setPaymentData(response.data.payment);
            }
            if (response.data?.payments && response.data.payments.length > 0) {
              setPaymentData(response.data.payments[0]);
            }
          } else {
            message.error(response.message || 'Có lỗi xảy ra khi cập nhật thanh toán');
            return;
          }
          break;
        case 'complete':
          response = await order.completeOrder(id);
          if (response.success) {
            message.success('Hoàn thành đơn hàng thành công');
          } else {
            message.error(response.message || 'Có lỗi xảy ra khi hoàn thành đơn hàng');
            return;
          }
          break;
        default:
          break;
      }
      loadOrderDetail();
    } catch (error) {
      console.error('Error updating order:', error);
      const errorMessage = error.message || 'Có lỗi xảy ra khi cập nhật đơn hàng';
      message.error(errorMessage);
    }
  };

  const getStatusTag = (statusId, statusName) => {
    const statusMap = {
      1: { color: 'orange', text: 'Chờ Xác Nhận' },
      2: { color: 'blue', text: 'Đã Xác Nhận' },
      3: { color: 'cyan', text: 'Đang Giao' },
      4: { color: 'green', text: 'Đã Giao' },
      5: { color: 'red', text: 'Đã Hủy' },
      6: { color: 'purple', text: 'Trả Hàng' },
    };
    const statusInfo = statusMap[statusId] || { color: 'default', text: statusName || 'N/A' };
    return <Tag color={statusInfo.color}>{statusInfo.text}</Tag>;
  };

  const getPaymentStatusTag = (payment) => {
    if (!payment) return <Tag color="default">Chưa có</Tag>;
    
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

  const columns = [
    {
      title: 'Sản Phẩm',
      key: 'product',
      render: (_, record) => {
        // Try to get product name from product_snapshot if product is not populated
        if (record.product?.name) {
          return record.product.name;
        }
        if (record.product_snapshot) {
          try {
            const snapshot = typeof record.product_snapshot === 'string' 
              ? JSON.parse(record.product_snapshot) 
              : record.product_snapshot;
            return snapshot.name || snapshot.product_name || 'N/A';
          } catch (e) {
            return 'N/A';
          }
        }
        return 'N/A';
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
      <div style={{ textAlign: 'center', padding: '100px' }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!orderData) {
    return (
      <div style={{ textAlign: 'center', padding: '100px' }}>
        <Title level={3}>Không tìm thấy đơn hàng</Title>
        <Button onClick={() => navigate('/admin/orders')}>Quay Lại</Button>
      </div>
    );
  }

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: '24px' }}>
        <Button 
          icon={<ArrowLeftOutlined />} 
          onClick={() => navigate('/admin/orders')}
          style={{ marginBottom: '16px' }}
        >
          Quay Lại
        </Button>
        <Title level={2} style={{ margin: 0 }}>Chi Tiết Đơn Hàng #{orderData.order_number}</Title>
      </div>

      <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
        <Col xs={24} lg={8}>
          <Card title="Thông Tin Đơn Hàng">
            <Descriptions column={1} size="small">
              <Descriptions.Item label="Mã đơn">{orderData.order_number}</Descriptions.Item>
              <Descriptions.Item label="Ngày tạo">
                {orderData.created_at ? new Date(orderData.created_at).toLocaleString('vi-VN') : 'N/A'}
              </Descriptions.Item>
              {orderData.order_date && (
                <Descriptions.Item label="Ngày đặt hàng">
                  {new Date(orderData.order_date).toLocaleString('vi-VN')}
                </Descriptions.Item>
              )}
              {orderData.updated_at && (
                <Descriptions.Item label="Cập nhật lần cuối">
                  {new Date(orderData.updated_at).toLocaleString('vi-VN')}
                </Descriptions.Item>
              )}
              <Descriptions.Item label="Trạng thái">
                {getStatusTag(
                  orderData.status_id || orderData.order_status_id,
                  orderData.order_status?.status_name || orderData.order_status?.name || orderData.status?.status_name || orderData.status?.name
                )}
              </Descriptions.Item>
              <Descriptions.Item label="Tổng tiền">
                <strong style={{ fontSize: '18px', color: '#1890ff' }}>
                  {new Intl.NumberFormat('vi-VN', {
                    style: 'currency',
                    currency: orderData.currency || 'VND',
                  }).format(orderData.total_amount || 0)}
                </strong>
              </Descriptions.Item>
              {orderData.discount_amount > 0 && (
                <Descriptions.Item label="Giảm giá">
                  {new Intl.NumberFormat('vi-VN', {
                    style: 'currency',
                    currency: orderData.currency || 'VND',
                  }).format(orderData.discount_amount || 0)}
                </Descriptions.Item>
              )}
              {orderData.shipping_fee > 0 && (
                <Descriptions.Item label="Phí vận chuyển">
                  {new Intl.NumberFormat('vi-VN', {
                    style: 'currency',
                    currency: orderData.currency || 'VND',
                  }).format(orderData.shipping_fee || 0)}
                </Descriptions.Item>
              )}
              {orderData.tax_amount > 0 && (
                <Descriptions.Item label="Thuế">
                  {new Intl.NumberFormat('vi-VN', {
                    style: 'currency',
                    currency: orderData.currency || 'VND',
                  }).format(orderData.tax_amount || 0)}
                </Descriptions.Item>
              )}
              {orderData.coupon_id && (
                <Descriptions.Item label="Mã giảm giá">
                  <div>
                    <Tag color="purple">{orderData.coupon?.code || `ID: ${orderData.coupon_id}`}</Tag>
                    {orderData.coupon && (
                      <div style={{ marginTop: '4px', fontSize: '12px', color: '#666' }}>
                        {orderData.coupon.description && <div>{orderData.coupon.description}</div>}
                        {orderData.coupon.discount_percent > 0 && (
                          <div>Giảm {orderData.coupon.discount_percent}%</div>
                        )}
                        {orderData.coupon.discount_amount > 0 && (
                          <div>Giảm {new Intl.NumberFormat('vi-VN', {
                            style: 'currency',
                            currency: 'VND',
                          }).format(orderData.coupon.discount_amount)}</div>
                        )}
                      </div>
                    )}
                  </div>
                </Descriptions.Item>
              )}
              {orderData.currency && (
                <Descriptions.Item label="Tiền tệ">
                  {orderData.currency}
                </Descriptions.Item>
              )}
              {orderData.processed_by && (
                <Descriptions.Item label="Người xử lý">
                  {orderData.processed_by_user ? (
                    <div>
                      <div>{orderData.processed_by_user.username || orderData.processed_by_user.email || `User ID: ${orderData.processed_by}`}</div>
                      {orderData.processed_by_user.email && (
                        <div style={{ fontSize: '12px', color: '#666' }}>{orderData.processed_by_user.email}</div>
                      )}
                    </div>
                  ) : (
                    `User ID: ${orderData.processed_by}`
                  )}
                </Descriptions.Item>
              )}
              {orderData.notes && (
                <Descriptions.Item label="Ghi chú">
                  {orderData.notes}
                </Descriptions.Item>
              )}
            </Descriptions>
          </Card>
        </Col>

        <Col xs={24} lg={8}>
          <Card title="Khách Hàng">
            {orderData.user ? (
              <Descriptions column={1} size="small">
                <Descriptions.Item label="User ID">
                  {orderData.user.user_id || orderData.user_id || 'N/A'}
                </Descriptions.Item>
                <Descriptions.Item label="Username">
                  {orderData.user.username || 'N/A'}
                </Descriptions.Item>
                <Descriptions.Item label="Email">
                  {orderData.user.email || 'N/A'}
                </Descriptions.Item>
                {(orderData.user.first_name || orderData.user.last_name) && (
                  <Descriptions.Item label="Họ và tên">
                    {[orderData.user.first_name, orderData.user.last_name].filter(Boolean).join(' ') || 'N/A'}
                  </Descriptions.Item>
                )}
                {orderData.user.phone && (
                  <Descriptions.Item label="Điện thoại">
                    {orderData.user.phone}
                  </Descriptions.Item>
                )}
                {orderData.user.role_id && (
                  <Descriptions.Item label="Vai trò">
                    <Tag color={orderData.user.role_id === 1 ? 'red' : orderData.user.role_id === 2 ? 'blue' : 'default'}>
                      {orderData.user.role_id === 1 ? 'Admin' : orderData.user.role_id === 2 ? 'Shipper' : orderData.user.role_id === 3 ? 'Customer' : `Role ID: ${orderData.user.role_id}`}
                    </Tag>
                  </Descriptions.Item>
                )}
                {orderData.user.is_active !== undefined && (
                  <Descriptions.Item label="Trạng thái">
                    <Tag color={orderData.user.is_active ? 'green' : 'red'}>
                      {orderData.user.is_active ? 'Hoạt động' : 'Không hoạt động'}
                    </Tag>
                  </Descriptions.Item>
                )}
                {orderData.user.email_verified !== undefined && (
                  <Descriptions.Item label="Xác thực email">
                    <Tag color={orderData.user.email_verified ? 'green' : 'orange'}>
                      {orderData.user.email_verified ? 'Đã xác thực' : 'Chưa xác thực'}
                    </Tag>
                  </Descriptions.Item>
                )}
                {orderData.user.last_login && (
                  <Descriptions.Item label="Đăng nhập lần cuối">
                    {new Date(orderData.user.last_login).toLocaleString('vi-VN')}
                  </Descriptions.Item>
                )}
                {orderData.user.bio && (
                  <Descriptions.Item label="Giới thiệu">
                    {orderData.user.bio}
                  </Descriptions.Item>
                )}
                {orderData.user.created_at && (
                  <Descriptions.Item label="Ngày tạo">
                    {new Date(orderData.user.created_at).toLocaleString('vi-VN')}
                  </Descriptions.Item>
                )}
                {orderData.user.updated_at && (
                  <Descriptions.Item label="Cập nhật lần cuối">
                    {new Date(orderData.user.updated_at).toLocaleString('vi-VN')}
                  </Descriptions.Item>
                )}
              </Descriptions>
            ) : orderData.user_id ? (
              <p>User ID: {orderData.user_id} (Chưa có thông tin chi tiết)</p>
            ) : (
              <p>Chưa có thông tin khách hàng</p>
            )}
          </Card>
        </Col>

        <Col xs={24} lg={8}>
          <Card title="Địa Chỉ Giao Hàng">
            {orderData.shipping_address ? (
              <Descriptions column={1} size="small">
                <Descriptions.Item label="Người nhận">
                  <strong>{orderData.shipping_address.full_name}</strong>
                </Descriptions.Item>
                <Descriptions.Item label="Địa chỉ">
                  {orderData.shipping_address.address_line1}
                  {orderData.shipping_address.address_line2 && (
                    <div>{orderData.shipping_address.address_line2}</div>
                  )}
                </Descriptions.Item>
                <Descriptions.Item label="Địa chỉ đầy đủ">
                  {[
                    orderData.shipping_address.ward,
                    orderData.shipping_address.district,
                    orderData.shipping_address.city,
                    orderData.shipping_address.province
                  ].filter(Boolean).join(', ')}
                </Descriptions.Item>
                <Descriptions.Item label="Điện thoại">
                  {orderData.shipping_address.phone || 'N/A'}
                </Descriptions.Item>
              </Descriptions>
            ) : orderData.shipping_address_id ? (
              <p>Địa chỉ ID: {orderData.shipping_address_id}</p>
            ) : (
              <p>Chưa có địa chỉ</p>
            )}
          </Card>
        </Col>

        {orderData.billing_address_id && orderData.billing_address_id !== orderData.shipping_address_id && (
          <Col xs={24} lg={8}>
            <Card title="Địa Chỉ Thanh Toán">
              {orderData.billing_address ? (
                <Descriptions column={1} size="small">
                  <Descriptions.Item label="Người nhận">
                    <strong>{orderData.billing_address.full_name}</strong>
                  </Descriptions.Item>
                  <Descriptions.Item label="Địa chỉ">
                    {orderData.billing_address.address_line1}
                    {orderData.billing_address.address_line2 && (
                      <div>{orderData.billing_address.address_line2}</div>
                    )}
                  </Descriptions.Item>
                  <Descriptions.Item label="Địa chỉ đầy đủ">
                    {[
                      orderData.billing_address.ward,
                      orderData.billing_address.district,
                      orderData.billing_address.city,
                      orderData.billing_address.province
                    ].filter(Boolean).join(', ')}
                  </Descriptions.Item>
                  <Descriptions.Item label="Điện thoại">
                    {orderData.billing_address.phone || 'N/A'}
                  </Descriptions.Item>
                </Descriptions>
              ) : (
                <p>Địa chỉ ID: {orderData.billing_address_id}</p>
              )}
            </Card>
          </Col>
        )}

        {paymentData && (
          <Col xs={24} lg={8}>
            <Card title="Thông Tin Thanh Toán">
              <Descriptions column={1} size="small">
                <Descriptions.Item label="Gateway">
                  <Tag>{paymentData.gateway?.toUpperCase() || 'N/A'}</Tag>
                </Descriptions.Item>
                <Descriptions.Item label="Trạng thái">
                  {getPaymentStatusTag(paymentData)}
                </Descriptions.Item>
                <Descriptions.Item label="Số tiền">
                  {new Intl.NumberFormat('vi-VN', {
                    style: 'currency',
                    currency: 'VND',
                  }).format(paymentData.amount || 0)}
                </Descriptions.Item>
                {paymentData.gateway_transaction_id && (
                  <Descriptions.Item label="Transaction ID">
                    {paymentData.gateway_transaction_id}
                  </Descriptions.Item>
                )}
                {paymentData.gateway_status && (
                  <Descriptions.Item label="Gateway Status">
                    <Tag color={paymentData.gateway_status === 'success' ? 'green' : paymentData.gateway_status === 'pending' ? 'orange' : 'default'}>
                      {paymentData.gateway_status}
                    </Tag>
                  </Descriptions.Item>
                )}
                {paymentData.paid_at && (
                  <Descriptions.Item label="Ngày thanh toán">
                    {new Date(paymentData.paid_at).toLocaleString('vi-VN')}
                  </Descriptions.Item>
                )}
                {paymentData.created_at && (
                  <Descriptions.Item label="Ngày tạo">
                    {new Date(paymentData.created_at).toLocaleString('vi-VN')}
                  </Descriptions.Item>
                )}
                {paymentData.updated_at && (
                  <Descriptions.Item label="Cập nhật lần cuối">
                    {new Date(paymentData.updated_at).toLocaleString('vi-VN')}
                  </Descriptions.Item>
                )}
              </Descriptions>
            </Card>
          </Col>
        )}
      </Row>

      <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
        <Col xs={24}>
          <Card title="Sản Phẩm">
            <Table
              columns={columns}
              dataSource={orderData.items || orderData.order_items || []}
              rowKey={(record) => record.order_item_id || record.id}
              pagination={false}
            />
          </Card>
        </Col>
      </Row>

      {orderData.status_history && (
        <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
          <Col xs={24}>
            <Card title="Lịch Sử Thay Đổi Trạng Thái">
              {(() => {
                try {
                  const history = typeof orderData.status_history === 'string' 
                    ? JSON.parse(orderData.status_history) 
                    : orderData.status_history;
                  
                  if (Array.isArray(history) && history.length > 0) {
                    return (
                      <Descriptions column={1} size="small" bordered>
                        {history.map((item, index) => (
                          <Descriptions.Item 
                            key={index} 
                            label={
                              <div>
                                <div>{new Date(item.changed_at).toLocaleString('vi-VN')}</div>
                                {item.changed_by && (
                                  <div style={{ fontSize: '11px', color: '#999' }}>
                                    User ID: {item.changed_by}
                                  </div>
                                )}
                              </div>
                            }
                          >
                            {(() => {
                              const statusId = parseInt(item.status_id) || item.status_id;
                              // Thử nhiều cách để lấy tên trạng thái
                              const statusName = statusMap[statusId] || 
                                                 statusMap[statusId.toString()] || 
                                                 statusMap[item.status_id] ||
                                                 defaultStatusMap[statusId] ||
                                                 defaultStatusMap[statusId.toString()] ||
                                                 `Status ID: ${item.status_id}`;
                              return (
                                <Tag color={statusId === 1 ? 'orange' : 
                                            statusId === 2 ? 'blue' : 
                                            statusId === 3 ? 'cyan' : 
                                            statusId === 4 ? 'green' : 
                                            statusId === 5 ? 'red' : 
                                            statusId === 6 ? 'purple' : 
                                            statusId === 7 ? 'purple' : 
                                            statusId === 8 ? 'green' : 'default'}>
                                  {statusName}
                                </Tag>
                              );
                            })()}
                          </Descriptions.Item>
                        ))}
                      </Descriptions>
                    );
                  }
                  return <p>Không có lịch sử</p>;
                } catch (e) {
                  console.error('Error parsing status_history:', e);
                  return <p>Lỗi khi đọc lịch sử</p>;
                }
              })()}
            </Card>
          </Col>
        </Row>
      )}

      <div style={{ marginTop: '24px', textAlign: 'right' }}>
        <Space>
          {/* [REQUIREMENT] Chỉ hiển thị nút xác nhận và hủy khi order ở trạng thái PENDING */}
          {(orderData.order_status_id === 1 || orderData.status_id === 1) && (
            <>
              <Button
                type="primary"
                icon={<CheckOutlined />}
                onClick={() => handleStatusChange('confirm')}
              >
                Xác Nhận Đơn Hàng
              </Button>
              <Button
                danger
                icon={<CloseCircleOutlined />}
                onClick={() => handleStatusChange('cancel')}
              >
                Hủy Đơn Hàng
              </Button>
            </>
          )}
          {/* [REQUIREMENT] Order CONFIRMED không thể hủy - không hiển thị nút hủy */}
          {(orderData.order_status_id === 2 || orderData.status_id === 2) && (
            <Button
              type="primary"
              icon={<TruckOutlined />}
              onClick={() => handleStatusChange('shipping')}
            >
              Bắt Đầu Giao Hàng
            </Button>
          )}
          {(orderData.order_status_id === 3 || orderData.status_id === 3) && (
            <Button
              type="primary"
              icon={<CheckCircleOutlined />}
              onClick={() => handleStatusChange('delivered')}
            >
              Đánh Dấu Đã Giao
            </Button>
          )}
          {/* [NEW REQUIREMENT] COD orders ở DELIVERED: Admin có thể chọn trạng thái thanh toán */}
          {(orderData.order_status_id === 4 || orderData.status_id === 4) && 
           paymentData && 
           (paymentData.gateway === 'COD' || paymentData.gateway === 'cod') && (
            <>
              <Popconfirm
                title="Xác nhận đã thanh toán?"
                description="Đơn hàng sẽ chuyển sang trạng thái 'Hoàn thành'"
                onConfirm={() => handleStatusChange('confirm-payment-paid')}
                okText="Xác nhận"
                cancelText="Hủy"
              >
                <Button
                  type="primary"
                  icon={<DollarOutlined />}
                  style={{ backgroundColor: '#52c41a', borderColor: '#52c41a' }}
                >
                  Xác Nhận Đã Thanh Toán
                </Button>
              </Popconfirm>
              {paymentData.payment_status_id === 2 && (
                <Popconfirm
                  title="Chuyển về trạng thái chưa thanh toán?"
                  description="Đơn hàng sẽ giữ ở trạng thái 'Đã giao hàng'"
                  onConfirm={() => handleStatusChange('confirm-payment-pending')}
                  okText="Xác nhận"
                  cancelText="Hủy"
                >
                  <Button
                    icon={<ClockCircleOutlined />}
                    onClick={() => handleStatusChange('confirm-payment-pending')}
                  >
                    Đánh Dấu Chưa Thanh Toán
                  </Button>
                </Popconfirm>
              )}
            </>
          )}
          {/* Button "Hoàn thành" cho tất cả đơn hàng ở trạng thái DELIVERED */}
          {(orderData.order_status_id === 4 || orderData.status_id === 4) && (
            <Popconfirm
              title="Hoàn thành đơn hàng?"
              description="Đơn hàng sẽ chuyển sang trạng thái 'Hoàn thành'"
              onConfirm={() => handleStatusChange('complete')}
              okText="Xác nhận"
              cancelText="Hủy"
            >
              <Button
                type="primary"
                icon={<CheckCircleOutlined />}
                style={{ backgroundColor: '#52c41a', borderColor: '#52c41a' }}
              >
                Hoàn Thành
              </Button>
            </Popconfirm>
          )}
        </Space>
      </div>
    </div>
  );
};

export default AdminOrderDetail;
