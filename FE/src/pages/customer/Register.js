import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Result, Button } from 'antd';
import { HomeOutlined } from '@ant-design/icons';

const Register = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Redirect to home and open register modal
    navigate('/', { replace: true });
    // Trigger openRegisterOTPModal event after a short delay to ensure navigation completes
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent('openRegisterOTPModal'));
    }, 100);
  }, [navigate]);

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
      <Result
        icon={<HomeOutlined style={{ color: '#1890ff' }} />}
        title="Đang chuyển hướng..."
        subTitle="Bạn sẽ được chuyển đến trang chủ và mở form đăng ký"
        extra={
          <Button type="primary" onClick={() => navigate('/')}>
            Về Trang Chủ
          </Button>
        }
      />
    </div>
  );
};

export default Register;
