import React, { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { matchPath, useLocation, useNavigate, useOutlet } from 'react-router-dom';
import type { KeepAliveLayoutProps, KeepAlivePolicy, RouteConfig, RouteInfo, TabItem } from './types';
import { KeepAliveContext } from './context';
import TabsBar from './TabsBar';

type CachedTabItem = TabItem & {
  lastVisitedAt: number;
  expireAt?: number;
};

const STORAGE_KEY = '__keepalive_tabs_list__';

const defaultStorage = {
  read: (key: string) => {
    if (typeof window === 'undefined') return null;
    return window.sessionStorage.getItem(key);
  },
  write: (key: string, value: string) => {
    if (typeof window === 'undefined') return;
    window.sessionStorage.setItem(key, value);
  },
};

const resolveRouteInfo = (routeConfig: RouteConfig, pathname: string): RouteInfo | null => {
  if (routeConfig[pathname]) return routeConfig[pathname];
  for (const [pattern, info] of Object.entries(routeConfig)) {
    if (matchPath(pattern, pathname)) return info;
  }
  return null;
};

const resolveKeepAlivePolicy = (policy: KeepAlivePolicy | undefined) => {
  if (policy === false) {
    return { enabled: false, max: undefined as number | undefined, ttl: undefined as number | undefined, reuse: true };
  }
  if (policy === true || typeof policy === 'undefined') {
    return { enabled: true, max: undefined as number | undefined, ttl: undefined as number | undefined, reuse: true };
  }
  return {
    enabled: policy.enabled !== false,
    max: policy.max,
    ttl: policy.ttl,
    reuse: policy.reuse !== false,
  };
};

const readSavedKeys = (read: (key: string) => string | null, storageKey: string): string[] => {
  try {
    const raw = read(storageKey);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(parsed) ? parsed.map((x) => `${x}`.toLowerCase()).filter(Boolean) : [];
  } catch {
    return [];
  }
};

const encodeTabKey = (path: string) => {
  const raw = encodeURIComponent(path);
  const b64 = btoa(raw);
  return `t_${b64.replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '')}`;
};

const normalizePath = (path: string) => `${path}`.toLowerCase();

const KeepAliveLayout: React.FC<KeepAliveLayoutProps> = ({
  routeConfig,
  namespace = 'default',
  storage = defaultStorage,
  onTabOpen,
  onTabClose,
  onRestore,
}) => {
  const location = useLocation();
  const navigate = useNavigate();
  const outlet = useOutlet();

  const routePath = normalizePath(location.pathname);
  const routeInfo = useMemo(() => resolveRouteInfo(routeConfig, routePath), [routeConfig, routePath]);
  const policy = useMemo(() => resolveKeepAlivePolicy(routeInfo?.keepAlive), [routeInfo]);
  const activePath = useMemo(
    () => normalizePath(policy.reuse ? location.pathname : `${location.pathname}${location.search}`),
    [location.pathname, location.search, policy.reuse],
  );
  const [, forceUpdate] = useState(0);

  const storageKey = `${STORAGE_KEY}:${namespace}`;
  const writeSavedKeys = useCallback(
    (keys: string[]) => {
      storage.write(storageKey, JSON.stringify(keys));
    },
    [storage, storageKey],
  );

  const tabsRef = useRef<Record<string, CachedTabItem>>({});
  const [orderKeys, setOrderKeys] = useState<string[]>(() => {
    const saved = readSavedKeys(storage.read, storageKey);
    onRestore?.(saved);
    const keys = Array.from(new Set([...saved, activePath]));
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
        lastVisitedAt: Date.now(),
      };
    });
    writeSavedKeys(keys);
    return keys;
  });

  const pruneByTTL = useCallback(() => {
    const now = Date.now();
    const staleKeys = Object.keys(tabsRef.current).filter((key) => {
      const tab = tabsRef.current[key];
      return tab?.expireAt !== undefined && tab.expireAt <= now;
    });
    if (!staleKeys.length) return;

    setOrderKeys((prev) => {
      const next = prev.filter((k) => !staleKeys.includes(k));
      staleKeys.forEach((k) => delete tabsRef.current[k]);
      writeSavedKeys(next);
      return next;
    });
  }, [writeSavedKeys]);

  const ensureMaxTabs = useCallback(
    (max: number | undefined) => {
      if (!max || max < 1) return;
      setOrderKeys((prev) => {
        if (prev.length <= max) return prev;
        const candidates = prev.filter((k) => k !== activePath);
        const removeCount = Math.max(prev.length - max, 0);
        const toRemove = candidates.slice(0, removeCount);
        if (!toRemove.length) return prev;
        const next = prev.filter((k) => !toRemove.includes(k));
        toRemove.forEach((k) => {
          const t = tabsRef.current[k];
          if (t) onTabClose?.({ path: t.path, title: t.title });
          delete tabsRef.current[k];
        });
        writeSavedKeys(next);
        return next;
      });
    },
    [activePath, onTabClose, writeSavedKeys],
  );

  useLayoutEffect(() => {
    pruneByTTL();
  }, [pruneByTTL]);

  useLayoutEffect(() => {
    if (!policy.enabled) return;

    if (!tabsRef.current[activePath]) {
      tabsRef.current[activePath] = {
        path: activePath,
        tabKey: encodeTabKey(activePath),
        title: routeInfo?.name || activePath,
        icon: routeInfo?.icon,
        closable: true,
        content: null,
        cacheKey: 1,
        lastVisitedAt: Date.now(),
        expireAt: policy.ttl ? Date.now() + policy.ttl : undefined,
      };
      onTabOpen?.({ path: activePath, title: tabsRef.current[activePath].title });
    } else {
      tabsRef.current[activePath].title = routeInfo?.name || activePath;
      tabsRef.current[activePath].icon = routeInfo?.icon;
      tabsRef.current[activePath].lastVisitedAt = Date.now();
      tabsRef.current[activePath].expireAt = policy.ttl ? Date.now() + policy.ttl : undefined;
    }

    setOrderKeys((prev) => {
      if (prev.includes(activePath)) return prev;
      const next = [...prev, activePath];
      writeSavedKeys(next);
      return next;
    });

    ensureMaxTabs(policy.max);
  }, [activePath, ensureMaxTabs, onTabOpen, policy.enabled, policy.max, policy.ttl, routeInfo, writeSavedKeys]);

  useLayoutEffect(() => {
    if (!policy.enabled) return;
    const current = tabsRef.current[activePath];
    if (!current) return;
    current.content = outlet;
  }, [activePath, policy.enabled, outlet]);

  const tabs = useMemo(() => {
    const list = orderKeys.map((k) => tabsRef.current[k]).filter(Boolean) as TabItem[];
    const closable = list.length > 1;
    return list.map((t) => ({ ...t, closable, content: null }));
  }, [orderKeys]);

  const closeTab = useCallback(
    (path: string) => {
      const target = normalizePath(path);
      setOrderKeys((prev) => {
        if (!prev.includes(target) || prev.length <= 1) return prev;
        const next = prev.filter((k) => k !== target);
        const tab = tabsRef.current[target];
        if (tab) onTabClose?.({ path: tab.path, title: tab.title });
        delete tabsRef.current[target];
        writeSavedKeys(next);

        if (target === activePath) {
          const nextKey = next[next.length - 1] || '/';
          navigate(nextKey, { replace: true });
        }
        return next;
      });
    },
    [activePath, navigate, onTabClose, writeSavedKeys],
  );

  const refreshTab = useCallback((path: string) => {
    const target = normalizePath(path);
    const current = tabsRef.current[target];
    if (!current) return;
    current.cacheKey += 1;
    forceUpdate((v) => v + 1);
  }, []);

  const reorderTabs = useCallback(
    (newOrderKeys: string[]) => {
      const next = newOrderKeys.map(normalizePath).filter(Boolean);
      const seen = new Set<string>();
      const deduped = next.filter((k) => (seen.has(k) ? false : (seen.add(k), true)));
      const filtered = deduped.filter((k) => Boolean(tabsRef.current[k]));
      if (!filtered.length) return;
      setOrderKeys(filtered);
      writeSavedKeys(filtered);
    },
    [writeSavedKeys],
  );

  const applyNextOrder = useCallback(
    (nextOrder: string[], nextActive?: string) => {
      const normalized = nextOrder.map(normalizePath).filter(Boolean);
      const seen = new Set<string>();
      const deduped = normalized.filter((k) => (seen.has(k) ? false : (seen.add(k), true)));
      const filtered = deduped.filter((k) => Boolean(tabsRef.current[k]));
      const finalOrder = filtered.length ? filtered : [activePath];

      const keepSet = new Set(finalOrder);
      Object.keys(tabsRef.current).forEach((k) => {
        if (!keepSet.has(k)) {
          const tab = tabsRef.current[k];
          if (tab) onTabClose?.({ path: tab.path, title: tab.title });
          delete tabsRef.current[k];
        }
      });

      setOrderKeys(finalOrder);
      writeSavedKeys(finalOrder);

      if (!finalOrder.includes(activePath)) {
        const target = (nextActive ? normalizePath(nextActive) : '') || finalOrder[finalOrder.length - 1] || '/';
        navigate(target, { replace: true });
      }
    },
    [activePath, navigate, onTabClose, writeSavedKeys],
  );

  const dropOtherTabs = useCallback(
    (path: string) => {
      const target = normalizePath(path);
      if (!tabsRef.current[target]) return;
      applyNextOrder([target], target);
    },
    [applyNextOrder],
  );

  const dropLeftTabs = useCallback(
    (path: string) => {
      const target = normalizePath(path);
      const idx = orderKeys.indexOf(target);
      if (idx < 0) return;
      applyNextOrder(orderKeys.slice(idx), target);
    },
    [applyNextOrder, orderKeys],
  );

  const dropRightTabs = useCallback(
    (path: string) => {
      const target = normalizePath(path);
      const idx = orderKeys.indexOf(target);
      if (idx < 0) return;
      applyNextOrder(orderKeys.slice(0, idx + 1), target);
    },
    [applyNextOrder, orderKeys],
  );

  if (!policy.enabled) return <div className="tabs-content">{outlet}</div>;

  return (
    <KeepAliveContext.Provider
      value={{
        activePath,
        activeTabKey: encodeTabKey(activePath),
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
            const content = key === activePath ? outlet : t.content;
            return (
              <div
                key={t.path}
                style={{
                  height: '100%',
                  display: t.path === activePath ? 'block' : 'none',
                  overflow: 'auto',
                  background: '#f5f5f5',
                }}
              >
                <React.Fragment key={t.cacheKey}>{content}</React.Fragment>
              </div>
            );
          })}
        </div>
      </div>
    </KeepAliveContext.Provider>
  );
};

export default KeepAliveLayout;
