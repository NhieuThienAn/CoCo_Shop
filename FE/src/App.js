import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { ConfigProvider } from 'antd';
import viVN from 'antd/locale/vi_VN';
import { AuthProvider } from './contexts/AuthContext.js';
import AppRoutes from './routes/AppRoutes.js';
import 'antd/dist/reset.css';
import './App.scss';

function App() {
  return (
    <ConfigProvider locale={viVN}>
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </ConfigProvider>
  );
}

export default App;
