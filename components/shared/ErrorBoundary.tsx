"use client";

import { Component, ReactNode } from "react";
import { Button, Result } from "antd";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(_error: Error, _info: React.ErrorInfo) {
    // Extend here to report to a monitoring service (Sentry, Datadog, etc.)
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <Result
          status="error"
          title="Something went wrong"
          subTitle="An unexpected error occurred. Please try again."
          extra={
            <Button
              type="primary"
              onClick={() => this.setState({ hasError: false, error: null })}
            >
              Try Again
            </Button>
          }
        />
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
