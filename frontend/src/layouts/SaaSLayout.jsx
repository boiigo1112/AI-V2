import { Outlet } from 'react-router-dom';
import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Building2, CreditCard, Settings, LogOut, Zap, Users, Receipt, Shield } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { cn } from '../lib/utils';

const saasMenuItems = [
  { path: '/saas/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/saas/tenants', label: 'Tenants', icon: Building2 },
  { path: '/saas/plans', label: 'Plans', icon: CreditCard },
  { path: '/saas/billing', label: 'Billing', icon: Receipt },
  { path: '/saas/security', label: 'Security', icon: Shield },
  { path: '/saas/settings', label: 'Settings', icon: Settings },
];

function SaaSLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#08080e] flex">
      {/* Sidebar */}
      <aside className="w-56 bg-[#0c0c14] border-r border-white/[0.06] flex flex-col flex-shrink-0">
        {/* Logo */}
        <div className="flex items-center gap-2.5 px-5 py-5 border-b border-white/[0.06]">
          <div className="size-8 rounded-lg bg-gradient-to-br from-gold to-gold-light flex items-center justify-center shadow-lg shadow-gold/20">
            <Building2 className="size-5 text-[#08080e]" />
          </div>
          <div>
            <span className="text-sm font-bold bg-gradient-to-r from-gold to-gold-light bg-clip-text text-transparent">SaaS Panel</span>
            <p className="text-[9px] text-muted-foreground tracking-wider uppercase">Customer Management</p>
          </div>
        </div>

        {/* Menu */}
        <nav className="flex-1 py-3 px-3 space-y-1">
          {saasMenuItems.map(item => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) => cn(
                  'flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs transition-all duration-150',
                  isActive
                    ? 'bg-gold/10 text-gold border-l-2 border-gold'
                    : 'text-muted-foreground hover:text-foreground hover:bg-white/[0.04] border-l-2 border-transparent'
                )}
              >
                <Icon className="w-4 h-4" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        {/* User */}
        <div className="px-3 py-3 border-t border-white/[0.06]">
          <div className="flex items-center gap-2.5">
            <div className="size-7 rounded-full bg-gold/15 flex items-center justify-center text-[10px] font-bold text-gold flex-shrink-0">
              {(user?.full_name || user?.username || 'U').charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-medium text-foreground truncate">{user?.full_name || user?.username}</p>
              <p className="text-[9px] text-muted-foreground capitalize">{user?.role?.name || 'guest'}</p>
            </div>
            <button onClick={() => { logout(); navigate('/login'); }}
              className="size-6 rounded-md text-muted-foreground hover:text-danger transition-colors flex items-center justify-center"
              title="ออกจากระบบ">
              <LogOut className="w-3 h-3" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col">
        <header className="h-12 bg-[#0c0c14]/80 backdrop-blur-md border-b border-white/[0.06] flex items-center px-5">
          <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
            <Building2 className="w-3 h-3" />
            <span>SaaS Admin Panel</span>
            <span className="text-white/[0.1]">/</span>
            <button onClick={() => navigate('/dashboard')} className="hover:text-gold transition-colors">
              ไปยัง Game Admin →
            </button>
          </div>
        </header>
        <main className="flex-1 p-5 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default SaaSLayout;
