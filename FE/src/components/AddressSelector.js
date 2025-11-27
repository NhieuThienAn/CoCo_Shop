/**
 * Address Selector Component
 * Provides cascading selects for Province and Ward based on Vietnamese address data
 */

import React, { useState, useEffect } from 'react';
import { Select, Form, Row, Col, Input, message } from 'antd';
import { EnvironmentOutlined } from '@ant-design/icons';

const { Option } = Select;

const AddressSelector = ({ form, onAddressChange, initialValues = {} }) => {
  const [provinces, setProvinces] = useState([]);
  const [wards, setWards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedProvince, setSelectedProvince] = useState(initialValues.province || null);
  const [selectedWard, setSelectedWard] = useState(initialValues.ward || null);

  useEffect(() => {
    loadAddressData();
  }, []);

  useEffect(() => {
    if (initialValues.province) {
      setSelectedProvince(initialValues.province);
      handleProvinceChange(initialValues.province);
    }
    if (initialValues.ward) {
      setSelectedWard(initialValues.ward);
    }
  }, [initialValues]);

  const loadAddressData = async () => {
    try {
      const response = await fetch('/assets/vn-addresses.json');
      if (!response.ok) {
        throw new Error('Failed to load address data');
      }
      const data = await response.json();
      setProvinces(data);
      setLoading(false);
    } catch (error) {
      console.error('Error loading address data:', error);
      message.error('Không thể tải dữ liệu địa chỉ');
      setLoading(false);
    }
  };

  const handleProvinceChange = (provinceCode) => {
    setSelectedProvince(provinceCode);
    setSelectedWard(null);
    
    // Reset ward field
    if (form) {
      form.setFieldsValue({ ward: undefined });
    }

    // Find province and get its wards
    const province = provinces.find(p => p.Code === provinceCode);
    if (province && province.Wards) {
      setWards(province.Wards);
    } else {
      setWards([]);
    }

    // Trigger address change callback
    if (onAddressChange) {
      const provinceName = province ? province.FullName : '';
      onAddressChange({
        province: provinceCode,
        provinceName,
        ward: null,
        wardName: null,
      });
    }
  };

  const handleWardChange = (wardCode) => {
    setSelectedWard(wardCode);
    
    // Find ward details
    const province = provinces.find(p => p.Code === selectedProvince);
    const ward = province?.Wards?.find(w => w.Code === wardCode);
    
    // Trigger address change callback
    if (onAddressChange) {
      const provinceName = province ? province.FullName : '';
      const wardName = ward ? ward.FullName : '';
      onAddressChange({
        province: selectedProvince,
        provinceName,
        ward: wardCode,
        wardName,
      });
    }
  };

  // Get province name for display
  const getProvinceName = (code) => {
    const province = provinces.find(p => p.Code === code);
    return province ? province.FullName : code;
  };

  // Get ward name for display
  const getWardName = (code) => {
    if (!selectedProvince) return code;
    const province = provinces.find(p => p.Code === selectedProvince);
    const ward = province?.Wards?.find(w => w.Code === code);
    return ward ? ward.FullName : code;
  };

  return (
    <>
      <Row gutter={16}>
        <Col xs={24} sm={12}>
          <Form.Item
            name="province"
            label="Tỉnh/Thành Phố"
            rules={[{ required: true, message: 'Vui lòng chọn tỉnh/thành phố' }]}
          >
            <Select
              placeholder="Chọn tỉnh/thành phố"
              loading={loading}
              showSearch
              filterOption={(input, option) =>
                (option?.children ?? '').toLowerCase().includes(input.toLowerCase())
              }
              onChange={handleProvinceChange}
              value={selectedProvince}
              suffixIcon={<EnvironmentOutlined />}
            >
              {provinces.map((province) => (
                <Option key={province.Code} value={province.Code}>
                  {province.FullName}
                </Option>
              ))}
            </Select>
          </Form.Item>
        </Col>
        <Col xs={24} sm={12}>
          <Form.Item
            name="ward"
            label="Phường/Xã"
            rules={[{ required: true, message: 'Vui lòng chọn phường/xã' }]}
          >
            <Select
              placeholder="Chọn phường/xã"
              disabled={!selectedProvince || wards.length === 0}
              showSearch
              filterOption={(input, option) =>
                (option?.children ?? '').toLowerCase().includes(input.toLowerCase())
              }
              onChange={handleWardChange}
              value={selectedWard}
              suffixIcon={<EnvironmentOutlined />}
            >
              {wards.map((ward) => (
                <Option key={ward.Code} value={ward.Code}>
                  {ward.FullName}
                </Option>
              ))}
            </Select>
          </Form.Item>
        </Col>
      </Row>
      <Row gutter={16}>
        <Col xs={24} sm={12}>
          <Form.Item
            name="district"
            label="Quận/Huyện (Tùy chọn)"
          >
            <Input placeholder="Nhập quận/huyện (nếu có)" />
          </Form.Item>
        </Col>
        <Col xs={24} sm={12}>
          <Form.Item
            name="address_line1"
            label="Số Nhà Tên Đường"
            rules={[{ required: true, message: 'Vui lòng nhập số nhà tên đường' }]}
          >
            <Input placeholder="Số nhà, tên đường, ngõ, ngách..." />
          </Form.Item>
        </Col>
      </Row>
    </>
  );
};

export default AddressSelector;

