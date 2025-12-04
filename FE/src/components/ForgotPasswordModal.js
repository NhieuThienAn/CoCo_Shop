import React, { useState, useEffect } from 'react';
import { Modal, Form, Input, Button, Typography, Alert, message, Steps } from 'antd';
import { MailOutlined, LockOutlined, SafetyOutlined } from '@ant-design/icons';
import * as auth from '../api/auth';

const { Title, Paragraph, Text } = Typography;
const { Step } = Steps;

const ForgotPasswordModal = ({ open, onClose, onSuccess }) => {
  const [form] = Form.useForm();
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [email, setEmail] = useState('');
  const [otpVerified, setOtpVerified] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [canResend, setCanResend] = useState(false);
  const [verifiedOtp, setVerifiedOtp] = useState('');

  useEffect(() => {
    if (open) {
      setCurrentStep(0);
      setError(null);
      setEmail('');
      setOtpVerified(false);
      setCountdown(0);
      setCanResend(false);
      setVerifiedOtp('');
      form.resetFields();
    }
  }, [open, form]);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else if (countdown === 0 && currentStep === 1) {
      setCanResend(true);
    }
  }, [countdown, currentStep]);

  // Step 0: Enter Email
  const handleRequestOTP = async (values) => {
    setLoading(true);
    setError(null);

    try {
      const result = await auth.forgotPassword(values.email);
      
      if (result.success) {
        setEmail(values.email);
        setCurrentStep(1);
        setCountdown(60); // 60 seconds countdown
        setCanResend(false);
        message.success('Mã OTP đã được gửi đến email của bạn. Vui lòng kiểm tra hộp thư đến hoặc thư mục spam.');
      } else {
        setError(result.message || 'Có lỗi xảy ra khi gửi mã OTP');
        message.error(result.message || 'Có lỗi xảy ra khi gửi mã OTP');
      }
    } catch (err) {
      const errorMessage = err.message || err.response?.data?.message || 'Có lỗi xảy ra. Vui lòng thử lại.';
      setError(errorMessage);
      message.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Step 1: Verify OTP
  const handleVerifyOTP = async (values) => {
    setLoading(true);
    setError(null);

    try {
      const result = await auth.verifyForgotPasswordOTP(email, values.otp);
      
      if (result.success) {
        // Store OTP for later use in reset password step
        setVerifiedOtp(values.otp);
        setOtpVerified(true);
        setCurrentStep(2);
        message.success('Xác thực OTP thành công. Vui lòng nhập mật khẩu mới.');
      } else {
        setError(result.message || 'Mã OTP không hợp lệ');
        message.error(result.message || 'Mã OTP không hợp lệ');
      }
    } catch (err) {
      const errorMessage = err.message || err.response?.data?.message || 'Có lỗi xảy ra. Vui lòng thử lại.';
      setError(errorMessage);
      message.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Reset Password
  const handleResetPassword = async (values) => {
    setLoading(true);
    setError(null);

    try {
      if (!verifiedOtp) {
        setError('Mã OTP không hợp lệ. Vui lòng bắt đầu lại từ đầu.');
        message.error('Mã OTP không hợp lệ. Vui lòng bắt đầu lại từ đầu.');
        setLoading(false);
        return;
      }

      const result = await auth.resetPassword(email, verifiedOtp, values.newPassword);
      
      if (result.success) {
        message.success('Đặt lại mật khẩu thành công! Vui lòng đăng nhập với mật khẩu mới.');
        if (onSuccess) {
          onSuccess();
        }
        onClose();
      } else {
        if (result.errors && Array.isArray(result.errors)) {
          setError(result.errors.join(', '));
          message.error(result.errors.join(', '));
        } else {
          setError(result.message || 'Có lỗi xảy ra khi đặt lại mật khẩu');
          message.error(result.message || 'Có lỗi xảy ra khi đặt lại mật khẩu');
        }
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
    setLoading(true);
    setError(null);

    try {
      const result = await auth.forgotPassword(email);
      
      if (result.success) {
        setCountdown(60);
        setCanResend(false);
        message.success('Mã OTP mới đã được gửi đến email của bạn.');
      } else {
        setError(result.message || 'Có lỗi xảy ra khi gửi lại mã OTP');
        message.error(result.message || 'Có lỗi xảy ra khi gửi lại mã OTP');
      }
    } catch (err) {
      const errorMessage = err.message || err.response?.data?.message || 'Có lỗi xảy ra. Vui lòng thử lại.';
      setError(errorMessage);
      message.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Password validation function
  const validatePassword = (_, value) => {
    if (!value) {
      return Promise.reject(new Error('Vui lòng nhập mật khẩu mới'));
    }
    
    const errors = [];
    
    if (value.length < 8) {
      errors.push('Mật khẩu phải có ít nhất 8 ký tự');
    }
    
    if (value.length > 128) {
      errors.push('Mật khẩu không được vượt quá 128 ký tự');
    }
    
    if (!/[A-Z]/.test(value)) {
      errors.push('Mật khẩu phải có ít nhất một chữ cái viết hoa');
    }
    
    if (!/[a-z]/.test(value)) {
      errors.push('Mật khẩu phải có ít nhất một chữ cái viết thường');
    }
    
    if (!/[0-9]/.test(value)) {
      errors.push('Mật khẩu phải có ít nhất một chữ số');
    }
    
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(value)) {
      errors.push('Mật khẩu phải có ít nhất một ký tự đặc biệt');
    }
    
    if (errors.length > 0) {
      return Promise.reject(new Error(errors[0]));
    }
    
    return Promise.resolve();
  };

  const steps = [
    {
      title: 'Nhập Email',
      icon: <MailOutlined />,
    },
    {
      title: 'Xác Thực OTP',
      icon: <SafetyOutlined />,
    },
    {
      title: 'Đặt Lại Mật Khẩu',
      icon: <LockOutlined />,
    },
  ];

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      width={600}
      centered
      destroyOnClose
    >
      <div style={{ padding: '8px 0' }}>
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <Title level={3} style={{ marginBottom: '8px' }}>
            Quên Mật Khẩu
          </Title>
          <Paragraph type="secondary">
            Vui lòng làm theo các bước để đặt lại mật khẩu của bạn
          </Paragraph>
        </div>

        <Steps current={currentStep} style={{ marginBottom: '32px' }}>
          {steps.map((step, index) => (
            <Step key={index} title={step.title} icon={step.icon} />
          ))}
        </Steps>

        {error && (
          <Alert
            type="error"
            message={error}
            showIcon
            closable
            onClose={() => setError(null)}
            style={{ marginBottom: '24px' }}
          />
        )}

        {/* Step 0: Enter Email */}
        {currentStep === 0 && (
          <Form
            form={form}
            layout="vertical"
            onFinish={handleRequestOTP}
            size="large"
          >
            <Form.Item
              name="email"
              label="Email"
              rules={[
                { required: true, message: 'Vui lòng nhập email' },
                { type: 'email', message: 'Email không hợp lệ' },
              ]}
            >
              <Input
                prefix={<MailOutlined />}
                placeholder="Nhập email của bạn"
                allowClear
              />
            </Form.Item>

            <Form.Item>
              <Button type="primary" htmlType="submit" block loading={loading}>
                Gửi Mã OTP
              </Button>
            </Form.Item>
          </Form>
        )}

        {/* Step 1: Verify OTP */}
        {currentStep === 1 && (
          <div>
            <Paragraph style={{ marginBottom: '24px', textAlign: 'center' }}>
              Mã OTP đã được gửi đến <strong>{email}</strong>
            </Paragraph>

            <Form
              form={form}
              layout="vertical"
              onFinish={handleVerifyOTP}
              size="large"
              preserve={false}
            >
              <Form.Item
                name="otp"
                label="Mã OTP"
                rules={[
                  { required: true, message: 'Vui lòng nhập mã OTP' },
                  { len: 6, message: 'Mã OTP phải có 6 chữ số' },
                  { pattern: /^\d+$/, message: 'Mã OTP chỉ chứa số' },
                ]}
              >
                <Input
                  prefix={<SafetyOutlined />}
                  placeholder="Nhập mã OTP 6 chữ số"
                  maxLength={6}
                  allowClear
                />
              </Form.Item>

              <Form.Item>
                <Button type="primary" htmlType="submit" block loading={loading}>
                  Xác Thực OTP
                </Button>
              </Form.Item>

              <div style={{ textAlign: 'center', marginTop: '16px' }}>
                {countdown > 0 ? (
                  <Text type="secondary">
                    Gửi lại mã sau {countdown} giây
                  </Text>
                ) : (
                  <Button type="link" onClick={handleResendOTP} loading={loading}>
                    Gửi lại mã OTP
                  </Button>
                )}
              </div>
            </Form>
          </div>
        )}

        {/* Step 2: Reset Password */}
        {currentStep === 2 && (
          <Form
            form={form}
            layout="vertical"
            onFinish={handleResetPassword}
            size="large"
          >
            <Form.Item
              name="newPassword"
              label="Mật Khẩu Mới"
              rules={[
                { required: true, message: 'Vui lòng nhập mật khẩu mới' },
                { validator: validatePassword },
              ]}
              help="Mật khẩu phải có ít nhất 8 ký tự, bao gồm chữ hoa, chữ thường, số và ký tự đặc biệt"
            >
              <Input.Password
                prefix={<LockOutlined />}
                placeholder="Nhập mật khẩu mới"
              />
            </Form.Item>

            <Form.Item
              name="confirmPassword"
              label="Xác Nhận Mật Khẩu"
              dependencies={['newPassword']}
              rules={[
                { required: true, message: 'Vui lòng xác nhận mật khẩu' },
                ({ getFieldValue }) => ({
                  validator(_, value) {
                    if (!value || getFieldValue('newPassword') === value) {
                      return Promise.resolve();
                    }
                    return Promise.reject(new Error('Mật khẩu xác nhận không khớp'));
                  },
                }),
              ]}
            >
              <Input.Password
                prefix={<LockOutlined />}
                placeholder="Xác nhận mật khẩu mới"
              />
            </Form.Item>

            <Form.Item>
              <Button type="primary" htmlType="submit" block loading={loading}>
                Đặt Lại Mật Khẩu
              </Button>
            </Form.Item>
          </Form>
        )}
      </div>
    </Modal>
  );
};

export default ForgotPasswordModal;

