import React from 'react';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Uncaught error caught by ErrorBoundary:", error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = '/'; // Reset by sending back to root
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="app-container flex items-center justify-center p-6 min-h-screen bg-slate-900 text-white">
          <div className="panel max-w-md w-full text-center bg-slate-800/80 border border-slate-700/50 backdrop-blur-xl p-8 rounded-2xl shadow-2xl">
            <span style={{ fontSize: '4.5rem', display: 'block', marginBottom: '16px' }}>⚠️</span>
            <h2 className="text-2xl font-black mb-3 text-rose-400">Something went wrong</h2>
            <p className="text-sm text-slate-300 mb-6 leading-relaxed">
              An unexpected error occurred and Dahoot had to pause. You can try reloading the page or returning home.
            </p>
            {this.state.error && (
              <pre className="text-left text-xs bg-slate-950 p-4 rounded-xl mb-6 text-rose-300 overflow-auto max-h-40 border border-rose-950/50 font-mono">
                {this.state.error.toString()}
              </pre>
            )}
            <div className="flex gap-4">
              <button
                onClick={() => window.location.reload()}
                className="btn btn-secondary flex-1 py-3"
              >
                🔄 Reload Page
              </button>
              <button
                onClick={this.handleReset}
                className="btn btn-primary flex-1 py-3"
              >
                🏠 Go Home
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
