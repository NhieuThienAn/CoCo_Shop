import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Result, Button, message } from 'antd';
import { HomeOutlined } from '@ant-design/icons';

const VerifyEmail = () => {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Get email from location state or query params
    const email = location.state?.email || new URLSearchParams(location.search).get('email') || '';
    
    if (email) {
      // Redirect to home and open register OTP modal with email
      navigate('/', { replace: true });
      // Trigger openRegisterOTPModal event after a short delay
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('openRegisterOTPModal', { detail: { email } }));
      }, 100);
    } else {
      // No email found, redirect to home
      message.warning('Không tìm thấy email. Vui lòng đăng ký lại.');
      navigate('/', { replace: true });
    }
  }, [location, navigate]);

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
      <Result
        icon={<HomeOutlined style={{ color: '#1890ff' }} />}
        title="Đang chuyển hướng..."
        subTitle="Bạn sẽ được chuyển đến trang chủ và mở form xác thực OTP"
        extra={
          <Button type="primary" onClick={() => navigate('/')}>
            Về Trang Chủ
          </Button>
        }
      />
    </div>
  );
};

export default VerifyEmail;

