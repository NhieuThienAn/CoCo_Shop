import React, { useEffect, useState } from 'react';
import {
  Table,
  Tag,
  Space,
  Button,
  Popconfirm,
  message,
  Typography,
  Modal,
  Form,
  InputNumber,
  Row,
  Col,
  Card,
  Statistic,
  Input,
  Select,
  Tabs,
} from 'antd';
import {
  EditOutlined,
  DeleteOutlined,
  ShoppingCartOutlined,
  UserOutlined,
  DollarOutlined,
  ClearOutlined,
  EyeOutlined,
} from '@ant-design/icons';
import cartAPI from '../../api/cart';
import { user } from '../../api/index';

const { Title } = Typography;
const { TabPane } = Tabs;

const AdminCartManagement = () => {
  const [carts, setCarts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0 });
  const [statistics, setStatistics] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [userCart, setUserCart] = useState(null);
  const [users, setUsers] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [form] = Form.useForm();
  const [filters, setFilters] = useState({});

  useEffect(() => {
    loadCarts();
    loadStatistics();
    loadUsers();
  }, [pagination.page, filters]);

  const loadCarts = async () => {
    setLoading(true);
    try {
      const response = await cartAPI.getAllCarts(
        pagination.page,
        pagination.limit,
        filters
      );
      if (response.success) {
        setCarts(response.data || []);
        setPagination((prev) => ({
          ...prev,
          total: response.total || 0,
        }));
      } else {
        message.error(response.message || 'Có lỗi xảy ra khi tải giỏ hàng');
      }
    } catch (error) {
      console.error('Error loading carts:', error);
      message.error('Có lỗi xảy ra khi tải giỏ hàng');
    } finally {
      setLoading(false);
    }
  };

  const loadStatistics = async () => {
    try {
      const response = await cartAPI.getCartStatistics();
      if (response.success) {
        setStatistics(response.data);
      }
    } catch (error) {
      console.error('Error loading statistics:', error);
    }
  };

  const loadUsers = async () => {
    try {
      const response = await user.getAllUsers(1, 1000);
      if (response.success) {
        setUsers(response.data || []);
      }
    } catch (error) {
      console.error('Error loading users:', error);
    }
  };

  const loadUserCart = async (userId) => {
    try {
      const response = await cartAPI.getCartByUserId(userId);
      if (response.success) {
        setUserCart(response.data);
        setSelectedUser(userId);
        setModalVisible(true);
      } else {
        message.error(response.message || 'Có lỗi xảy ra khi tải giỏ hàng');
      }
    } catch (error) {
      console.error('Error loading user cart:', error);
      message.error('Có lỗi xảy ra khi tải giỏ hàng');
    }
  };

  const handleEdit = (record) => {
    setEditingItem(record);
    form.setFieldsValue({
      quantity: record.quantity,
    });
    setEditModalVisible(true);
  };

  const handleUpdate = async (values) => {
    try {
      const response = await cartAPI.updateCartItemByAdmin(
        editingItem.cart_item_id,
        values.quantity
      );
      if (response.success) {
        message.success('Cập nhật số lượng thành công');
        setEditModalVisible(false);
        setEditingItem(null);
        form.resetFields();
        loadCarts();
        if (selectedUser) {
          loadUserCart(selectedUser);
        }
      } else {
        message.error(response.message || 'Có lỗi xảy ra khi cập nhật');
      }
    } catch (error) {
      console.error('Error updating cart item:', error);
      message.error('Có lỗi xảy ra khi cập nhật');
    }
  };

  const handleDelete = async (id) => {
    try {
      const response = await cartAPI.deleteCartItemByAdmin(id);
      if (response.success) {
        message.success('Xóa sản phẩm khỏi giỏ hàng thành công');
        loadCarts();
        if (selectedUser) {
          loadUserCart(selectedUser);
        }
        loadStatistics();
      } else {
        message.error(response.message || 'Có lỗi xảy ra khi xóa');
      }
    } catch (error) {
      console.error('Error deleting cart item:', error);
      message.error('Có lỗi xảy ra khi xóa');
    }
  };

  const handleClearCart = async (userId) => {
    try {
      const response = await cartAPI.clearUserCartByAdmin(userId);
      if (response.success) {
        message.success(response.message || 'Đã xóa toàn bộ giỏ hàng');
        loadCarts();
        if (selectedUser === userId) {
          setModalVisible(false);
          setSelectedUser(null);
          setUserCart(null);
        }
        loadStatistics();
      } else {
        message.error(response.message || 'Có lỗi xảy ra khi xóa giỏ hàng');
      }
    } catch (error) {
      console.error('Error clearing cart:', error);
      message.error('Có lỗi xảy ra khi xóa giỏ hàng');
    }
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(price);
  };

  const columns = [
    {
      title: 'ID',
      dataIndex: 'cart_item_id',
      key: 'cart_item_id',
      width: 80,
    },
    {
      title: 'Khách Hàng',
      key: 'user',
      width: 200,
      render: (_, record) => (
        <div>
          <div>
            <strong>{record.user?.username || 'N/A'}</strong>
          </div>
          <div style={{ fontSize: '12px', color: '#666' }}>
            {record.user?.email || 'N/A'}
          </div>
        </div>
      ),
    },
    {
      title: 'Sản Phẩm',
      key: 'product',
      width: 250,
      render: (_, record) => (
        <div>
          <div>
            <strong>{record.product?.name || 'N/A'}</strong>
          </div>
          {record.product?.primary_image && (
            <img
              src={record.product.primary_image}
              alt={record.product.name}
              style={{ width: 50, height: 50, objectFit: 'cover', marginTop: 8 }}
            />
          )}
        </div>
      ),
    },
    {
      title: 'Số Lượng',
      dataIndex: 'quantity',
      key: 'quantity',
      width: 100,
      align: 'center',
    },
    {
      title: 'Đơn Giá',
      dataIndex: 'unit_price',
      key: 'unit_price',
      width: 120,
      align: 'right',
      render: (price) => formatPrice(price || 0),
    },
    {
      title: 'Thành Tiền',
      key: 'total',
      width: 150,
      align: 'right',
      render: (_, record) => {
        const total = (parseFloat(record.unit_price || 0) * parseInt(record.quantity || 0));
        return <strong>{formatPrice(total)}</strong>;
      },
    },
    {
      title: 'Ngày Tạo',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 150,
      render: (date) => (date ? new Date(date).toLocaleString('vi-VN') : 'N/A'),
    },
    {
      title: 'Thao Tác',
      key: 'action',
      width: 250,
      render: (_, record) => (
        <Space>
          <Button
            icon={<EyeOutlined />}
            size="small"
            onClick={() => loadUserCart(record.user_id)}
          >
            Xem Giỏ Hàng
          </Button>
          <Button
            icon={<EditOutlined />}
            size="small"
            onClick={() => handleEdit(record)}
          >
            Sửa
          </Button>
          <Popconfirm
            title="Bạn có chắc muốn xóa sản phẩm này khỏi giỏ hàng?"
            onConfirm={() => handleDelete(record.cart_item_id)}
            okText="Xóa"
            cancelText="Hủy"
          >
            <Button
              type="primary"
              danger
              icon={<DeleteOutlined />}
              size="small"
            >
              Xóa
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const userCartColumns = [
    {
      title: 'Sản Phẩm',
      key: 'product',
      width: 300,
      render: (_, record) => (
        <div style={{ display: 'flex', gap: 12 }}>
          {record.product?.primary_image && (
            <img
              src={record.product.primary_image}
              alt={record.product.name}
              style={{ width: 60, height: 60, objectFit: 'cover', borderRadius: 4 }}
            />
          )}
          <div>
            <div>
              <strong>{record.product?.name || 'N/A'}</strong>
            </div>
            {record.product?.price && (
              <div style={{ color: '#666', fontSize: '12px' }}>
                {formatPrice(record.product.price)}
              </div>
            )}
          </div>
        </div>
      ),
    },
    {
      title: 'Số Lượng',
      dataIndex: 'quantity',
      key: 'quantity',
      width: 100,
      align: 'center',
    },
    {
      title: 'Đơn Giá',
      dataIndex: 'unit_price',
      key: 'unit_price',
      width: 120,
      align: 'right',
      render: (price) => formatPrice(price || 0),
    },
    {
      title: 'Thành Tiền',
      key: 'total',
      width: 150,
      align: 'right',
      render: (_, record) => {
        const total = (parseFloat(record.unit_price || 0) * parseInt(record.quantity || 0));
        return <strong>{formatPrice(total)}</strong>;
      },
    },
    {
      title: 'Thao Tác',
      key: 'action',
      width: 200,
      render: (_, record) => (
        <Space>
          <Button
            icon={<EditOutlined />}
            size="small"
            onClick={() => handleEdit(record)}
          >
            Sửa
          </Button>
          <Popconfirm
            title="Bạn có chắc muốn xóa sản phẩm này?"
            onConfirm={() => handleDelete(record.cart_item_id)}
            okText="Xóa"
            cancelText="Hủy"
          >
            <Button
              type="primary"
              danger
              icon={<DeleteOutlined />}
              size="small"
            >
              Xóa
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Title level={2}>Quản Lý Giỏ Hàng</Title>

      {/* Statistics Cards */}
      {statistics && (
        <Row gutter={16} style={{ marginBottom: 24 }}>
          <Col span={6}>
            <Card>
              <Statistic
                title="Tổng Số Giỏ Hàng"
                value={statistics.totalCarts}
                prefix={<ShoppingCartOutlined />}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="Tổng Số Sản Phẩm"
                value={statistics.totalItems}
                prefix={<ShoppingCartOutlined />}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="Tổng Giá Trị"
                value={statistics.totalValue}
                prefix={<DollarOutlined />}
                formatter={(value) => formatPrice(value)}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="Sản Phẩm Khác Nhau"
                value={statistics.uniqueProducts}
                prefix={<ShoppingCartOutlined />}
              />
            </Card>
          </Col>
        </Row>
      )}

      {/* Filters */}
      <Card style={{ marginBottom: 16 }}>
        <Row gutter={16}>
          <Col span={6}>
            <Select
              placeholder="Lọc theo khách hàng"
              allowClear
              style={{ width: '100%' }}
              showSearch
              filterOption={(input, option) =>
                (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
              }
              options={users
                .filter((u) => u.role_id === 3)
                .map((u) => ({
                  value: u.user_id,
                  label: `${u.username} (${u.email})`,
                }))}
              onChange={(value) => {
                if (value) {
                  setFilters({ ...filters, userId: value });
                } else {
                  const { userId, ...rest } = filters;
                  setFilters(rest);
                }
                setPagination({ ...pagination, page: 1 });
              }}
            />
          </Col>
          <Col span={6}>
            <Input
              placeholder="Lọc theo Product ID"
              allowClear
              onChange={(e) => {
                const value = e.target.value;
                if (value) {
                  setFilters({ ...filters, productId: value });
                } else {
                  const { productId, ...rest } = filters;
                  setFilters(rest);
                }
                setPagination({ ...pagination, page: 1 });
              }}
            />
          </Col>
        </Row>
      </Card>

      {/* Table */}
      <Card>
        <Table
          columns={columns}
          dataSource={carts}
          rowKey="cart_item_id"
          loading={loading}
          pagination={{
            current: pagination.page,
            pageSize: pagination.limit,
            total: pagination.total,
            showSizeChanger: true,
            showTotal: (total) => `Tổng ${total} mục`,
            onChange: (page, pageSize) => {
              setPagination({ ...pagination, page, limit: pageSize });
            },
          }}
        />
      </Card>

      {/* User Cart Modal */}
      <Modal
        title={`Giỏ Hàng của ${userCart?.user?.username || 'Khách Hàng'}`}
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false);
          setSelectedUser(null);
          setUserCart(null);
        }}
        footer={null}
        width={1000}
      >
        {userCart && (
          <div>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={12}>
                <Card size="small">
                  <Statistic
                    title="Tổng Số Sản Phẩm"
                    value={userCart.items?.length || 0}
                    prefix={<ShoppingCartOutlined />}
                  />
                </Card>
              </Col>
              <Col span={12}>
                <Card size="small">
                  <Statistic
                    title="Tổng Giá Trị"
                    value={userCart.total || 0}
                    prefix={<DollarOutlined />}
                    formatter={(value) => formatPrice(value)}
                  />
                </Card>
              </Col>
            </Row>
            <div style={{ marginBottom: 16 }}>
              <Popconfirm
                title="Bạn có chắc muốn xóa toàn bộ giỏ hàng của khách hàng này?"
                onConfirm={() => handleClearCart(selectedUser)}
                okText="Xóa"
                cancelText="Hủy"
              >
                <Button
                  type="primary"
                  danger
                  icon={<ClearOutlined />}
                  style={{ marginBottom: 16 }}
                >
                  Xóa Toàn Bộ Giỏ Hàng
                </Button>
              </Popconfirm>
            </div>
            <Table
              columns={userCartColumns}
              dataSource={userCart.items || []}
              rowKey="cart_item_id"
              pagination={false}
            />
          </div>
        )}
      </Modal>

      {/* Edit Quantity Modal */}
      <Modal
        title="Cập Nhật Số Lượng"
        open={editModalVisible}
        onOk={() => form.submit()}
        onCancel={() => {
          setEditModalVisible(false);
          setEditingItem(null);
          form.resetFields();
        }}
      >
        <Form form={form} onFinish={handleUpdate} layout="vertical">
          <Form.Item
            name="quantity"
            label="Số Lượng"
            rules={[
              { required: true, message: 'Vui lòng nhập số lượng' },
              { type: 'number', min: 0, message: 'Số lượng phải lớn hơn hoặc bằng 0' },
            ]}
          >
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default AdminCartManagement;

