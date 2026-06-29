import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import ProtectedRoute from './components/ProtectedRoute';
import { ErrorBoundary } from './components/ErrorBoundary';
import MainLayout from './layouts/MainLayout';
import SaaSLayout from './layouts/SaaSLayout';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
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
import PKRanking from './pages/PKRanking';
import PlayerSecurity from './pages/PlayerSecurity';
import Gmc from './pages/Gmc';
import Coupons from './pages/Coupons';
import GameStatus from './pages/GameStatus';
import BanManager from './pages/BanManager';
import OnlineMap from './pages/OnlineMap';
import Inventory from './pages/Inventory';
import SaasDashboard from './pages/SaasDashboard';
import SaasPlans from './pages/SaasPlans';
import SaasCheckout from './pages/SaasCheckout';
import SaasBilling from './pages/SaasBilling';
import SecurityDashboard from './pages/SecurityDashboard';

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
          {/* Public */}
          <Route path="/" element={<Landing />} />
          <Route path="/register" element={<Register />} />
          <Route path="/install" element={<ErrorBoundary message="เกิดข้อผิดพลาดในขั้นตอนการติดตั้ง"><Install /></ErrorBoundary>} />
          <Route path="/login" element={<Login />} />

          {/* Game Admin Panel (MainLayout with game sidebar) */}
          <Route element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>
            <Route path="/dashboard" element={<AnimatedPage><Dashboard /></AnimatedPage>} />
            <Route path="/users" element={<ProtectedRoute requiredPermission="users.read"><AnimatedPage><Users /></AnimatedPage></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute requiredPermission="settings.read"><AnimatedPage><Settings /></AnimatedPage></ProtectedRoute>} />
            <Route path="/game/players" element={<AnimatedPage><Players /></AnimatedPage>} />
            <Route path="/game/characters" element={<AnimatedPage><Characters /></AnimatedPage>} />
            <Route path="/game/online-map" element={<AnimatedPage><OnlineMap /></AnimatedPage>} />
            <Route path="/game/inventory" element={<AnimatedPage><Inventory /></AnimatedPage>} />
            <Route path="/game/pk-ranking" element={<AnimatedPage><PKRanking /></AnimatedPage>} />
            <Route path="/game/player-security" element={<AnimatedPage><PlayerSecurity /></AnimatedPage>} />
            <Route path="/game/coupons" element={<AnimatedPage><Coupons /></AnimatedPage>} />
            <Route path="/game/pets" element={<AnimatedPage><Pets /></AnimatedPage>} />
            <Route path="/game/guild" element={<AnimatedPage><Guild /></AnimatedPage>} />
            <Route path="/game/gmc" element={<AnimatedPage><Gmc /></AnimatedPage>} />
            <Route path="/game/shop" element={<AnimatedPage><Shop /></AnimatedPage>} />
            <Route path="/game/logs" element={<AnimatedPage><Logs /></AnimatedPage>} />
            <Route path="/game/status" element={<AnimatedPage><GameStatus /></AnimatedPage>} />
            <Route path="/game/ban-manager" element={<AnimatedPage><BanManager /></AnimatedPage>} />
          </Route>

          {/* SaaS Admin Panel (SaaSLayout with dedicated sidebar - NO game items) */}
          <Route element={<ProtectedRoute requiredPermission="saas.admin"><SaaSLayout /></ProtectedRoute>}>
            <Route path="/saas/dashboard" element={<AnimatedPage><SaasDashboard /></AnimatedPage>} />
            <Route path="/saas/tenants" element={<AnimatedPage><SaasDashboard /></AnimatedPage>} />
            <Route path="/saas/plans" element={<AnimatedPage><SaasPlans /></AnimatedPage>} />
            <Route path="/saas/checkout/:planId" element={<AnimatedPage><SaasCheckout /></AnimatedPage>} />
            <Route path="/saas/billing" element={<AnimatedPage><SaasBilling /></AnimatedPage>} />
            <Route path="/saas/security" element={<AnimatedPage><SecurityDashboard /></AnimatedPage>} />
            <Route path="/saas/settings" element={<AnimatedPage><SaasDashboard /></AnimatedPage>} />
          </Route>

          {/* Redirects */}
          <Route path="/saas" element={<Navigate to="/saas/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/install" replace />} />
        </Routes>
      </AnimatePresence>
    </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
