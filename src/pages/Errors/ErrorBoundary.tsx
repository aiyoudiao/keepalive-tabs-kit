import { Button, Result } from 'antd';
import React from 'react';

type State = { hasError: boolean };

class ErrorBoundary extends React.Component<React.PropsWithChildren, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <Result
        status="error"
        title="页面出错了"
        subTitle="请刷新页面重试。"
        extra={
          <Button type="primary" onClick={() => window.location.reload()}>
            刷新页面
          </Button>
        }
      />
    );
  }
}

export default ErrorBoundary;

