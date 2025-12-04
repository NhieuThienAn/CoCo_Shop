import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
} from 'antd';
import {
  EyeOutlined,
  CheckOutlined,
  TruckOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  SearchOutlined,
  ReloadOutlined,
  UserOutlined,
  DollarOutlined,
  ShoppingOutlined,
  CalendarOutlined,
  EnvironmentOutlined,
  TagOutlined,
  FileTextOutlined,
  EditOutlined,
  InfoCircleOutlined,
  ClearOutlined,
} from '@ant-design/icons';
import { order, payment } from '../../api/index.js';
import { getAddressById } from '../../api/address.js';

const { Title, Text } = Typography;
const { Search } = Input;

const AdminOrders = () => {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState({});
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0 });
  const [filters, setFilters] = useState({
    statusId: '',
    searchText: '',
    paymentMethod: '',
    paymentStatus: '',
  });

  useEffect(() => {
    loadOrders();
  }, [pagination.page, pagination.limit, filters.statusId, filters.paymentMethod, filters.paymentStatus]);

  const loadOrders = async () => {
    setLoading(true);
    try {
      const apiFilters = {};
      if (filters.statusId) {
        apiFilters.statusId = filters.statusId;
      }
      if (filters.searchText) {
        apiFilters.search = filters.searchText;
      }
      
      const response = filters.statusId
        ? await order.getOrdersByStatus(filters.statusId, pagination.page, pagination.limit)
        : await order.getAllOrders(pagination.page, pagination.limit, apiFilters);

      if (response.success) {
        let ordersData = response.data || [];
        
        // Filter by search text if provided
        if (filters.searchText) {
          const searchLower = filters.searchText.toLowerCase();
          ordersData = ordersData.filter(o => 
            o.order_number?.toLowerCase().includes(searchLower) ||
            o.user?.username?.toLowerCase().includes(searchLower) ||
            o.user?.email?.toLowerCase().includes(searchLower)
          );
        }

        // Filter by payment method
        if (filters.paymentMethod) {
          ordersData = ordersData.filter(o => {
            const payment = o.payment || o.payments?.[0];
            if (!payment) return filters.paymentMethod === 'none';
            const gateway = payment.gateway?.toUpperCase();
            if (filters.paymentMethod === 'COD') return gateway === 'COD';
            if (filters.paymentMethod === 'MOMO') return gateway === 'MOMO';
            return false;
          });
        }

        // Filter by payment status
        if (filters.paymentStatus) {
          ordersData = ordersData.filter(o => {
            const payment = o.payment || o.payments?.[0];
            if (!payment) return filters.paymentStatus === 'none';
            const statusId = parseInt(payment.payment_status_id);
            if (filters.paymentStatus === 'paid') return statusId === 2;
            if (filters.paymentStatus === 'pending') return statusId === 1;
            return false;
          });
        }

        
        // Enrich orders with payment and address data if not already included
        // Backend getAll does not enrich payment data, so we fetch it here
        // Logic: Find paid payment (status_id = 2) first, otherwise use most recent payment
        const enrichedOrders = await Promise.all(
          ordersData.map(async (orderItem) => {
            // Only fetch if payment data is not already present
            if (!orderItem.payment && (!orderItem.payments || orderItem.payments.length === 0)) {
              try {
                const paymentRes = await payment.getPaymentsByOrder(orderItem.order_id);
                if (paymentRes.success && paymentRes.data) {
                  const payments = Array.isArray(paymentRes.data) ? paymentRes.data : [paymentRes.data];
                  if (payments.length > 0) {
                    // Sort payments: paid first (status_id = 2), then by created_at DESC
                    payments.sort((a, b) => {
                      const aStatus = parseInt(a.payment_status_id) || 0;
                      const bStatus = parseInt(b.payment_status_id) || 0;
                      if (aStatus === 2 && bStatus !== 2) return -1;
                      if (aStatus !== 2 && bStatus === 2) return 1;
                      // Both same status, sort by created_at DESC
                      const aDate = new Date(a.created_at || 0);
                      const bDate = new Date(b.created_at || 0);
                      return bDate - aDate;
                    });
                    // Primary payment: paid payment (status_id = 2) or most recent
                    orderItem.payment = payments[0] || null;
                    orderItem.payments = payments;
                  } else {
                    orderItem.payment = null;
                    orderItem.payments = [];
                  }
                } else {
                  orderItem.payment = null;
                  orderItem.payments = [];
                }
              } catch (error) {
                console.warn('Could not load payment for order', orderItem.order_id, error);
                orderItem.payment = null;
                orderItem.payments = [];
              }
            }
            
            // Fetch shipping address if not already present
            if (orderItem.shipping_address_id && !orderItem.shipping_address) {
              try {
                const addressRes = await getAddressById(orderItem.shipping_address_id);
                if (addressRes.success && addressRes.data) {
                  orderItem.shipping_address = addressRes.data;
                }
              } catch (error) {
                console.warn('Could not load shipping address for order', orderItem.order_id, error);
              }
            }
            
            // Fetch billing address if not already present and different from shipping
            if (orderItem.billing_address_id && 
                orderItem.billing_address_id !== orderItem.shipping_address_id && 
                !orderItem.billing_address) {
              try {
                const addressRes = await getAddressById(orderItem.billing_address_id);
                if (addressRes.success && addressRes.data) {
                  orderItem.billing_address = addressRes.data;
                }
              } catch (error) {
                console.warn('Could not load billing address for order', orderItem.order_id, error);
              }
            }
            
            return orderItem;
          })
        );
        
        setOrders(enrichedOrders);
        setPagination((prev) => ({
          ...prev,
          total: response.pagination?.total || enrichedOrders.length || 0,
        }));
      } else {
        message.error(response.message || 'Có lỗi xảy ra khi tải đơn hàng');
      }
    } catch (error) {
      console.error('Error loading orders:', error);
      message.error(error.message || 'Có lỗi xảy ra khi tải đơn hàng');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (orderId, action) => {
    // Prevent multiple clicks on the same order
    const updateKey = `${orderId}-${action}`;
    if (updating[updateKey]) {
      return;
    }

    setUpdating((prev) => ({ ...prev, [updateKey]: true }));
    try {
      let response;
      switch (action) {
        case 'confirm':
          response = await order.confirmOrder(orderId);
          if (response.success) {
            message.success('Xác nhận đơn hàng thành công');
            // Reload immediately to update UI
            await loadOrders();
          } else {
            message.error(response.message || 'Có lỗi xảy ra khi xác nhận đơn hàng');
            return;
          }
          break;
        case 'shipping':
          response = await order.startShipping(orderId);
          if (response.success) {
            message.success('Bắt đầu giao hàng thành công');
          } else {
            message.error(response.message || 'Có lỗi xảy ra khi bắt đầu giao hàng');
            return;
          }
          break;
        case 'delivered':
          response = await order.markAsDelivered(orderId);
          if (response.success) {
            message.success('Đánh dấu đã giao thành công');
          } else {
            message.error(response.message || 'Có lỗi xảy ra khi đánh dấu đã giao');
            return;
          }
          break;
        case 'cancel':
          response = await order.cancelOrder(orderId);
          if (response.success) {
            message.success('Hủy đơn hàng thành công');
          } else {
            message.error(response.message || 'Có lỗi xảy ra khi hủy đơn hàng');
            return;
          }
          break;
        case 'complete':
          response = await order.completeOrder(orderId);
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
      // Only reload if not already reloaded in specific case
      if (action !== 'confirm') {
        await loadOrders();
      }
    } catch (error) {
      console.error('Error updating order:', error);
      message.error(error.message || 'Có lỗi xảy ra khi cập nhật đơn hàng');
    } finally {
      setUpdating((prev) => {
        const newState = { ...prev };
        delete newState[updateKey];
        return newState;
      });
    }
  };

  const getOrderStatusTag = (statusId, statusName) => {
    // Backend trả về order_status với status_name (không phải name)
    // Nếu có statusName từ backend, ưu tiên sử dụng
    if (statusName) {
      const statusMap = {
        1: { color: 'orange' },
        2: { color: 'blue' },
        3: { color: 'cyan' },
        4: { color: 'green' },
        5: { color: 'red' },
        6: { color: 'purple' },
        8: { color: 'green' },
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
    const statusName = payment.payment_status?.status_name || payment.status?.status_name || '';
    
    // payment_status_id: 1 = Pending, 2 = Paid/Completed
    // Theo database: paymentstatus table có status_name
    if (paymentStatusId === 2) {
      return <Tag color="green">Đã Thanh Toán ({gateway})</Tag>;
    } else if (paymentStatusId === 1) {
      return <Tag color="orange">Chờ Thanh Toán ({gateway})</Tag>;
    } else {
      // Fallback: hiển thị status_name nếu có
      return <Tag color="default">{statusName || gateway}</Tag>;
    }
  };

  const getPaymentMethod = (payment) => {
    if (!payment) return 'Chưa có';
    const gateway = payment.gateway?.toUpperCase();
    return gateway === 'MOMO' ? 'MoMo' : gateway === 'COD' ? 'COD' : gateway || 'N/A';
  };

  if (loading && orders.length === 0) {
    return (
      <div style={{ padding: '24px', textAlign: 'center' }}>
        <Spin size="large">
          <div style={{ marginTop: '16px' }}>Đang tải đơn hàng...</div>
        </Spin>
      </div>
    );
  }

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <Title level={2} style={{ margin: 0 }}>Quản Lý Đơn Hàng</Title>
        <Button
          icon={<ReloadOutlined />}
          onClick={loadOrders}
          loading={loading}
        >
          Làm Mới
        </Button>
      </div>

      <Card 
        style={{ marginBottom: '16px' }}
        styles={{ body: { padding: '16px' } }}
      >
        <Space direction="vertical" style={{ width: '100%' }} size="middle">
          {/* Quick filters row */}
          <Space wrap style={{ width: '100%' }}>
            <Search
              placeholder="Tìm kiếm theo mã đơn, tên, email khách hàng..."
              allowClear
              enterButton={<SearchOutlined />}
              style={{ width: 300 }}
              value={filters.searchText}
              onSearch={(value) => {
                setFilters((prev) => ({ ...prev, searchText: value }));
                setPagination((prev) => ({ ...prev, page: 1 }));
              }}
              onChange={(e) => {
                if (!e.target.value) {
                  setFilters((prev) => ({ ...prev, searchText: '' }));
                  setPagination((prev) => ({ ...prev, page: 1 }));
                }
              }}
            />
            <Select
              placeholder="Trạng thái đơn hàng"
              style={{ width: 160 }}
              allowClear
              value={filters.statusId || undefined}
              onChange={(value) => {
                setFilters((prev) => ({ ...prev, statusId: value || '' }));
                setPagination((prev) => ({ ...prev, page: 1 }));
              }}
            >
              <Select.Option value="1">Chờ Xác Nhận</Select.Option>
              <Select.Option value="2">Đã Xác Nhận</Select.Option>
              <Select.Option value="3">Đang Giao</Select.Option>
              <Select.Option value="4">Đã Giao</Select.Option>
              <Select.Option value="5">Đã Hủy</Select.Option>
              <Select.Option value="6">Trả Hàng</Select.Option>
              <Select.Option value="8">Hoàn Thành</Select.Option>
            </Select>
            <Select
              placeholder="Phương thức thanh toán"
              style={{ width: 180 }}
              allowClear
              value={filters.paymentMethod || undefined}
              onChange={(value) => {
                setFilters((prev) => ({ ...prev, paymentMethod: value || '' }));
                setPagination((prev) => ({ ...prev, page: 1 }));
              }}
            >
              <Select.Option value="COD">COD</Select.Option>
              <Select.Option value="MOMO">MoMo</Select.Option>
              <Select.Option value="none">Chưa có thanh toán</Select.Option>
            </Select>
            <Select
              placeholder="Trạng thái thanh toán"
              style={{ width: 180 }}
              allowClear
              value={filters.paymentStatus || undefined}
              onChange={(value) => {
                setFilters((prev) => ({ ...prev, paymentStatus: value || '' }));
                setPagination((prev) => ({ ...prev, page: 1 }));
              }}
            >
              <Select.Option value="paid">Đã Thanh Toán</Select.Option>
              <Select.Option value="pending">Chờ Thanh Toán</Select.Option>
              <Select.Option value="none">Chưa có thanh toán</Select.Option>
            </Select>
            <Button
              icon={<ClearOutlined />}
              onClick={() => {
                setFilters({
                  statusId: '',
                  searchText: '',
                  paymentMethod: '',
                  paymentStatus: '',
                  dateRange: null,
                  singleDate: null,
                  amountRange: { min: null, max: null },
                });
                setPagination((prev) => ({ ...prev, page: 1 }));
              }}
            >
              Xóa Bộ Lọc
            </Button>
          </Space>

          {/* Results count */}
          {orders.length > 0 && (
            <div style={{ marginTop: '8px' }}>
              <Text type="secondary">
                Tìm thấy <Text strong>{orders.length}</Text> đơn hàng
              </Text>
            </div>
          )}
        </Space>
      </Card>

      {orders.length === 0 ? (
        <Empty description="Chưa có đơn hàng nào" />
      ) : (
        <>
          <Row gutter={[16, 16]}>
            {orders.map((record) => {
              const orderId = record.order_id;
              const statusId = record.status_id || record.order_status_id;
              // Backend trả về order_status với status_name (không phải name)
              // Cần kiểm tra cả status_name và name để tương thích
              const statusName = record.order_status?.status_name || 
                                 record.order_status?.name || 
                                 record.status?.status_name || 
                                 record.status?.name;
              const user = record.user || {};
              const paymentData = record.payment || record.payments?.[0];
              const paymentStatusId = paymentData ? parseInt(paymentData.payment_status_id) : null;
              const isPaid = paymentStatusId === 2;

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
                          onClick={() => navigate(`/admin/orders/${orderId}`)}
                        >
                          Xem
                        </Button>
                      </Tooltip>,
                      statusId === 1 && (
                        <Tooltip title="Xác nhận đơn hàng" key="confirm">
                          <Popconfirm
                            title="Xác nhận đơn hàng này?"
                            onConfirm={() => handleStatusChange(orderId, 'confirm')}
                            okText="Xác nhận"
                            cancelText="Hủy"
                            disabled={updating[`${orderId}-confirm`]}
                          >
                            <Button
                              type="text"
                              icon={<CheckOutlined />}
                              style={{ color: '#1890ff' }}
                              loading={updating[`${orderId}-confirm`]}
                              disabled={updating[`${orderId}-confirm`]}
                            >
                              Xác Nhận
                            </Button>
                          </Popconfirm>
                        </Tooltip>
                      ),
                      statusId === 2 && (
                        <Tooltip title="Bắt đầu giao hàng" key="shipping">
                          <Popconfirm
                            title="Bắt đầu giao hàng?"
                            onConfirm={() => handleStatusChange(orderId, 'shipping')}
                            okText="Xác nhận"
                            cancelText="Hủy"
                          >
                            <Button
                              type="text"
                              icon={<TruckOutlined />}
                              style={{ color: '#1890ff' }}
                            >
                              Giao Hàng
                            </Button>
                          </Popconfirm>
                        </Tooltip>
                      ),
                      statusId === 3 && (
                        <Tooltip title="Đánh dấu đã giao hàng" key="delivered">
                          <Popconfirm
                            title="Xác nhận đã giao hàng?"
                            onConfirm={() => handleStatusChange(orderId, 'delivered')}
                            okText="Xác nhận"
                            cancelText="Hủy"
                          >
                            <Button
                              type="text"
                              icon={<CheckCircleOutlined />}
                              style={{ color: '#52c41a' }}
                            >
                              Đã Giao Hàng
                            </Button>
                          </Popconfirm>
                        </Tooltip>
                      ),
                      statusId === 1 && (
                        <Tooltip title="Hủy đơn hàng" key="cancel">
                          <Popconfirm
                            title="Bạn có chắc muốn hủy đơn hàng này?"
                            onConfirm={() => handleStatusChange(orderId, 'cancel')}
                            okText="Hủy"
                            cancelText="Không"
                            okType="danger"
                          >
                            <Button
                              type="text"
                              danger
                              icon={<CloseCircleOutlined />}
                            >
                              Hủy
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
                          onClick={() => navigate(`/admin/orders/${orderId}`)}
                          style={{ padding: 0, height: 'auto', fontSize: '16px', fontWeight: 'bold' }}
                        >
                          {record.order_number || `#${orderId}`}
                        </Button>
                        {getOrderStatusTag(statusId, statusName)}
                      </div>

                      <Space direction="vertical" size="small" style={{ width: '100%' }}>
                        <div>
                          <UserOutlined style={{ marginRight: '8px', color: '#1890ff' }} />
                          <Text strong>Khách hàng:</Text>
                          <div style={{ marginLeft: '24px', marginTop: '4px' }}>
                            <div>{user.username || 'N/A'}</div>
                            <div style={{ fontSize: '12px', color: '#999' }}>{user.email || ''}</div>
                            {user.phone && (
                              <div style={{ fontSize: '12px', color: '#999' }}>{user.phone}</div>
                            )}
                          </div>
                        </div>

                        {/* Thông tin địa chỉ giao hàng */}
                        {record.shipping_address_id && (
                          <div>
                            <EnvironmentOutlined style={{ marginRight: '8px', color: '#52c41a' }} />
                            <Text strong>Địa chỉ giao hàng:</Text>
                            <div style={{ marginLeft: '24px', marginTop: '4px', fontSize: '12px', color: '#666' }}>
                              {record.shipping_address ? (
                                <div>
                                  <div>{record.shipping_address.full_name} - {record.shipping_address.phone}</div>
                                  <div>{record.shipping_address.address_line1}</div>
                                  {record.shipping_address.address_line2 && (
                                    <div>{record.shipping_address.address_line2}</div>
                                  )}
                                  <div>
                                    {[
                                      record.shipping_address.ward,
                                      record.shipping_address.district,
                                      record.shipping_address.city,
                                      record.shipping_address.province
                                    ].filter(Boolean).join(', ')}
                                  </div>
                                </div>
                              ) : (
                                <Text type="secondary">ID: {record.shipping_address_id}</Text>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Thông tin địa chỉ thanh toán */}
                        {record.billing_address_id && record.billing_address_id !== record.shipping_address_id && (
                          <div>
                            <EnvironmentOutlined style={{ marginRight: '8px', color: '#fa8c16' }} />
                            <Text strong>Địa chỉ thanh toán:</Text>
                            <div style={{ marginLeft: '24px', marginTop: '4px', fontSize: '12px', color: '#666' }}>
                              {record.billing_address ? (
                                <div>
                                  <div>{record.billing_address.full_name} - {record.billing_address.phone}</div>
                                  <div>{record.billing_address.address_line1}</div>
                                  {record.billing_address.address_line2 && (
                                    <div>{record.billing_address.address_line2}</div>
                                  )}
                                  <div>
                                    {[
                                      record.billing_address.ward,
                                      record.billing_address.district,
                                      record.billing_address.city,
                                      record.billing_address.province
                                    ].filter(Boolean).join(', ')}
                                  </div>
                                </div>
                              ) : (
                                <Text type="secondary">ID: {record.billing_address_id}</Text>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Thông tin giá trị đơn hàng */}
                        <div>
                          <DollarOutlined style={{ marginRight: '8px', color: '#52c41a' }} />
                          <Text strong>Giá trị đơn hàng:</Text>
                          <div style={{ marginLeft: '24px', marginTop: '4px' }}>
                            <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#1890ff' }}>
                              {new Intl.NumberFormat('vi-VN', {
                                style: 'currency',
                                currency: record.currency || 'VND',
                              }).format(record.total_amount || 0)}
                            </div>
                            {(record.discount_amount > 0 || record.shipping_fee > 0 || record.tax_amount > 0) && (
                              <div style={{ fontSize: '11px', color: '#999', marginTop: '4px' }}>
                                {record.discount_amount > 0 && (
                                  <div>Giảm giá: -{new Intl.NumberFormat('vi-VN', {
                                    style: 'currency',
                                    currency: record.currency || 'VND',
                                  }).format(record.discount_amount)}</div>
                                )}
                                {record.shipping_fee > 0 && (
                                  <div>Phí vận chuyển: +{new Intl.NumberFormat('vi-VN', {
                                    style: 'currency',
                                    currency: record.currency || 'VND',
                                  }).format(record.shipping_fee)}</div>
                                )}
                                {record.tax_amount > 0 && (
                                  <div>Thuế: +{new Intl.NumberFormat('vi-VN', {
                                    style: 'currency',
                                    currency: record.currency || 'VND',
                                  }).format(record.tax_amount)}</div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Thông tin coupon */}
                        {record.coupon_id && (
                          <div>
                            <TagOutlined style={{ marginRight: '8px', color: '#722ed1' }} />
                            <Text strong>Mã giảm giá:</Text>
                            <div style={{ marginLeft: '24px', marginTop: '4px' }}>
                              <Tag color="purple">ID: {record.coupon_id}</Tag>
                              {record.discount_amount > 0 && (
                                <Text style={{ fontSize: '12px', color: '#52c41a', marginLeft: '8px' }}>
                                  (-{new Intl.NumberFormat('vi-VN', {
                                    style: 'currency',
                                    currency: record.currency || 'VND',
                                  }).format(record.discount_amount)})
                                </Text>
                              )}
                            </div>
                          </div>
                        )}

                        <div>
                          <Text strong>Phương thức TT:</Text>
                          <div style={{ marginTop: '4px' }}>
                            <Tag>{getPaymentMethod(paymentData)}</Tag>
                          </div>
                        </div>

                        <div>
                          <Text strong>Trạng thái TT:</Text>
                          <div style={{ marginTop: '4px' }}>
                            {getPaymentStatusTag(paymentData)}
                          </div>
                        </div>

                        <div>
                          <ShoppingOutlined style={{ marginRight: '8px', color: '#722ed1' }} />
                          <Text strong>Số sản phẩm:</Text>
                          <Text style={{ marginLeft: '8px' }}>{record.items_count || 0}</Text>
                        </div>

                        {/* Ngày đặt hàng */}
                        {record.order_date && (
                          <div>
                            <CalendarOutlined style={{ marginRight: '8px', color: '#1890ff' }} />
                            <Text strong>Ngày đặt hàng:</Text>
                            <div style={{ marginLeft: '24px', marginTop: '4px', fontSize: '12px', color: '#666' }}>
                              {new Date(record.order_date).toLocaleString('vi-VN', {
                                year: 'numeric',
                                month: '2-digit',
                                day: '2-digit',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </div>
                          </div>
                        )}

                        {/* Ngày tạo */}
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

                        {/* Ngày cập nhật */}
                        {record.updated_at && record.updated_at !== record.created_at && (
                          <div>
                            <EditOutlined style={{ marginRight: '8px', color: '#999' }} />
                            <Text strong>Ngày cập nhật:</Text>
                            <div style={{ marginLeft: '24px', marginTop: '4px', fontSize: '12px', color: '#999' }}>
                              {new Date(record.updated_at).toLocaleString('vi-VN', {
                                year: 'numeric',
                                month: '2-digit',
                                day: '2-digit',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </div>
                          </div>
                        )}

                        {/* Ghi chú */}
                        {record.notes && (
                          <div>
                            <FileTextOutlined style={{ marginRight: '8px', color: '#faad14' }} />
                            <Text strong>Ghi chú:</Text>
                            <div style={{ marginLeft: '24px', marginTop: '4px', fontSize: '12px', color: '#666', fontStyle: 'italic' }}>
                              {record.notes}
                            </div>
                          </div>
                        )}

                        {/* Người xử lý */}
                        {record.processed_by && (
                          <div>
                            <InfoCircleOutlined style={{ marginRight: '8px', color: '#1890ff' }} />
                            <Text strong>Xử lý bởi:</Text>
                            <div style={{ marginLeft: '24px', marginTop: '4px', fontSize: '12px', color: '#666' }}>
                              User ID: {record.processed_by}
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

          <div style={{ marginTop: '24px', textAlign: 'right' }}>
            <Pagination
              current={pagination.page}
              pageSize={pagination.limit}
              total={pagination.total}
              showSizeChanger
              showQuickJumper
              showTotal={(total) => `Tổng ${total} đơn hàng`}
              pageSizeOptions={['10', '20', '50', '100']}
              onChange={(page, pageSize) => {
                setPagination((prev) => ({ ...prev, page, limit: pageSize }));
              }}
            />
          </div>
        </>
      )}
    </div>
  );
};

export default AdminOrders;
