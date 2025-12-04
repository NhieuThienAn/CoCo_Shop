import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Spin } from 'antd';
import AdminLayout from '../layouts/AdminLayout.js';
import CustomerLayout from '../layouts/CustomerLayout.js';
import ShipperLayout from '../layouts/ShipperLayout.js';
import PrivateRoute from '../components/PrivateRoute.js';

// Loading fallback component
const LoadingFallback = () => (
  <div style={{ 
    display: 'flex', 
    justifyContent: 'center', 
    alignItems: 'center', 
    minHeight: '50vh' 
  }}>
    <Spin size="large" />
  </div>
);

// Lazy load Customer Pages
const Home = lazy(() => import('../pages/customer/Home.js'));
const Products = lazy(() => import('../pages/customer/Products.js'));
const ProductDetail = lazy(() => import('../pages/customer/ProductDetail.js'));
const Cart = lazy(() => import('../pages/customer/Cart.js'));
const Checkout = lazy(() => import('../pages/customer/Checkout.js'));
const Orders = lazy(() => import('../pages/customer/Orders.js'));
const Profile = lazy(() => import('../pages/customer/Profile.js'));
const Wishlist = lazy(() => import('../pages/customer/Wishlist.js'));
const Promotions = lazy(() => import('../pages/customer/Promotions.js'));
const Blog = lazy(() => import('../pages/customer/Blog.js'));
const Register = lazy(() => import('../pages/customer/Register.js'));
const VerifyEmail = lazy(() => import('../pages/customer/VerifyEmail.js'));

// Lazy load Admin Pages
const AdminDashboard = lazy(() => import('../pages/admin/Dashboard.js'));
const AdminProducts = lazy(() => import('../pages/admin/Products.js'));
const AdminProductForm = lazy(() => import('../pages/admin/ProductForm.js'));
const AdminOrders = lazy(() => import('../pages/admin/Orders.js'));
const AdminOrderDetail = lazy(() => import('../pages/admin/OrderDetail.js'));
const AdminUsers = lazy(() => import('../pages/admin/Users.js'));
const AdminCategories = lazy(() => import('../pages/admin/Categories.js'));
const AdminStockReceipts = lazy(() => import('../pages/admin/StockReceipts.js'));
const StockReceiptProductSelect = lazy(() => import('../pages/admin/StockReceiptProductSelect.js'));
const StockReceiptForm = lazy(() => import('../pages/admin/StockReceiptForm.js'));
const StockReceiptDetail = lazy(() => import('../pages/admin/StockReceiptDetail.js'));
const WarehouseManagement = lazy(() => import('../pages/admin/WarehouseManagement.js'));
const AdminBank = lazy(() => import('../pages/admin/Bank.js'));
const AdminStatistics = lazy(() => import('../pages/admin/Statistics.js'));
const AdminCartManagement = lazy(() => import('../pages/admin/CartManagement.js'));

// Lazy load Shipper Pages
const ShipperOrders = lazy(() => import('../pages/shipper/Orders.js'));
const ShipperProfile = lazy(() => import('../pages/shipper/Profile.js'));

const AppRoutes = () => {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <Routes>
        {/* Customer Routes */}
        <Route path="/" element={<CustomerLayout />}>
          <Route index element={<Home />} />
          <Route path="products" element={<Products />} />
          <Route path="products/:id" element={<ProductDetail />} />
          {/* Protected routes - STRICTLY for customers only (role 3) */}
          <Route path="cart" element={<PrivateRoute allowedRoles={3}><Cart /></PrivateRoute>} />
          <Route path="checkout" element={<PrivateRoute allowedRoles={3}><Checkout /></PrivateRoute>} />
          <Route path="orders" element={<PrivateRoute allowedRoles={3}><Orders /></PrivateRoute>} />
          <Route path="orders/:id" element={<PrivateRoute allowedRoles={3}><Orders /></PrivateRoute>} />
          <Route path="profile" element={<PrivateRoute allowedRoles={3}><Profile /></PrivateRoute>} />
          <Route path="wishlist" element={<PrivateRoute allowedRoles={3}><Wishlist /></PrivateRoute>} />
          {/* Public routes */}
          <Route path="promotions" element={<Promotions />} />
          <Route path="blog" element={<Blog />} />
          <Route path="register" element={<Register />} />
          <Route path="verify-email" element={<VerifyEmail />} />
        </Route>

        {/* Admin Routes - Only accessible by Admin (role 1) */}
        <Route path="/admin" element={<PrivateRoute allowedRoles={1}><AdminLayout /></PrivateRoute>}>
          <Route index element={<Navigate to="/admin/dashboard" replace />} />
          <Route path="dashboard" element={<AdminDashboard />} />
          <Route path="products" element={<AdminProducts />} />
          <Route path="products/:id" element={<AdminProductForm />} />
          <Route path="products/new" element={<AdminProductForm />} />
          <Route path="orders" element={<AdminOrders />} />
          <Route path="orders/:id" element={<AdminOrderDetail />} />
          <Route path="users" element={<AdminUsers />} />
          <Route path="categories" element={<AdminCategories />} />
          <Route path="warehouse" element={<WarehouseManagement />} />
          <Route path="warehouse" element={<WarehouseManagement />} />
          <Route path="warehouse/stock-receipts" element={<WarehouseManagement />} />
          <Route path="warehouse/stock-receipts/:id" element={<StockReceiptDetail />} />
          <Route path="warehouse/stock-receipts/select-products" element={<StockReceiptProductSelect />} />
          <Route path="warehouse/stock-receipts/create" element={<StockReceiptForm />} />
          {/* Legacy routes for backward compatibility */}
          <Route path="inventory" element={<Navigate to="/admin/warehouse?tab=pending-products" replace />} />
          <Route path="stock-receipts" element={<Navigate to="/admin/warehouse?tab=stock-receipts" replace />} />
          <Route path="stock-receipts/:id" element={<StockReceiptDetail />} />
          <Route path="stock-receipts/select-products" element={<StockReceiptProductSelect />} />
          <Route path="stock-receipts/create" element={<StockReceiptForm />} />
          <Route path="bank" element={<AdminBank />} />
          <Route path="statistics" element={<AdminStatistics />} />
          <Route path="carts" element={<AdminCartManagement />} />
        </Route>

        {/* Shipper Routes - Only accessible by Shipper (role 2) */}
        <Route path="/shipper" element={<PrivateRoute allowedRoles={2}><ShipperLayout /></PrivateRoute>}>
          <Route index element={<Navigate to="/shipper/orders" replace />} />
          <Route path="orders" element={<ShipperOrders />} />
          <Route path="orders/:id" element={<ShipperOrders />} />
          <Route path="profile" element={<ShipperProfile />} />
        </Route>

        {/* 404 */}
        <Route path="*" element={<div>404 - Page Not Found</div>} />
      </Routes>
    </Suspense>
  );
};

export default AppRoutes;
