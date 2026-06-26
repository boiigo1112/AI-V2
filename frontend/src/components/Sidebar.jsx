import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Users, Settings, Zap, Gamepad2, ScrollText, ShoppingBag, Wifi, Moon, Sun } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useGameStatus } from '@/hooks/use-game';
import { useTheme } from '@/contexts/ThemeContext';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Sidebar as SidebarRoot,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from '@/components/ui/sidebar';

const adminMenuItems = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, permission: 'dashboard.read' },
  { path: '/users', label: 'Admin Users', icon: Users, permission: 'users.read' },
  { path: '/settings', label: 'Settings', icon: Settings, permission: 'settings.read' },
];

const gameMenuItems = [
  { path: '/game/players', label: 'Players', icon: Gamepad2 },
  { path: '/game/shop', label: 'Shop', icon: ShoppingBag },
  { path: '/game/logs', label: 'Logs', icon: ScrollText },
  { path: '/game/status', label: 'Connection', icon: Wifi },
];

function Sidebar() {
  const { user } = useAuth();
  const { data: gameStatus } = useGameStatus();
  const { theme, toggle } = useTheme();
  const hasAccess = (perm) => !perm || user?.permissions?.includes(perm);

  return (
    <SidebarRoot>
      <SidebarContent>
        <div className="flex items-center gap-2.5 px-5 py-5">
          <div className="size-8 rounded-lg bg-primary/15 flex items-center justify-center">
            <Zap className="size-5 text-primary" />
          </div>
          <span className="text-lg font-bold bg-gradient-to-r from-primary to-purple-400 bg-clip-text text-transparent">
            Black En
          </span>
        </div>

        <SidebarGroup>
          <SidebarGroupLabel>Admin</SidebarGroupLabel>
          <SidebarMenu>
            {adminMenuItems.filter(m => hasAccess(m.permission)).map(item => {
              const Icon = item.icon;
              return (
                <SidebarMenuItem key={item.path}>
                  <SidebarMenuButton asChild>
                    <NavLink to={item.path} className={({ isActive }) => cn(isActive && 'bg-primary text-primary-foreground')}>
                      <Icon />
                      <span>{item.label}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              );
            })}
          </SidebarMenu>
        </SidebarGroup>

        {gameStatus?.connected && (
          <SidebarGroup>
            <SidebarGroupLabel>Game Data</SidebarGroupLabel>
            <SidebarMenu>
              {gameMenuItems.map(item => {
                const Icon = item.icon;
                return (
                  <SidebarMenuItem key={item.path}>
                    <SidebarMenuButton asChild>
                      <NavLink to={item.path} className={({ isActive }) => cn(isActive && 'bg-primary text-primary-foreground')}>
                        <Icon />
                        <span>{item.label}</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroup>
        )}
      </SidebarContent>

      <div className="px-5 py-4 border-t border-sidebar-border">
        <div className="flex items-center gap-2">
          <div className="flex-1">
            <p className="text-xs text-muted-foreground capitalize">{user?.role?.name || 'guest'}</p>
            {gameStatus?.connected && (
              <p className="text-xs text-success flex items-center gap-1">
                <span className="size-1.5 rounded-full bg-current" />
                Game DB Connected
              </p>
            )}
          </div>
          <Button variant="ghost" size="icon-sm" onClick={toggle} title={theme === 'dark' ? 'โหมดสว่าง' : 'โหมดมืด'}>
            {theme === 'dark' ? <Sun className="size-4" /> : <Moon className="size-4" />}
          </Button>
        </div>
      </div>
    </SidebarRoot>
  );
}

export default Sidebar;
