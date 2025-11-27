import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Table,
  Button,
  Card,
  Typography,
  Tag,
  Space,
  message,
  Alert,
  Spin,
  InputNumber,
  Popconfirm,
} from 'antd';
import {
  PlusOutlined,
  ReloadOutlined,
  ShoppingCartOutlined,
  InboxOutlined,
} from '@ant-design/icons';
import { order, support } from '../../api/index.js';
import { formatCurrency } from '../../utils/numberFormatter.js';

const { Title, Text } = Typography;

const PendingOrderProducts = () => {
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedProducts, setSelectedProducts] = useState({}); // { product_id: quantity }
  const [creatingReceipt, setCreatingReceipt] = useState(false);
  const [summary, setSummary] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const response = await order.getPendingOrderProductsSummary();
      if (response.success) {
        setProducts(response.data || []);
        setSummary({
          total_products: response.total_products || 0,
          total_pending_orders: response.total_pending_orders || 0,
        });
      } else {
        message.error(response.message || 'Lỗi khi tải dữ liệu');
      }
    } catch (error) {
      console.error('Error loading pending order products:', error);
      message.error('Lỗi khi tải dữ liệu');
    } finally {
      setLoading(false);
    }
  };

  const handleQuantityChange = (productId, quantity) => {
    setSelectedProducts((prev) => ({
      ...prev,
      [productId]: quantity || 0,
    }));
  };

  const handleSelectAll = () => {
    const allSelected = {};
    products.forEach((product) => {
      allSelected[product.product_id] = product.total_quantity_needed;
    });
    setSelectedProducts(allSelected);
  };

  const handleClearSelection = () => {
    setSelectedProducts({});
  };

  const handleCreateStockReceipt = async () => {
    // Map selected products to items with all required fields
    const selectedItems = Object.entries(selectedProducts)
      .filter(([_, quantity]) => quantity > 0)
      .map(([productId, quantity]) => {
        // Find product data to get price
        const product = products.find(p => p.product_id === parseInt(productId));
        const productIdNum = parseInt(productId);
        const quantityNum = parseInt(quantity) || 1;
        const unitPrice = product?.price ? parseFloat(product.price) : 0;
        
        return {
          product_id: productIdNum,
          quantity: quantityNum,
          unit_price: unitPrice,
        };
      });

    if (selectedItems.length === 0) {
      message.warning('Vui lòng chọn ít nhất một sản phẩm để tạo phiếu nhập kho');
      return;
    }

    setCreatingReceipt(true);
    try {
      // Calculate total value
      const totalValue = selectedItems.reduce((sum, item) => {
        return sum + (item.quantity * (item.unit_price || 0));
      }, 0);

      // Auto-generate receipt number (same format as StockReceiptForm)
      // Format: SR-YYYYMMDD-HHmmss
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      const seconds = String(now.getSeconds()).padStart(2, '0');
      const receiptNumber = `SR-${year}${month}${day}-${hours}${minutes}${seconds}`;

      // Get current date for receipt_date (format: YYYY-MM-DD)
      const receiptDate = `${year}-${month}-${day}`;

      // Tạo phiếu nhập kho với đầy đủ các trường giống như tạo thủ công
      // Backend expects all fields that StockReceiptForm sends
      const receiptData = {
        receipt_number: receiptNumber,
        receipt_date: receiptDate, // Ngày nhập = ngày hiện tại
        expected_date: null, // Không có ngày dự kiến khi tự động tạo
        warehouse: null, // Có thể để null hoặc set mặc định
        receiver_name: null, // Có thể để null
        receiver_phone: null, // Có thể để null
        receipt_reason: 'Tự động tạo từ thống kê đơn hàng chờ xác nhận', // Lý do nhập
        delivery_method: null, // Có thể để null
        supplier_name: null, // Có thể để null
        supplier_contact: null, // Có thể để null
        total_value: totalValue,
        items: selectedItems, // Send as array, backend will stringify
        notes: `Tự động tạo từ thống kê đơn hàng chờ xác nhận. Tổng ${selectedItems.length} sản phẩm, tổng giá trị: ${totalValue.toLocaleString('vi-VN')} đ.`,
      };

      console.log('[PendingOrderProducts] 📦 Creating stock receipt with full data:', {
        receipt_number: receiptData.receipt_number,
        receipt_date: receiptData.receipt_date,
        itemsCount: selectedItems.length,
        items: selectedItems,
        totalValue,
        receipt_reason: receiptData.receipt_reason,
      });

      const response = await support.createStockReceipt(receiptData);
      
      if (response.success) {
        message.success('Tạo phiếu nhập kho thành công!');
        // Chuyển đến trang chi tiết phiếu nhập kho
        navigate(`/admin/warehouse/stock-receipts/${response.data.receipt_id}`);
        // Reset selection
        setSelectedProducts({});
      } else {
        message.error(response.message || 'Lỗi khi tạo phiếu nhập kho');
      }
    } catch (error) {
      console.error('Error creating stock receipt:', error);
      message.error(error.message || 'Lỗi khi tạo phiếu nhập kho');
    } finally {
      setCreatingReceipt(false);
    }
  };

  const columns = [
    {
      title: 'Mã SP',
      dataIndex: 'product_id',
      key: 'product_id',
      width: 100,
      fixed: 'left',
    },
    {
      title: 'Tên Sản Phẩm',
      dataIndex: 'name',
      key: 'name',
      fixed: 'left',
      width: 250,
      render: (text) => <Text strong>{text}</Text>,
    },
    {
      title: 'Tồn Kho Hiện Tại',
      dataIndex: 'current_stock',
      key: 'current_stock',
      width: 150,
      align: 'right',
      render: (value) => (
        <Tag color={value > 0 ? 'green' : 'red'}>
          {value.toLocaleString('vi-VN')}
        </Tag>
      ),
    },
    {
      title: 'Số Lượng Cần Đặt',
      dataIndex: 'total_quantity_needed',
      key: 'total_quantity_needed',
      width: 150,
      align: 'right',
      render: (value) => (
        <Tag color="orange" style={{ fontSize: '14px', padding: '4px 12px' }}>
          {value.toLocaleString('vi-VN')}
        </Tag>
      ),
    },
    {
      title: 'Số Đơn Hàng',
      dataIndex: 'orders_count',
      key: 'orders_count',
      width: 120,
      align: 'center',
      render: (value) => (
        <Tag color="blue">{value} đơn</Tag>
      ),
    },
    {
      title: 'Mã Đơn Hàng',
      dataIndex: 'order_numbers',
      key: 'order_numbers',
      width: 200,
      render: (orderNumbers) => (
        <Space size="small" wrap>
          {orderNumbers && orderNumbers.length > 0 ? (
            orderNumbers.slice(0, 3).map((orderNumber, index) => (
              <Tag key={index} color="default">{orderNumber}</Tag>
            ))
          ) : (
            <Text type="secondary">-</Text>
          )}
          {orderNumbers && orderNumbers.length > 3 && (
            <Tag>+{orderNumbers.length - 3} đơn khác</Tag>
          )}
        </Space>
      ),
    },
    {
      title: 'Số Lượng Nhập',
      key: 'quantity_input',
      width: 180,
      align: 'center',
      render: (_, record) => {
        const productId = record.product_id;
        const defaultQuantity = record.total_quantity_needed;
        const currentValue = selectedProducts[productId] || defaultQuantity;

        return (
          <InputNumber
            min={0}
            max={999999}
            value={currentValue}
            onChange={(value) => handleQuantityChange(productId, value)}
            style={{ width: '100%' }}
            placeholder="Nhập số lượng"
            formatter={(value) => value ? `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',') : ''}
            parser={(value) => value.replace(/\$\s?|(,*)/g, '')}
          />
        );
      },
    },
  ];

  const selectedCount = Object.values(selectedProducts).filter((qty) => qty > 0).length;
  const totalSelectedQuantity = Object.values(selectedProducts).reduce(
    (sum, qty) => sum + (parseInt(qty) || 0),
    0
  );

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <Title level={2} style={{ margin: 0 }}>
            <InboxOutlined style={{ marginRight: '8px' }} />
            Sản Phẩm Cần Đặt Hàng
          </Title>
          <Text type="secondary" style={{ fontSize: '14px' }}>
            Thống kê từ đơn hàng chờ xác nhận
          </Text>
        </div>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={loadData} loading={loading}>
            Làm Mới
          </Button>
          {products.length > 0 && (
            <>
              <Button onClick={handleSelectAll}>
                Chọn Tất Cả
              </Button>
              <Button onClick={handleClearSelection} disabled={selectedCount === 0}>
                Bỏ Chọn
              </Button>
              <Popconfirm
                title="Tạo phiếu nhập kho?"
                description={`Bạn có chắc muốn tạo phiếu nhập kho cho ${selectedCount} sản phẩm (tổng ${totalSelectedQuantity.toLocaleString('vi-VN')} sản phẩm)?`}
                onConfirm={handleCreateStockReceipt}
                okText="Xác nhận"
                cancelText="Hủy"
                okButtonProps={{ loading: creatingReceipt }}
              >
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  disabled={selectedCount === 0 || creatingReceipt}
                  loading={creatingReceipt}
                >
                  Tạo Phiếu Nhập Kho
                </Button>
              </Popconfirm>
            </>
          )}
        </Space>
      </div>

      {summary && (
        <Alert
          message={
            <Space>
              <Text strong>Tổng số sản phẩm cần đặt:</Text>
              <Tag color="orange" style={{ fontSize: '14px', padding: '4px 12px' }}>
                {summary.total_products} sản phẩm
              </Tag>
              <Text strong>Từ:</Text>
              <Tag color="blue" style={{ fontSize: '14px', padding: '4px 12px' }}>
                {summary.total_pending_orders} đơn hàng chờ xác nhận
              </Tag>
            </Space>
          }
          type="info"
          showIcon
          style={{ marginBottom: '16px' }}
        />
      )}

      {selectedCount > 0 && (
        <Alert
          message={
            <Space>
              <Text strong>Đã chọn:</Text>
              <Tag color="green" style={{ fontSize: '14px', padding: '4px 12px' }}>
                {selectedCount} sản phẩm
              </Tag>
              <Text strong>Tổng số lượng:</Text>
              <Tag color="green" style={{ fontSize: '14px', padding: '4px 12px' }}>
                {totalSelectedQuantity.toLocaleString('vi-VN')} sản phẩm
              </Tag>
            </Space>
          }
          type="success"
          showIcon
          style={{ marginBottom: '16px' }}
        />
      )}

      <Card>
        <Spin spinning={loading}>
          {products.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px' }}>
              <ShoppingCartOutlined style={{ fontSize: '48px', color: '#d9d9d9', marginBottom: '16px' }} />
              <Text type="secondary" style={{ fontSize: '16px' }}>
                Không có đơn hàng chờ xác nhận
              </Text>
            </div>
          ) : (
            <Table
              columns={columns}
              dataSource={products}
              rowKey="product_id"
              pagination={{
                pageSize: 20,
                showSizeChanger: true,
                showTotal: (total) => `Tổng ${total} sản phẩm`,
              }}
              scroll={{ x: 1200 }}
              size="middle"
            />
          )}
        </Spin>
      </Card>
    </div>
  );
};

export default PendingOrderProducts;

