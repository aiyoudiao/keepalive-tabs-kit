import React, { useEffect } from 'react';
import { describe, expect, it } from 'vitest';
import { act, render, screen, waitFor } from '@testing-library/react';
import { RouterProvider, createMemoryRouter } from 'react-router-dom';
import type { RouteConfig } from '@/components/KeepAliveTabs';
import { KeepAliveLayout } from '@/components/KeepAliveTabs';
import { useKeepAliveContext } from '@/components/KeepAliveTabs/context';

const STORAGE_KEY = '__keepalive_tabs_list__';

const Probe: React.FC<{ onReady: (ctx: ReturnType<typeof useKeepAliveContext>) => void }> = ({ onReady }) => {
  const ctx = useKeepAliveContext();
  useEffect(() => {
    onReady(ctx);
  }, [ctx, onReady]);
  return <div>probe</div>;
};

describe('KeepAliveTabs', () => {
  it('reorderTabs updates tab order and persists to sessionStorage', async () => {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(['/about', '/', '/counter/1']));

    const routeConfig: RouteConfig = {
      '/': { name: '首页' },
      '/about': { name: '关于' },
      '/counter/:id': { name: 'Counter' },
      '/probe': { name: 'Probe' },
    };

    let ctxRef: any;
    const router = createMemoryRouter(
      [
        {
          path: '/',
          element: <KeepAliveLayout routeConfig={routeConfig as RouteConfig} />,
          children: [
            { path: 'about', element: <div>about</div> },
            { path: 'counter/:id', element: <div>counter</div> },
            { path: 'probe', element: <Probe onReady={(ctx) => (ctxRef = ctx)} /> },
          ],
        },
      ],
      { initialEntries: ['/probe'] },
    );

    render(<RouterProvider router={router} />);

    expect(await screen.findByText('probe')).toBeTruthy();
    expect(ctxRef).toBeTruthy();

    await act(async () => {
      ctxRef.reorderTabs(['/counter/1', '/', '/about']);
    });

    const saved = JSON.parse(sessionStorage.getItem(STORAGE_KEY) || '[]') as string[];
    expect(saved).toEqual(['/counter/1', '/', '/about']);

    const tabs = screen
      .getAllByRole('tab')
      .map((el) => (el.textContent || '').trim())
      .filter(Boolean);
    expect(tabs[0]).toContain('Counter');
    expect(tabs[1]).toContain('首页');
    expect(tabs[2]).toContain('关于');
  });

  it('dropOtherTabs keeps only target tab and persists', async () => {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(['/about', '/', '/counter/1', '/probe']));

    const routeConfig: RouteConfig = {
      '/': { name: '首页' },
      '/about': { name: '关于' },
      '/counter/:id': { name: 'Counter' },
      '/probe': { name: 'Probe' },
    };

    let ctxRef: any;
    const router = createMemoryRouter(
      [
        {
          path: '/',
          element: <KeepAliveLayout routeConfig={routeConfig as RouteConfig} />,
          children: [
            { path: 'about', element: <div>about</div> },
            { path: 'counter/:id', element: <div>counter</div> },
            { path: 'probe', element: <Probe onReady={(ctx) => (ctxRef = ctx)} /> },
          ],
        },
      ],
      { initialEntries: ['/probe'] },
    );

    render(<RouterProvider router={router} />);

    expect(await screen.findByText('probe')).toBeTruthy();
    expect(ctxRef).toBeTruthy();

    await act(async () => {
      ctxRef.dropOtherTabs('/about');
    });

    const saved = JSON.parse(sessionStorage.getItem(STORAGE_KEY) || '[]') as string[];
    expect(saved).toEqual(['/about']);

    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/about');
    });
  });
});
