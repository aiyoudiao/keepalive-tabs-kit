import React, { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { matchPath, useLocation, useNavigate, useOutlet } from 'react-router-dom';
import type { RouteConfig, RouteInfo, TabItem } from './types';
import { KeepAliveContext } from './context';
import TabsBar from './TabsBar';

type Props = {
  routeConfig: RouteConfig;
};

const STORAGE_KEY = '__keepalive_tabs_list__';

const readSavedKeys = (): string[] => {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(parsed) ? parsed.map((x) => `${x}`.toLowerCase()).filter(Boolean) : [];
  } catch {
    return [];
  }
};

const writeSavedKeys = (keys: string[]) => {
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(keys));
};

const resolveRouteInfo = (routeConfig: RouteConfig, pathname: string): RouteInfo | null => {
  if (routeConfig[pathname]) return routeConfig[pathname];
  for (const [pattern, info] of Object.entries(routeConfig)) {
    if (matchPath(pattern, pathname)) return info;
  }
  return null;
};

const encodeTabKey = (path: string) => {
  const raw = encodeURIComponent(path);
  const b64 = btoa(raw);
  return `t_${b64.replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '')}`;
};

const KeepAliveLayout: React.FC<Props> = ({ routeConfig }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const outlet = useOutlet();
  const activeKey = location.pathname.toLowerCase();
  const [, forceUpdate] = useState(0);

  const tabsRef = useRef<Record<string, TabItem>>({});
  const [orderKeys, setOrderKeys] = useState<string[]>(() => {
    const saved = readSavedKeys();
    const keys = Array.from(new Set([...saved, activeKey]));
    keys.forEach((k, idx) => {
      const info = resolveRouteInfo(routeConfig, k);
      tabsRef.current[k] = {
        path: k,
        tabKey: encodeTabKey(k),
        title: info?.name || k || `Tab ${idx + 1}`,
        icon: info?.icon,
        closable: keys.length > 1,
        content: null,
        cacheKey: 1,
      };
    });
    writeSavedKeys(keys);
    return keys;
  });

  const keepAlive = useMemo(() => {
    const info = resolveRouteInfo(routeConfig, activeKey);
    return info?.keepAlive !== false;
  }, [activeKey, routeConfig]);

  useLayoutEffect(() => {
    if (!keepAlive) return;
    const info = resolveRouteInfo(routeConfig, activeKey);
    if (!tabsRef.current[activeKey]) {
      tabsRef.current[activeKey] = {
        path: activeKey,
        tabKey: encodeTabKey(activeKey),
        title: info?.name || activeKey,
        icon: info?.icon,
        closable: true,
        content: null,
        cacheKey: 1,
      };
    } else {
      tabsRef.current[activeKey].title = info?.name || activeKey;
      tabsRef.current[activeKey].icon = info?.icon;
    }

    setOrderKeys((prev) => {
      if (prev.includes(activeKey)) return prev;
      const next = [...prev, activeKey];
      writeSavedKeys(next);
      return next;
    });
  }, [activeKey, keepAlive, routeConfig]);

  useLayoutEffect(() => {
    if (!keepAlive) return;
    const current = tabsRef.current[activeKey];
    if (!current) return;
    current.content = outlet;
  }, [activeKey, keepAlive, outlet]);

  const tabs = useMemo(() => {
    const list = orderKeys.map((k) => tabsRef.current[k]).filter(Boolean) as TabItem[];
    const closable = list.length > 1;
    return list.map((t) => ({ ...t, closable, content: null }));
  }, [orderKeys]);

  const closeTab = useCallback(
    (path: string) => {
      const target = `${path}`.toLowerCase();
      setOrderKeys((prev) => {
        if (!prev.includes(target)) return prev;
        if (prev.length <= 1) return prev;

        const next = prev.filter((k) => k !== target);
        delete tabsRef.current[target];
        writeSavedKeys(next);

        if (target === activeKey) {
          const nextKey = next[next.length - 1] || '/';
          navigate(nextKey, { replace: true });
        }
        return next;
      });
    },
    [activeKey, navigate],
  );

  const refreshTab = useCallback((path: string) => {
    const target = `${path}`.toLowerCase();
    const current = tabsRef.current[target];
    if (!current) return;
    current.cacheKey += 1;
    forceUpdate((v) => v + 1);
  }, []);

  const reorderTabs = useCallback((newOrderKeys: string[]) => {
    const next = newOrderKeys.map((k) => `${k}`.toLowerCase()).filter(Boolean);
    const seen = new Set<string>();
    const deduped = next.filter((k) => (seen.has(k) ? false : (seen.add(k), true)));
    const filtered = deduped.filter((k) => Boolean(tabsRef.current[k]));
    if (!filtered.length) return;
    setOrderKeys(filtered);
    writeSavedKeys(filtered);
  }, []);

  const applyNextOrder = useCallback(
    (nextOrder: string[], nextActive?: string) => {
      const normalized = nextOrder.map((k) => `${k}`.toLowerCase()).filter(Boolean);
      const seen = new Set<string>();
      const deduped = normalized.filter((k) => (seen.has(k) ? false : (seen.add(k), true)));
      const filtered = deduped.filter((k) => Boolean(tabsRef.current[k]));
      const finalOrder = filtered.length ? filtered : [activeKey];

      const keepSet = new Set(finalOrder);
      Object.keys(tabsRef.current).forEach((k) => {
        if (!keepSet.has(k)) delete tabsRef.current[k];
      });

      setOrderKeys(finalOrder);
      writeSavedKeys(finalOrder);

      if (!finalOrder.includes(activeKey)) {
        const target = (nextActive ? `${nextActive}`.toLowerCase() : '') || finalOrder[finalOrder.length - 1] || '/';
        navigate(target, { replace: true });
      }
    },
    [activeKey, navigate],
  );

  const dropOtherTabs = useCallback(
    (path: string) => {
      const target = `${path}`.toLowerCase();
      if (!tabsRef.current[target]) return;
      applyNextOrder([target], target);
    },
    [applyNextOrder],
  );

  const dropLeftTabs = useCallback(
    (path: string) => {
      const target = `${path}`.toLowerCase();
      const idx = orderKeys.indexOf(target);
      if (idx < 0) return;
      applyNextOrder(orderKeys.slice(idx), target);
    },
    [applyNextOrder, orderKeys],
  );

  const dropRightTabs = useCallback(
    (path: string) => {
      const target = `${path}`.toLowerCase();
      const idx = orderKeys.indexOf(target);
      if (idx < 0) return;
      applyNextOrder(orderKeys.slice(0, idx + 1), target);
    },
    [applyNextOrder, orderKeys],
  );

  if (!keepAlive) return <div className="tabs-content">{outlet}</div>;

  return (
    <KeepAliveContext.Provider
      value={{
        activePath: activeKey,
        activeTabKey: encodeTabKey(activeKey),
        tabs,
        closeTab,
        refreshTab,
        reorderTabs,
        dropLeftTabs,
        dropRightTabs,
        dropOtherTabs,
      }}
    >
      <div className="app-shell">
        <TabsBar />
        <div className="tabs-content">
          {orderKeys.map((key) => {
            const t = tabsRef.current[key];
            if (!t) return null;
            const content = key === activeKey ? outlet : t.content;
            return (
            <div
              key={t.path}
              style={{
                height: '100%',
                display: t.path === activeKey ? 'block' : 'none',
                overflow: 'auto',
                background: '#f5f5f5',
              }}
            >
              <React.Fragment key={t.cacheKey}>{content}</React.Fragment>
            </div>
          )})}
        </div>
      </div>
    </KeepAliveContext.Provider>
  );
};

export default KeepAliveLayout;
