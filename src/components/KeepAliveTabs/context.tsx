import React from 'react';
import type { TabItem } from './types';

type KeepAliveContextValue = {
  activePath: string;
  activeTabKey: string;
  tabs: TabItem[];
  closeTab: (path: string) => void;
  refreshTab: (path: string) => void;
  reorderTabs: (newOrderPaths: string[]) => void;
  dropLeftTabs: (path: string) => void;
  dropRightTabs: (path: string) => void;
  dropOtherTabs: (path: string) => void;
};

export const KeepAliveContext = React.createContext<KeepAliveContextValue | null>(null);

export const useKeepAliveContext = () => {
  const ctx = React.useContext(KeepAliveContext);
  if (!ctx) throw new Error('KeepAliveContext not found');
  return ctx;
};
