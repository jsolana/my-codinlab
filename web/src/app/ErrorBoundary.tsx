import { Component, type ErrorInfo, type ReactNode } from 'react';

interface State {
  error: Error | null;
}

/** Last line of defense: show the error instead of a blank screen. */
export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('Unhandled UI error', error, info.componentStack);
  }

  render(): ReactNode {
    const { error } = this.state;
    if (!error) return this.props.children;
    return (
      <div role="alert" style={{ padding: 32, maxWidth: 720, margin: '0 auto' }}>
        <h1 style={{ fontSize: 22 }}>Something went wrong</h1>
        <pre style={{ whiteSpace: 'pre-wrap', color: 'var(--danger)', fontFamily: 'var(--font-mono)' }}>
          {error.message}
        </pre>
        <a href="#/" onClick={() => this.setState({ error: null })} style={{ color: 'var(--accent-strong)' }}>
          ← Back to all challenges
        </a>
      </div>
    );
  }
}
