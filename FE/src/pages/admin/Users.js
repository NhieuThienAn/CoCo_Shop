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
  Input,
  Select,
  Switch,
  Row,
  Col,
  Tabs,
} from 'antd';
import { EditOutlined, LockOutlined, UnlockOutlined, DeleteOutlined, UndoOutlined } from '@ant-design/icons';
import { user, support } from '../../api/index.js';

const { Title } = Typography;

const AdminUsers = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, limit: 20 });
  const [modalVisible, setModalVisible] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [roles, setRoles] = useState([]);
  const [roleFilter, setRoleFilter] = useState(undefined); // Filter theo role_id
  const [activeTab, setActiveTab] = useState('active'); // 'active', 'locked', 'deleted'
  const [form] = Form.useForm();

  useEffect(() => {
    loadRoles();
  }, []);

  useEffect(() => {
    loadUsers();
  }, [pagination.page, roleFilter, activeTab]);

  const loadUsers = async () => {
    setLoading(true);
    try {
      // Tạo filters object với role_id nếu có
      const filters = {};
      if (roleFilter !== undefined && roleFilter !== null && roleFilter !== '') {
        filters.role_id = roleFilter;
      }
      
      // Thêm filter theo activeTab
      const filterParams = {
        includeInactive: activeTab !== 'active', // Include inactive nếu không phải tab active
        includeDeleted: activeTab === 'deleted', // Include deleted nếu đang ở tab deleted
        ...filters,
      };
      
      // Thêm filter is_active dựa trên tab
      if (activeTab === 'active') {
        filterParams.is_active = 1;
      } else if (activeTab === 'locked') {
        filterParams.is_active = 0;
      }
      // Tab deleted không cần filter is_active vì đã filter theo deleted_at
      
      // Remove undefined values
      Object.keys(filterParams).forEach(key => {
        if (filterParams[key] === undefined || filterParams[key] === null || filterParams[key] === '') {
          delete filterParams[key];
        }
      });
      
      const response = await user.getAllUsers(pagination.page, pagination.limit, filterParams);
      if (response.success) {
        let filteredData = response.data || [];
        
        // Filter client-side để đảm bảo chính xác (backup filter)
        if (activeTab === 'active') {
          // Chỉ hiển thị users đang hoạt động và chưa bị xóa
          filteredData = filteredData.filter(u => u.is_active === 1 && !u.deleted_at);
        } else if (activeTab === 'locked') {
          // Chỉ hiển thị users bị khóa và chưa bị xóa
          filteredData = filteredData.filter(u => u.is_active === 0 && !u.deleted_at);
        } else if (activeTab === 'deleted') {
          // Chỉ hiển thị users đã bị xóa mềm
          filteredData = filteredData.filter(u => u.deleted_at);
        }
        
        setUsers(filteredData);
        // Cập nhật pagination nếu backend trả về
        if (response.pagination) {
          setPagination((prev) => ({
            ...prev,
            total: response.pagination.total,
          }));
        }
      } else {
        message.error(response.message || 'Có lỗi xảy ra khi tải người dùng');
      }
    } catch (error) {
      console.error('Error loading users:', error);
      const errorMessage = error.message || 'Có lỗi xảy ra khi tải người dùng';
      message.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const loadRoles = async () => {
    try {
      const response = await support.getRoles();
      if (response.success) {
        setRoles(response.data || []);
      }
    } catch (error) {
      console.error('Error loading roles:', error);
    }
  };

  const handleEdit = (record) => {
    setEditingUser(record);
    form.setFieldsValue({
      username: record.username || '',
      email: record.email || '',
      first_name: record.first_name || '',
      last_name: record.last_name || '',
      phone: record.phone || '',
      role_id: record.role_id || record.role?.role_id || undefined,
      is_active: record.is_active !== undefined ? record.is_active : true,
    });
    setModalVisible(true);
  };

  const handleToggleActive = async (id, currentStatus) => {
    try {
      const newStatus = !currentStatus;
      const response = await user.updateUser(id, { is_active: newStatus ? 1 : 0 });
      if (response.success) {
        message.success(newStatus ? 'Mở khóa người dùng thành công' : 'Khóa người dùng thành công');
        loadUsers();
      } else {
        message.error(response.message || 'Có lỗi xảy ra khi cập nhật trạng thái người dùng');
      }
    } catch (error) {
      console.error('Error toggling user active status:', error);
      const errorMessage = error.message || 'Có lỗi xảy ra khi cập nhật trạng thái người dùng';
      message.error(errorMessage);
    }
  };

  const handleSoftDelete = async (id) => {
    try {
      const response = await user.deleteUser(id);
      if (response.success) {
        message.success('Xóa mềm người dùng thành công');
        loadUsers();
      } else {
        message.error(response.message || 'Có lỗi xảy ra khi xóa mềm người dùng');
      }
    } catch (error) {
      console.error('Error soft deleting user:', error);
      const errorMessage = error.message || 'Có lỗi xảy ra khi xóa mềm người dùng';
      message.error(errorMessage);
    }
  };

  const handleRestore = async (id) => {
    try {
      const response = await user.restoreUser(id);
      if (response.success) {
        message.success('Khôi phục người dùng thành công');
        loadUsers();
      } else {
        message.error(response.message || 'Có lỗi xảy ra khi khôi phục người dùng');
      }
    } catch (error) {
      console.error('Error restoring user:', error);
      const errorMessage = error.message || 'Có lỗi xảy ra khi khôi phục người dùng';
      message.error(errorMessage);
    }
  };

  const handleSubmit = async (values) => {
    try {
      const userData = {
        username: values.username?.trim(),
        email: values.email?.trim(),
        first_name: values.first_name?.trim() || null,
        last_name: values.last_name?.trim() || null,
        phone: values.phone?.trim() || null,
        role_id: values.role_id || null,
        is_active: values.is_active !== undefined ? (values.is_active ? 1 : 0) : 1,
      };

      let response;
      if (editingUser) {
        response = await user.updateUser(editingUser.user_id, userData);
      } else {
        // Note: Creating user should be done through registration
        message.warning('Vui lòng sử dụng chức năng đăng ký để tạo người dùng mới');
        return;
      }

      if (response.success) {
        message.success('Cập nhật người dùng thành công');
        setModalVisible(false);
        setEditingUser(null);
        form.resetFields();
        loadUsers();
      } else {
        message.error(response.message || 'Có lỗi xảy ra khi cập nhật người dùng');
      }
    } catch (error) {
      console.error('Error saving user:', error);
      const errorMessage = error.message || 'Có lỗi xảy ra khi cập nhật người dùng';
      message.error(errorMessage);
    }
  };

  // Hàm lấy màu Tag theo role
  const getRoleColor = (roleId) => {
    switch (roleId) {
      case 1:
        return 'red'; // Admin
      case 2:
        return 'blue'; // Shipper
      case 3:
        return 'green'; // Customer
      default:
        return 'default';
    }
  };

  // Hàm lấy tên role để hiển thị
  const getRoleName = (record) => {
    if (record.role?.role_name) {
      return record.role.role_name;
    }
    // Fallback nếu không có role object
    const roleId = record.role_id;
    const roleObj = roles.find((r) => r.role_id === roleId);
    if (roleObj) {
      return roleObj.role_name;
    }
    return 'N/A';
  };

  const columns = [
    {
      title: 'ID',
      dataIndex: 'user_id',
      key: 'user_id',
      width: 80,
    },
    {
      title: 'Username',
      dataIndex: 'username',
      key: 'username',
    },
    {
      title: 'Email',
      dataIndex: 'email',
      key: 'email',
    },
    {
      title: 'Họ Tên',
      key: 'fullname',
      render: (_, record) => `${record.first_name || ''} ${record.last_name || ''}`.trim() || 'N/A',
    },
    {
      title: 'Vai Trò',
      key: 'role',
      width: 150,
      render: (_, record) => {
        const roleId = record.role_id || record.role?.role_id;
        const roleName = getRoleName(record);
        return (
          <Tag color={getRoleColor(roleId)}>
            {roleName}
          </Tag>
        );
      },
    },
    {
      title: 'Trạng Thái',
      dataIndex: 'is_active',
      key: 'is_active',
      width: 120,
      render: (isActive) => (
        <Tag color={isActive ? 'green' : 'red'}>
          {isActive ? 'Hoạt động' : 'Khóa'}
        </Tag>
      ),
    },
    {
      title: 'Thao Tác',
      key: 'action',
      width: 300,
      render: (_, record) => {
        const isActive = record.is_active;
        const isDeleted = !!record.deleted_at;
        
        return (
          <Space>
            {/* Chỉ hiển thị nút Sửa nếu user chưa bị xóa */}
            {!isDeleted && (
              <Button icon={<EditOutlined />} size="small" onClick={() => handleEdit(record)}>
                Sửa
              </Button>
            )}
            {/* Chỉ hiển thị nút Khóa/Mở khóa nếu user chưa bị xóa */}
            {!isDeleted && (
              <Popconfirm
                title={isActive ? "Bạn có chắc muốn khóa người dùng này?" : "Bạn có chắc muốn mở khóa người dùng này?"}
                onConfirm={() => handleToggleActive(record.user_id, isActive)}
                okText={isActive ? "Khóa" : "Mở khóa"}
                cancelText="Hủy"
              >
                <Button 
                  type={isActive ? "default" : "primary"}
                  danger={isActive}
                  icon={isActive ? <LockOutlined /> : <UnlockOutlined />} 
                  size="small"
                >
                  {isActive ? "Khóa" : "Mở khóa"}
                </Button>
              </Popconfirm>
            )}
            {/* Chỉ hiển thị nút Xóa mềm nếu user chưa bị xóa */}
            {!isDeleted && (
              <Popconfirm
                title="Bạn có chắc muốn xóa mềm người dùng này?"
                description="Người dùng sẽ bị xóa mềm và không thể đăng nhập. Bạn có thể khôi phục sau."
                onConfirm={() => handleSoftDelete(record.user_id)}
                okText="Xóa mềm"
                cancelText="Hủy"
                okType="danger"
              >
                <Button type="primary" danger icon={<DeleteOutlined />} size="small">
                  Xóa mềm
                </Button>
              </Popconfirm>
            )}
            {/* Chỉ hiển thị nút Khôi phục nếu user đã bị xóa */}
            {isDeleted && (
              <Popconfirm
                title="Bạn có chắc muốn khôi phục người dùng này?"
                description="Người dùng sẽ được khôi phục và có thể đăng nhập lại."
                onConfirm={() => handleRestore(record.user_id)}
                okText="Khôi phục"
                cancelText="Hủy"
              >
                <Button type="primary" icon={<UndoOutlined />} size="small">
                  Khôi phục
                </Button>
              </Popconfirm>
            )}
          </Space>
        );
      },
    },
  ];

  return (
    <div>
      <Title level={2}>Quản Lý Người Dùng</Title>

      {/* Tabs */}
      <Tabs
        activeKey={activeTab}
        onChange={(key) => {
          setActiveTab(key);
          setPagination((prev) => ({ ...prev, page: 1, total: undefined }));
        }}
        style={{ marginBottom: 16 }}
      >
        <Tabs.TabPane tab="Người Dùng Hoạt Động" key="active">
          {/* Tab content sẽ được hiển thị bên dưới */}
        </Tabs.TabPane>
        <Tabs.TabPane tab="Người Dùng Đã Khóa" key="locked">
          {/* Tab content sẽ được hiển thị bên dưới */}
        </Tabs.TabPane>
        <Tabs.TabPane tab="Người Dùng Đã Xóa" key="deleted">
          {/* Tab content sẽ được hiển thị bên dưới */}
        </Tabs.TabPane>
      </Tabs>

      {/* Bộ lọc */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={6}>
          <Select
            style={{ width: '100%' }}
            placeholder="Lọc theo vai trò"
            allowClear
            value={roleFilter}
            onChange={(value) => {
              setRoleFilter(value);
              // Reset về trang 1 khi filter thay đổi
              setPagination((prev) => ({ ...prev, page: 1, total: undefined }));
            }}
          >
            {roles.map((role) => (
              <Select.Option key={role.role_id} value={role.role_id}>
                {role.role_name}
              </Select.Option>
            ))}
          </Select>
        </Col>
      </Row>

      <Table
        columns={columns}
        dataSource={users}
        rowKey="user_id"
        loading={loading}
        pagination={{
          current: pagination.page,
          pageSize: pagination.limit,
          total: pagination.total,
          showSizeChanger: true,
          showTotal: (total) => `Tổng ${total} người dùng`,
          onChange: (page, pageSize) => {
            setPagination((prev) => ({ ...prev, page, limit: pageSize }));
          },
        }}
        locale={{ emptyText: 'Chưa có người dùng nào' }}
      />

      <Modal
        title={editingUser ? 'Sửa Người Dùng' : 'Thêm Người Dùng'}
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false);
          setEditingUser(null);
          form.resetFields();
        }}
        footer={null}
        width={600}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item
            name="username"
            label="Username"
            rules={[{ required: true, message: 'Vui lòng nhập username' }]}
          >
            <Input placeholder="Nhập username" disabled={!!editingUser} />
          </Form.Item>
          <Form.Item
            name="email"
            label="Email"
            rules={[
              { required: true, message: 'Vui lòng nhập email' },
              { type: 'email', message: 'Email không hợp lệ' },
            ]}
          >
            <Input placeholder="Nhập email" />
          </Form.Item>
          <Form.Item name="first_name" label="Họ">
            <Input placeholder="Nhập họ" />
          </Form.Item>
          <Form.Item name="last_name" label="Tên">
            <Input placeholder="Nhập tên" />
          </Form.Item>
          <Form.Item name="phone" label="Điện Thoại">
            <Input placeholder="Nhập số điện thoại" />
          </Form.Item>
          <Form.Item
            name="role_id"
            label="Vai Trò"
            rules={[{ required: true, message: 'Vui lòng chọn vai trò' }]}
          >
            <Select placeholder="Chọn vai trò">
              {roles.map((role) => (
                <Select.Option key={role.role_id} value={role.role_id}>
                  {role.role_name}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="is_active" valuePropName="checked" label="Hoạt động">
            <Switch />
          </Form.Item>
          <Form.Item>
            <Space>
              <Button
                onClick={() => {
                  setModalVisible(false);
                  setEditingUser(null);
                  form.resetFields();
                }}
              >
                Hủy
              </Button>
              <Button type="primary" htmlType="submit">
                {editingUser ? 'Cập Nhật' : 'Tạo'}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default AdminUsers;
