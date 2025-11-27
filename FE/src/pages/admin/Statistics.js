import React, { useEffect, useState } from 'react';
import {
  Card,
  Row,
  Col,
  Statistic,
  DatePicker,
  Select,
  Button,
  Space,
  Typography,
  Spin,
  message,
  Tabs,
  Table,
} from 'antd';
import {
  DollarOutlined,
  ShoppingCartOutlined,
  UserOutlined,
  ProductOutlined,
  ReloadOutlined,
  FilterOutlined,
} from '@ant-design/icons';
import { Line, Column, Pie, Bar } from '@ant-design/charts';
import moment from 'moment';
import { statistics, support, category } from '../../api';

const { RangePicker } = DatePicker;
const { Title, Text } = Typography;
const { Option } = Select;

const Statistics = () => {
  // State
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  // Filters
  const [dateRange, setDateRange] = useState([moment().subtract(30, 'days'), moment()]);
  const [orderStatusFilter, setOrderStatusFilter] = useState(null);
  const [paymentMethodFilter, setPaymentMethodFilter] = useState(null);
  const [userRoleFilter, setUserRoleFilter] = useState(null);
  const [categoryFilter, setCategoryFilter] = useState(null);
  const [brandFilter, setBrandFilter] = useState(null);
  const [revenueGroupBy, setRevenueGroupBy] = useState('day');

  // Data
  const [overviewData, setOverviewData] = useState(null);
  const [orderStats, setOrderStats] = useState(null);
  const [revenueStats, setRevenueStats] = useState(null);
  const [userStats, setUserStats] = useState(null);
  const [productStats, setProductStats] = useState(null);

  // Options for filters
  const [orderStatuses, setOrderStatuses] = useState([]);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [roles, setRoles] = useState([]);
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);

  useEffect(() => {
    loadFilterOptions();
  }, []);

  useEffect(() => {
    loadData();
  }, [activeTab, dateRange, orderStatusFilter, paymentMethodFilter, userRoleFilter, categoryFilter, brandFilter, revenueGroupBy]);

  const loadFilterOptions = async () => {
    try {
      const [statusesRes, methodsRes, rolesRes, categoriesRes, brandsRes] = await Promise.all([
        support.getOrderStatuses(),
        support.getPaymentMethods(),
        support.getRoles(),
        category.getCategories(1, 1000),
        support.getBrands(),
      ]);

      if (statusesRes.success) setOrderStatuses(statusesRes.data || []);
      if (methodsRes.success) setPaymentMethods(methodsRes.data || []);
      if (rolesRes.success) setRoles(rolesRes.data || []);
      if (categoriesRes.success) setCategories(categoriesRes.data || []);
      if (brandsRes.success) setBrands(brandsRes.data || []);
    } catch (error) {
      console.error('Error loading filter options:', error);
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const startDate = dateRange[0] ? dateRange[0].format('YYYY-MM-DD') : null;
      const endDate = dateRange[1] ? dateRange[1].format('YYYY-MM-DD') : null;

      const promises = [];

      // Load overview
      if (activeTab === 'overview') {
        promises.push(statistics.getOverview(startDate, endDate));
      }

      // Load order statistics
      if (activeTab === 'orders') {
        promises.push(
          statistics.getOrderStatistics({
            startDate,
            endDate,
            statusId: orderStatusFilter,
            paymentMethodId: paymentMethodFilter,
          })
        );
      }

      // Load revenue statistics
      if (activeTab === 'revenue') {
        promises.push(
          statistics.getRevenueStatistics({
            startDate,
            endDate,
            paymentMethodId: paymentMethodFilter,
            groupBy: revenueGroupBy,
          })
        );
      }

      // Load user statistics
      if (activeTab === 'users') {
        promises.push(
          statistics.getUserStatistics({
            startDate,
            endDate,
            roleId: userRoleFilter,
          })
        );
      }

      // Load product statistics
      if (activeTab === 'products') {
        promises.push(
          statistics.getProductStatistics({
            categoryId: categoryFilter,
            brandId: brandFilter,
            limit: 20,
          })
        );
      }

      const results = await Promise.all(promises);

      // Check for errors in results
      const failedResults = results.filter(r => !r?.success);
      if (failedResults.length > 0) {
        console.error('Some statistics requests failed:', failedResults);
        const errorMessages = failedResults.map(r => r.message || 'Lỗi không xác định').join(', ');
        message.error(`Lỗi khi tải dữ liệu thống kê: ${errorMessages}`);
      }

      if (activeTab === 'overview' && results[0]?.success) {
        setOverviewData(results[0].data);
      } else if (activeTab === 'orders' && results[0]?.success) {
        setOrderStats(results[0].data);
      } else if (activeTab === 'revenue' && results[0]?.success) {
        setRevenueStats(results[0].data);
      } else if (activeTab === 'users' && results[0]?.success) {
        setUserStats(results[0].data);
      } else if (activeTab === 'products' && results[0]?.success) {
        setProductStats(results[0].data);
      } else if (results[0] && !results[0].success) {
        message.error(results[0].message || 'Lỗi khi tải dữ liệu thống kê');
      }
    } catch (error) {
      console.error('Error loading statistics:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Lỗi khi tải dữ liệu thống kê';
      message.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleResetFilters = () => {
    setDateRange([moment().subtract(30, 'days'), moment()]);
    setOrderStatusFilter(null);
    setPaymentMethodFilter(null);
    setUserRoleFilter(null);
    setCategoryFilter(null);
    setBrandFilter(null);
    setRevenueGroupBy('day');
  };

  const formatCurrency = (value) => {
    if (!value && value !== 0) return '₫0';
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(parseFloat(value));
  };

  const formatNumber = (value) => {
    if (!value && value !== 0) return '0';
    return new Intl.NumberFormat('vi-VN').format(parseInt(value));
  };

  // Render Overview Tab
  const renderOverview = () => {
    if (!overviewData) {
      return <div style={{ textAlign: 'center', padding: '50px' }}>Đang tải dữ liệu...</div>;
    }

    const { 
      summary = {}, 
      orderStatusCounts = [], 
      revenueByPaymentMethod = [], 
      topProducts = [], 
      revenueByDay = [] 
    } = overviewData;

    // Revenue chart data - Backend trả về: { date, revenue, order_count }
    const revenueChartData = (revenueByDay || []).map((item) => ({
      date: item.date || '',
      revenue: parseFloat(item.revenue || 0),
      orders: parseInt(item.order_count || 0),
    }));

    // Order status pie chart data - Backend trả về: { status_id, status_name, count }
    const orderStatusChartData = (orderStatusCounts || [])
      .filter(item => parseInt(item.count || 0) > 0)
      .map((item) => ({
        type: item.status_name || 'N/A',
        value: parseInt(item.count || 0),
      }));

    // Payment method chart data - Backend trả về: { payment_method_id, method_name, total_revenue, payment_count }
    const paymentMethodChartData = (revenueByPaymentMethod || [])
      .filter(item => parseFloat(item.total_revenue || 0) > 0)
      .map((item) => ({
        type: item.method_name || 'N/A',
        value: parseFloat(item.total_revenue || 0),
      }));

    // Top products chart data - Backend trả về: { product_id, product_id, name, slug, total_sold, total_revenue }
    const topProductsChartData = (topProducts || [])
      .slice(0, 10)
      .map((p) => ({
        name: p.name || 'N/A',
        value: parseInt(p.total_sold || 0),
      }));

    return (
      <div>
        {/* Summary Cards */}
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="Tổng Đơn Hàng"
                value={summary.totalOrders || 0}
                prefix={<ShoppingCartOutlined />}
                valueStyle={{ color: '#1890ff' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="Tổng Doanh Thu"
                value={formatCurrency(summary.totalRevenue)}
                prefix={<DollarOutlined />}
                valueStyle={{ color: '#52c41a' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="Tổng Khách Hàng"
                value={summary.totalCustomers || 0}
                prefix={<UserOutlined />}
                valueStyle={{ color: '#722ed1' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="Tổng Sản Phẩm"
                value={summary.totalProducts || 0}
                prefix={<ProductOutlined />}
                valueStyle={{ color: '#fa8c16' }}
              />
            </Card>
          </Col>
        </Row>

        {/* Charts Row 1 */}
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          <Col xs={24} lg={16}>
            <Card title="Doanh Thu Theo Ngày">
              {revenueChartData.length > 0 ? (
                <Line
                  data={revenueChartData}
                  xField="date"
                  yField="revenue"
                  point={{ size: 5, shape: 'circle' }}
                  smooth
                  color="#1890ff"
                  height={300}
                  label={{
                    formatter: (datum) => formatCurrency(datum.revenue),
                  }}
                />
              ) : (
                <div style={{ textAlign: 'center', padding: '50px' }}>Không có dữ liệu</div>
              )}
            </Card>
          </Col>
          <Col xs={24} lg={8}>
            <Card title="Đơn Hàng Theo Trạng Thái">
              {orderStatusChartData.length > 0 ? (
                <Pie
                  data={orderStatusChartData}
                  angleField="value"
                  colorField="type"
                  radius={0.8}
                  label={{
                    content: '{type}: {value}',
                    formatter: (datum) => {
                      if (!datum || !datum.type) return '';
                      return `${datum.type}: ${datum.value || 0}`;
                    },
                  }}
                  interactions={[{ type: 'element-active' }]}
                  height={300}
                />
              ) : (
                <div style={{ textAlign: 'center', padding: '50px' }}>Không có dữ liệu</div>
              )}
            </Card>
          </Col>
        </Row>

        {/* Charts Row 2 */}
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          <Col xs={24} lg={12}>
            <Card title="Doanh Thu Theo Phương Thức Thanh Toán">
              {paymentMethodChartData.length > 0 ? (
                <Column
                  data={paymentMethodChartData}
                  xField="type"
                  yField="value"
                  color="#52c41a"
                  height={300}
                  label={{
                    position: 'top',
                    formatter: (datum) => formatCurrency(datum.value),
                  }}
                />
              ) : (
                <div style={{ textAlign: 'center', padding: '50px' }}>Không có dữ liệu</div>
              )}
            </Card>
          </Col>
          <Col xs={24} lg={12}>
            <Card title="Top 10 Sản Phẩm Bán Chạy">
              {topProductsChartData.length > 0 ? (
                <Bar
                  data={topProductsChartData}
                  xField="value"
                  yField="name"
                  color="#fa8c16"
                  height={300}
                  label={{
                    position: 'right',
                  }}
                />
              ) : (
                <div style={{ textAlign: 'center', padding: '50px' }}>Không có dữ liệu</div>
              )}
            </Card>
          </Col>
        </Row>

        {/* Top Products Table */}
        <Card title="Chi Tiết Top Sản Phẩm">
          {topProducts.length > 0 ? (
            <Table
              dataSource={topProducts}
              columns={[
                {
                  title: 'Sản Phẩm',
                  dataIndex: 'name',
                  key: 'name',
                  render: (text) => text || 'N/A',
                },
                {
                  title: 'Đã Bán',
                  dataIndex: 'total_sold',
                  key: 'total_sold',
                  render: (v) => formatNumber(v),
                  sorter: (a, b) => parseInt(a.total_sold || 0) - parseInt(b.total_sold || 0),
                },
                {
                  title: 'Doanh Thu',
                  dataIndex: 'total_revenue',
                  key: 'total_revenue',
                  render: (v) => formatCurrency(v),
                  sorter: (a, b) => parseFloat(a.total_revenue || 0) - parseFloat(b.total_revenue || 0),
                },
              ]}
              pagination={false}
              rowKey={(record) => `product-${record.product_id || record.id || Math.random()}`}
            />
          ) : (
            <div style={{ textAlign: 'center', padding: '50px' }}>Không có dữ liệu</div>
          )}
        </Card>
      </div>
    );
  };

  // Render Orders Tab
  const renderOrders = () => {
    if (!orderStats) {
      return <div style={{ textAlign: 'center', padding: '50px' }}>Đang tải dữ liệu...</div>;
    }

    const { ordersByStatus = [], ordersByDay = [], ordersByMonth = [] } = orderStats;

    // Backend trả về: { date, count, total_amount }
    const ordersByDayChartData = (ordersByDay || []).map((item) => ({
      date: item.date || '',
      count: parseInt(item.count || 0),
      revenue: parseFloat(item.total_amount || 0),
    }));

    // Backend trả về: { month, count, total_amount }
    const ordersByMonthChartData = (ordersByMonth || []).map((item) => ({
      month: item.month || '',
      count: parseInt(item.count || 0),
      revenue: parseFloat(item.total_amount || 0),
    }));

    // Backend trả về: { status_id, status_name, count, total_amount }
    const ordersByStatusChartData = (ordersByStatus || [])
      .filter(item => parseInt(item.count || 0) > 0)
      .map((item) => ({
        status: item.status_name || 'N/A',
        count: parseInt(item.count || 0),
      }));

    return (
      <div>
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          <Col xs={24} lg={12}>
            <Card title="Đơn Hàng Theo Ngày">
              {ordersByDayChartData.length > 0 ? (
                <Line
                  data={ordersByDayChartData}
                  xField="date"
                  yField="count"
                  point={{ size: 5 }}
                  smooth
                  color="#1890ff"
                  height={300}
                />
              ) : (
                <div style={{ textAlign: 'center', padding: '50px' }}>Không có dữ liệu</div>
              )}
            </Card>
          </Col>
          <Col xs={24} lg={12}>
            <Card title="Đơn Hàng Theo Trạng Thái">
              {ordersByStatusChartData.length > 0 ? (
                <Column
                  data={ordersByStatusChartData}
                  xField="status"
                  yField="count"
                  color="#52c41a"
                  height={300}
                  label={{
                    position: 'top',
                  }}
                />
              ) : (
                <div style={{ textAlign: 'center', padding: '50px' }}>Không có dữ liệu</div>
              )}
            </Card>
          </Col>
        </Row>

        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          <Col xs={24}>
            <Card title="Đơn Hàng Theo Tháng">
              {ordersByMonthChartData.length > 0 ? (
                <Column
                  data={ordersByMonthChartData}
                  xField="month"
                  yField="count"
                  color="#722ed1"
                  height={300}
                  label={{
                    position: 'top',
                  }}
                />
              ) : (
                <div style={{ textAlign: 'center', padding: '50px' }}>Không có dữ liệu</div>
              )}
            </Card>
          </Col>
        </Row>

        <Card title="Chi Tiết Đơn Hàng Theo Trạng Thái">
          {ordersByStatus.length > 0 ? (
            <Table
              dataSource={ordersByStatus}
              columns={[
                { 
                  title: 'Trạng Thái', 
                  dataIndex: 'status_name', 
                  key: 'status_name',
                  render: (text) => text || 'N/A',
                },
                {
                  title: 'Số Lượng',
                  dataIndex: 'count',
                  key: 'count',
                  render: (v) => formatNumber(v),
                  sorter: (a, b) => parseInt(a.count || 0) - parseInt(b.count || 0),
                },
                {
                  title: 'Tổng Giá Trị',
                  dataIndex: 'total_amount',
                  key: 'total_amount',
                  render: (v) => formatCurrency(v),
                  sorter: (a, b) => parseFloat(a.total_amount || 0) - parseFloat(b.total_amount || 0),
                },
              ]}
              pagination={false}
              rowKey={(record) => `status-${record.status_id || Math.random()}`}
            />
          ) : (
            <div style={{ textAlign: 'center', padding: '50px' }}>Không có dữ liệu</div>
          )}
        </Card>
      </div>
    );
  };

  // Render Revenue Tab
  const renderRevenue = () => {
    if (!revenueStats) {
      return <div style={{ textAlign: 'center', padding: '50px' }}>Đang tải dữ liệu...</div>;
    }

    const { revenueData = [], summary = {}, revenueByPaymentMethod = [] } = revenueStats;

    // Backend trả về: { period, revenue, payment_count, order_count }
    const revenueChartData = (revenueData || []).map((item) => ({
      period: item.period || '',
      revenue: parseFloat(item.revenue || 0),
      orders: parseInt(item.order_count || 0),
      payments: parseInt(item.payment_count || 0),
    }));

    // Backend trả về: { payment_method_id, method_name, revenue, payment_count }
    const paymentMethodChartData = (revenueByPaymentMethod || [])
      .filter(item => parseFloat(item.revenue || 0) > 0)
      .map((item) => ({
        type: item.method_name || 'N/A',
        value: parseFloat(item.revenue || 0),
      }));

    return (
      <div>
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="Tổng Doanh Thu"
                value={formatCurrency(summary.total_revenue)}
                prefix={<DollarOutlined />}
                valueStyle={{ color: '#52c41a' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="Tổng Thanh Toán"
                value={summary.total_payments || 0}
                prefix={<ShoppingCartOutlined />}
                valueStyle={{ color: '#1890ff' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="Tổng Đơn Hàng"
                value={summary.total_orders || 0}
                prefix={<ShoppingCartOutlined />}
                valueStyle={{ color: '#722ed1' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="Giá Trị Đơn Trung Bình"
                value={formatCurrency(summary.avg_order_value)}
                prefix={<DollarOutlined />}
                valueStyle={{ color: '#fa8c16' }}
              />
            </Card>
          </Col>
        </Row>

        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          <Col xs={24} lg={16}>
            <Card title={`Doanh Thu Theo ${revenueGroupBy === 'day' ? 'Ngày' : revenueGroupBy === 'month' ? 'Tháng' : 'Năm'}`}>
              {revenueChartData.length > 0 ? (
                <Line
                  data={revenueChartData}
                  xField="period"
                  yField="revenue"
                  point={{ size: 5 }}
                  smooth
                  color="#52c41a"
                  height={300}
                  label={{
                    formatter: (datum) => formatCurrency(datum.revenue),
                  }}
                />
              ) : (
                <div style={{ textAlign: 'center', padding: '50px' }}>Không có dữ liệu</div>
              )}
            </Card>
          </Col>
          <Col xs={24} lg={8}>
            <Card title="Doanh Thu Theo Phương Thức">
              {paymentMethodChartData.length > 0 ? (
                <Pie
                  data={paymentMethodChartData}
                  angleField="value"
                  colorField="type"
                  radius={0.8}
                  label={{
                    content: '{type}: {value}',
                    formatter: (datum) => {
                      if (!datum || !datum.type) return '';
                      return `${datum.type}: ${formatCurrency(datum.value || 0)}`;
                    },
                  }}
                  interactions={[{ type: 'element-active' }]}
                  height={300}
                />
              ) : (
                <div style={{ textAlign: 'center', padding: '50px' }}>Không có dữ liệu</div>
              )}
            </Card>
          </Col>
        </Row>

        <Card title="Chi Tiết Doanh Thu Theo Phương Thức">
          {revenueByPaymentMethod.length > 0 ? (
            <Table
              dataSource={revenueByPaymentMethod}
              columns={[
                { 
                  title: 'Phương Thức', 
                  dataIndex: 'method_name', 
                  key: 'method_name',
                  render: (text) => text || 'N/A',
                },
                {
                  title: 'Doanh Thu',
                  dataIndex: 'revenue',
                  key: 'revenue',
                  render: (v) => formatCurrency(v),
                  sorter: (a, b) => parseFloat(a.revenue || 0) - parseFloat(b.revenue || 0),
                },
                {
                  title: 'Số Lượng Thanh Toán',
                  dataIndex: 'payment_count',
                  key: 'payment_count',
                  render: (v) => formatNumber(v),
                  sorter: (a, b) => parseInt(a.payment_count || 0) - parseInt(b.payment_count || 0),
                },
              ]}
              pagination={false}
              rowKey={(record) => `payment-${record.payment_method_id || Math.random()}`}
            />
          ) : (
            <div style={{ textAlign: 'center', padding: '50px' }}>Không có dữ liệu</div>
          )}
        </Card>
      </div>
    );
  };

  // Render Users Tab
  const renderUsers = () => {
    if (!userStats) {
      return <div style={{ textAlign: 'center', padding: '50px' }}>Đang tải dữ liệu...</div>;
    }

    const { usersByRole = [], usersByDay = [], totalUsers = 0 } = userStats;

    // Backend trả về: { date, count }
    const usersByDayChartData = (usersByDay || []).map((item) => ({
      date: item.date || '',
      count: parseInt(item.count || 0),
    }));

    // Backend trả về: { role_id, role_name, count }
    const usersByRoleChartData = (usersByRole || [])
      .filter(item => parseInt(item.count || 0) > 0)
      .map((item) => ({
        role: item.role_name || 'N/A',
        count: parseInt(item.count || 0),
      }));

    return (
      <div>
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="Tổng Người Dùng"
                value={totalUsers || 0}
                prefix={<UserOutlined />}
                valueStyle={{ color: '#1890ff' }}
              />
            </Card>
          </Col>
        </Row>

        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          <Col xs={24} lg={12}>
            <Card title="Người Dùng Theo Ngày">
              {usersByDayChartData.length > 0 ? (
                <Line
                  data={usersByDayChartData}
                  xField="date"
                  yField="count"
                  point={{ size: 5 }}
                  smooth
                  color="#1890ff"
                  height={300}
                />
              ) : (
                <div style={{ textAlign: 'center', padding: '50px' }}>Không có dữ liệu</div>
              )}
            </Card>
          </Col>
          <Col xs={24} lg={12}>
            <Card title="Người Dùng Theo Vai Trò">
              {usersByRoleChartData.length > 0 ? (
                <Column
                  data={usersByRoleChartData}
                  xField="role"
                  yField="count"
                  color="#722ed1"
                  height={300}
                  label={{
                    position: 'top',
                  }}
                />
              ) : (
                <div style={{ textAlign: 'center', padding: '50px' }}>Không có dữ liệu</div>
              )}
            </Card>
          </Col>
        </Row>

        <Card title="Chi Tiết Người Dùng Theo Vai Trò">
          {usersByRole.length > 0 ? (
            <Table
              dataSource={usersByRole}
              columns={[
                { 
                  title: 'Vai Trò', 
                  dataIndex: 'role_name', 
                  key: 'role_name',
                  render: (text) => text || 'N/A',
                },
                {
                  title: 'Số Lượng',
                  dataIndex: 'count',
                  key: 'count',
                  render: (v) => formatNumber(v),
                  sorter: (a, b) => parseInt(a.count || 0) - parseInt(b.count || 0),
                },
              ]}
              pagination={false}
              rowKey={(record) => `role-${record.role_id || Math.random()}`}
            />
          ) : (
            <div style={{ textAlign: 'center', padding: '50px' }}>Không có dữ liệu</div>
          )}
        </Card>
      </div>
    );
  };

  // Render Products Tab
  const renderProducts = () => {
    if (!productStats) {
      return <div style={{ textAlign: 'center', padding: '50px' }}>Đang tải dữ liệu...</div>;
    }

    const { topProducts = [], productsByCategory = [], productsByBrand = [], totalProducts = 0 } = productStats;

    // Backend trả về: { category_id, name, product_count, total_sold, total_revenue }
    const categoryChartData = (productsByCategory || [])
      .filter(item => parseInt(item.total_sold || 0) > 0)
      .slice(0, 10)
      .map((item) => ({
        name: item.name || 'N/A',
        value: parseInt(item.total_sold || 0),
      }));

    // Backend trả về: { brand_id, name, product_count, total_sold, total_revenue }
    const brandChartData = (productsByBrand || [])
      .filter(item => parseInt(item.total_sold || 0) > 0)
      .slice(0, 10)
      .map((item) => ({
        name: item.name || 'N/A',
        value: parseInt(item.total_sold || 0),
      }));

    return (
      <div>
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="Tổng Sản Phẩm"
                value={totalProducts || 0}
                prefix={<ProductOutlined />}
                valueStyle={{ color: '#fa8c16' }}
              />
            </Card>
          </Col>
        </Row>

        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          <Col xs={24} lg={12}>
            <Card title="Sản Phẩm Theo Danh Mục">
              {categoryChartData.length > 0 ? (
                <Bar
                  data={categoryChartData}
                  xField="value"
                  yField="name"
                  color="#1890ff"
                  height={300}
                  label={{
                    position: 'right',
                  }}
                />
              ) : (
                <div style={{ textAlign: 'center', padding: '50px' }}>Không có dữ liệu</div>
              )}
            </Card>
          </Col>
          <Col xs={24} lg={12}>
            <Card title="Sản Phẩm Theo Thương Hiệu">
              {brandChartData.length > 0 ? (
                <Bar
                  data={brandChartData}
                  xField="value"
                  yField="name"
                  color="#52c41a"
                  height={300}
                  label={{
                    position: 'right',
                  }}
                />
              ) : (
                <div style={{ textAlign: 'center', padding: '50px' }}>Không có dữ liệu</div>
              )}
            </Card>
          </Col>
        </Row>

        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          <Col xs={24} lg={12}>
            <Card title="Doanh Thu Theo Danh Mục">
              {productsByCategory.length > 0 ? (
                <Bar
                  data={productsByCategory
                    .filter(item => parseFloat(item.total_revenue || 0) > 0)
                    .slice(0, 10)
                    .map((item) => ({
                      name: item.name || 'N/A',
                      value: parseFloat(item.total_revenue || 0),
                    }))}
                  xField="value"
                  yField="name"
                  color="#722ed1"
                  height={300}
                  label={{
                    position: 'right',
                    formatter: (datum) => formatCurrency(datum.value),
                  }}
                />
              ) : (
                <div style={{ textAlign: 'center', padding: '50px' }}>Không có dữ liệu</div>
              )}
            </Card>
          </Col>
          <Col xs={24} lg={12}>
            <Card title="Doanh Thu Theo Thương Hiệu">
              {productsByBrand.length > 0 ? (
                <Bar
                  data={productsByBrand
                    .filter(item => parseFloat(item.total_revenue || 0) > 0)
                    .slice(0, 10)
                    .map((item) => ({
                      name: item.name || 'N/A',
                      value: parseFloat(item.total_revenue || 0),
                    }))}
                  xField="value"
                  yField="name"
                  color="#fa8c16"
                  height={300}
                  label={{
                    position: 'right',
                    formatter: (datum) => formatCurrency(datum.value),
                  }}
                />
              ) : (
                <div style={{ textAlign: 'center', padding: '50px' }}>Không có dữ liệu</div>
              )}
            </Card>
          </Col>
        </Row>

        <Card title="Top Sản Phẩm Bán Chạy">
          {topProducts.length > 0 ? (
            <Table
              dataSource={topProducts}
              columns={[
                { 
                  title: 'Sản Phẩm', 
                  dataIndex: 'name', 
                  key: 'name',
                  render: (text) => text || 'N/A',
                },
                {
                  title: 'Giá',
                  dataIndex: 'price',
                  key: 'price',
                  render: (v) => formatCurrency(v),
                  sorter: (a, b) => parseFloat(a.price || 0) - parseFloat(b.price || 0),
                },
                {
                  title: 'Tồn Kho',
                  dataIndex: 'stock_quantity',
                  key: 'stock_quantity',
                  render: (v) => formatNumber(v),
                  sorter: (a, b) => parseInt(a.stock_quantity || 0) - parseInt(b.stock_quantity || 0),
                },
                {
                  title: 'Đã Bán',
                  dataIndex: 'total_sold',
                  key: 'total_sold',
                  render: (v) => formatNumber(v),
                  sorter: (a, b) => parseInt(a.total_sold || 0) - parseInt(b.total_sold || 0),
                },
                {
                  title: 'Doanh Thu',
                  dataIndex: 'total_revenue',
                  key: 'total_revenue',
                  render: (v) => formatCurrency(v),
                  sorter: (a, b) => parseFloat(a.total_revenue || 0) - parseFloat(b.total_revenue || 0),
                },
                {
                  title: 'Số Đơn Hàng',
                  dataIndex: 'order_count',
                  key: 'order_count',
                  render: (v) => formatNumber(v),
                  sorter: (a, b) => parseInt(a.order_count || 0) - parseInt(b.order_count || 0),
                },
              ]}
              pagination={false}
              rowKey={(record) => `product-${record.product_id || record.id || Math.random()}`}
            />
          ) : (
            <div style={{ textAlign: 'center', padding: '50px' }}>Không có dữ liệu</div>
          )}
        </Card>

        <Row gutter={[16, 16]} style={{ marginTop: 24 }}>
          <Col xs={24} lg={12}>
            <Card title="Chi Tiết Sản Phẩm Theo Danh Mục">
              {productsByCategory.length > 0 ? (
                <Table
                  dataSource={productsByCategory}
                  columns={[
                    { 
                      title: 'Danh Mục', 
                      dataIndex: 'name', 
                      key: 'name',
                      render: (text) => text || 'N/A',
                    },
                    {
                      title: 'Số Sản Phẩm',
                      dataIndex: 'product_count',
                      key: 'product_count',
                      render: (v) => formatNumber(v),
                      sorter: (a, b) => parseInt(a.product_count || 0) - parseInt(b.product_count || 0),
                    },
                    {
                      title: 'Đã Bán',
                      dataIndex: 'total_sold',
                      key: 'total_sold',
                      render: (v) => formatNumber(v),
                      sorter: (a, b) => parseInt(a.total_sold || 0) - parseInt(b.total_sold || 0),
                    },
                    {
                      title: 'Doanh Thu',
                      dataIndex: 'total_revenue',
                      key: 'total_revenue',
                      render: (v) => formatCurrency(v),
                      sorter: (a, b) => parseFloat(a.total_revenue || 0) - parseFloat(b.total_revenue || 0),
                    },
                  ]}
                  pagination={false}
                  rowKey={(record) => `category-${record.category_id || Math.random()}`}
                />
              ) : (
                <div style={{ textAlign: 'center', padding: '50px' }}>Không có dữ liệu</div>
              )}
            </Card>
          </Col>
          <Col xs={24} lg={12}>
            <Card title="Chi Tiết Sản Phẩm Theo Thương Hiệu">
              {productsByBrand.length > 0 ? (
                <Table
                  dataSource={productsByBrand}
                  columns={[
                    { 
                      title: 'Thương Hiệu', 
                      dataIndex: 'name', 
                      key: 'name',
                      render: (text) => text || 'N/A',
                    },
                    {
                      title: 'Số Sản Phẩm',
                      dataIndex: 'product_count',
                      key: 'product_count',
                      render: (v) => formatNumber(v),
                      sorter: (a, b) => parseInt(a.product_count || 0) - parseInt(b.product_count || 0),
                    },
                    {
                      title: 'Đã Bán',
                      dataIndex: 'total_sold',
                      key: 'total_sold',
                      render: (v) => formatNumber(v),
                      sorter: (a, b) => parseInt(a.total_sold || 0) - parseInt(b.total_sold || 0),
                    },
                    {
                      title: 'Doanh Thu',
                      dataIndex: 'total_revenue',
                      key: 'total_revenue',
                      render: (v) => formatCurrency(v),
                      sorter: (a, b) => parseFloat(a.total_revenue || 0) - parseFloat(b.total_revenue || 0),
                    },
                  ]}
                  pagination={false}
                  rowKey={(record) => `brand-${record.brand_id || Math.random()}`}
                />
              ) : (
                <div style={{ textAlign: 'center', padding: '50px' }}>Không có dữ liệu</div>
              )}
            </Card>
          </Col>
        </Row>
      </div>
    );
  };

  return (
    <div style={{ padding: '24px' }}>
      <Title level={2} style={{ marginBottom: 24 }}>
        Thống Kê Hệ Thống
      </Title>

      {/* Filters */}
      <Card
        title={
          <Space>
            <FilterOutlined />
            <Text strong>Bộ Lọc</Text>
          </Space>
        }
        style={{ marginBottom: 24 }}
        extra={
          <Space>
            <Button icon={<ReloadOutlined />} onClick={handleResetFilters}>
              Đặt Lại
            </Button>
            <Button type="primary" icon={<ReloadOutlined />} onClick={loadData}>
              Tải Lại
            </Button>
          </Space>
        }
      >
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} lg={6}>
            <Text strong>Khoảng Thời Gian:</Text>
            <br />
            <RangePicker
              value={dateRange}
              onChange={setDateRange}
              format="DD/MM/YYYY"
              style={{ width: '100%', marginTop: 8 }}
            />
          </Col>

          {(activeTab === 'orders' || activeTab === 'overview' || activeTab === 'revenue') && (
            <Col xs={24} sm={12} lg={6}>
              <Text strong>Trạng Thái Đơn Hàng:</Text>
              <br />
              <Select
                value={orderStatusFilter || undefined}
                onChange={setOrderStatusFilter}
                placeholder="Tất cả"
                allowClear
                style={{ width: '100%', marginTop: 8 }}
              >
                {orderStatuses.filter(s => s.status_id != null).map((status) => (
                  <Option key={status.status_id} value={status.status_id}>
                    {status.status_name}
                  </Option>
                ))}
              </Select>
            </Col>
          )}

          {(activeTab === 'orders' || activeTab === 'overview' || activeTab === 'revenue') && (
            <Col xs={24} sm={12} lg={6}>
              <Text strong>Phương Thức Thanh Toán:</Text>
              <br />
              <Select
                value={paymentMethodFilter || undefined}
                onChange={setPaymentMethodFilter}
                placeholder="Tất cả"
                allowClear
                style={{ width: '100%', marginTop: 8 }}
              >
                {paymentMethods.filter(m => (m.payment_method_id || m.method_id) != null).map((method) => (
                  <Option key={method.payment_method_id || method.method_id} value={method.payment_method_id || method.method_id}>
                    {method.method_name}
                  </Option>
                ))}
              </Select>
            </Col>
          )}

          {activeTab === 'users' && (
            <Col xs={24} sm={12} lg={6}>
              <Text strong>Vai Trò:</Text>
              <br />
              <Select
                value={userRoleFilter || undefined}
                onChange={setUserRoleFilter}
                placeholder="Tất cả"
                allowClear
                style={{ width: '100%', marginTop: 8 }}
              >
                {roles.filter(r => r.role_id != null).map((role) => (
                  <Option key={role.role_id} value={role.role_id}>
                    {role.role_name}
                  </Option>
                ))}
              </Select>
            </Col>
          )}

          {activeTab === 'products' && (
            <>
              <Col xs={24} sm={12} lg={6}>
                <Text strong>Danh Mục:</Text>
                <br />
                <Select
                  value={categoryFilter || undefined}
                  onChange={setCategoryFilter}
                  placeholder="Tất cả"
                  allowClear
                  style={{ width: '100%', marginTop: 8 }}
                >
                  {categories.filter(c => c.category_id != null).map((cat) => (
                    <Option key={cat.category_id} value={cat.category_id}>
                      {cat.name || cat.category_name}
                    </Option>
                  ))}
                </Select>
              </Col>
              <Col xs={24} sm={12} lg={6}>
                <Text strong>Thương Hiệu:</Text>
                <br />
                <Select
                  value={brandFilter || undefined}
                  onChange={setBrandFilter}
                  placeholder="Tất cả"
                  allowClear
                  style={{ width: '100%', marginTop: 8 }}
                >
                  {brands.filter(b => b.brand_id != null).map((brand) => (
                    <Option key={brand.brand_id} value={brand.brand_id}>
                      {brand.name || brand.brand_name}
                    </Option>
                  ))}
                </Select>
              </Col>
            </>
          )}

          {activeTab === 'revenue' && (
            <Col xs={24} sm={12} lg={6}>
              <Text strong>Nhóm Theo:</Text>
              <br />
              <Select
                value={revenueGroupBy}
                onChange={setRevenueGroupBy}
                style={{ width: '100%', marginTop: 8 }}
              >
                <Option key="day" value="day">Ngày</Option>
                <Option key="month" value="month">Tháng</Option>
                <Option key="year" value="year">Năm</Option>
              </Select>
            </Col>
          )}
        </Row>
      </Card>

      {/* Tabs */}
      <Card>
        <Spin spinning={loading}>
          <Tabs
            activeKey={activeTab}
            onChange={setActiveTab}
            type="card"
            items={[
              {
                key: 'overview',
                label: 'Tổng Quan',
                children: renderOverview(),
              },
              {
                key: 'orders',
                label: 'Đơn Hàng',
                children: renderOrders(),
              },
              {
                key: 'revenue',
                label: 'Doanh Thu',
                children: renderRevenue(),
              },
              {
                key: 'users',
                label: 'Người Dùng',
                children: renderUsers(),
              },
              {
                key: 'products',
                label: 'Sản Phẩm',
                children: renderProducts(),
              },
            ]}
          />
        </Spin>
      </Card>
    </div>
  );
};

export default Statistics;
