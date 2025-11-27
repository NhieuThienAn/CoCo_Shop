import React, { useEffect, useState } from 'react';
import {
  Card,
  Row,
  Col,
  Typography,
  Descriptions,
  Tag,
  Table,
  Space,
  Button,
  Spin,
  message,
  Statistic,
  Divider,
  Empty,
} from 'antd';
import {
  BankOutlined,
  DollarOutlined,
  ReloadOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  HistoryOutlined,
} from '@ant-design/icons';
import { bank } from '../../api/index.js';

const { Title } = Typography;

const AdminBank = () => {
  const [loading, setLoading] = useState(true);
  const [bankInfo, setBankInfo] = useState(null);
  const [transactions, setTransactions] = useState([]);

  useEffect(() => {
    loadBankInfo();
  }, []);

  const loadBankInfo = async () => {
    setLoading(true);
    try {
      const response = await bank.getSystemBankInfo();
      if (response.success) {
        setBankInfo(response.data);
        setTransactions(response.data.recentTransactions || []);
      } else {
        message.error(response.message || 'Có lỗi xảy ra khi tải thông tin ngân hàng');
      }
    } catch (error) {
      console.error('Error loading bank info:', error);
      message.error('Có lỗi xảy ra khi tải thông tin ngân hàng');
    } finally {
      setLoading(false);
    }
  };

  const transactionColumns = [
    {
      title: 'Thời gian',
      dataIndex: 'posted_at',
      key: 'posted_at',
      render: (date) => date ? new Date(date).toLocaleString('vi-VN') : 'N/A',
    },
    {
      title: 'Loại',
      dataIndex: 'txn_type',
      key: 'txn_type',
      render: (type) => {
        const typeMap = {
          credit: { color: 'green', text: 'Thu' },
          debit: { color: 'red', text: 'Chi' },
          transfer: { color: 'blue', text: 'Chuyển' },
          fee: { color: 'orange', text: 'Phí' },
          refund: { color: 'purple', text: 'Hoàn' },
        };
        const info = typeMap[type] || { color: 'default', text: type };
        return <Tag color={info.color}>{info.text}</Tag>;
      },
    },
    {
      title: 'Số tiền',
      dataIndex: 'amount',
      key: 'amount',
      render: (amount) => (
        <span style={{ 
          color: amount >= 0 ? '#52c41a' : '#ff4d4f',
          fontWeight: 'bold' 
        }}>
          {amount >= 0 ? '+' : ''}
          {new Intl.NumberFormat('vi-VN', {
            style: 'currency',
            currency: 'VND',
          }).format(amount || 0)}
        </span>
      ),
    },
    {
      title: 'Mô tả',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
    },
    {
      title: 'Số dư sau',
      dataIndex: 'balance_after',
      key: 'balance_after',
      render: (balance) => (
        <strong>
          {new Intl.NumberFormat('vi-VN', {
            style: 'currency',
            currency: 'VND',
          }).format(balance || 0)}
        </strong>
      ),
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      render: (status) => {
        const statusMap = {
          posted: { color: 'green', text: 'Đã ghi' },
          pending: { color: 'orange', text: 'Chờ xử lý' },
          reconciled: { color: 'blue', text: 'Đã đối soát' },
          failed: { color: 'red', text: 'Thất bại' },
          cancelled: { color: 'default', text: 'Đã hủy' },
        };
        const info = statusMap[status] || { color: 'default', text: status };
        return <Tag color={info.color}>{info.text}</Tag>;
      },
    },
  ];

  if (loading) {
    return (
      <div style={{ padding: '24px', textAlign: 'center' }}>
        <Spin size="large">
          <div style={{ marginTop: '16px' }}>Đang tải thông tin ngân hàng...</div>
        </Spin>
      </div>
    );
  }

  if (!bankInfo) {
    return (
      <div style={{ padding: '24px', textAlign: 'center' }}>
        <Empty description="Không tìm thấy thông tin ngân hàng hệ thống" />
        <Button type="primary" onClick={loadBankInfo} style={{ marginTop: '16px' }}>
          Thử lại
        </Button>
      </div>
    );
  }

  const { bank: bankData, account } = bankInfo;

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <Title level={2} style={{ margin: 0 }}>
          <BankOutlined style={{ marginRight: '8px' }} />
          Ngân Hàng Hệ Thống
        </Title>
        <Button
          icon={<ReloadOutlined />}
          onClick={loadBankInfo}
          loading={loading}
        >
          Làm Mới
        </Button>
      </div>

      <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
        <Col xs={24} lg={8}>
          <Card title="Thông Tin Ngân Hàng">
            <Descriptions column={1} size="small">
              <Descriptions.Item label="Tên ngân hàng">
                <strong>{bankData.provider_name}</strong>
              </Descriptions.Item>
              <Descriptions.Item label="Mã ngân hàng">
                {bankData.provider_code || 'N/A'}
              </Descriptions.Item>
              <Descriptions.Item label="Loại">
                <Tag color={bankData.is_internal ? 'blue' : 'default'}>
                  {bankData.is_internal ? 'Nội bộ' : 'Bên ngoài'}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Quốc gia">
                {bankData.country || 'VN'}
              </Descriptions.Item>
              {bankData.notes && (
                <Descriptions.Item label="Ghi chú">
                  {bankData.notes}
                </Descriptions.Item>
              )}
            </Descriptions>
          </Card>
        </Col>

        <Col xs={24} lg={8}>
          <Card title="Thông Tin Tài Khoản">
            <Descriptions column={1} size="small">
              <Descriptions.Item label="Tên tài khoản">
                <strong>{account.account_name}</strong>
              </Descriptions.Item>
              <Descriptions.Item label="Số tài khoản">
                {account.account_number}
              </Descriptions.Item>
              <Descriptions.Item label="Loại">
                <Tag color="purple">
                  {account.account_type === 'main' ? 'Tài khoản chính' : account.account_type}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Tiền tệ">
                {account.currency || 'VND'}
              </Descriptions.Item>
              <Descriptions.Item label="Trạng thái">
                <Tag color={account.status === 'active' ? 'green' : 'red'}>
                  {account.status === 'active' ? 'Hoạt động' : account.status}
                </Tag>
              </Descriptions.Item>
            </Descriptions>
          </Card>
        </Col>

        <Col xs={24} lg={8}>
          <Card title="Số Dư">
            <Space direction="vertical" size="large" style={{ width: '100%' }}>
              <Statistic
                title="Số dư hiện tại"
                value={account.balance || 0}
                prefix={<DollarOutlined />}
                suffix="VND"
                valueStyle={{ color: '#1890ff', fontSize: '24px' }}
              />
              <Divider style={{ margin: '12px 0' }} />
              <Row gutter={16}>
                <Col span={12}>
                  <Statistic
                    title="Khả dụng"
                    value={account.available_balance || 0}
                    prefix={<ArrowUpOutlined />}
                    suffix="VND"
                    valueStyle={{ color: '#52c41a', fontSize: '16px' }}
                  />
                </Col>
                <Col span={12}>
                  <Statistic
                    title="Đang chờ"
                    value={account.pending_balance || 0}
                    prefix={<ArrowDownOutlined />}
                    suffix="VND"
                    valueStyle={{ color: '#faad14', fontSize: '16px' }}
                  />
                </Col>
              </Row>
            </Space>
          </Card>
        </Col>
      </Row>

      <Card 
        title={
          <Space>
            <HistoryOutlined />
            <span>Lịch Sử Giao Dịch Gần Đây</span>
          </Space>
        }
      >
        {transactions.length === 0 ? (
          <Empty description="Chưa có giao dịch nào" />
        ) : (
          <Table
            columns={transactionColumns}
            dataSource={transactions}
            rowKey="txn_id"
            pagination={false}
            size="small"
          />
        )}
      </Card>
    </div>
  );
};

export default AdminBank;

