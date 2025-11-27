import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, Row, Col, Table, Statistic, Spin, Typography } from 'antd';
import {
  ShoppingCartOutlined,
  DollarOutlined,
  ShoppingOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { order, product, user, payment } from '../../api/index.js';

const { Title } = Typography;

const Dashboard = () => {
  const [stats, setStats] = useState({
    totalOrders: 0,
    totalRevenue: 0,
    totalProducts: 0,
    totalUsers: 0,
  });
  const [recentOrders, setRecentOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const [ordersRes, productsRes, usersRes, paymentsRes] = await Promise.all([
        order.getAllOrders(1, 5),
        product.getProducts(1, 1),
        user.getAllUsers(1, 1),
        payment.getAllPayments(1, 100),
      ]);

      if (ordersRes.success) {
        setRecentOrders(ordersRes.data || []);
        setStats((prev) => ({
          ...prev,
          totalOrders: ordersRes.pagination?.total || 0,
        }));
      }

      if (productsRes.success) {
        setStats((prev) => ({
          ...prev,
          totalProducts: productsRes.pagination?.total || 0,
        }));
      }

      if (usersRes.success) {
        setStats((prev) => ({
          ...prev,
          totalUsers: usersRes.pagination?.total || 0,
        }));
      }

      if (paymentsRes.success) {
        // Tính doanh thu từ các payment đã hoàn thành (status = Completed/Paid)
        const completedPayments = (paymentsRes.data || []).filter(
          (p) => p.payment_status_id === 2 || p.status_id === 2 || p.payment_status?.name === 'Completed'
        );
        const revenue = completedPayments.reduce(
          (sum, p) => sum + (p.amount || 0),
          0
        );
        setStats((prev) => ({
          ...prev,
          totalRevenue: revenue,
        }));
      }
    } catch (error) {
      console.error('Error loading dashboard:', error);
      // Không hiển thị error message để không làm gián đoạn dashboard
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    {
      title: 'Mã Đơn',
      dataIndex: 'order_number',
      key: 'order_number',
    },
    {
      title: 'Khách Hàng',
      key: 'username',
      render: (_, record) => record.user?.username || 'N/A',
    },
    {
      title: 'Tổng Tiền',
      dataIndex: 'total_amount',
      key: 'total_amount',
      render: (amount) =>
        new Intl.NumberFormat('vi-VN', {
          style: 'currency',
          currency: 'VND',
        }).format(amount || 0),
    },
    {
      title: 'Trạng Thái',
      key: 'status',
      render: (_, record) => {
        const statusName = record.order_status?.name || record.status?.name || 'Pending';
        return (
          <span style={{ color: getStatusColor(statusName) }}>
            {statusName}
          </span>
        );
      },
    },
    {
      title: 'Ngày Tạo',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (date) => new Date(date).toLocaleDateString('vi-VN'),
    },
    {
      title: 'Thao Tác',
      key: 'action',
      render: (_, record) => (
        <Link to={`/admin/orders/${record.order_id}`}>Xem</Link>
      ),
    },
  ];

  const getStatusColor = (status) => {
    const statusMap = {
      Pending: '#faad14',
      Confirmed: '#1890ff',
      Shipping: '#722ed1',
      Delivered: '#52c41a',
      Cancelled: '#ff4d4f',
    };
    return statusMap[status] || '#666';
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '100px' }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div>
      <Title level={2}>Dashboard</Title>

      <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Tổng Đơn Hàng"
              value={stats.totalOrders}
              prefix={<ShoppingCartOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Doanh Thu"
              value={stats.totalRevenue}
              prefix={<DollarOutlined />}
              precision={0}
              valueStyle={{ color: '#52c41a' }}
              formatter={(value) =>
                new Intl.NumberFormat('vi-VN', {
                  style: 'currency',
                  currency: 'VND',
                }).format(value)
              }
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Tổng Sản Phẩm"
              value={stats.totalProducts}
              prefix={<ShoppingOutlined />}
              valueStyle={{ color: '#722ed1' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Tổng Người Dùng"
              value={stats.totalUsers}
              prefix={<UserOutlined />}
              valueStyle={{ color: '#fa8c16' }}
            />
          </Card>
        </Col>
      </Row>

      <Card
        title="Đơn Hàng Gần Đây"
        extra={<Link to="/admin/orders">Xem Tất Cả</Link>}
      >
        <Table
          columns={columns}
          dataSource={recentOrders}
          rowKey="order_id"
          pagination={false}
          locale={{ emptyText: 'Chưa có đơn hàng nào' }}
        />
      </Card>
    </div>
  );
};

export default Dashboard;
