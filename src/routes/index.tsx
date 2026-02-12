import { HomeOutlined, InfoCircleOutlined, NumberOutlined } from '@ant-design/icons';
import React from 'react';
import { createBrowserRouter } from 'react-router-dom';
import { KeepAliveLayout, RouteConfig } from '@/components/KeepAliveTabs';
import Home from '@/pages/Home';
import About from '@/pages/About';
import Counter from '@/pages/Counter';
import NotFound from '@/pages/Errors/404';

export const routeConfig: RouteConfig = {
  '/': { name: '首页', icon: <HomeOutlined /> },
  '/about': { name: '关于', icon: <InfoCircleOutlined /> },
  '/counter/:id': { name: 'Counter', icon: <NumberOutlined /> },
  '/404': { name: '404', keepAlive: false },
};

export const router = createBrowserRouter([
  {
    path: '/',
    element: <KeepAliveLayout routeConfig={routeConfig} />,
    children: [
      { index: true, element: <Home /> },
      { path: 'about', element: <About /> },
      { path: 'counter/:id', element: <Counter /> },
      { path: '*', element: <NotFound /> },
    ],
  },
]);

