import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Tabs, Typography } from 'antd';
import PendingOrderProducts from './PendingOrderProducts.js';
import AdminStockReceipts from './StockReceipts.js';

const { Title } = Typography;

const WarehouseManagement = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const tabFromUrl = searchParams.get('tab') || 'pending-products';
  const [activeTab, setActiveTab] = useState(tabFromUrl);

  useEffect(() => {
    // Sync URL with active tab
    if (tabFromUrl !== activeTab) {
      setActiveTab(tabFromUrl);
    }
  }, [tabFromUrl, activeTab]);

  const handleTabChange = (key) => {
    setActiveTab(key);
    setSearchParams({ tab: key });
  };

  const tabItems = [
    {
      key: 'pending-products',
      label: 'Sản Phẩm Cần Đặt',
      children: <PendingOrderProducts />,
    },
    {
      key: 'stock-receipts',
      label: 'Phiếu Nhập Kho',
      children: <AdminStockReceipts />,
    },
  ];

  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <Title level={2} style={{ margin: 0 }}>Quản Lý Kho</Title>
      </div>
      <Tabs
        activeKey={activeTab}
        onChange={handleTabChange}
        items={tabItems}
        size="large"
      />
    </div>
  );
};

export default WarehouseManagement;
