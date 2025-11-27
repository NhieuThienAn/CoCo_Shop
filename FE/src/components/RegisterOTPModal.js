import React, { useState, useEffect } from 'react';
import { Modal, Form, Input, Button, Typography, Alert, Steps, Row, Col, message, Space } from 'antd';
import { 
  UserOutlined, 
  LockOutlined, 
  MailOutlined, 
  PhoneOutlined, 
  SafetyOutlined, 
  ReloadOutlined, 
  CheckCircleOutlined 
} from '@ant-design/icons';
import { useAuth } from '../contexts/AuthContext.js';
import { sendOTP, verifyOTP } from '../api/auth.js';
import logoImg from '../assets/logo.png';

const { Title, Text, Paragraph } = Typography;
const { Step } = Steps;

const RegisterOTPModal = ({ open, onClose, onSuccess, initialEmail }) => {
  const { register } = useAuth();
  const [form] = Form.useForm();
  const [otpForm] = Form.useForm();
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [sendingOTP, setSendingOTP] = useState(false);
  const [verified, setVerified] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [registeredEmail, setRegisteredEmail] = useState(initialEmail || '');
  const [error, setError] = useState(null);

  useEffect(() => {
    if (open) {
      // If initialEmail is provided, skip to OTP step
      if (initialEmail) {
        setRegisteredEmail(initialEmail);
        setCurrentStep(1);
      } else {
        // Reset state when modal opens
        setCurrentStep(0);
        setRegisteredEmail('');
      }
      setVerified(false);
      setError(null);
      setCountdown(0);
      form.resetFields();
      otpForm.resetFields();
    }
  }, [open, initialEmail]);

  // Countdown timer
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const handleRegister = async (values) => {
    if (values.password !== values.confirmPassword) {
      setError('Mật khẩu xác nhận không khớp');
      message.error('Mật khẩu xác nhận không khớp');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { confirmPassword, ...registerData } = values;
      const result = await register(registerData);

      if (result.success) {
        // Check: User should NOT exist in registration response
        if (result.user || result.data?.user) {
          setError('Lỗi hệ thống: Tài khoản không nên được tạo ngay.');
          message.error('Lỗi hệ thống: Tài khoản không nên được tạo ngay.');
          return;
        }

        const emailToVerify = result.email || values.email;
        if (!emailToVerify) {
          setError('Lỗi: Không tìm thấy email. Vui lòng thử lại.');
          message.error('Lỗi: Không tìm thấy email. Vui lòng thử lại.');
          return;
        }

        setRegisteredEmail(emailToVerify);
        setCurrentStep(1); // Move to OTP verification step

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
            </div>
          ),
          duration: 6,
        });
      } else {
        const errorMessage = result.message || result.error || 'Đăng ký thất bại. Vui lòng thử lại.';
        setError(errorMessage);
        message.error(errorMessage);
      }
    } catch (err) {
      const errorMessage = err.message || err.response?.data?.message || 'Có lỗi xảy ra. Vui lòng thử lại.';
      setError(errorMessage);
      message.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    if (countdown > 0) {
      message.warning(`Vui lòng đợi ${countdown} giây trước khi gửi lại mã OTP`);
      return;
    }

    if (!registeredEmail) {
      message.error('Không tìm thấy email. Vui lòng đăng ký lại.');
      return;
    }

    setSendingOTP(true);
    try {
      const result = await sendOTP(registeredEmail, 'email_verification');
      if (result.success) {
        message.success('Mã OTP mới đã được gửi đến email của bạn. Vui lòng kiểm tra hộp thư đến hoặc thư mục spam.');
        setCountdown(60); // 60 seconds countdown
      } else {
        message.error(result.message || 'Có lỗi xảy ra khi gửi mã OTP');
      }
    } catch (error) {
      message.error(error.response?.data?.message || 'Có lỗi xảy ra khi gửi mã OTP');
    } finally {
      setSendingOTP(false);
    }
  };

  const handleVerifyOTP = async (values) => {
    if (!registeredEmail) {
      message.error('Không tìm thấy email. Vui lòng đăng ký lại.');
      return;
    }

    setLoading(true);
    try {
      const result = await verifyOTP(registeredEmail, values.otp, 'email_verification');

      if (result.success) {
        setVerified(true);
        const hasUser = !!result.data?.user;
        const successMessage = hasUser 
          ? 'Tài khoản của bạn đã được tạo thành công! Bạn có thể đăng nhập ngay bây giờ.'
          : 'Xác thực email thành công! Bạn có thể đăng nhập ngay bây giờ.';

        message.success({
          content: (
            <div>
              <div style={{ fontWeight: 'bold', marginBottom: '8px', fontSize: '16px' }}>
                ✅ Xác thực email thành công!
              </div>
              <div style={{ marginBottom: '4px' }}>{successMessage}</div>
            </div>
          ),
          duration: 4,
        });

        // Close modal and call onSuccess after 1.5 seconds
        setTimeout(() => {
          onSuccess && onSuccess();
          onClose();
        }, 1500);
      } else {
        message.error(result.message || 'Mã OTP không đúng. Vui lòng thử lại.');
        otpForm.setFields([{ name: 'otp', errors: [result.message || 'Mã OTP không đúng'] }]);
      }
    } catch (error) {
      message.error(error.response?.data?.message || 'Có lỗi xảy ra khi xác thực OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    if (currentStep === 1) {
      setCurrentStep(0);
      setRegisteredEmail('');
      otpForm.resetFields();
    }
  };

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      width={600}
      centered
      destroyOnClose
      closable={!verified}
      maskClosable={!verified}
    >
      <div style={{ padding: '8px 0' }}>
        {/* Logo and Title */}
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <img src={logoImg} alt="CoCo Store" style={{ height: '50px', marginBottom: '12px' }} />
          <Title level={3} style={{ marginBottom: '8px' }}>
            {currentStep === 0 ? 'Đăng Ký' : 'Xác Thực Email'}
          </Title>
          <Text type="secondary">
            {currentStep === 0 
              ? 'Tạo tài khoản mới để bắt đầu mua sắm'
              : 'Nhập mã OTP đã được gửi đến email của bạn'
            }
          </Text>
        </div>

        {/* Steps Indicator */}
        <Steps current={currentStep} style={{ marginBottom: '32px' }}>
          <Step title="Đăng ký" icon={<UserOutlined />} />
          <Step title="Xác thực OTP" icon={<SafetyOutlined />} />
        </Steps>

        {/* Step 0: Registration Form */}
        {currentStep === 0 && (
          <Form
            form={form}
            layout="vertical"
            onFinish={handleRegister}
            size="large"
          >
            {error && (
              <Alert
                message={error}
                type="error"
                showIcon
                closable
                onClose={() => setError(null)}
                style={{ marginBottom: '16px' }}
              />
            )}

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

            <Form.Item
              name="username"
              label="Username"
              rules={[{ required: true, message: 'Vui lòng nhập username' }]}
            >
              <Input prefix={<UserOutlined />} placeholder="Nhập username" />
            </Form.Item>

            <Form.Item
              name="email"
              label="Email"
              rules={[
                { required: true, message: 'Vui lòng nhập email' },
                { type: 'email', message: 'Email không hợp lệ' },
              ]}
            >
              <Input prefix={<MailOutlined />} placeholder="Nhập email" />
            </Form.Item>

            <Form.Item name="phone" label="Điện Thoại">
              <Input prefix={<PhoneOutlined />} placeholder="Nhập số điện thoại" />
            </Form.Item>

            <Form.Item
              name="password"
              label="Mật Khẩu"
              rules={[
                { required: true, message: 'Vui lòng nhập mật khẩu' },
                { min: 6, message: 'Mật khẩu phải có ít nhất 6 ký tự' },
              ]}
            >
              <Input.Password prefix={<LockOutlined />} placeholder="Nhập mật khẩu" />
            </Form.Item>

            <Form.Item
              name="confirmPassword"
              label="Xác Nhận Mật Khẩu"
              dependencies={['password']}
              rules={[
                { required: true, message: 'Vui lòng xác nhận mật khẩu' },
                ({ getFieldValue }) => ({
                  validator(_, value) {
                    if (!value || getFieldValue('password') === value) {
                      return Promise.resolve();
                    }
                    return Promise.reject(new Error('Mật khẩu xác nhận không khớp'));
                  },
                }),
              ]}
            >
              <Input.Password prefix={<LockOutlined />} placeholder="Xác nhận mật khẩu" />
            </Form.Item>

            <Form.Item>
              <Button type="primary" htmlType="submit" block loading={loading}>
                Đăng Ký
              </Button>
            </Form.Item>
          </Form>
        )}

        {/* Step 1: OTP Verification */}
        {currentStep === 1 && !verified && (
          <div>
            <Alert
              message={
                <div>
                  <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>
                    <MailOutlined /> Mã OTP đã được gửi đến email của bạn
                  </div>
                  <div style={{ fontSize: '14px', color: '#666' }}>
                    Email: <strong>{registeredEmail}</strong>
                  </div>
                  <div style={{ fontSize: '12px', color: '#999', marginTop: '8px' }}>
                    💡 Vui lòng kiểm tra hộp thư đến hoặc thư mục spam. Mã OTP có hiệu lực trong 10 phút.
                  </div>
                </div>
              }
              type="info"
              showIcon
              style={{ marginBottom: '24px' }}
            />

            <Form
              form={otpForm}
              layout="vertical"
              onFinish={handleVerifyOTP}
              autoComplete="off"
            >
              <Form.Item
                name="otp"
                label="Mã OTP"
                rules={[
                  { required: true, message: 'Vui lòng nhập mã OTP' },
                  { len: 6, message: 'Mã OTP phải là 6 chữ số' },
                ]}
              >
                <Input.OTP
                  length={6}
                  size="large"
                  autoFocus
                  onComplete={(value) => {
                    // Auto-submit when 6 digits are entered
                    otpForm.validateFields(['otp']).then(() => {
                      handleVerifyOTP({ otp: value });
                    }).catch(() => {
                      // Validation failed, don't submit
                    });
                  }}
                  style={{
                    justifyContent: 'center',
                  }}
                />
              </Form.Item>

              <Form.Item>
                <Space direction="vertical" style={{ width: '100%' }}>
                  <Button
                    type="primary"
                    htmlType="submit"
                    size="large"
                    block
                    loading={loading}
                    icon={<SafetyOutlined />}
                  >
                    Xác thực
                  </Button>
                  <Button
                    type="default"
                    onClick={handleBack}
                    block
                    disabled={loading}
                  >
                    Quay lại
                  </Button>
                </Space>
              </Form.Item>

              <div style={{ textAlign: 'center', marginTop: '16px' }}>
                <Text type="secondary" style={{ fontSize: '14px', display: 'block', marginBottom: '8px' }}>
                  Không nhận được mã OTP?
                </Text>
                <Button
                  type="link"
                  onClick={handleResendOTP}
                  loading={sendingOTP}
                  disabled={countdown > 0}
                  icon={<ReloadOutlined />}
                >
                  {countdown > 0 ? `Gửi lại sau ${countdown}s` : 'Gửi lại mã OTP'}
                </Button>
              </div>
            </Form>
          </div>
        )}

        {/* Success State */}
        {verified && (
          <div style={{ textAlign: 'center', padding: '40px 20px' }}>
            <CheckCircleOutlined style={{ fontSize: '64px', color: '#52c41a', marginBottom: '20px' }} />
            <Title level={3} style={{ color: '#52c41a', marginBottom: '16px' }}>
              Xác thực thành công!
            </Title>
            <Paragraph style={{ fontSize: '16px', color: '#666' }}>
              Email của bạn đã được xác thực thành công.
            </Paragraph>
            <Paragraph style={{ fontSize: '14px', color: '#999' }}>
              Đang đóng modal...
            </Paragraph>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default RegisterOTPModal;

