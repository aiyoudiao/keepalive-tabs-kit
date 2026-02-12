import { Button, Card, Space, Typography } from 'antd';
import React, { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';

const Counter: React.FC = () => {
  const navigate = useNavigate();
  const params = useParams();
  const id = useMemo(() => `${params.id || '1'}`, [params.id]);
  const [count, setCount] = useState(0);

  return (
    <div style={{ padding: 16 }}>
      <Space direction="vertical" size={12} style={{ width: '100%' }}>
        <Typography.Title level={3} style={{ margin: 0 }}>
          Counter {id}
        </Typography.Title>
        <Card>
          <Space direction="vertical" size={8}>
            <Typography.Text>当前计数：{count}</Typography.Text>
            <Space wrap>
              <Button type="primary" onClick={() => setCount((v) => v + 1)}>
                +1
              </Button>
              <Button onClick={() => setCount(0)}>重置</Button>
              <Button onClick={() => navigate(`/counter/${Number(id) + 1}`)}>
                打开 /counter/{Number(id) + 1}
              </Button>
              <Link to="/">返回首页</Link>
            </Space>
          </Space>
        </Card>
      </Space>
    </div>
  );
};

export default Counter;

