import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Card,
  Tabs,
  Form,
  Input,
  Button,
  Space,
  Typography,
  Spin,
  message,
  Popconfirm,
  Empty,
  Tag,
  Row,
  Col,
  Avatar,
  Divider,
  Alert,
} from 'antd';
import {
  EditOutlined,
  DeleteOutlined,
  LogoutOutlined,
  PlusOutlined,
  UserOutlined,
  EnvironmentOutlined,
  LockOutlined,
} from '@ant-design/icons';
import { user, address } from '../../api/index.js';
import { useAuth } from '../../contexts/AuthContext.js';
import avatarImg from '../../assets/avarta.png';
import AddressFormWithMap from '../../components/AddressFormWithMap.js';
import './Profile.scss';

const { Title, Text } = Typography;
const { TabPane } = Tabs;

const Profile = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user: authUser, logout } = useAuth();
  const [form] = Form.useForm();
  const [addressForm] = Form.useForm();
  const [userData, setUserData] = useState(null);
  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [editingAddressId, setEditingAddressId] = useState(null);

  useEffect(() => {
    if (!authUser) {
      window.dispatchEvent(new CustomEvent('openLoginModal', { detail: { tab: 'login' } }));
      navigate('/');
      return;
    }
    loadProfile();
    // Check if we should open addresses tab
    if (searchParams.get('tab') === 'addresses') {
      // Tab will be set by defaultActiveKey
    }
  }, [authUser, searchParams]);

  const loadProfile = async () => {
    try {
      const [userRes, addressesRes] = await Promise.all([
        user.getCurrentUser(),
        address.getMyAddresses(),
      ]);

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
      if (addressesRes.success) {
        setAddresses(addressesRes.data || []);
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
      const updateData = {
        first_name: values.first_name?.trim() || '',
        last_name: values.last_name?.trim() || '',
        phone: values.phone?.trim() || '',
      };
      
      await user.updateCurrentUser(updateData);
      setEditing(false);
      loadProfile();
      message.success('Cập nhật thành công');
    } catch (error) {
      console.error('Error updating profile:', error);
      const errorMessage = error.message || 'Có lỗi xảy ra khi cập nhật thông tin';
      message.error(errorMessage);
    }
  };

  /**
   * Clean address data - remove fields not in backend schema
   * Backend expects: full_name, phone, address_line1, address_line2, city, district, ward, province, postal_code, country
   * Remove: latitude, longitude, fullAddress, provinceName, wardName, address_id, user_id, is_default_shipping, created_at, updated_at
   * Note: address_line2 and postal_code are optional (DEFAULT NULL) - only include if provided
   * Note: Backend requires 'city' but form uses 'province'. If city is missing, use province value.
   */
  const cleanAddressData = (data) => {
    // Required fields that must be included
    const requiredFields = [
      'full_name',
      'phone',
      'address_line1',
      'city',
      'country',
    ];
    
    // Optional fields - only include if they have values
    const optionalFields = [
      'address_line2',
      'district',
      'ward',
      'province',
      'postal_code',
    ];
    
    const cleaned = {};
    
    // Add required fields
    requiredFields.forEach(field => {
      if (data[field] !== undefined && data[field] !== null && data[field] !== '') {
        cleaned[field] = data[field];
      }
    });
    
    // Add optional fields only if they have values (don't send empty/null/undefined)
    optionalFields.forEach(field => {
      if (data[field] !== undefined && data[field] !== null && data[field] !== '') {
        cleaned[field] = data[field];
      }
    });
    
    // Backend requires 'city' field. If not provided, use province value or empty string
    if (!cleaned.city && cleaned.province) {
      // Try to get province name from code if possible, otherwise use code
      cleaned.city = cleaned.province;
    } else if (!cleaned.city) {
      // If no city and no province, set empty string (backend will handle validation)
      cleaned.city = '';
    }
    
    // Ensure required fields have default values
    if (!cleaned.country) {
      cleaned.country = 'Việt Nam';
    }
    
    // Remove any fields that are not in the allowed list (extra safety check)
    const allAllowedFields = [...requiredFields, ...optionalFields];
    Object.keys(cleaned).forEach(key => {
      if (!allAllowedFields.includes(key)) {
        delete cleaned[key];
      }
    });
    
    return cleaned;
  };

  const handleAddAddress = async (values) => {
    try {
      // Clean data - remove unnecessary fields
      const cleanedData = cleanAddressData(values);
      
      if (editingAddressId) {
        await address.updateAddress(editingAddressId, cleanedData);
        message.success('Cập nhật địa chỉ thành công');
      } else {
        // Check address limit before creating
        if (addresses.length >= 5) {
          message.error('Bạn chỉ có thể tạo tối đa 5 địa chỉ giao hàng. Vui lòng xóa một địa chỉ trước khi thêm mới.');
          return;
        }
        await address.createAddress(cleanedData);
        message.success('Thêm địa chỉ thành công');
      }
      setShowAddressForm(false);
      setEditingAddressId(null);
      addressForm.resetFields();
      loadProfile();
    } catch (error) {
      console.error('Error saving address:', error);
      // Check if error is about address limit
      const errorMessage = error?.message || error?.error || 'Có lỗi xảy ra';
      if (errorMessage.includes('tối đa') || errorMessage.includes('5 địa chỉ')) {
        message.error(errorMessage);
      } else {
        message.error('Có lỗi xảy ra');
      }
    }
  };

  const handleEditAddress = (addr) => {
    setEditingAddressId(addr.address_id);
    addressForm.setFieldsValue({
      full_name: addr.full_name,
      phone: addr.phone,
      address_line1: addr.address_line1,
      ward: addr.ward || '',
      district: addr.district || '',
      city: addr.city || '',
      province: addr.province || '',
      country: addr.country || 'Việt Nam',
    });
    setShowAddressForm(true);
  };

  const handleDeleteAddress = async (addressId) => {
    try {
      await address.deleteAddress(addressId);
      message.success('Xóa địa chỉ thành công');
      loadProfile();
    } catch (error) {
      console.error('Error deleting address:', error);
      message.error('Có lỗi xảy ra');
    }
  };

  const handleSetDefaultAddress = async (addressId) => {
    try {
      await address.setDefaultAddress(addressId);
      message.success('Đặt địa chỉ mặc định thành công');
      loadProfile();
    } catch (error) {
      console.error('Error setting default address:', error);
      message.error('Có lỗi xảy ra');
    }
  };

  if (loading) {
    return (
      <div className="profile-loading">
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div className="profile-page">
      <div className="container">
        <Title level={2} className="page-title">
          <UserOutlined /> Tài Khoản Của Tôi
        </Title>

        <Tabs defaultActiveKey={searchParams.get('tab') || 'profile'} className="profile-tabs">
          <TabPane
            tab={
              <span>
                <UserOutlined />
                Thông Tin Cá Nhân
              </span>
            }
            key="profile"
          >
            <Card
              title="Thông Tin Cá Nhân"
              className="profile-card"
              extra={
                !editing && (
                  <Button icon={<EditOutlined />} onClick={() => setEditing(true)}>
                    Chỉnh Sửa
                  </Button>
                )
              }
            >
              {editing ? (
                <Form form={form} layout="vertical" onFinish={handleUpdateProfile}>
                  <Row gutter={16}>
                    <Col xs={24} sm={12}>
                      <Form.Item name="first_name" label="Họ">
                        <Input placeholder="Nhập họ" />
                      </Form.Item>
                    </Col>
                    <Col xs={24} sm={12}>
                      <Form.Item name="last_name" label="Tên">
                        <Input placeholder="Nhập tên" />
                      </Form.Item>
                    </Col>
                  </Row>
                  <Form.Item name="email" label="Email">
                    <Input type="email" disabled />
                  </Form.Item>
                  <Form.Item name="phone" label="Điện Thoại">
                    <Input placeholder="Nhập số điện thoại" />
                  </Form.Item>
                  <Form.Item>
                    <Space>
                      <Button type="primary" htmlType="submit">
                        Lưu
                      </Button>
                      <Button
                        onClick={() => {
                          setEditing(false);
                          loadProfile();
                        }}
                      >
                        Hủy
                      </Button>
                    </Space>
                  </Form.Item>
                </Form>
              ) : (
                <div className="profile-info">
                  <div className="profile-avatar-section">
                    <Avatar size={120} src={avatarImg} icon={<UserOutlined />} />
                    <div className="profile-details">
                      <Title level={3} className="profile-name">
                        {userData?.first_name} {userData?.last_name}
                      </Title>
                      <Text type="secondary">{userData?.email}</Text>
                    </div>
                  </div>
                  <Divider />
                  <Row gutter={[16, 16]}>
                    <Col xs={24} sm={12}>
                      <div className="info-item">
                        <Text type="secondary">Username:</Text>
                        <Text strong style={{ marginLeft: '8px' }}>
                          {userData?.username}
                        </Text>
                      </div>
                    </Col>
                    <Col xs={24} sm={12}>
                      <div className="info-item">
                        <Text type="secondary">Email:</Text>
                        <Text strong style={{ marginLeft: '8px' }}>
                          {userData?.email}
                        </Text>
                      </div>
                    </Col>
                    <Col xs={24} sm={12}>
                      <div className="info-item">
                        <Text type="secondary">Họ tên:</Text>
                        <Text strong style={{ marginLeft: '8px' }}>
                          {userData?.first_name} {userData?.last_name}
                        </Text>
                      </div>
                    </Col>
                    <Col xs={24} sm={12}>
                      <div className="info-item">
                        <Text type="secondary">Điện thoại:</Text>
                        <Text strong style={{ marginLeft: '8px' }}>
                          {userData?.phone || 'Chưa cập nhật'}
                        </Text>
                      </div>
                    </Col>
                  </Row>
                </div>
              )}
            </Card>
          </TabPane>

          <TabPane
            tab={
              <span>
                <EnvironmentOutlined />
                Địa Chỉ
              </span>
            }
            key="addresses"
          >
            <Card
              title="Địa Chỉ Của Tôi"
              className="profile-card"
              extra={
                <Space>
                  {addresses.length >= 5 && (
                    <Text type="secondary" style={{ fontSize: '12px' }}>
                      Đã đạt giới hạn 5 địa chỉ
                    </Text>
                  )}
                  <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    disabled={addresses.length >= 5 && !showAddressForm}
                    onClick={() => {
                      if (addresses.length >= 5 && !showAddressForm) {
                        message.warning('Bạn chỉ có thể tạo tối đa 5 địa chỉ giao hàng. Vui lòng xóa một địa chỉ trước khi thêm mới.');
                        return;
                      }
                      setShowAddressForm(!showAddressForm);
                      setEditingAddressId(null);
                      addressForm.resetFields();
                    }}
                  >
                    {showAddressForm ? 'Hủy' : 'Thêm Địa Chỉ'}
                  </Button>
                </Space>
              }
            >
              {showAddressForm && (
                <Card style={{ marginBottom: '24px', background: '#f8f9fa' }}>
                  <Form form={addressForm} layout="vertical">
                    <Form.Item name="full_name" label="Họ Tên" rules={[{ required: true }]}>
                      <Input placeholder="Nhập họ tên" />
                    </Form.Item>
                    <Form.Item name="phone" label="Điện Thoại" rules={[{ required: true }]}>
                      <Input placeholder="Nhập số điện thoại" />
                    </Form.Item>
                    <Form.Item name="country" label="Quốc Gia" rules={[{ required: true }]} initialValue="Việt Nam">
                      <Input placeholder="Nhập quốc gia" />
                    </Form.Item>
                    <AddressFormWithMap
                      form={addressForm}
                      onFinish={handleAddAddress}
                      onCancel={() => {
                        setShowAddressForm(false);
                        setEditingAddressId(null);
                        addressForm.resetFields();
                      }}
                      initialValues={editingAddressId ? addresses.find(a => a.address_id === editingAddressId) : {}}
                      showMap={true}
                      showSteps={true}
                    />
                  </Form>
                </Card>
              )}

              {addresses.length >= 5 && (
                <Alert
                  message="Bạn đã đạt giới hạn 5 địa chỉ giao hàng"
                  description="Để thêm địa chỉ mới, vui lòng xóa một địa chỉ hiện có trước."
                  type="info"
                  showIcon
                  style={{ marginBottom: '16px' }}
                />
              )}
              
              {addresses.length === 0 ? (
                <Empty description="Bạn chưa có địa chỉ nào" />
              ) : (
                <Row gutter={[16, 16]}>
                  {addresses.map((addr) => (
                    <Col xs={24} sm={12} key={addr.address_id}>
                      <Card
                        className={`address-card ${addr.is_default_shipping ? 'default-address' : ''}`}
                        title={
                          <Space>
                            <Text strong>{addr.full_name}</Text>
                            {addr.is_default_shipping && (
                              <Tag color="green">Mặc định</Tag>
                            )}
                          </Space>
                        }
                        extra={
                          <Space>
                            {!addr.is_default_shipping && (
                              <Button
                                size="small"
                                onClick={() => handleSetDefaultAddress(addr.address_id)}
                              >
                                Đặt Mặc Định
                              </Button>
                            )}
                            <Button
                              size="small"
                              icon={<EditOutlined />}
                              onClick={() => handleEditAddress(addr)}
                            >
                              Sửa
                            </Button>
                            <Popconfirm
                              title="Bạn có chắc muốn xóa địa chỉ này?"
                              onConfirm={() => handleDeleteAddress(addr.address_id)}
                              okText="Xóa"
                              cancelText="Hủy"
                            >
                              <Button danger size="small" icon={<DeleteOutlined />}>
                                Xóa
                              </Button>
                            </Popconfirm>
                          </Space>
                        }
                      >
                        <div className="address-content">
                          <Text strong>{addr.full_name}</Text>
                          <br />
                          <Text>{addr.address_line1}</Text>
                          {addr.address_line2 && (
                            <>
                              <br />
                              <Text>{addr.address_line2}</Text>
                            </>
                          )}
                          <br />
                          <Text type="secondary">
                            {[
                              addr.ward,
                              addr.district,
                              addr.city,
                              addr.province,
                            ].filter(Boolean).join(', ')}
                            {addr.postal_code && ` - ${addr.postal_code}`}
                          </Text>
                          {addr.country && (
                            <>
                              <br />
                              <Text type="secondary">{addr.country}</Text>
                            </>
                          )}
                          <br />
                          <Text type="secondary">Điện thoại: {addr.phone}</Text>
                        </div>
                      </Card>
                    </Col>
                  ))}
                </Row>
              )}
            </Card>
          </TabPane>

          <TabPane
            tab={
              <span>
                <LockOutlined />
                Bảo Mật
              </span>
            }
            key="security"
          >
            <Card title="Bảo Mật" className="profile-card">
              <div className="security-section">
                <Text>Để thay đổi mật khẩu, vui lòng liên hệ với quản trị viên.</Text>
                <Divider />
                <Button danger icon={<LogoutOutlined />} onClick={logout} size="large">
                  Đăng Xuất
                </Button>
              </div>
            </Card>
          </TabPane>
        </Tabs>
      </div>
    </div>
  );
};

export default Profile;
