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
} from 'antd';
import { EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { user, support } from '../../api/index.js';

const { Title } = Typography;

const AdminUsers = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, limit: 20 });
  const [modalVisible, setModalVisible] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [roles, setRoles] = useState([]);
  const [form] = Form.useForm();

  useEffect(() => {
    loadUsers();
    loadRoles();
  }, [pagination.page]);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const response = await user.getAllUsers(pagination.page, pagination.limit);
      if (response.success) {
        setUsers(response.data || []);
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

  const handleDelete = async (id) => {
    try {
      const response = await user.deleteUser(id);
      if (response.success) {
        message.success('Xóa người dùng thành công');
        loadUsers();
      } else {
        message.error(response.message || 'Có lỗi xảy ra khi xóa người dùng');
      }
    } catch (error) {
      console.error('Error deleting user:', error);
      const errorMessage = error.message || 'Có lỗi xảy ra khi xóa người dùng';
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
      render: (_, record) => record.role?.name || 'N/A',
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
      width: 150,
      render: (_, record) => (
        <Space>
          <Button icon={<EditOutlined />} size="small" onClick={() => handleEdit(record)}>
            Sửa
          </Button>
          <Popconfirm
            title="Bạn có chắc muốn xóa người dùng này?"
            onConfirm={() => handleDelete(record.user_id)}
            okText="Xóa"
            cancelText="Hủy"
          >
            <Button type="primary" danger icon={<DeleteOutlined />} size="small">
              Xóa
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Title level={2}>Quản Lý Người Dùng</Title>

      <Table
        columns={columns}
        dataSource={users}
        rowKey="user_id"
        loading={loading}
        pagination={{
          current: pagination.page,
          pageSize: pagination.limit,
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
