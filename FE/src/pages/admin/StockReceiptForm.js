/**
 * Stock Receipt - Step 2: Receipt Form Page
 * This page allows admin to fill in complete stock receipt information
 */

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Form,
  Input,
  InputNumber,
  DatePicker,
  Button,
  Card,
  Row,
  Col,
  Space,
  Typography,
  Table,
  message,
  Divider,
  Select,
  Image,
  AutoComplete,
  Tooltip,
  Tag,
} from 'antd';
import { ArrowLeftOutlined, SaveOutlined, InfoCircleOutlined, ThunderboltOutlined } from '@ant-design/icons';
import { support, user } from '../../api/index.js';
import { useAuth } from '../../contexts/AuthContext.js';
import dayjs from 'dayjs';
import { numberFormatter, numberParser, integerFormatter, integerParser } from '../../utils/numberFormatter.js';

const { Title } = Typography;
const { TextArea } = Input;

const StockReceiptForm = () => {
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const [form] = Form.useForm();
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [warehouseOptions, setWarehouseOptions] = useState([]);
  const [supplierOptions, setSupplierOptions] = useState([]);
  const [recentReceipts, setRecentReceipts] = useState([]);

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    // Load selected products from sessionStorage
    const stored = sessionStorage.getItem('stockReceiptSelectedProducts');
    
    if (!stored) {
      message.warning('Vui lòng chọn sản phẩm trước');
      navigate('/admin/warehouse/stock-receipts/select-products');
      return;
    }

    try {
      const products = JSON.parse(stored);
      setSelectedProducts(products);
      
      // Load suppliers for autocomplete
      try {
        const suppliersRes = await support.getSuppliers();
        if (suppliersRes.success && suppliersRes.data) {
          const supplierNames = suppliersRes.data
            .map(s => s.supplier_name)
            .filter(Boolean)
            .slice(0, 20); // Limit to 20 most recent
          setSupplierOptions(supplierNames.map(name => ({ value: name })));
        }
      } catch (err) {
        console.warn('Could not load suppliers:', err);
      }

      // Load recent stock receipts for suggestions
      let recentReceiptsData = [];
      try {
        const receiptsRes = await support.getStockReceipts(1, 10);
        if (receiptsRes.success && receiptsRes.data) {
          recentReceiptsData = receiptsRes.data;
          setRecentReceipts(receiptsRes.data);
          
          // Extract unique warehouses from recent receipts
          const warehouses = new Set();
          receiptsRes.data.forEach(receipt => {
            try {
              if (receipt.notes) {
                const notesData = typeof receipt.notes === 'string' 
                  ? JSON.parse(receipt.notes) 
                  : receipt.notes;
                const warehouse = notesData?.additional_info?.warehouse || notesData?.warehouse;
                if (warehouse) {
                  warehouses.add(warehouse);
                }
              }
            } catch (e) {
              // Ignore parse errors
            }
          });
          
          setWarehouseOptions(Array.from(warehouses).map(w => ({ value: w })));
        }
      } catch (err) {
        console.warn('Could not load recent receipts:', err);
      }

      // Auto-fill form with smart defaults
      const autoFillData = {
        receipt_date: dayjs(),
        expected_date: dayjs().add(1, 'day'),
      };

      // Auto-fill receiver info from current user
      if (currentUser) {
        if (currentUser.full_name || currentUser.name) {
          autoFillData.receiver_name = currentUser.full_name || currentUser.name || currentUser.username;
        }
        if (currentUser.phone || currentUser.phone_number) {
          autoFillData.receiver_phone = currentUser.phone || currentUser.phone_number;
        }
      }

      // Auto-fill from most recent receipt if available
      if (recentReceiptsData.length > 0) {
        const lastReceipt = recentReceiptsData[0];
        try {
          if (lastReceipt.notes) {
            const notesData = typeof lastReceipt.notes === 'string' 
              ? JSON.parse(lastReceipt.notes) 
              : lastReceipt.notes;
            const additionalInfo = notesData?.additional_info || notesData;
            
            if (additionalInfo) {
              if (additionalInfo.warehouse && !autoFillData.warehouse) {
                autoFillData.warehouse = additionalInfo.warehouse;
              }
              if (additionalInfo.supplier_name && !autoFillData.supplier_name) {
                autoFillData.supplier_name = additionalInfo.supplier_name;
              }
              if (additionalInfo.supplier_contact && !autoFillData.supplier_contact) {
                autoFillData.supplier_contact = additionalInfo.supplier_contact;
              }
              if (additionalInfo.delivery_method && !autoFillData.delivery_method) {
                autoFillData.delivery_method = additionalInfo.delivery_method;
              }
            }
          }
        } catch (e) {
          // Ignore parse errors
        }
      }

      form.setFieldsValue(autoFillData);
    } catch (error) {
      message.error('Không thể tải dữ liệu sản phẩm đã chọn');
      navigate('/admin/warehouse/stock-receipts/select-products');
    }
  };

  const handleQuantityChange = (productId, quantity) => {
    // CRITICAL FIX: Handle null/undefined properly
    // Parser now returns null for empty values, so we need to handle that
    if (quantity === null || quantity === undefined) {
      setSelectedProducts(prev => prev.map(p => 
        p.product_id === productId ? { ...p, quantity: 1 } : p
      ));
      return;
    }
    
    // Ensure quantity is a valid integer
    let validQuantity = 1;
    
    if (quantity === '') {
      validQuantity = 1;
    } else if (typeof quantity === 'string') {
      // For strings like "100.5", parse as float first, then floor
      const floatValue = parseFloat(quantity);
      if (!isNaN(floatValue)) {
        validQuantity = Math.floor(floatValue);
      } else {
        // If not a valid float, extract all digits
        const digitsOnly = quantity.replace(/\D/g, '');
        const parsed = digitsOnly ? parseInt(digitsOnly, 10) : 1;
        validQuantity = isNaN(parsed) || parsed < 1 ? 1 : parsed;
      }
      validQuantity = validQuantity < 1 ? 1 : validQuantity;
    } else {
      // For numbers, floor to ensure integer
      const numValue = Number(quantity);
      validQuantity = isNaN(numValue) || numValue < 1 ? 1 : Math.floor(numValue);
    }
    
    setSelectedProducts(prev => prev.map(p => 
      p.product_id === productId ? { ...p, quantity: validQuantity } : p
    ));
  };

  const handleUnitPriceChange = (productId, unitPrice) => {
    // CRITICAL FIX: Handle null/undefined properly
    // Parser now returns null for empty values, so we need to handle that
    if (unitPrice === null || unitPrice === undefined) {
      setSelectedProducts(prev => prev.map(p => 
        p.product_id === productId ? { ...p, unit_price: 0 } : p
      ));
      return;
    }
    
    setSelectedProducts(prev => prev.map(p => 
      p.product_id === productId ? { ...p, unit_price: unitPrice || 0 } : p
    ));
  };

  const handleRemoveProduct = (productId) => {
    setSelectedProducts(prev => prev.filter(p => p.product_id !== productId));
  };

  const calculateTotal = () => {
    return selectedProducts.reduce((sum, item) => {
      const quantity = item.quantity || 1;
      const unitPrice = item.unit_price || 0;
      return sum + (quantity * unitPrice);
    }, 0);
  };

  const handleSubmit = async (values) => {

    if (selectedProducts.length === 0) {
      message.error('Vui lòng chọn ít nhất một sản phẩm');
      return;
    }

    setSubmitting(true);
    try {
      // Ensure all quantities are valid numbers
      const items = selectedProducts.map(item => {
        const quantity = item.quantity === null || item.quantity === undefined 
          ? 1 
          : (typeof item.quantity === 'string' ? parseInt(item.quantity, 10) : Number(item.quantity)) || 1;
        const unitPrice = item.unit_price === null || item.unit_price === undefined 
          ? 0 
          : (typeof item.unit_price === 'string' ? parseFloat(item.unit_price) : Number(item.unit_price)) || 0;
        

        return {
          product_id: item.product_id,
          quantity: Math.floor(quantity), // Ensure integer
          unit_price: unitPrice,
          total_price: Math.floor(quantity) * unitPrice,
        };
      });

      // Auto-generate receipt number if not provided
      let receiptNumber = values.receipt_number?.trim();
      if (!receiptNumber) {
        const dateStr = dayjs().format('YYYYMMDD');
        const timeStr = dayjs().format('HHmmss');
        receiptNumber = `SR-${dateStr}-${timeStr}`;
      }

      // Prepare receipt data with all fields
      const receiptData = {
        receipt_number: receiptNumber,
        receipt_date: values.receipt_date ? dayjs(values.receipt_date).format('YYYY-MM-DD') : undefined,
        expected_date: values.expected_date ? dayjs(values.expected_date).format('YYYY-MM-DD') : undefined,
        warehouse: values.warehouse?.trim() || null,
        receiver_name: values.receiver_name?.trim() || null,
        receiver_phone: values.receiver_phone?.trim() || null,
        receipt_reason: values.receipt_reason || null,
        delivery_method: values.delivery_method || null,
        supplier_name: values.supplier_name?.trim() || null,
        supplier_contact: values.supplier_contact?.trim() || null,
        total_value: calculateTotal(),
        items: items, // Send as array, backend will stringify
        notes: values.notes?.trim() || null,
      };

      // Use stock receipt API (not purchase order)
      const response = await support.createStockReceipt(receiptData);

      if (response.success) {
        message.success('Tạo phiếu nhập kho thành công');
        sessionStorage.removeItem('stockReceiptSelectedProducts');
        navigate('/admin/warehouse?tab=stock-receipts');
      } else {
        message.error(response.message || 'Có lỗi xảy ra khi tạo phiếu nhập kho');
      }
    } catch (error) {
      message.error(error.message || 'Có lỗi xảy ra khi tạo phiếu nhập kho');
    } finally {
      setSubmitting(false);
    }
  };

  const handleBack = () => {
    navigate('/admin/warehouse/stock-receipts/select-products');
  };

  const handleCancel = () => {
    sessionStorage.removeItem('stockReceiptSelectedProducts');
    navigate('/admin/warehouse?tab=stock-receipts');
  };

  // Removed unused productColumns - using Card list instead of Table

  const columns = [
    {
      key: 'image',
      width: 90,
      fixed: 'left',
      render: (text, record) => (
        <Image
          src={record.image_url || '/placeholder.jpg'}
          alt={record.product_name}
          width={70}
          height={70}
          style={{ objectFit: 'cover', borderRadius: '6px', border: '1px solid #e8e8e8' }}
          preview={{
            mask: 'Xem ảnh lớn',
          }}
          fallback="/placeholder.jpg"
        />
      ),
    },
    {
      title: 'Sản Phẩm',
      dataIndex: 'product_name',
      key: 'product_name',
      width: 200,
      render: (text, record) => (
        <div>
          <div style={{ fontWeight: 'bold', fontSize: '14px', marginBottom: '4px' }}>{text}</div>
          <div style={{ fontSize: '12px', color: '#666' }}>SKU: {record.sku}</div>
          <div style={{ fontSize: '12px', color: '#999' }}>Tồn kho: {record.current_stock}</div>
        </div>
      ),
    },
    {
      title: 'Số Lượng Nhập',
      key: 'quantity',
      width: 120,
      align: 'center',
      render: (text, record) => (
        <InputNumber
          key={`table-quantity-${record.product_id}-${record.quantity}`}
          min={1}
          precision={0}
          value={record.quantity ?? 1}
          onChange={(value) => handleQuantityChange(record.product_id, value)}
          formatter={integerFormatter}
          parser={integerParser}
          style={{ width: '100%' }}
        />
      ),
    },
    {
      title: 'Đơn Giá (VNĐ)',
      key: 'unit_price',
      width: 150,
      align: 'right',
      render: (text, record) => (
        <InputNumber
          key={`table-price-${record.product_id}-${record.unit_price}`}
          min={0}
          value={record.unit_price ?? 0}
          onChange={(value) => handleUnitPriceChange(record.product_id, value)}
          formatter={numberFormatter}
          parser={numberParser}
          style={{ width: '100%' }}
        />
      ),
    },
    {
      title: 'Thành Tiền',
      key: 'total',
      width: 150,
      align: 'right',
      render: (text, record) => {
        const total = (record.quantity || 1) * (record.unit_price || 0);
        return (
          <span style={{ fontWeight: 'bold', color: '#1890ff', fontSize: '14px' }}>
            {new Intl.NumberFormat('vi-VN').format(total)} đ
          </span>
        );
      },
    },
    {
      title: 'Thao Tác',
      key: 'action',
      width: 80,
      fixed: 'right',
      align: 'center',
      render: (text, record) => (
        <Button
          type="link"
          danger
          size="small"
          onClick={() => handleRemoveProduct(record.product_id)}
        >
          Xóa
        </Button>
      ),
    },
  ];

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: '24px' }}>
        <Space>
          <Button icon={<ArrowLeftOutlined />} onClick={handleBack}>
            Quay Lại
          </Button>
          <Title level={2} style={{ margin: 0 }}>Tạo Phiếu Nhập Kho - Bước 2/2</Title>
        </Space>
      </div>

      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        initialValues={{
          receipt_date: dayjs(),
          expected_date: dayjs().add(1, 'day'),
        }}
      >
        <Row gutter={24}>
          <Col xs={24} lg={16}>
            <Card title="Thông Tin Phiếu Nhập Kho" style={{ marginBottom: '24px' }}>
              <Row gutter={16}>
                <Col xs={24} sm={12}>
                  <Form.Item
                    name="receipt_number"
                    label="Mã Phiếu Nhập Kho"
                    help="Để trống để tự động tạo mã"
                  >
                    <Input 
                      placeholder="SR-YYYYMMDD-HHMMSS" 
                      suffix={
                        <Button
                          type="link"
                          size="small"
                          icon={<ThunderboltOutlined />}
                          onClick={() => {
                            const dateStr = dayjs().format('YYYYMMDD');
                            const timeStr = dayjs().format('HHmmss');
                            const autoNumber = `SR-${dateStr}-${timeStr}`;
                            form.setFieldsValue({ receipt_number: autoNumber });
                            message.success('Đã tạo mã tự động');
                          }}
                        >
                          Tự động
                        </Button>
                      }
                    />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12}>
                  <Form.Item
                    name="receipt_date"
                    label={
                      <Space>
                        <span>Ngày Nhập Kho</span>
                        <Tooltip title="Mặc định: Hôm nay">
                          <Tag color="green" style={{ margin: 0 }}>Tự động</Tag>
                        </Tooltip>
                      </Space>
                    }
                    rules={[{ required: true, message: 'Vui lòng chọn ngày nhập kho' }]}
                  >
                    <DatePicker 
                      style={{ width: '100%' }} 
                      format="YYYY-MM-DD"
                      disabledDate={(current) => current && current > dayjs().endOf('day')}
                    />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12}>
                  <Form.Item
                    name="expected_date"
                    label={
                      <Space>
                        <span>Ngày Dự Kiến Nhập</span>
                        <Tooltip title="Mặc định: Ngày mai">
                          <Tag color="green" style={{ margin: 0 }}>Tự động</Tag>
                        </Tooltip>
                      </Space>
                    }
                  >
                    <DatePicker 
                      style={{ width: '100%' }} 
                      format="YYYY-MM-DD"
                      disabledDate={(current) => current && current < dayjs().startOf('day')}
                    />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12}>
                  <Form.Item
                    name="warehouse"
                    label={
                      <Space>
                        <span>Kho Nhận Hàng</span>
                        <Tooltip title="Gợi ý: Sử dụng kho đã dùng gần đây hoặc nhập kho mới">
                          <InfoCircleOutlined style={{ color: '#1890ff', cursor: 'help' }} />
                        </Tooltip>
                      </Space>
                    }
                    rules={[{ required: true, message: 'Vui lòng nhập tên kho' }]}
                  >
                    <AutoComplete
                      options={warehouseOptions}
                      placeholder="VD: Kho Hà Nội, Kho TP.HCM"
                      filterOption={(inputValue, option) =>
                        option.value.toUpperCase().indexOf(inputValue.toUpperCase()) !== -1
                      }
                      onSearch={(value) => {
                        // Add custom option if not in list
                        if (value && !warehouseOptions.some(opt => opt.value === value)) {
                          setWarehouseOptions(prev => [
                            { value },
                            ...prev.filter(opt => opt.value !== value)
                          ]);
                        }
                      }}
                    />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12}>
                  <Form.Item
                    name="receipt_reason"
                    label="Lý Do Nhập Kho"
                    rules={[{ required: true, message: 'Vui lòng nhập lý do nhập kho' }]}
                    tooltip="Chọn lý do nhập kho phù hợp nhất"
                  >
                    <Select 
                      placeholder="Chọn lý do nhập kho"
                      showSearch
                      optionFilterProp="children"
                      filterOption={(input, option) =>
                        option.children.toLowerCase().indexOf(input.toLowerCase()) >= 0
                      }
                    >
                      <Select.Option value="Nhập hàng từ nhà cung cấp">Nhập hàng từ nhà cung cấp</Select.Option>
                      <Select.Option value="Nhập hàng trả về">Nhập hàng trả về</Select.Option>
                      <Select.Option value="Điều chuyển từ kho khác">Điều chuyển từ kho khác</Select.Option>
                      <Select.Option value="Kiểm kê phát hiện thiếu">Kiểm kê phát hiện thiếu</Select.Option>
                      <Select.Option value="Nhập hàng sản xuất">Nhập hàng sản xuất</Select.Option>
                      <Select.Option value="Khác">Khác</Select.Option>
                    </Select>
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12}>
                  <Form.Item
                    name="delivery_method"
                    label="Phương Thức Vận Chuyển"
                    tooltip="Chọn phương thức vận chuyển hàng vào kho"
                  >
                    <Select 
                      placeholder="Chọn phương thức"
                      showSearch
                      optionFilterProp="children"
                      filterOption={(input, option) =>
                        option.children.toLowerCase().indexOf(input.toLowerCase()) >= 0
                      }
                    >
                      <Select.Option value="Tự vận chuyển">Tự vận chuyển</Select.Option>
                      <Select.Option value="Nhà cung cấp giao hàng">Nhà cung cấp giao hàng</Select.Option>
                      <Select.Option value="Đơn vị vận chuyển">Đơn vị vận chuyển</Select.Option>
                      <Select.Option value="Giao hàng nhanh">Giao hàng nhanh</Select.Option>
                    </Select>
                  </Form.Item>
                </Col>
              </Row>
            </Card>

            <Card title="Thông Tin Người Nhận" style={{ marginBottom: '24px' }}>
              <Row gutter={16}>
                <Col xs={24} sm={12}>
                  <Form.Item
                    name="receiver_name"
                    label={
                      <Space>
                        <span>Tên Người Nhận</span>
                        {currentUser && (currentUser.full_name || currentUser.name) && (
                          <Tooltip title="Đã tự động điền từ thông tin tài khoản">
                            <Tag color="blue" icon={<ThunderboltOutlined />} style={{ margin: 0 }}>
                              Tự động
                            </Tag>
                          </Tooltip>
                        )}
                      </Space>
                    }
                    rules={[{ required: true, message: 'Vui lòng nhập tên người nhận' }]}
                  >
                    <Input placeholder="Họ và tên người nhận" />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12}>
                  <Form.Item
                    name="receiver_phone"
                    label={
                      <Space>
                        <span>Số Điện Thoại Người Nhận</span>
                        {currentUser && (currentUser.phone || currentUser.phone_number) && (
                          <Tooltip title="Đã tự động điền từ thông tin tài khoản">
                            <Tag color="blue" icon={<ThunderboltOutlined />} style={{ margin: 0 }}>
                              Tự động
                            </Tag>
                          </Tooltip>
                        )}
                      </Space>
                    }
                    rules={[
                      { required: true, message: 'Vui lòng nhập số điện thoại' },
                      { pattern: /^[0-9]{10,11}$/, message: 'Số điện thoại không hợp lệ' },
                    ]}
                  >
                    <Input placeholder="VD: 0901234567" maxLength={11} />
                  </Form.Item>
                </Col>
              </Row>
            </Card>

            <Card title="Thông Tin Nhà Cung Cấp (Nếu Có)" style={{ marginBottom: '24px' }}>
              <Row gutter={16}>
                <Col xs={24} sm={12}>
                  <Form.Item
                    name="supplier_name"
                    label={
                      <Space>
                        <span>Tên Nhà Cung Cấp</span>
                        <Tooltip title="Gợi ý: Chọn từ danh sách nhà cung cấp đã có hoặc nhập mới">
                          <InfoCircleOutlined style={{ color: '#1890ff', cursor: 'help' }} />
                        </Tooltip>
                      </Space>
                    }
                  >
                    <AutoComplete
                      options={supplierOptions}
                      placeholder="Tên nhà cung cấp"
                      filterOption={(inputValue, option) =>
                        option.value.toUpperCase().indexOf(inputValue.toUpperCase()) !== -1
                      }
                      onSearch={(value) => {
                        // Add custom option if not in list
                        if (value && !supplierOptions.some(opt => opt.value === value)) {
                          setSupplierOptions(prev => [
                            { value },
                            ...prev.filter(opt => opt.value !== value)
                          ]);
                        }
                      }}
                    />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12}>
                  <Form.Item
                    name="supplier_contact"
                    label="Liên Hệ Nhà Cung Cấp"
                  >
                    <Input placeholder="Số điện thoại hoặc email" />
                  </Form.Item>
                </Col>
              </Row>
            </Card>

            <Card title="Ghi Chú" style={{ marginBottom: '24px' }}>
              <Form.Item name="notes">
                <TextArea rows={4} placeholder="Nhập ghi chú bổ sung (nếu có)" />
              </Form.Item>
            </Card>
          </Col>

          <Col xs={24} lg={8}>
            <Card 
              title={`Danh Sách Sản Phẩm (${selectedProducts.length})`} 
              style={{ marginBottom: '24px' }}
            >
              {selectedProducts.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
                  <div style={{ fontSize: '16px', marginBottom: '8px' }}>Chưa có sản phẩm nào</div>
                  <div style={{ fontSize: '12px' }}>Vui lòng quay lại để chọn sản phẩm</div>
                </div>
              ) : (
                <div style={{ 
                  display: 'flex', 
                  flexDirection: 'column', 
                  gap: '12px',
                  maxHeight: '500px',
                  overflowY: 'auto',
                  paddingRight: '8px'
                }}>
                  {selectedProducts.map((item) => (
                    <Card
                      key={item.product_id}
                      size="small"
                      style={{
                        border: '1px solid #e8e8e8',
                        borderRadius: '8px',
                      }}
                      bodyStyle={{ padding: '12px' }}
                    >
                      <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                        <div style={{ flexShrink: 0 }}>
                          <Image
                            src={item.image_url || '/placeholder.jpg'}
                            alt={item.product_name}
                            width={80}
                            height={80}
                            style={{ objectFit: 'cover', borderRadius: '6px', border: '1px solid #e8e8e8' }}
                            preview={{
                              mask: 'Xem ảnh lớn',
                            }}
                            fallback="/placeholder.jpg"
                          />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 'bold', fontSize: '14px', marginBottom: '4px' }}>
                            {item.product_name}
                          </div>
                          <div style={{ fontSize: '12px', color: '#666', marginBottom: '8px' }}>
                            SKU: {item.sku} | Tồn kho: {item.current_stock}
                          </div>
                          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{ fontSize: '12px', minWidth: '80px' }}>Số lượng:</span>
                              <InputNumber
                                key={`quantity-${item.product_id}-${item.quantity}`}
                                min={1}
                                precision={0}
                                value={item.quantity ?? 1}
                                onChange={(value) => handleQuantityChange(item.product_id, value)}
                                formatter={integerFormatter}
                                parser={integerParser}
                                style={{ width: '100px' }}
                              />
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{ fontSize: '12px', minWidth: '80px' }}>Đơn giá:</span>
                              <InputNumber
                                key={`price-${item.product_id}-${item.unit_price}`}
                                min={0}
                                value={item.unit_price ?? 0}
                                onChange={(value) => handleUnitPriceChange(item.product_id, value)}
                                formatter={numberFormatter}
                                parser={numberParser}
                                style={{ width: '150px' }}
                              />
                              <span style={{ fontSize: '12px', color: '#666' }}>VNĐ</span>
                            </div>
                            <div style={{ marginLeft: 'auto' }}>
                              <span style={{ fontSize: '12px', color: '#666', marginRight: '8px' }}>Thành tiền:</span>
                              <span style={{ fontWeight: 'bold', color: '#1890ff', fontSize: '14px' }}>
                                {new Intl.NumberFormat('vi-VN').format((item.quantity || 1) * (item.unit_price || 0))} đ
                              </span>
                            </div>
                            <Button
                              type="link"
                              danger
                              size="small"
                              onClick={() => handleRemoveProduct(item.product_id)}
                            >
                              Xóa
                            </Button>
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </Card>

            <Card title="Tổng Kết">
              <div style={{ marginBottom: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span>Số lượng sản phẩm:</span>
                  <strong>{selectedProducts.length}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span>Tổng số lượng:</span>
                  <strong>
                    {selectedProducts.reduce((sum, item) => sum + (item.quantity || 1), 0)}
                  </strong>
                </div>
                <Divider />
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '16px', fontWeight: 'bold' }}>Tổng giá trị:</span>
                  <span style={{ fontSize: '18px', fontWeight: 'bold', color: '#1890ff' }}>
                    {new Intl.NumberFormat('vi-VN').format(calculateTotal())} đ
                  </span>
                </div>
              </div>
            </Card>
          </Col>
        </Row>

        <div style={{ marginTop: '24px', textAlign: 'right' }}>
          <Space>
            <Button onClick={handleCancel}>
              Hủy
            </Button>
            <Button type="primary" htmlType="submit" icon={<SaveOutlined />} loading={submitting}>
              Tạo Phiếu Nhập Kho
            </Button>
          </Space>
        </div>
      </Form>
    </div>
  );
};

export default StockReceiptForm;

