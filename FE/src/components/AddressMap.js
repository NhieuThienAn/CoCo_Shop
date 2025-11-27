/**
 * Address Map Component
 * Displays address on map for user confirmation using Google Maps (Simple Embed API)
 */

import React, { useEffect, useState, useRef } from 'react';
import { Button, Space, Typography, Spin, message, Alert } from 'antd';
import { CheckOutlined, ReloadOutlined, EnvironmentOutlined } from '@ant-design/icons';

const { Text: TypographyText } = Typography;

const AddressMap = ({ 
  address, 
  onConfirm, 
  onCancel,
  height = '400px',
  showConfirmButton = true 
}) => {
  const [loading, setLoading] = useState(false);
  const [fullAddress, setFullAddress] = useState('');
  const [mapUrl, setMapUrl] = useState('');
  const [coordinates, setCoordinates] = useState(null);
  const mapContainerRef = useRef(null);

  useEffect(() => {
    if (address) {
      geocodeAddress(address);
    }
  }, [address]);

  const geocodeAddress = async (addr) => {
    setLoading(true);
    try {
      // Build full address string
      const addressParts = [
        addr.address_line1,
        addr.address_line2,
        addr.wardName || addr.ward,
        addr.district,
        addr.provinceName || addr.province,
        'Vietnam'
      ].filter(Boolean);
      
      const fullAddr = addressParts.join(', ');
      setFullAddress(fullAddr);

      // Use simple Google Maps URL - no API key needed
      // This uses Google Maps search URL which is free and doesn't require API key
      const encodedAddress = encodeURIComponent(fullAddr);
      
      // Simple Google Maps iframe URL (works without API key)
      // Format: https://www.google.com/maps?q=ADDRESS&output=embed
      const simpleMapUrl = `https://www.google.com/maps?q=${encodedAddress}&output=embed`;
      
      // Try to get coordinates for better accuracy (optional)
      try {
        const geocodeResponse = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodedAddress}&limit=1&countrycodes=vn`,
          {
            headers: {
              'User-Agent': 'CoCoo-Cosmetics/1.0'
            }
          }
        );

        if (geocodeResponse.ok) {
          const geocodeData = await geocodeResponse.json();
          if (geocodeData && geocodeData.length > 0) {
            const { lat, lon } = geocodeData[0];
            setCoordinates({ lat: parseFloat(lat), lng: parseFloat(lon) });
            // Use coordinates for more accurate map (also works without API key)
            const coordMapUrl = `https://www.google.com/maps?q=${lat},${lon}&output=embed`;
            setMapUrl(coordMapUrl);
          } else {
            // Fallback to address search
            setMapUrl(simpleMapUrl);
          }
        } else {
          setMapUrl(simpleMapUrl);
        }
      } catch (geocodeError) {
        console.warn('Geocoding error, using address search:', geocodeError);
        setMapUrl(simpleMapUrl);
      }
    } catch (error) {
      console.error('Error setting up map:', error);
      message.error('Không thể tải bản đồ. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = () => {
    if (onConfirm) {
      onConfirm({
        ...address,
        latitude: coordinates?.lat || null,
        longitude: coordinates?.lng || null,
        fullAddress,
      });
    }
  };

  const handleRetry = () => {
    if (address) {
      geocodeAddress(address);
    }
  };

  return (
    <div>
      {fullAddress && (
        <Alert
          message={
            <Space>
              <EnvironmentOutlined />
              <TypographyText strong>Địa chỉ: {fullAddress}</TypographyText>
            </Space>
          }
          type="info"
          style={{ marginBottom: '16px' }}
          showIcon
        />
      )}
      
      <div style={{ marginBottom: '16px', textAlign: 'right' }}>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={handleRetry} loading={loading}>
            Tìm Lại
          </Button>
          {showConfirmButton && (
            <Button 
              type="primary" 
              size="large"
              icon={<CheckOutlined />} 
              onClick={handleConfirm}
              disabled={loading || !mapUrl}
            >
              Xác Nhận Địa Chỉ Này
            </Button>
          )}
        </Space>
      </div>
      
      {loading ? (
        <div style={{ textAlign: 'center', padding: '50px' }}>
          <Spin size="large" />
          <div style={{ marginTop: '16px' }}>
            <TypographyText>Đang tải bản đồ...</TypographyText>
          </div>
        </div>
      ) : mapUrl ? (
        <div style={{ height, width: '100%', position: 'relative', border: '1px solid #d9d9d9', borderRadius: '4px', overflow: 'hidden' }}>
          <iframe
            ref={mapContainerRef}
            width="100%"
            height="100%"
            style={{ border: 0 }}
            loading="lazy"
            allowFullScreen
            referrerPolicy="no-referrer-when-downgrade"
            src={mapUrl}
            title="Google Maps - Địa chỉ"
          />
        </div>
      ) : (
        <div style={{ textAlign: 'center', padding: '50px', border: '1px solid #d9d9d9', borderRadius: '4px' }}>
          <TypographyText type="secondary">Không thể tải bản đồ. Vui lòng thử lại.</TypographyText>
        </div>
      )}
      
      <Alert
        message="Hướng dẫn"
        description={
          <TypographyText type="secondary" style={{ fontSize: '12px' }}>
            Bản đồ hiển thị vị trí ước tính của địa chỉ bạn đã nhập. 
            Bạn có thể xem và phóng to/thu nhỏ bản đồ để xác nhận vị trí chính xác, 
            sau đó click "Xác Nhận Địa Chỉ Này" để hoàn tất.
          </TypographyText>
        }
        type="info"
        showIcon
        style={{ marginTop: '16px' }}
      />
    </div>
  );
};

export default AddressMap;

