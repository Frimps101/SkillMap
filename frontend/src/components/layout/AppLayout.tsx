import React from "react";
import { Outlet, useNavigate } from "react-router-dom";
import Sidebar from "./Sidebar";

interface BoundaryState {
  error: Error | null;
}

class PageErrorBoundary extends React.Component<
  { children: React.ReactNode },
  BoundaryState
> {
  state: BoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): BoundaryState {
    return { error };
  }

  handleReset = () => this.setState({ error: null });

  render() {
    if (this.state.error) {
      return (
        <div className="flex-1 flex items-center justify-center p-12">
          <div className="text-center max-w-sm">
            <div className="w-12 h-12 rounded-xl bg-surface-tertiary border border-surface-border flex items-center justify-center mx-auto mb-4">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-red-400">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            </div>
            <p className="text-white font-medium mb-1">Something went wrong</p>
            <p className="text-xs text-gray-500 mb-5 font-mono bg-surface-tertiary px-3 py-2 rounded-lg">
              {this.state.error.message}
            </p>
            <button
              onClick={this.handleReset}
              className="text-xs text-brand border border-brand/30 rounded-lg px-4 py-2 hover:bg-brand/10 transition-colors"
            >
              Try again
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function AppLayout() {
  return (
    <div className="flex h-screen bg-surface overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <PageErrorBoundary>
          <Outlet />
        </PageErrorBoundary>
      </main>
    </div>
  );
}
