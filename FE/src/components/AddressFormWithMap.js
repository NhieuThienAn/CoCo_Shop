/**
 * Address Form with Map Component
 * Combines AddressSelector and AddressMap for complete address input with map confirmation
 * Automatically shows map in Modal after address input is complete
 */

import React, { useState } from 'react';
import { Form, Card, Steps, Button, Space, Divider, Modal, Typography } from 'antd';
import { EnvironmentOutlined, CheckCircleOutlined } from '@ant-design/icons';
import AddressSelector from './AddressSelector';
import AddressMap from './AddressMap';

const { Text: TypographyText } = Typography;

const { Step } = Steps;

const AddressFormWithMap = ({ 
  form, 
  onFinish, 
  onCancel,
  initialValues = {},
  showMap = true,
  showSteps = true
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [addressData, setAddressData] = useState(null);
  const [confirmedAddress, setConfirmedAddress] = useState(null);
  const [mapModalVisible, setMapModalVisible] = useState(false);

  const handleAddressChange = (addressInfo) => {
    const formValues = form.getFieldsValue();
    const mergedData = {
      ...formValues,
      ...addressInfo, // This includes provinceName and wardName from AddressSelector
    };
    setAddressData(mergedData);
  };

  const handleMapConfirm = (confirmed) => {
    setConfirmedAddress(confirmed);
    setMapModalVisible(false);
    setCurrentStep(2);
  };

  const handleMapModalCancel = () => {
    setMapModalVisible(false);
    setCurrentStep(0);
  };

  /**
   * Clean address data - remove fields not needed by backend
   * Backend schema: full_name, phone, address_line1, address_line2, city, district, ward, province, postal_code, country
   * Remove: latitude, longitude, fullAddress, provinceName, wardName, address_id, user_id, is_default_shipping, created_at, updated_at
   */
  const cleanAddressData = (data) => {
    const allowedFields = [
      'full_name',
      'phone',
      'address_line1',
      'address_line2',
      'city',
      'district',
      'ward',
      'province',
      'postal_code',
      'country',
    ];
    
    const cleaned = {};
    allowedFields.forEach(field => {
      if (data[field] !== undefined && data[field] !== null && data[field] !== '') {
        cleaned[field] = data[field];
      }
    });
    
    // Remove any fields not in allowed list
    Object.keys(data).forEach(key => {
      if (!allowedFields.includes(key)) {
        // Field will be excluded
      }
    });
    
    return cleaned;
  };

  const handleFormSubmit = () => {
    if (showMap && !confirmedAddress) {
      // If map is enabled but not confirmed, move to map step
      setCurrentStep(1);
      return;
    }

    form.validateFields().then((values) => {
      const finalAddress = {
        ...values,
        ...(confirmedAddress || {}),
      };
      
      // Clean data before passing to parent
      const cleanedAddress = cleanAddressData(finalAddress);
      
      if (onFinish) {
        onFinish(cleanedAddress);
      }
    });
  };

  const handleNext = async () => {
    form.validateFields(['province', 'ward', 'address_line1', 'full_name', 'phone']).then(async () => {
      const values = form.getFieldsValue();
      
      // CRITICAL FIX: Get province and ward names from JSON data
      // Form only has codes (e.g., "01", "00004"), but geocoding needs names (e.g., "Thành phố Hà Nội", "Phường Ba Đình")
      // If addressData already has names from handleAddressChange, use those; otherwise fetch from JSON
      let provinceName = addressData?.provinceName || null;
      let wardName = addressData?.wardName || null;
      
      // If names are missing, fetch from JSON data
      if (!provinceName || !wardName) {
        try {
          const response = await fetch('/assets/vn-addresses.json');
          if (response.ok) {
            const provincesData = await response.json();
            
            // Find province name
            if (values.province && !provinceName) {
              const province = provincesData.find(p => p.Code === values.province);
              if (province) {
                provinceName = province.FullName;
                
                // Find ward name
                if (values.ward && !wardName && province.Wards) {
                  const ward = province.Wards.find(w => w.Code === values.ward);
                  if (ward) {
                    wardName = ward.FullName;
                  }
                }
              }
            }
          }
        } catch (error) {
          console.error('[AddressFormWithMap] Error loading address data:', error);
        }
      }
      
      // Merge form values with names
      const addressDataWithNames = {
        ...values,
        provinceName: provinceName || null,
        wardName: wardName || null,
      };
      
      setAddressData(addressDataWithNames);
      
      if (showMap) {
        // Automatically open map modal for confirmation
        setMapModalVisible(true);
        setCurrentStep(1);
      } else {
        handleFormSubmit();
      }
    }).catch((errorInfo) => {
      // Validation failed - form will show error messages
    });
  };

  const handleBack = () => {
    setCurrentStep(0);
  };

  const steps = [
    {
      title: 'Nhập Địa Chỉ',
      icon: <EnvironmentOutlined />,
    },
    ...(showMap ? [{
      title: 'Xác Nhận Bản Đồ',
      icon: <CheckCircleOutlined />,
    }] : []),
  ];

  return (
    <div>
      {showSteps && (
        <Card style={{ marginBottom: '24px' }}>
          <Steps current={currentStep} items={steps} />
        </Card>
      )}

      {currentStep === 0 && (
        <Card title="Thông Tin Địa Chỉ">
          <AddressSelector 
            form={form} 
            onAddressChange={handleAddressChange}
            initialValues={initialValues}
          />
          <Divider />
          <Space>
            <Button type="primary" onClick={handleNext} icon={<EnvironmentOutlined />}>
              {showMap ? 'Xác Nhận Trên Bản Đồ' : 'Hoàn Tất'}
            </Button>
            {onCancel && (
              <Button onClick={onCancel}>Hủy</Button>
            )}
          </Space>
          {showMap && (
            <div style={{ marginTop: '12px' }}>
              <TypographyText type="secondary" style={{ fontSize: '12px' }}>
                💡 Sau khi nhập địa chỉ, bạn sẽ được yêu cầu xác nhận vị trí trên bản đồ để đảm bảo địa chỉ chính xác.
              </TypographyText>
            </div>
          )}
        </Card>
      )}

      {/* Map Confirmation Modal - Automatically opens after address input */}
      <Modal
        title={
          <Space>
            <EnvironmentOutlined />
            <span>Xác Nhận Địa Chỉ Trên Bản Đồ</span>
          </Space>
        }
        open={mapModalVisible}
        onCancel={handleMapModalCancel}
        footer={null}
        width={900}
        style={{ top: 20 }}
        destroyOnClose
      >
        <AddressMap
          address={addressData}
          onConfirm={handleMapConfirm}
          onCancel={handleMapModalCancel}
          showConfirmButton={true}
          height="500px"
        />
      </Modal>

      {currentStep === 2 && confirmedAddress && (
        <Card 
          title={
            <Space>
              <CheckCircleOutlined style={{ color: '#52c41a' }} />
              <span>Địa Chỉ Đã Được Xác Nhận</span>
            </Space>
          }
          style={{ marginTop: '24px', border: '1px solid #52c41a' }}
        >
          <div style={{ marginBottom: '16px' }}>
            <TypographyText strong>Địa chỉ đã được xác nhận trên bản đồ:</TypographyText>
            <div style={{ marginTop: '8px', padding: '12px', background: '#f6ffed', borderRadius: '4px' }}>
              <TypographyText>{confirmedAddress.fullAddress || addressData?.address_line1}</TypographyText>
            </div>
          </div>
          <Space>
            <Button onClick={() => {
              setMapModalVisible(true);
              setCurrentStep(1);
            }}>
              Xem Lại Bản Đồ
            </Button>
            <Button onClick={() => {
              setCurrentStep(0);
              setConfirmedAddress(null);
            }}>
              Sửa Địa Chỉ
            </Button>
            <Button type="primary" onClick={handleFormSubmit}>
              Hoàn Tất
            </Button>
          </Space>
        </Card>
      )}
    </div>
  );
};

export default AddressFormWithMap;

