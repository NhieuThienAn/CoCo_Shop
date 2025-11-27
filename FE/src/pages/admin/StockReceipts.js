import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Table,
  Button,
  Space,
  Tag,
  Typography,
  Select,
  message,
  Modal,
  Popconfirm,
  Input,
} from 'antd';
import { PlusOutlined, CheckOutlined, CloseOutlined, DeleteOutlined, EyeOutlined } from '@ant-design/icons';
import { support } from '../../api/index.js';

const { Title } = Typography;
const { TextArea } = Input;

const AdminStockReceipts = () => {
  const navigate = useNavigate();
  const [receipts, setReceipts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0 });
  const [filters, setFilters] = useState({ status: '' });

  useEffect(() => {
    loadReceipts();
  }, [pagination.page, filters.status]);

  const loadReceipts = async () => {
    setLoading(true);
    try {
      let response;
      if (filters.status) {
        // Use stock receipt API
        response = await support.getStockReceiptsByStatus(filters.status);
      } else {
        // Use stock receipt API
        response = await support.getStockReceipts(pagination.page, pagination.limit);
      }
      
      if (response && response.success) {
        // Handle both nested (response.data.data) and flat (response.data) formats
        let receiptsData = [];
        let paginationData = null;
        
        if (Array.isArray(response.data)) {
          // Flat format: response.data is array
          receiptsData = response.data;
          paginationData = response.pagination;
        } else if (response.data && Array.isArray(response.data.data)) {
          // Nested format: response.data.data is array
          receiptsData = response.data.data;
          paginationData = response.data.pagination || response.pagination;
        } else {
          receiptsData = [];
        }
        
        setReceipts(receiptsData);
        setPagination((prev) => ({
          ...prev,
          total: paginationData?.total || receiptsData.length || 0,
        }));
      } else {
        message.error(response?.message || response?.data?.message || 'Có lỗi xảy ra khi tải phiếu nhập kho');
      }
    } catch (error) {
      message.error(error.message || 'Có lỗi xảy ra khi tải phiếu nhập kho');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    // Navigate to product selection page instead of opening modal
    navigate('/admin/warehouse/stock-receipts/select-products');
  };

  const handleApprove = async (id) => {
    try {
      const response = await support.approveStockReceipt(id);
      if (response.success) {
        message.success('Duyệt phiếu nhập kho thành công. Đã cập nhật tồn kho.');
        loadReceipts();
      } else {
        message.error(response.message || 'Có lỗi xảy ra khi duyệt phiếu nhập kho');
      }
    } catch (error) {
      message.error(error.message || 'Có lỗi xảy ra khi duyệt phiếu nhập kho');
    }
  };

  const handleReject = async (id) => {
    Modal.confirm({
      title: 'Từ chối phiếu nhập kho',
      content: (
        <Input.TextArea
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
        try {
          const response = await support.rejectStockReceipt(id, reason);
          if (response.success) {
            message.success('Từ chối phiếu nhập kho thành công');
            loadReceipts();
          } else {
            message.error(response.message || 'Có lỗi xảy ra khi từ chối');
          }
        } catch (error) {
          message.error(error.message || 'Có lỗi xảy ra khi từ chối');
        }
      },
    });
  };

  const handleDelete = async (id) => {
    try {
      const response = await support.deleteStockReceipt(id);
      if (response.success) {
        message.success('Xóa phiếu nhập kho thành công');
        loadReceipts();
      } else {
        message.error(response.message || 'Có lỗi xảy ra khi xóa');
      }
    } catch (error) {
      message.error(error.message || 'Có lỗi xảy ra khi xóa');
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

  const columns = [
    {
      title: 'ID',
      dataIndex: 'receipt_id',
      key: 'receipt_id',
      width: 80,
    },
    {
      title: 'Mã Phiếu',
      dataIndex: 'receipt_number',
      key: 'receipt_number',
    },
    {
      title: 'Số Lượng Sản Phẩm',
      key: 'items_count',
      width: 150,
      render: (_, record) => {
        if (!record.items) return '0';
        try {
          const items = typeof record.items === 'string' 
            ? JSON.parse(record.items) 
            : record.items;
          return Array.isArray(items) ? items.length : 'N/A';
        } catch (e) {
          return 'N/A';
        }
      },
    },
    {
      title: 'Trạng Thái',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (status) => getStatusTag(status),
    },
    {
      title: 'Ngày Tạo',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 180,
      render: (date) => {
        if (!date) return 'N/A';
        try {
          // Format: DD/MM/YYYY HH:mm:ss
          const dateObj = new Date(date);
          const day = String(dateObj.getDate()).padStart(2, '0');
          const month = String(dateObj.getMonth() + 1).padStart(2, '0');
          const year = dateObj.getFullYear();
          const hours = String(dateObj.getHours()).padStart(2, '0');
          const minutes = String(dateObj.getMinutes()).padStart(2, '0');
          const seconds = String(dateObj.getSeconds()).padStart(2, '0');
          return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
        } catch (e) {
          return date ? new Date(date).toLocaleString('vi-VN') : 'N/A';
        }
      },
    },
    {
      title: 'Thao Tác',
      key: 'action',
      width: 350,
      render: (_, record) => {
        const receiptId = record.receipt_id;
        return (
          <Space>
            <Button 
              type="link" 
              icon={<EyeOutlined />} 
              onClick={() => navigate(`/admin/warehouse/stock-receipts/${receiptId}`)}
            >
              Xem Chi Tiết
            </Button>
            {record.status === 'pending' && (
              <>
                <Popconfirm
                  title="Bạn có chắc muốn duyệt phiếu này? Tồn kho sẽ được cập nhật."
                  onConfirm={() => handleApprove(receiptId)}
                >
                  <Button type="link" icon={<CheckOutlined />} style={{ color: '#52c41a' }}>
                    Duyệt
                  </Button>
                </Popconfirm>
                <Button type="link" danger icon={<CloseOutlined />} onClick={() => handleReject(receiptId)}>
                  Từ Chối
                </Button>
              </>
            )}
            <Popconfirm
              title="Bạn có chắc muốn xóa phiếu này?"
              onConfirm={() => handleDelete(receiptId)}
            >
              <Button type="link" danger icon={<DeleteOutlined />}>
                Xóa
              </Button>
            </Popconfirm>
          </Space>
        );
      },
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <Title level={2} style={{ margin: 0 }}>Quản Lý Phiếu Nhập Kho</Title>
        <Space>
          <Select
            placeholder="Lọc theo trạng thái"
            style={{ width: 200 }}
            allowClear
            value={filters.status || undefined}
            onChange={(value) => {
              setFilters((prev) => ({ ...prev, status: value || '' }));
              setPagination((prev) => ({ ...prev, page: 1 }));
            }}
          >
            <Select.Option value="pending">Chờ Xác Nhận</Select.Option>
            <Select.Option value="approved">Đã Duyệt</Select.Option>
            <Select.Option value="rejected">Đã Từ Chối</Select.Option>
          </Select>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
            Nhập Kho
          </Button>
        </Space>
      </div>

      <Table
        columns={columns}
        dataSource={receipts}
        rowKey="receipt_id"
        loading={loading}
        pagination={{
          current: pagination.page,
          pageSize: pagination.limit,
          total: pagination.total,
          showSizeChanger: true,
          showTotal: (total) => `Tổng ${total} phiếu nhập kho`,
          onChange: (page, pageSize) => {
            setPagination((prev) => ({ ...prev, page, limit: pageSize }));
          },
        }}
        locale={{ emptyText: 'Chưa có phiếu nhập kho nào' }}
      />
    </div>
  );
};

export default AdminStockReceipts;

