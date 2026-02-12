import 'antd/dist/reset.css';
import { ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import React from 'react';
import ReactDOM from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import ErrorBoundary from '@/pages/Errors/ErrorBoundary';
import { router } from '@/routes';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <ConfigProvider locale={zhCN}>
    <ErrorBoundary>
      <RouterProvider router={router} />
    </ErrorBoundary>
  </ConfigProvider>,
);

