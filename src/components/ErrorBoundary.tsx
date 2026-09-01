import React, { ErrorInfo, ReactNode } from 'react';
import { logger } from '../lib/logger';
import { Button } from './ui/button';
import { AlertTriangle } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    logger.error('Uncaught error in React component tree', { error, errorInfo });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="h-[100dvh] w-screen flex flex-col items-center justify-center p-4 bg-[var(--tsd-surface)] text-[var(--tsd-forest-text)]">
          <AlertTriangle className="w-16 h-16 text-[var(--tsd-danger)] mb-4" />
          <h1 className="tsd-serif text-2xl font-bold mb-2">Something went wrong.</h1>
          <p className="text-center mb-6 text-[var(--tsd-moss)] max-w-md">
            An unexpected error occurred in the application. Our team has been notified.
          </p>
          <div className="flex gap-4">
            <Button
              onClick={() => window.location.reload()}
              className="bg-[var(--tsd-forest)] text-[var(--tsd-forest-text)] hover:bg-[var(--tsd-forest)]/90"
            >
              Refresh Page
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                localStorage.clear();
                window.location.reload();
              }}
              className="border-[var(--tsd-danger)] text-[var(--tsd-danger)] hover:bg-[var(--tsd-danger)]/10"
            >
              Clear Data & Reload
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
