import { Navigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ShieldAlert, ArrowLeft } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { Button } from './ui/button';

function ProtectedRoute({ children, requiredPermission }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          className="w-8 h-8 border-2 border-border border-t-primary rounded-full"
        />
        <p className="text-muted text-sm">Loading...</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (requiredPermission && !user.permissions?.includes(requiredPermission)) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-card rounded-2xl p-8 shadow-2xl border border-border text-center max-w-sm w-full"
        >
          <div className="w-14 h-14 rounded-full bg-danger/15 flex items-center justify-center mx-auto mb-4">
            <ShieldAlert className="w-7 h-7 text-danger" />
          </div>
          <h2 className="text-xl font-bold mb-2">Access Denied</h2>
          <p className="text-muted text-sm mb-6">
            You do not have permission to view this page.
          </p>
          <Button variant="outline" onClick={() => window.history.back()}>
            <ArrowLeft className="w-4 h-4" />
            Go Back
          </Button>
        </motion.div>
      </div>
    );
  }

  return children;
}

export default ProtectedRoute;
