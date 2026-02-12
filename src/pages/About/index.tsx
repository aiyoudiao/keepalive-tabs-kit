import { Card, Space, Typography } from 'antd';
import React from 'react';
import { Link } from 'react-router-dom';

const About: React.FC = () => {
  return (
    <div style={{ padding: 16 }}>
      <Space direction="vertical" size={12} style={{ width: '100%' }}>
        <Typography.Title level={3} style={{ margin: 0 }}>
          关于
        </Typography.Title>
        <Card>
          <Space direction="vertical" size={8}>
            <Typography.Text>
              这是一个可复用解决方案的最小闭环示例，不包含任何业务接口与业务状态管理。
            </Typography.Text>
            <Link to="/">返回首页</Link>
          </Space>
        </Card>
      </Space>
    </div>
  );
};

export default About;

