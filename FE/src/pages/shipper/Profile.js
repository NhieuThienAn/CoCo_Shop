import React, { useEffect, useState } from 'react';
import { Card, Form, Input, Button, Space, Typography, Spin, message } from 'antd';
import { EditOutlined } from '@ant-design/icons';
import { user } from '../../api/index.js';
import { useAuth } from '../../contexts/AuthContext.js';

const { Title } = Typography;

const ShipperProfile = () => {
  const { user: authUser } = useAuth();
  const [form] = Form.useForm();
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    if (authUser) {
      loadProfile();
    }
  }, [authUser]);

  const loadProfile = async () => {
    try {
      const userRes = await user.getCurrentUser();
      if (userRes.success) {
        const data = userRes.data;
        setUserData(data);
        form.setFieldsValue({
          first_name: data.first_name || '',
          last_name: data.last_name || '',
          phone: data.phone || '',
          email: data.email || '',
        });
      }
    } catch (error) {
      console.error('Error loading profile:', error);
      message.error('Có lỗi xảy ra khi tải thông tin');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProfile = async (values) => {
    try {
      const response = await user.updateCurrentUser(values);
      if (response.success !== false) {
        setEditing(false);
        loadProfile();
        message.success('Cập nhật thành công');
      } else {
        message.error(response.message || 'Cập nhật thất bại');
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      const errorMessage = error.message || error.response?.data?.message || 'Có lỗi xảy ra khi cập nhật';
      message.error(errorMessage);
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '100px' }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div style={{ padding: '40px 20px', maxWidth: '800px', margin: '0 auto' }}>
      <Title level={2} style={{ marginBottom: '24px' }}>Thông Tin Cá Nhân</Title>

      <Card
        title="Thông Tin Cá Nhân"
        extra={
          !editing && (
            <Button icon={<EditOutlined />} onClick={() => setEditing(true)}>
              Chỉnh Sửa
            </Button>
          )
        }
      >
        {editing ? (
          <Form
            form={form}
            layout="vertical"
            onFinish={handleUpdateProfile}
          >
            <Form.Item name="first_name" label="Họ">
              <Input />
            </Form.Item>
            <Form.Item name="last_name" label="Tên">
              <Input />
            </Form.Item>
            <Form.Item name="email" label="Email">
              <Input type="email" />
            </Form.Item>
            <Form.Item name="phone" label="Điện Thoại">
              <Input />
            </Form.Item>
            <Form.Item>
              <Space>
                <Button type="primary" htmlType="submit">
                  Lưu
                </Button>
                <Button onClick={() => {
                  setEditing(false);
                  loadProfile();
                }}>
                  Hủy
                </Button>
              </Space>
            </Form.Item>
          </Form>
        ) : (
          <div>
            <p><strong>Họ tên:</strong> {userData?.first_name} {userData?.last_name}</p>
            <p><strong>Email:</strong> {userData?.email}</p>
            <p><strong>Điện thoại:</strong> {userData?.phone || 'Chưa cập nhật'}</p>
            <p><strong>Username:</strong> {userData?.username}</p>
          </div>
        )}
      </Card>
    </div>
  );
};

export default ShipperProfile;

