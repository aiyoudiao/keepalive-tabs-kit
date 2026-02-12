import React from 'react';

export type KeepAlivePolicy =
  | boolean
  | {
      enabled?: boolean;
      max?: number;
      ttl?: number;
      reuse?: boolean;
    };

export type RouteInfo = {
  name: string;
  icon?: React.ReactNode;
  keepAlive?: KeepAlivePolicy;
};

export type RouteConfig = Record<string, RouteInfo>;

export type KeepAliveStorageAdapter = {
  read: (key: string) => string | null;
  write: (key: string, value: string) => void;
};

export type KeepAliveLifecyclePayload = {
  path: string;
  title: string;
};

export type KeepAliveLayoutProps = {
  routeConfig: RouteConfig;
  namespace?: string;
  storage?: KeepAliveStorageAdapter;
  onTabOpen?: (payload: KeepAliveLifecyclePayload) => void;
  onTabClose?: (payload: KeepAliveLifecyclePayload) => void;
  onRestore?: (paths: string[]) => void;
};

export type TabItem = {
  path: string;
  tabKey: string;
  title: string;
  icon?: React.ReactNode;
  closable: boolean;
  content: React.ReactNode | null;
  cacheKey: number;
};
