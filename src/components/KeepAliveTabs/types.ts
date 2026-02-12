import React from 'react';

export type RouteInfo = {
  name: string;
  icon?: React.ReactNode;
  keepAlive?: boolean;
};

export type RouteConfig = Record<string, RouteInfo>;

export type TabItem = {
  path: string;
  tabKey: string;
  title: string;
  icon?: React.ReactNode;
  closable: boolean;
  content: React.ReactNode | null;
  cacheKey: number;
};
