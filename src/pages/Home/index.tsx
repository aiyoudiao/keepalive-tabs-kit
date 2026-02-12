import { Button, Card, Space, Typography } from 'antd';
import React from 'react';
import { Link, useNavigate } from 'react-router-dom';

const Home: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div style={{ padding: 16 }}>
      <Space direction="vertical" size={12} style={{ width: '100%' }}>
        <Typography.Title level={3} style={{ margin: 0 }}>
          m2-frontend Demo
        </Typography.Title>
        <Card>
          <Space direction="vertical" size={8}>
            <Typography.Text>
              核心验证点：路由切换后，已打开的页面会以 Tab 形式缓存；刷新页面后，Tab 列表可恢复。
            </Typography.Text>
            <Space wrap>
              <Button type="primary" onClick={() => navigate('/about')}>
                打开 /about
              </Button>
              <Button onClick={() => navigate('/counter/1')}>打开 /counter/1</Button>
              <Button onClick={() => navigate('/counter/2')}>打开 /counter/2</Button>
              <Link to="/about">Link 到 /about</Link>
            </Space>
          </Space>
        </Card>
      </Space>
    </div>
  );
};

export default Home;

