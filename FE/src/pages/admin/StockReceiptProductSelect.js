/**
 * Stock Receipt - Step 1: Product Selection Page
 * This page allows admin to select products for stock receipt
 */

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card,
  Row,
  Col,
  Checkbox,
  Button,
  Input,
  Typography,
  Space,
  message,
  Spin,
  Pagination,
  Image,
} from 'antd';
import { ArrowLeftOutlined, ArrowRightOutlined, SearchOutlined } from '@ant-design/icons';
import { product } from '../../api/index.js';

const { Title } = Typography;
const { Search } = Input;

// Helper function to get product image URL
const getProductImage = (product) => {
  let imageUrl = null;
  
  // Try primary_image first
  if (product.primary_image) {
    imageUrl = product.primary_image;
  }
  
  // Try images array
  if (!imageUrl && product.images) {
    try {
      const images = typeof product.images === 'string' 
        ? JSON.parse(product.images) 
        : product.images;
      
      if (Array.isArray(images) && images.length > 0) {
        const primaryImg = images.find(img => img.is_primary === true || img.is_primary === 1) || images[0];
        imageUrl = primaryImg?.url || primaryImg?.image_url || primaryImg;
        
        if (typeof imageUrl === 'object' && imageUrl !== null) {
          imageUrl = imageUrl.url || imageUrl.image_url || null;
        }
      }
    } catch (e) {
      // Ignore parse errors
    }
  }
  
  return imageUrl || '/placeholder.jpg';
};

