import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.js';
import './index.css';

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, ErrorBoundaryState> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('CRITICAL APP ERROR:', error, errorInfo);
    this.setState({ errorInfo });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          padding: '40px',
          margin: '40px auto',
          maxWidth: '800px',
          background: '#fee2e2',
          border: '2px solid #ef4444',
          borderRadius: '12px',
          color: '#991b1b',
          fontFamily: 'system-ui, sans-serif'
        }}>
          <h2 style={{ marginTop: 0, fontSize: '1.25rem' }}>Dashboard Render Error</h2>
          <p style={{ fontWeight: 600 }}>{this.state.error?.toString()}</p>
          <pre style={{
            background: '#ffffff',
            padding: '16px',
            borderRadius: '8px',
            overflowX: 'auto',
            fontSize: '0.85rem',
            color: '#b91c1c'
          }}>
            {this.state.error?.stack}
          </pre>
          <button
            onClick={() => window.location.reload()}
            style={{
              marginTop: '16px',
              padding: '8px 16px',
              background: '#ef4444',
              color: '#ffffff',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: 700
            }}
          >
            Reload Application
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);
