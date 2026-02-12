import { DndContext, DragEndEvent, PointerSensor, closestCenter, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, arrayMove, horizontalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { CloseOutlined, RedoOutlined, VerticalLeftOutlined, VerticalRightOutlined } from '@ant-design/icons';
import { Dropdown, MenuProps, Space, Tabs } from 'antd';
import React, { useCallback, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useKeepAliveContext } from './context';

const TAB_ACTIONS = {
  REFRESH: 'refresh',
  RIGHT: 'right',
  LEFT: 'left',
  OTHERS: 'others',
  CLOSE: 'close',
} as const;

const DraggableTabNode = ({ className, ...props }: any) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: props['data-node-key'],
  });

  const style: React.CSSProperties = {
    ...props.style,
    transform: CSS.Translate.toString(transform),
    transition: isDragging ? 'none' : transition,
    cursor: 'pointer',
  };


  return React.cloneElement(props.children as React.ReactElement<any>, {
    ref: setNodeRef,
    style,
    ...attributes,
    ...listeners,
  });
};

const TabsBar: React.FC = () => {
  const navigate = useNavigate();
  const { activeTabKey, tabs, closeTab, refreshTab, reorderTabs, dropLeftTabs, dropRightTabs, dropOtherTabs } =
    useKeepAliveContext();
  const [isSorting, setIsSorting] = useState(false);

  const tabKeyToPath = useMemo(() => {
    return new Map(tabs.map((t) => [t.tabKey, t.path]));
  }, [tabs]);

  const handleMenu = useCallback(
    (action: string, tabKey: string) => {
      const path = tabKeyToPath.get(tabKey);
      if (!path) return;
      switch (action) {
        case TAB_ACTIONS.REFRESH:
          refreshTab(path);
          break;
        case TAB_ACTIONS.CLOSE:
          closeTab(path);
          break;
        case TAB_ACTIONS.LEFT:
          dropLeftTabs(path);
          break;
        case TAB_ACTIONS.RIGHT:
          dropRightTabs(path);
          break;
        case TAB_ACTIONS.OTHERS:
          dropOtherTabs(path);
          break;
      }
    },
    [closeTab, dropLeftTabs, dropOtherTabs, dropRightTabs, refreshTab, tabKeyToPath],
  );

  const menuItems: MenuProps['items'] = useMemo(
    () => [
      { label: '重新加载', key: TAB_ACTIONS.REFRESH, icon: <RedoOutlined /> },
      { label: '关闭当前', key: TAB_ACTIONS.CLOSE, icon: <CloseOutlined /> },
      { type: 'divider' },
      { label: '关闭右侧', key: TAB_ACTIONS.RIGHT, icon: <VerticalLeftOutlined /> },
      { label: '关闭左侧', key: TAB_ACTIONS.LEFT, icon: <VerticalRightOutlined /> },
      { type: 'divider' },
      { label: '关闭其它', key: TAB_ACTIONS.OTHERS, icon: <CloseOutlined /> },
    ],
    [],
  );

  const itemsWithMenu = useMemo(() => {
    return tabs.map((t) => ({
      key: t.tabKey,
      label: (
        <Dropdown
          menu={{
            items: menuItems,
            onClick: ({ key }) => handleMenu(`${key}`, t.tabKey),
          }}
          trigger={['contextMenu']}
        >
          <Space size={6} style={{ userSelect: 'none' }}>
            {t.icon && <span className="action">{t.icon}</span>}
            <span>{t.title}</span>
          </Space>
        </Dropdown>
      ),
      closable: t.closable,
    }));
  }, [handleMenu, menuItems, tabs]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  const onDragEnd = useCallback(
    ({ active, over }: DragEndEvent) => {
      if (!active || !over) return;
      if (active.id === over.id) return;

      const keys = tabs.map((t) => t.tabKey);
      const oldIndex = keys.indexOf(`${active.id}`);
      const newIndex = keys.indexOf(`${over.id}`);
      if (oldIndex < 0 || newIndex < 0) return;

      const newOrderTabKeys = arrayMove(keys, oldIndex, newIndex);
      const newOrderPaths = newOrderTabKeys
        .map((k) => tabKeyToPath.get(k))
        .filter(Boolean) as string[];
      reorderTabs(newOrderPaths);
    },
    [reorderTabs, tabKeyToPath, tabs],
  );

  return (
    <div className="tabs-bar">
      <Tabs
        activeKey={activeTabKey}
        type="editable-card"
        hideAdd
        items={itemsWithMenu}
        onChange={(tabKey) => {
          const path = tabKeyToPath.get(`${tabKey}`);
          if (path) navigate(path);
        }}
        onEdit={(targetKey, action) => {
          if (action !== 'remove') return;
          const path = tabKeyToPath.get(`${targetKey}`);
          if (path) closeTab(path);
        }}
        renderTabBar={(tabBarProps, DefaultTabBar) => (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={() => setIsSorting(true)}
            onDragCancel={() => setIsSorting(false)}
            onDragEnd={onDragEnd}
          >
            <SortableContext items={tabs.map((t) => t.tabKey)} strategy={horizontalListSortingStrategy}>
              <DefaultTabBar {...tabBarProps}>
                {(node) => (
                  <DraggableTabNode isSorting={isSorting} {...(node as any).props} key={node.key}>
                    {node}
                  </DraggableTabNode>
                )}
              </DefaultTabBar>
            </SortableContext>
          </DndContext>
        )}
      />
    </div>
  );
};

export default TabsBar;
