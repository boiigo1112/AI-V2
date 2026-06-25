import { Component } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from './ui/button';

export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-br from-[#0a0a1a] via-[#0f0f23] to-[#0a0a2e]">
          <div className="bg-card rounded-2xl p-8 shadow-2xl border border-border text-center max-w-md">
            <div className="w-16 h-16 rounded-full bg-danger/15 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-8 h-8 text-danger" />
            </div>
            <h2 className="text-xl font-bold mb-2">เกิดข้อผิดพลาด</h2>
            <p className="text-muted text-sm mb-2">
              {this.props.message || 'ระบบไม่สามารถดำเนินการต่อได้'}
            </p>
            <p className="text-xs text-muted/60 mb-6 font-mono">
              {this.state.error?.message}
            </p>
            <Button
              onClick={() => {
                this.setState({ hasError: false, error: null });
                window.location.reload();
              }}
            >
              <RefreshCw className="w-4 h-4" />
              ลองใหม่
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
