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

      if (this.props.isRoot) {
        return (
          <div className="min-h-screen flex items-center justify-center p-6 bg-[#06080e] text-white font-mono text-center select-none">
            <div className="max-w-md w-full p-6 rounded-3xl bg-black/80 border border-theme-primary/30 backdrop-blur-xl shadow-2xl space-y-4">
              <div className="w-12 h-12 mx-auto rounded-2xl bg-red-500/20 border border-red-500/40 flex items-center justify-center text-red-400">
                <AlertCircle className="w-6 h-6" />
              </div>
              <h1 className="text-base font-bold text-white tracking-wide">System Initialization Notice</h1>
              <p className="text-xs text-gray-400 leading-relaxed">
                {this.state.error?.message || 'A temporary display issue occurred while loading profile assets.'}
              </p>
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="w-full py-3 rounded-xl bg-theme-primary text-black font-bold text-xs tracking-wider uppercase transition-all active:scale-95 cursor-pointer shadow-glow"
              >
                Reload Profile Hub
              </button>
            </div>
          </div>
        );
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
