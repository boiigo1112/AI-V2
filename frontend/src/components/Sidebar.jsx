import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Users, Settings, Zap, Gamepad2, ScrollText, ShoppingBag, Wifi, LogOut, Shield, Swords, ShieldCheck, Castle, PawPrint, Crosshair, Lock, TicketPlus } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useGameStatus } from '@/hooks/use-game';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
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
  { path: '/users', label: 'User Management', icon: Users, permission: 'users.read' },
  { path: '/settings', label: 'Settings', icon: Settings, permission: 'settings.read' },
];

const gameMenuItems = [
  { path: '/game/players', label: 'Players', icon: Gamepad2 },
  { path: '/game/characters', label: 'Characters', icon: Swords },
  { path: '/game/guild', label: 'Guild', icon: Castle },
  { path: '/game/pets', label: 'Pets', icon: PawPrint },
  { path: '/game/pk-ranking', label: 'PK Ranking', icon: Crosshair },
  { path: '/game/player-security', label: 'Player Security', icon: Lock },
  { path: '/game/coupons', label: 'Coupons', icon: TicketPlus },
  { path: '/game/gmc', label: 'GMC', icon: ShieldCheck },
  { path: '/game/shop', label: 'Shop', icon: ShoppingBag },
  { path: '/game/logs', label: 'Logs', icon: ScrollText },
  { path: '/game/status', label: 'Connection', icon: Wifi },
];

function Sidebar() {
  const { user, logout } = useAuth();
  const { data: gameStatus } = useGameStatus();
  const hasAccess = (perm) => !perm || user?.permissions?.includes(perm);

  return (
    <SidebarRoot>
      <SidebarContent>
        {/* Logo */}
        <div className="flex items-center gap-2.5 px-5 py-5">
          <div className="size-8 rounded-lg bg-gradient-to-br from-gold to-gold-light flex items-center justify-center shadow-lg shadow-gold/20">
            <Zap className="size-5 text-[#08080e]" />
          </div>
          <span className="text-lg font-bold bg-gradient-to-r from-gold to-gold-light bg-clip-text text-transparent">
            Black En
          </span>
        </div>

        {/* Admin Menu */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-[10px] uppercase tracking-wider font-semibold text-gold/60">
            Admin
          </SidebarGroupLabel>
          <SidebarMenu>
            {adminMenuItems.filter(m => hasAccess(m.permission)).map(item => {
              const Icon = item.icon;
              return (
                <SidebarMenuItem key={item.path}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.path}
                      className={({ isActive }) => cn(
                        'transition-all duration-150',
                        isActive && 'bg-gold/10 text-gold border-l-2 border-gold'
                      )}
                    >
                      <Icon />
                      <span>{item.label}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              );
            })}
          </SidebarMenu>
        </SidebarGroup>

        {/* Game Data Menu */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-[10px] uppercase tracking-wider font-semibold text-blue/60">
            Game Data
          </SidebarGroupLabel>
          <SidebarMenu>
            {gameMenuItems.map(item => {
              const Icon = item.icon;
              return (
                <SidebarMenuItem key={item.path}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.path}
                      className={({ isActive }) => cn(
                        'transition-all duration-150',
                        isActive && 'bg-blue/10 text-blue border-l-2 border-blue'
                      )}
                    >
                      <Icon />
                      <span>{item.label}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              );
            })}
          </SidebarMenu>
        </SidebarGroup>

        {/* Game Status */}
        <div className="px-4 mt-auto">
          <div className={cn(
            'rounded-xl p-3 border transition-colors',
            gameStatus?.connected
              ? 'bg-success/5 border-success/20'
              : 'bg-danger/5 border-danger/20'
          )}>
            <div className="flex items-center gap-2">
              <div className={cn(
                'size-2 rounded-full',
                gameStatus?.connected ? 'bg-success animate-pulse' : 'bg-danger'
              )} />
              <span className="text-xs font-medium text-foreground">
                {gameStatus?.connected ? 'Game DB Connected' : 'Disconnected'}
              </span>
            </div>
          </div>
        </div>

        {/* User Info + Logout */}
        <div className="px-4 py-3">
          <Separator className="mb-3 bg-white/[0.06]" />
          <div className="flex items-center gap-2.5">
            <div className="size-8 rounded-full bg-gold/15 flex items-center justify-center text-xs font-bold text-gold flex-shrink-0">
              {(user?.full_name || user?.username || 'U').charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-foreground truncate">{user?.full_name || user?.username}</p>
              <p className="text-[10px] text-muted-foreground capitalize flex items-center gap-1">
                <Shield className="w-2.5 h-2.5" />
                {user?.role?.name || 'guest'}
              </p>
            </div>
            <Button variant="ghost" size="icon-sm" onClick={logout} className="text-muted-foreground hover:text-danger" title="ออกจากระบบ">
              <LogOut className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </SidebarContent>
    </SidebarRoot>
  );
}

export default Sidebar;
