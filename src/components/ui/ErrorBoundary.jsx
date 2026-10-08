/**
 * src/components/ui/ErrorBoundary.jsx
 * Robust React Error Boundary preventing White/Black Screen of Death.
 * Catches render errors and provides graceful recovery fallback.
 */
import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[ErrorBoundary caught error]:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="p-4 my-2 rounded-2xl bg-red-500/10 border border-red-500/30 text-white font-mono text-xs space-y-3 animate-fade-in">
          <div className="flex items-center gap-2 text-red-400 font-bold">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>Component Error Encountered</span>
          </div>
          <p className="text-[11px] text-gray-300">
            {this.state.error?.message || 'An unexpected rendering error occurred.'}
          </p>
          <button
            type="button"
            onClick={this.handleReset}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/40 text-[10px] font-bold cursor-pointer transition-all active:scale-95"
          >
            <RefreshCw className="w-3 h-3" />
            <span>Retry Component (ลองใหม่)</span>
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
