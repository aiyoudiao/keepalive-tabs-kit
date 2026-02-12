import { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { matchPath } from 'react-router-dom';
import type { KeepAliveLayoutProps, KeepAlivePolicy, RouteConfig, RouteInfo, TabItem } from '../types';

type CachedTabItem = TabItem & {
  createdAt: number;
  lastVisitedAt: number;
  expireAt?: number;
};

type UseKeepAliveManagerProps = KeepAliveLayoutProps & {
  location: { pathname: string; search: string };
  outlet: React.ReactNode;
  navigate: (to: string, opts?: { replace?: boolean }) => void;
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

const normalizePath = (path: string) => `${path}`.toLowerCase();

const resolveRouteInfo = (routeConfig: RouteConfig, pathname: string): RouteInfo | null => {
  if (routeConfig[pathname]) return routeConfig[pathname];
  for (const [pattern, info] of Object.entries(routeConfig)) {
    if (matchPath(pattern, pathname)) return info;
  }
  return null;
};

const resolveKeepAlivePolicy = (policy: KeepAlivePolicy | undefined) => {
  if (policy === false) {
    return {
      enabled: false,
      max: undefined as number | undefined,
      ttl: undefined as number | undefined,
      reuse: true,
      strategy: 'lru' as const,
    };
  }
  if (policy === true || typeof policy === 'undefined') {
    return {
      enabled: true,
      max: undefined as number | undefined,
      ttl: undefined as number | undefined,
      reuse: true,
      strategy: 'lru' as const,
    };
  }
  return {
    enabled: policy.enabled !== false,
    max: policy.max,
    ttl: policy.ttl,
    reuse: policy.reuse !== false,
    strategy: policy.strategy || 'lru',
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

export const useKeepAliveManager = ({
  routeConfig,
  namespace = 'default',
  storage = defaultStorage,
  onTabOpen,
  onTabClose,
  onRestore,
  location,
  outlet,
  navigate,
}: UseKeepAliveManagerProps) => {
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
      const now = Date.now();
      tabsRef.current[k] = {
        path: k,
        tabKey: encodeTabKey(k),
        title: info?.name || k || `Tab ${idx + 1}`,
        icon: info?.icon,
        closable: keys.length > 1,
        content: null,
        cacheKey: 1,
        createdAt: now,
        lastVisitedAt: now,
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
    (max: number | undefined, strategy: 'lru' | 'fifo') => {
      if (!max || max < 1) return;
      setOrderKeys((prev) => {
        if (prev.length <= max) return prev;
        const candidates = prev.filter((k) => k !== activePath);
        const removeCount = Math.max(prev.length - max, 0);
        const sorted = [...candidates].sort((a, b) => {
          const ta = tabsRef.current[a];
          const tb = tabsRef.current[b];
          const av = strategy === 'fifo' ? ta?.createdAt || 0 : ta?.lastVisitedAt || 0;
          const bv = strategy === 'fifo' ? tb?.createdAt || 0 : tb?.lastVisitedAt || 0;
          return av - bv;
        });
        const toRemove = sorted.slice(0, removeCount);
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
      const now = Date.now();
      tabsRef.current[activePath] = {
        path: activePath,
        tabKey: encodeTabKey(activePath),
        title: routeInfo?.name || activePath,
        icon: routeInfo?.icon,
        closable: true,
        content: null,
        cacheKey: 1,
        createdAt: now,
        lastVisitedAt: now,
        expireAt: policy.ttl ? now + policy.ttl : undefined,
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

    ensureMaxTabs(policy.max, policy.strategy);
  }, [activePath, ensureMaxTabs, onTabOpen, policy.enabled, policy.max, policy.strategy, policy.ttl, routeInfo, writeSavedKeys]);

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

  const cachedViews = useMemo(
    () =>
      orderKeys.map((key) => {
        const t = tabsRef.current[key];
        if (!t) return null;
        return {
          key,
          path: t.path,
          cacheKey: t.cacheKey,
          content: key === activePath ? outlet : t.content,
          isActive: t.path === activePath,
        };
      }),
    [activePath, orderKeys, outlet],
  );

  return {
    enabled: policy.enabled,
    activePath,
    activeTabKey: encodeTabKey(activePath),
    tabs,
    cachedViews,
    closeTab,
    refreshTab,
    reorderTabs,
    dropLeftTabs,
    dropRightTabs,
    dropOtherTabs,
  };
};
