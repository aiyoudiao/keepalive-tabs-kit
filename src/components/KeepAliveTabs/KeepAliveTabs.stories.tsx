import { HomeOutlined, InfoCircleOutlined, NumberOutlined } from '@ant-design/icons';
import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { RouterProvider, createMemoryRouter } from 'react-router-dom';
import { KeepAliveLayout, RouteConfig } from '@/components/KeepAliveTabs';
import About from '@/pages/About';
import Counter from '@/pages/Counter';
import Home from '@/pages/Home';
import NotFound from '@/pages/Errors/404';

const meta: Meta = {
  title: 'KeepAliveTabs/Kit',
};

export default meta;

type Story = StoryObj;

export const Demo: Story = {
  render: () => {
    const routeConfig: RouteConfig = {
      '/': { name: '首页', icon: <HomeOutlined /> },
      '/about': { name: '关于', icon: <InfoCircleOutlined /> },
      '/counter/:id': { name: 'Counter', icon: <NumberOutlined /> },
    };

    const router = createMemoryRouter(
      [
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
      ],
      { initialEntries: ['/'] },
    );

    return <RouterProvider router={router} />;
  },
};

