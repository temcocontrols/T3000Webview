/**
 * ErrorBoundary Component
 *
 * Catches React errors and displays fallback UI
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Button, makeStyles, tokens } from '@fluentui/react-components';
import { ErrorCircleRegular } from '@fluentui/react-icons';

const useStyles = makeStyles({
  container: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '48px',
    gap: '16px',
    minHeight: '400px',
  },
  icon: {
    fontSize: '64px',
    color: tokens.colorPaletteRedForeground1,
  },
  title: {
    fontSize: tokens.fontSizeBase500,
    fontWeight: tokens.fontWeightSemibold,
    color: tokens.colorNeutralForeground1,
  },
  message: {
    fontSize: tokens.fontSizeBase300,
    color: tokens.colorNeutralForeground2,
    textAlign: 'center',
    maxWidth: '600px',
  },
  details: {
    marginTop: '16px',
    padding: '16px',
    backgroundColor: tokens.colorNeutralBackground3,
    borderRadius: tokens.borderRadiusMedium,
    fontFamily: 'monospace',
    fontSize: tokens.fontSizeBase200,
    maxWidth: '800px',
    overflow: 'auto',
    maxHeight: '200px',
  },
});

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);

    this.setState({
      error,
      errorInfo,
    });

    this.props.onError?.(error, errorInfo);
  }

  private handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return <ErrorFallback error={this.state.error} onReset={this.handleReset} />;
    }

    return this.props.children;
  }
}

interface ErrorFallbackProps {
  error: Error | null;
  onReset: () => void;
}

const ErrorFallback: React.FC<ErrorFallbackProps> = ({ error, onReset }) => {
  const styles = useStyles();

  return (
    <div className={styles.container}>
      <ErrorCircleRegular className={styles.icon} />
      <div className={styles.title}>Something went wrong</div>
      <div className={styles.message}>
        An unexpected error occurred. Please try refreshing the page or contact support if the
        problem persists.
      </div>
      {error && (
        <div className={styles.details}>
          <strong>Error:</strong> {error.message}
          {error.stack && (
            <>
              <br />
              <br />
              <strong>Stack:</strong>
              <pre>{error.stack}</pre>
            </>
          )}
        </div>
      )}
      <Button appearance="primary" onClick={onReset}>
        Try Again
      </Button>
    </div>
  );
};
