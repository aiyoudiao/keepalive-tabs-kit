import React from 'react';
import { useLocation, useNavigate, useOutlet } from 'react-router-dom';
import type { KeepAliveLayoutProps } from './types';
import { KeepAliveContext } from './context';
import { useKeepAliveManager } from './core/useKeepAliveManager';
import TabsBar from './TabsBar';

const KeepAliveLayout: React.FC<KeepAliveLayoutProps> = ({ routeConfig, namespace, storage, onTabOpen, onTabClose, onRestore }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const outlet = useOutlet();

  const manager = useKeepAliveManager({
    routeConfig,
    namespace,
    storage,
    onTabOpen,
    onTabClose,
    onRestore,
    location,
    outlet,
    navigate,
  });

  if (!manager.enabled) return <div className="tabs-content">{outlet}</div>;

  return (
    <KeepAliveContext.Provider
      value={{
        activePath: manager.activePath,
        activeTabKey: manager.activeTabKey,
        tabs: manager.tabs,
        closeTab: manager.closeTab,
        refreshTab: manager.refreshTab,
        reorderTabs: manager.reorderTabs,
        dropLeftTabs: manager.dropLeftTabs,
        dropRightTabs: manager.dropRightTabs,
        dropOtherTabs: manager.dropOtherTabs,
      }}
    >
      <div className="app-shell">
        <TabsBar />
        <div className="tabs-content">
          {manager.cachedViews.map((view) => {
            if (!view) return null;
            return (
              <div
                key={view.path}
                style={{
                  height: '100%',
                  display: view.isActive ? 'block' : 'none',
                  overflow: 'auto',
                  background: '#f5f5f5',
                }}
              >
                <React.Fragment key={view.cacheKey}>{view.content}</React.Fragment>
              </div>
            );
          })}
        </div>
      </div>
    </KeepAliveContext.Provider>
  );
};

export default KeepAliveLayout;
