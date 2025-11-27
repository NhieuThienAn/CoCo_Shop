import React, { useState, useEffect } from 'react';
import { Modal, Form, Input, Button, Typography, Alert, Tabs, Row, Col, message } from 'antd';
import { UserOutlined, LockOutlined, MailOutlined, PhoneOutlined } from '@ant-design/icons';
import { useAuth } from '../contexts/AuthContext.js';
import { useNavigate } from 'react-router-dom';

const { Title, Paragraph, Text } = Typography;

const LoginModal = ({ open, onClose, defaultTab = 'login' }) => {
  const navigate = useNavigate();
  const { login, register } = useAuth();
  const [loginForm] = Form.useForm();
  const [registerForm] = Form.useForm();
  const [activeTab, setActiveTab] = useState(defaultTab);
  const [loginLoading, setLoginLoading] = useState(false);
  const [registerLoading, setRegisterLoading] = useState(false);
  const [loginError, setLoginError] = useState(null);
  const [registerError, setRegisterError] = useState(null);

  useEffect(() => {
    if (open) {
      setActiveTab(defaultTab);
      setLoginError(null);
      setRegisterError(null);
      loginForm.resetFields();
      registerForm.resetFields();
    }
  }, [open, defaultTab]);

  const handleLogin = async ({ identifier, password }) => {
    setLoginLoading(true);
    setLoginError(null);
    
    try {
      const trimmedIdentifier = identifier?.trim();

      if (!trimmedIdentifier) {
        setLoginError('Vui lòng cung cấp email hoặc tên đăng nhập');
        setLoginLoading(false);
        return;
      }

      const payload = {
        password,
        ...(trimmedIdentifier.includes('@') ? { email: trimmedIdentifier } : { username: trimmedIdentifier }),
      };

      const result = await login(payload);

      if (result.success) {
        const roleId = result.roleId || result.user?.role_id || result.user?.roleId;
        
        message.success('Đăng nhập thành công');
        onClose();
        loginForm.resetFields();
        
        // Redirect based on role (only for admin/shipper, customer stays on current page)
        if (roleId === 1) {
          navigate('/admin/dashboard', { replace: true });
        } else if (roleId === 2) {
          navigate('/shipper/orders', { replace: true });
        }
        // Customer stays on current page
      } else {
        const errorMessage = result.message || 'Đăng nhập thất bại';
        setLoginError(errorMessage);
        message.error(errorMessage);
      }
    } catch (err) {
      const errorMessage = err.message || err.response?.data?.message || 'Có lỗi xảy ra. Vui lòng thử lại.';
      setLoginError(errorMessage);
      message.error(errorMessage);
    } finally {
      setLoginLoading(false);
    }
  };

  const handleRegister = async (values) => {
    console.log('[LoginModal] 🚀🚀🚀 handleRegister CALLED 🚀🚀🚀');
    console.log('[LoginModal] Form values:', { ...values, password: '[HIDDEN]', confirmPassword: '[HIDDEN]' });
    
    if (values.password !== values.confirmPassword) {
      console.log('[LoginModal] ❌ Password mismatch');
      setRegisterError('Mật khẩu xác nhận không khớp');
      return;
    }

    setRegisterLoading(true);
    setRegisterError(null);
    console.log('[LoginModal] ⏳ Register loading set to true');
    
    try {
      const { confirmPassword, ...registerData } = values;
      console.log('[LoginModal] 📝 Calling register function...');
      console.log('[LoginModal] Email:', registerData.email);
      console.log('[LoginModal] Username:', registerData.username);
      
      const result = await register(registerData);
      console.log('[LoginModal] ✅ Register function returned');
      console.log('[LoginModal] 📥 Registration response:', {
        success: result.success,
        requiresEmailVerification: result.requiresEmailVerification,
        otpSent: result.otpSent,
        email: result.email,
      });
      
      if (result.success) {
        // ⚠️ WORKFLOW MỚI: Nếu có requiresEmailVerification, phải redirect đến /verify-email
        if (result.requiresEmailVerification) {
          console.log('[LoginModal] ✅ Registration successful with email verification required');
          console.log('[LoginModal] 🔄 Closing modal and redirecting to /verify-email...');
          
          // Kiểm tra: Không được có user trong result
          if (result.user || result.data?.user) {
            console.error('[LoginModal] ❌❌❌ ERROR: User should NOT exist in registration response! ❌❌❌');
            setRegisterError('Lỗi hệ thống: Tài khoản không nên được tạo ngay.');
            return;
          }
          
          const otpMessage = result.otpSent 
            ? 'Mã OTP đã được gửi đến email của bạn. Vui lòng kiểm tra hộp thư đến hoặc thư mục spam.'
            : 'Vui lòng kiểm tra email để nhận mã OTP. Nếu không nhận được, bạn có thể yêu cầu gửi lại.';
          
          message.success({
            content: (
              <div>
                <div style={{ fontWeight: 'bold', marginBottom: '8px', fontSize: '16px' }}>
                  ✅ Đăng ký thành công!
                </div>
                <div style={{ marginBottom: '4px' }}>{otpMessage}</div>
                <div style={{ fontSize: '12px', color: '#666', marginTop: '8px' }}>
                  ⚠️ Vui lòng xác thực email để hoàn tất đăng ký
                </div>
              </div>
            ),
            duration: 6,
          });
          
          // Đóng modal và redirect đến verify-email
          onClose();
          registerForm.resetFields();
          
          const emailToVerify = result.email || values.email;
          if (!emailToVerify) {
            console.error('[LoginModal] ❌ No email found in result or form values');
            message.error('Lỗi: Không tìm thấy email. Vui lòng thử lại.');
            return;
          }
          
          console.log('[LoginModal] 🔄 Navigating to /verify-email with email:', emailToVerify);
          navigate('/verify-email', { 
            state: { 
              email: emailToVerify,
              purpose: 'email_verification'
            },
            replace: true
          });
        } else {
          // Fallback: Nếu không có requiresEmailVerification (không mong muốn trong workflow này)
          console.warn('[LoginModal] ⚠️  Warning: requiresEmailVerification is false');
          message.success('Đăng ký thành công! Vui lòng đăng nhập để tiếp tục.');
          registerForm.resetFields();
          setActiveTab('login');
          setRegisterError(null);
        }
      } else {
        const errorMessage = result.message || result.error || 'Đăng ký thất bại. Vui lòng thử lại.';
        console.error('[LoginModal] ❌ Registration failed:', errorMessage);
        setRegisterError(errorMessage);
        message.error(errorMessage);
      }
    } catch (err) {
      console.error('[LoginModal] ❌❌❌ Registration error:', err);
      const errorMessage = err.message || err.response?.data?.message || 'Có lỗi xảy ra. Vui lòng thử lại.';
      setRegisterError(errorMessage);
      message.error(errorMessage);
    } finally {
      setRegisterLoading(false);
      console.log('[LoginModal] ⏳ Register loading set to false');
    }
  };

  const handleTabChange = (key) => {
    setActiveTab(key);
    setLoginError(null);
    setRegisterError(null);
  };

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      width={500}
      centered
      destroyOnClose
    >
      <div style={{ padding: '8px 0' }}>
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <Title level={3} style={{ marginBottom: '8px' }}>
            {activeTab === 'login' ? 'Đăng Nhập' : 'Đăng Ký'}
          </Title>
          <Paragraph type="secondary">
            {activeTab === 'login' 
              ? 'Chào mừng bạn trở lại CoCo Store' 
              : 'Tạo tài khoản mới để bắt đầu mua sắm'}
          </Paragraph>
        </div>

        <Tabs 
          activeKey={activeTab} 
          onChange={handleTabChange} 
          centered
          items={[
            {
              key: 'login',
              label: 'Đăng Nhập',
              children: (
                <>
                  {loginError && (
                    <Alert
                      type="error"
                      message={loginError}
                      showIcon
                      closable
                      onClose={() => setLoginError(null)}
                      style={{ marginBottom: '24px' }}
                    />
                  )}
                  <Form
                    form={loginForm}
                    layout="vertical"
                    onFinish={handleLogin}
                    size="large"
                  >
                    <Form.Item
                      name="identifier"
                      label="Email / Username"
                      rules={[{ required: true, message: 'Vui lòng nhập email hoặc tên đăng nhập' }]}
                    >
                      <Input
                        prefix={<UserOutlined />}
                        placeholder="Email hoặc username"
                        allowClear
                      />
                    </Form.Item>
                    <Form.Item
                      name="password"
                      label="Mật Khẩu"
                      rules={[{ required: true, message: 'Vui lòng nhập mật khẩu' }]}
                    >
                      <Input.Password
                        prefix={<LockOutlined />}
                        placeholder="Nhập mật khẩu"
                      />
                    </Form.Item>
                    <Form.Item>
                      <Button type="primary" htmlType="submit" block loading={loginLoading}>
                        Đăng Nhập
                      </Button>
                    </Form.Item>
                  </Form>
                </>
              ),
            },
            {
              key: 'register',
              label: 'Đăng Ký',
              children: (
                <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                  <Paragraph type="secondary" style={{ marginBottom: '24px' }}>
                    Đăng ký tài khoản mới với xác thực OTP
                  </Paragraph>
                  <Button
                    type="primary"
                    size="large"
                    block
                    onClick={() => {
                      onClose();
                      // Trigger openRegisterOTPModal event
                      window.dispatchEvent(new CustomEvent('openRegisterOTPModal'));
                    }}
                  >
                    Mở Form Đăng Ký
                  </Button>
                  <Paragraph type="secondary" style={{ marginTop: '16px', fontSize: '12px' }}>
                    Bạn sẽ được hướng dẫn qua các bước đăng ký và xác thực email
                  </Paragraph>
                </div>
              ),
            },
          ]}
        />
      </div>
    </Modal>
  );
};

export default LoginModal;

