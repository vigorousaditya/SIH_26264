import React from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('CaseBridge Portal Error Caught by Boundary:', error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[400px] flex items-center justify-center p-6">
          <div className="bg-white border border-gov-border border-l-4 border-l-status-overdue rounded-xs p-6 max-w-xl w-full shadow-sm space-y-4">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-xs bg-status-overdueBg text-status-overdue border border-status-overdueBorder shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="space-y-1 flex-1">
                <h2 className="text-base font-bold text-gov-text">
                  Portal Interface Exception Encountered
                </h2>
                <p className="text-xs text-gov-textMuted leading-relaxed">
                  The system encountered an unexpected error while rendering this administrative module. Case data and audit records remain securely preserved in storage.
                </p>
              </div>
            </div>

            {this.state.error && (
              <div className="bg-gov-bg border border-gov-border rounded-xs p-3 font-mono text-[11px] text-status-overdue overflow-x-auto">
                {this.state.error.toString()}
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-gov-border">
              <button
                onClick={this.handleGoHome}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xs border border-gov-border bg-white text-gov-text text-xs font-semibold hover:bg-gov-bg"
              >
                <Home className="w-3.5 h-3.5" />
                Return to Dashboard
              </button>
              <button
                onClick={this.handleReload}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xs bg-gov-saffron text-white text-xs font-bold hover:bg-gov-saffronHover"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Reload Portal Page
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