const StockReceiptProductSelect = () => {
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0 });


  useEffect(() => {
    loadProducts();
  }, [pagination.page, searchTerm]);

  const loadProducts = async () => {
    setLoading(true);
    try {
      const response = await product.getProducts(
        pagination.page,
        pagination.limit,
        { includeDeleted: true, includeInactive: true }
      );
      
      if (response.success) {
        let productsData = response.data || [];
        
        // Filter by search term if provided
        if (searchTerm) {
          const term = searchTerm.toLowerCase();
          productsData = productsData.filter(p => 
            p.name?.toLowerCase().includes(term) ||
            p.sku?.toLowerCase().includes(term) ||
            p.barcode?.toLowerCase().includes(term)
          );
        }
        
        setProducts(productsData);
        setPagination(prev => ({
          ...prev,
          total: response.pagination?.total || productsData.length,
        }));
      } else {
        message.error('Có lỗi xảy ra khi tải danh sách sản phẩm');
      }
    } catch (error) {
      console.error('[StockReceiptProductSelect] ❌ Error loading products:', error);
      message.error('Có lỗi xảy ra khi tải danh sách sản phẩm');
    } finally {
      setLoading(false);
    }
  };

  const handleProductToggle = (productId, checked) => {
    if (checked) {
      const product = products.find(p => (p.id || p.product_id) === productId);
      if (product) {
        setSelectedProducts(prev => [...prev, {
          product_id: product.id || product.product_id,
          product_name: product.name,
          sku: product.sku,
          current_stock: product.stock_quantity || 0,
          quantity: 1,
          unit_price: product.price || 0,
          image_url: getProductImage(product),
        }]);
      }
    } else {
      setSelectedProducts(prev => prev.filter(p => p.product_id !== productId));
    }
  };


  const handleNext = () => {
    if (selectedProducts.length === 0) {
      message.warning('Vui lòng chọn ít nhất một sản phẩm');
      return;
    }

    // Store selected products in sessionStorage to pass to next page
    sessionStorage.setItem('stockReceiptSelectedProducts', JSON.stringify(selectedProducts));
    
    // Navigate to form page
    navigate('/admin/warehouse/stock-receipts/create');
  };

  const handleCancel = () => {
    sessionStorage.removeItem('stockReceiptSelectedProducts');
    navigate('/admin/warehouse?tab=stock-receipts');
  };

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: '24px' }}>
        <Space>
          <Button icon={<ArrowLeftOutlined />} onClick={handleCancel}>
            Quay Lại
          </Button>
          <Title level={2} style={{ margin: 0 }}>Chọn Sản Phẩm Nhập Kho - Bước 1/2</Title>
        </Space>
      </div>

      <Card style={{ marginBottom: '24px' }}>
        <Space direction="vertical" style={{ width: '100%' }}>
          <div>
            <strong>Đã chọn: {selectedProducts.length} sản phẩm</strong>
          </div>
          <Search
            placeholder="Tìm kiếm sản phẩm (tên, SKU, mã vạch)"
            allowClear
            enterButton={<SearchOutlined />}
            size="large"
            onSearch={(value) => {
              setSearchTerm(value);
              setPagination(prev => ({ ...prev, page: 1 }));
            }}
            onChange={(e) => {
              if (!e.target.value) {
                setSearchTerm('');
                setPagination(prev => ({ ...prev, page: 1 }));
              }
            }}
          />
        </Space>
      </Card>

      {selectedProducts.length > 0 && (
        <Card 
          title="Sản Phẩm Đã Chọn" 
          style={{ marginBottom: '24px' }}
          extra={
            <Button type="primary" icon={<ArrowRightOutlined />} onClick={handleNext}>
              Tiếp Theo ({selectedProducts.length} sản phẩm)
            </Button>
          }
        >
          <div style={{ 
            display: 'flex', 
            flexWrap: 'wrap', 
            gap: '16px',
            overflowX: 'auto',
            paddingBottom: '8px'
          }}>
            {selectedProducts.map((item) => (
              <Card 
                key={item.product_id}
                size="small"
                style={{ 
                  width: '200px',
                  flexShrink: 0,
                  border: '1px solid #d9d9d9',
                  borderRadius: '8px'
                }}
                bodyStyle={{ padding: '12px' }}
              >
                <div style={{ 
                  height: '120px', 
                  overflow: 'hidden', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  backgroundColor: '#f5f5f5',
                  borderRadius: '4px',
                  marginBottom: '12px'
                }}>
                  <Image
                    src={item.image_url || '/placeholder.jpg'}
                    alt={item.product_name}
                    preview={false}
                    style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                    fallback="/placeholder.jpg"
                  />
                </div>
                <div style={{ marginBottom: '8px' }}>
                  <strong style={{ fontSize: '13px', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {item.product_name}
                  </strong>
                </div>
                <div style={{ fontSize: '11px', color: '#666', marginBottom: '8px' }}>
                  <div>SKU: {item.sku}</div>
                  <div>Tồn kho: {item.current_stock}</div>
                </div>
                <div style={{ fontSize: '11px', color: '#999', fontStyle: 'italic' }}>
                  Số lượng sẽ được nhập ở bước tiếp theo
                </div>
              </Card>
            ))}
          </div>
        </Card>
      )}

      <Card title="Danh Sách Sản Phẩm">
        {loading ? (
          <div style={{ textAlign: 'center', padding: '50px' }}>
            <Spin size="large" />
          </div>
        ) : (
          <>
            <div style={{ 
              display: 'flex', 
              flexWrap: 'wrap', 
              gap: '16px',
              justifyContent: 'flex-start'
            }}>
              {products.map((prod) => {
                const productId = prod.id || prod.product_id;
                const isSelected = selectedProducts.some(p => p.product_id === productId);
                return (
                  <Card
                    key={productId}
                    size="small"
                    hoverable
                    style={{
                      width: '180px',
                      border: isSelected ? '2px solid #1890ff' : '1px solid #d9d9d9',
                      backgroundColor: isSelected ? '#e6f7ff' : 'white',
                      borderRadius: '8px',
                      transition: 'all 0.3s',
                    }}
                    bodyStyle={{ padding: '12px' }}
                  >
                    <div style={{ 
                      height: '100px', 
                      overflow: 'hidden', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center', 
                      backgroundColor: '#f5f5f5',
                      borderRadius: '4px',
                      marginBottom: '12px'
                    }}>
                      <Image
                        src={getProductImage(prod)}
                        alt={prod.name}
                        preview={{
                          mask: 'Xem ảnh lớn',
                        }}
                        style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                        fallback="/placeholder.jpg"
                      />
                    </div>
                    <Checkbox
                      checked={isSelected}
                      onChange={(e) => handleProductToggle(productId, e.target.checked)}
                      style={{ width: '100%' }}
                    >
                      <div style={{ marginTop: '8px' }}>
                        <div style={{ 
                          fontWeight: 'bold', 
                          marginBottom: '4px', 
                          fontSize: '13px',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}>
                          {prod.name}
                        </div>
                        <div style={{ fontSize: '11px', color: '#666', marginBottom: '2px' }}>
                          SKU: {prod.sku || 'N/A'}
                        </div>
                        <div style={{ fontSize: '11px', color: '#666', marginBottom: '4px' }}>
                          Tồn: {prod.stock_quantity || 0}
                        </div>
                        {prod.price && (
                          <div style={{ fontSize: '12px', color: '#1890ff', fontWeight: 'bold' }}>
                            {new Intl.NumberFormat('vi-VN').format(prod.price)} đ
                          </div>
                        )}
                      </div>
                    </Checkbox>
                  </Card>
                );
              })}
            </div>
            {products.length === 0 && (
              <div style={{ textAlign: 'center', padding: '50px', color: '#999' }}>
                Không tìm thấy sản phẩm nào
              </div>
            )}
            <div style={{ marginTop: '24px', textAlign: 'center' }}>
              <Pagination
                current={pagination.page}
                pageSize={pagination.limit}
                total={pagination.total}
                showSizeChanger
                showTotal={(total) => `Tổng ${total} sản phẩm`}
                onChange={(page, pageSize) => {
                  setPagination(prev => ({ ...prev, page, limit: pageSize }));
                }}
              />
            </div>
          </>
        )}
      </Card>

      {selectedProducts.length > 0 && (
        <div style={{ position: 'fixed', bottom: '24px', right: '24px' }}>
          <Button type="primary" size="large" icon={<ArrowRightOutlined />} onClick={handleNext}>
            Tiếp Theo ({selectedProducts.length} sản phẩm)
          </Button>
        </div>
      )}
    </div>
  );
};

export default StockReceiptProductSelect;

