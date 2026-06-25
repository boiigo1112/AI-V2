import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Users, Settings, Zap } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { cn } from '../lib/utils';

const menuItems = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, permission: 'dashboard.read' },
  { path: '/users', label: 'Users', icon: Users, permission: 'users.read' },
  { path: '/settings', label: 'Settings', icon: Settings, permission: 'settings.read' },
];

function Sidebar() {
  const { user } = useAuth();

  const hasAccess = (perm) => !perm || user?.permissions?.includes(perm);

  return (
    <aside className="fixed top-0 left-0 bottom-0 w-60 bg-sidebar border-r border-border z-50 flex flex-col">
      <div className="flex items-center gap-2.5 px-5 py-5 border-b border-border">
        <div className="w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center">
          <Zap className="w-5 h-5 text-primary" />
        </div>
        <span className="text-lg font-bold bg-gradient-to-r from-primary to-purple-400 bg-clip-text text-transparent">
          Black En
        </span>
      </div>

      <nav className="flex-1 p-3 space-y-1">
        {menuItems
          .filter((m) => hasAccess(m.permission))
          .map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm transition-all duration-150',
                    isActive
                      ? 'bg-primary text-white shadow-lg shadow-primary/20'
                      : 'text-muted hover:text-text hover:bg-hover'
                  )
                }
              >
                <Icon className="w-4.5 h-4.5" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
      </nav>

      <div className="px-5 py-4 border-t border-border">
        <span className="text-xs text-muted capitalize">{user?.role?.name || 'guest'}</span>
      </div>
    </aside>
  );
}

export default Sidebar;
