import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import ProtectedRoute from './components/ProtectedRoute';
import { ErrorBoundary } from './components/ErrorBoundary';
import MainLayout from './layouts/MainLayout';
import Login from './pages/Login';
import Install from './pages/Install';
import Dashboard from './pages/Dashboard';
import Users from './pages/Users';
import Settings from './pages/Settings';
import Players from './pages/Players';
import Logs from './pages/Logs';
import Shop from './pages/Shop';
import Characters from './pages/Characters';
import Guild from './pages/Guild';
import Pets from './pages/Pets';
import Gmc from './pages/Gmc';
import GameStatus from './pages/GameStatus';

function AnimatedPage({ children }) {
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}>{children}</motion.div>
  );
}

function App() {
  const location = useLocation();

  return (
    <ThemeProvider>
    <AuthProvider>
      <AnimatePresence mode="wait">
        <Routes location={location} key={location.pathname}>
          <Route path="/install" element={<ErrorBoundary message="เกิดข้อผิดพลาดในขั้นตอนการติดตั้ง"><Install /></ErrorBoundary>} />
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>
            <Route path="/dashboard" element={<AnimatedPage><Dashboard /></AnimatedPage>} />
            <Route path="/users" element={<ProtectedRoute requiredPermission="users.read"><AnimatedPage><Users /></AnimatedPage></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute requiredPermission="settings.read"><AnimatedPage><Settings /></AnimatedPage></ProtectedRoute>} />
            <Route path="/game/players" element={<AnimatedPage><Players /></AnimatedPage>} />
            <Route path="/game/characters" element={<AnimatedPage><Characters /></AnimatedPage>} />
            <Route path="/game/pets" element={<AnimatedPage><Pets /></AnimatedPage>} />
            <Route path="/game/guild" element={<AnimatedPage><Guild /></AnimatedPage>} />
            <Route path="/game/gmc" element={<AnimatedPage><Gmc /></AnimatedPage>} />
            <Route path="/game/shop" element={<AnimatedPage><Shop /></AnimatedPage>} />
            <Route path="/game/logs" element={<AnimatedPage><Logs /></AnimatedPage>} />
            <Route path="/game/status" element={<AnimatedPage><GameStatus /></AnimatedPage>} />
          </Route>
          <Route path="*" element={<Navigate to="/install" replace />} />
        </Routes>
      </AnimatePresence>
    </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
