/**
 * Stock Receipt Detail Page
 * Displays comprehensive information about a stock receipt
 */

import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Card,
  Table,
  Tag,
  Button,
  Space,
  Typography,
  Descriptions,
  Spin,
  message,
  Row,
  Col,
  Image,
  Divider,
  Popconfirm,
  Modal,
  Input,
} from 'antd';
import {
  ArrowLeftOutlined,
  CheckOutlined,
  CloseOutlined,
  DeleteOutlined,
  PrinterOutlined,
} from '@ant-design/icons';
import { support, product as productAPI, user as userAPI } from '../../api/index.js';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { TextArea } = Input;

const StockReceiptDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [receiptData, setReceiptData] = useState(null);
  const [items, setItems] = useState([]);
  const [products, setProducts] = useState({}); // Cache product details
  const [createdByUser, setCreatedByUser] = useState(null);
  const [approvedByUser, setApprovedByUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    loadReceiptDetail();
  }, [id]);

  const loadReceiptDetail = async () => {
    setLoading(true);
    try {
      const response = await support.getStockReceiptById(id);
      
      if (response.success && response.data) {
        const receipt = response.data;
        setReceiptData(receipt);

        // Parse items
        let parsedItems = [];
        try {
          parsedItems = typeof receipt.items === 'string' 
            ? JSON.parse(receipt.items) 
            : receipt.items;
          if (!Array.isArray(parsedItems)) {
            parsedItems = [];
          }
        } catch (e) {
          console.error('Error parsing items:', e);
          parsedItems = [];
        }
        setItems(parsedItems);

        // Load product details for items
        await loadProductDetails(parsedItems);

        // Load user information
        if (receipt.created_by) {
          loadUserInfo(receipt.created_by, setCreatedByUser);
        }
        if (receipt.approved_by) {
          loadUserInfo(receipt.approved_by, setApprovedByUser);
        }
      } else {
        message.error(response.message || 'Không tìm thấy phiếu nhập kho');
        navigate('/admin/warehouse?tab=stock-receipts');
      }
    } catch (error) {
      console.error('Error loading stock receipt detail:', error);
      message.error(error.message || 'Có lỗi xảy ra khi tải phiếu nhập kho');
      navigate('/admin/warehouse?tab=stock-receipts');
    } finally {
      setLoading(false);
    }
  };

  const loadProductDetails = async (items) => {
    const productIds = items.map(item => item.product_id).filter(Boolean);
    const productMap = {};
    
    // Load product details in parallel
    await Promise.all(
      productIds.map(async (productId) => {
        try {
          const productResponse = await productAPI.getProductById(productId);
          if (productResponse.success && productResponse.data) {
            productMap[productId] = productResponse.data;
          }
        } catch (error) {
          console.warn(`Failed to load product ${productId}:`, error);
        }
      })
    );
    
    setProducts(productMap);
  };

  const loadUserInfo = async (userId, setter) => {
    try {
      const userResponse = await userAPI.getUserById(userId);
      if (userResponse.success && userResponse.data) {
        setter(userResponse.data);
      }
    } catch (error) {
      console.warn(`Failed to load user ${userId}:`, error);
    }
  };

  const handleApprove = async () => {
    setActionLoading(true);
    try {
      const response = await support.approveStockReceipt(id);
      if (response.success) {
        message.success('Duyệt phiếu nhập kho thành công. Đã cập nhật tồn kho.');
        loadReceiptDetail(); // Reload to get updated status
      } else {
        message.error(response.message || 'Có lỗi xảy ra khi duyệt phiếu nhập kho');
      }
    } catch (error) {
      message.error(error.message || 'Có lỗi xảy ra khi duyệt phiếu nhập kho');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = () => {
    Modal.confirm({
      title: 'Từ chối phiếu nhập kho',
      content: (
        <TextArea
          placeholder="Nhập lý do từ chối"
          rows={4}
          id="rejection-reason-input"
        />
      ),
      onOk: async () => {
        const reason = document.getElementById('rejection-reason-input')?.value || '';
        if (!reason.trim()) {
          message.error('Vui lòng nhập lý do từ chối');
          return;
        }
        setActionLoading(true);
        try {
          const response = await support.rejectStockReceipt(id, reason);
          if (response.success) {
            message.success('Từ chối phiếu nhập kho thành công');
            loadReceiptDetail(); // Reload to get updated status
          } else {
            message.error(response.message || 'Có lỗi xảy ra khi từ chối');
          }
        } catch (error) {
          message.error(error.message || 'Có lỗi xảy ra khi từ chối');
        } finally {
          setActionLoading(false);
        }
      },
    });
  };

  const handleDelete = async () => {
    setActionLoading(true);
    try {
      const response = await support.deleteStockReceipt(id);
      if (response.success) {
        message.success('Xóa phiếu nhập kho thành công');
        navigate('/admin/warehouse?tab=stock-receipts');
      } else {
        message.error(response.message || 'Có lỗi xảy ra khi xóa');
      }
    } catch (error) {
      message.error(error.message || 'Có lỗi xảy ra khi xóa');
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusTag = (status) => {
    const statusMap = {
      pending: { color: 'warning', text: 'Chờ Xác Nhận' },
      approved: { color: 'success', text: 'Đã Duyệt' },
      rejected: { color: 'error', text: 'Đã Từ Chối' },
    };
    const statusInfo = statusMap[status?.toLowerCase()] || { color: 'default', text: status };
    return <Tag color={statusInfo.color}>{statusInfo.text}</Tag>;
  };

  const parseNotes = (notes) => {
    if (!notes) return null;
    try {
      return typeof notes === 'string' ? JSON.parse(notes) : notes;
    } catch (e) {
      return { notes: notes };
    }
  };

  const getProductImage = (product) => {
    if (!product) return '/placeholder.jpg';
    
    if (product.primary_image) {
      return product.primary_image;
    }
    
    if (product.images) {
      try {
        const images = typeof product.images === 'string' 
          ? JSON.parse(product.images) 
          : product.images;
        
        if (Array.isArray(images) && images.length > 0) {
          const primaryImg = images.find(img => img.is_primary === true || img.is_primary === 1) || images[0];
          return primaryImg?.url || primaryImg?.image_url || primaryImg || '/placeholder.jpg';
        }
      } catch (e) {
        // Ignore parse errors
      }
    }
    
    return '/placeholder.jpg';
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '100px' }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!receiptData) {
    return null;
  }

  const notesData = parseNotes(receiptData.notes);
  const additionalInfo = notesData?.additional_info || {};
  const totalValue = items.reduce((sum, item) => sum + (item.total_price || 0), 0);

  const itemColumns = [
    {
      title: 'Ảnh',
      key: 'image',
      width: 80,
      render: (_, record) => {
        const productData = products[record.product_id];
        return (
          <Image
            src={getProductImage(productData)}
            alt={productData?.name || 'Product'}
            width={60}
            height={60}
            style={{ objectFit: 'cover', borderRadius: '4px' }}
            preview={false}
            fallback="/placeholder.jpg"
          />
        );
      },
    },
    {
      title: 'Sản Phẩm',
      key: 'product_name',
      render: (_, record) => {
        const productData = products[record.product_id];
        return (
          <div>
            <div style={{ fontWeight: 'bold' }}>
              {productData?.name || `Product ID: ${record.product_id}`}
            </div>
            {productData?.sku && (
              <div style={{ fontSize: '12px', color: '#666' }}>
                SKU: {productData.sku}
              </div>
            )}
          </div>
        );
      },
    },
    {
      title: 'Số Lượng',
      dataIndex: 'quantity',
      key: 'quantity',
      width: 100,
      align: 'center',
      render: (quantity) => new Intl.NumberFormat('vi-VN').format(quantity || 0),
    },
    {
      title: 'Đơn Giá',
      dataIndex: 'unit_price',
      key: 'unit_price',
      width: 150,
      align: 'right',
      render: (price) => 
        price ? new Intl.NumberFormat('vi-VN').format(price) + ' đ' : '0 đ',
    },
    {
      title: 'Thành Tiền',
      dataIndex: 'total_price',
      key: 'total_price',
      width: 150,
      align: 'right',
      render: (total) => 
        total ? new Intl.NumberFormat('vi-VN').format(total) + ' đ' : '0 đ',
    },
  ];

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: '24px' }}>
        <Space>
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/admin/warehouse?tab=stock-receipts')}>
            Quay Lại
          </Button>
          <Title level={2} style={{ margin: 0 }}>
            Chi Tiết Phiếu Nhập Kho
          </Title>
        </Space>
      </div>

      {/* Action Buttons */}
      {receiptData.status === 'pending' && (
        <Card style={{ marginBottom: '24px' }}>
          <Space>
            <Popconfirm
              title="Bạn có chắc muốn duyệt phiếu này? Tồn kho sẽ được cập nhật."
              onConfirm={handleApprove}
              okText="Duyệt"
              cancelText="Hủy"
            >
              <Button 
                type="primary" 
                icon={<CheckOutlined />} 
                loading={actionLoading}
                style={{ backgroundColor: '#52c41a', borderColor: '#52c41a' }}
              >
                Duyệt Phiếu
              </Button>
            </Popconfirm>
            <Button 
              danger 
              icon={<CloseOutlined />} 
              onClick={handleReject}
              loading={actionLoading}
            >
              Từ Chối
            </Button>
            <Popconfirm
              title="Bạn có chắc muốn xóa phiếu này?"
              onConfirm={handleDelete}
              okText="Xóa"
              cancelText="Hủy"
            >
              <Button 
                danger 
                icon={<DeleteOutlined />} 
                loading={actionLoading}
              >
                Xóa
              </Button>
            </Popconfirm>
          </Space>
        </Card>
      )}

      {/* Receipt Information */}
      <Row gutter={16}>
        <Col xs={24} lg={16}>
          <Card title="Thông Tin Phiếu Nhập Kho" style={{ marginBottom: '24px' }}>
            <Descriptions column={1} bordered>
              <Descriptions.Item label="Mã Phiếu">
                <Text strong>{receiptData.receipt_number}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="Trạng Thái">
                {getStatusTag(receiptData.status)}
              </Descriptions.Item>
              {additionalInfo.receipt_date && (
                <Descriptions.Item label="Ngày Nhập">
                  {dayjs(additionalInfo.receipt_date).format('DD/MM/YYYY')}
                </Descriptions.Item>
              )}
              {additionalInfo.expected_date && (
                <Descriptions.Item label="Ngày Dự Kiến">
                  {dayjs(additionalInfo.expected_date).format('DD/MM/YYYY')}
                </Descriptions.Item>
              )}
              {additionalInfo.warehouse && (
                <Descriptions.Item label="Kho">
                  {additionalInfo.warehouse}
                </Descriptions.Item>
              )}
              {additionalInfo.receipt_reason && (
                <Descriptions.Item label="Lý Do Nhập">
                  {additionalInfo.receipt_reason}
                </Descriptions.Item>
              )}
              {additionalInfo.delivery_method && (
                <Descriptions.Item label="Phương Thức Giao Hàng">
                  {additionalInfo.delivery_method}
                </Descriptions.Item>
              )}
              <Descriptions.Item label="Ngày Tạo">
                {receiptData.created_at 
                  ? dayjs(receiptData.created_at).format('DD/MM/YYYY HH:mm:ss')
                  : 'N/A'}
              </Descriptions.Item>
              {receiptData.approved_at && (
                <Descriptions.Item label="Ngày Duyệt">
                  {dayjs(receiptData.approved_at).format('DD/MM/YYYY HH:mm:ss')}
                </Descriptions.Item>
              )}
            </Descriptions>
          </Card>

          {/* Items Table */}
          <Card title={`Danh Sách Sản Phẩm (${items.length} sản phẩm)`}>
            <Table
              columns={itemColumns}
              dataSource={items}
              rowKey={(record, index) => `${record.product_id}-${index}`}
              pagination={false}
              locale={{ emptyText: 'Không có sản phẩm nào' }}
            />
            <Divider />
            <div style={{ textAlign: 'right', fontSize: '16px', fontWeight: 'bold' }}>
              <Text>Tổng Giá Trị: </Text>
              <Text style={{ color: '#1890ff', fontSize: '18px' }}>
                {new Intl.NumberFormat('vi-VN').format(totalValue)} đ
              </Text>
            </div>
          </Card>
        </Col>

        <Col xs={24} lg={8}>
          {/* Supplier Information */}
          {(additionalInfo.supplier_name || additionalInfo.supplier_contact) && (
            <Card title="Thông Tin Nhà Cung Cấp" style={{ marginBottom: '24px' }}>
              <Descriptions column={1} bordered>
                {additionalInfo.supplier_name && (
                  <Descriptions.Item label="Tên Nhà Cung Cấp">
                    {additionalInfo.supplier_name}
                  </Descriptions.Item>
                )}
                {additionalInfo.supplier_contact && (
                  <Descriptions.Item label="Liên Hệ">
                    {additionalInfo.supplier_contact}
                  </Descriptions.Item>
                )}
              </Descriptions>
            </Card>
          )}

          {/* Receiver Information */}
          {(additionalInfo.receiver_name || additionalInfo.receiver_phone) && (
            <Card title="Thông Tin Người Nhận" style={{ marginBottom: '24px' }}>
              <Descriptions column={1} bordered>
                {additionalInfo.receiver_name && (
                  <Descriptions.Item label="Tên Người Nhận">
                    {additionalInfo.receiver_name}
                  </Descriptions.Item>
                )}
                {additionalInfo.receiver_phone && (
                  <Descriptions.Item label="Số Điện Thoại">
                    {additionalInfo.receiver_phone}
                  </Descriptions.Item>
                )}
              </Descriptions>
            </Card>
          )}

          {/* User Information */}
          <Card title="Thông Tin Người Dùng" style={{ marginBottom: '24px' }}>
            <Descriptions column={1} bordered>
              {createdByUser && (
                <Descriptions.Item label="Người Tạo">
                  {createdByUser.full_name || createdByUser.email || `User ID: ${receiptData.created_by}`}
                </Descriptions.Item>
              )}
              {approvedByUser && (
                <Descriptions.Item label="Người Duyệt">
                  {approvedByUser.full_name || approvedByUser.email || `User ID: ${receiptData.approved_by}`}
                </Descriptions.Item>
              )}
            </Descriptions>
          </Card>

          {/* Notes */}
          {notesData?.notes && (
            <Card title="Ghi Chú">
              <Text>{notesData.notes}</Text>
            </Card>
          )}

          {/* Rejection Reason */}
          {receiptData.rejection_reason && (
            <Card title="Lý Do Từ Chối" style={{ marginTop: '24px' }}>
              <Text type="danger">{receiptData.rejection_reason}</Text>
            </Card>
          )}
        </Col>
      </Row>
    </div>
  );
};

export default StockReceiptDetail;

