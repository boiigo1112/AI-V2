import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { LogOut, User, Search, Bell, ChevronDown, PanelLeftClose, PanelLeft } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../contexts/ThemeContext';
import { Button } from '@/components/ui/button';
import { useSidebar } from '@/components/ui/sidebar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const routeMap = {
  '/dashboard': { title: 'Dashboard', section: 'Admin' },
  '/users': { title: 'User Management', section: 'Admin' },
  '/settings': { title: 'Settings', section: 'Admin' },
  '/game/players': { title: 'Players', section: 'Game Data' },
  '/game/shop': { title: 'Shop', section: 'Game Data' },
  '/game/logs': { title: 'Logs', section: 'Game Data' },
  '/game/status': { title: 'Connection', section: 'Game Data' },
  '/game/player-security': { title: 'Player Security', section: 'Game Data' },
  '/game/coupons': { title: 'Coupons', section: 'Game Data' },
  '/game/ban-manager': { title: 'Ban Manager', section: 'Game Data' },
};

function Header() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { theme, toggle } = useTheme();
  const { open, setOpen } = useSidebar();
  const [searchQuery, setSearchQuery] = useState('');

  const route = routeMap[location.pathname] || { title: 'Admin Panel', section: '' };

  return (
    <header className="h-14 bg-background/80 backdrop-blur-md border-b border-white/[0.06] flex items-center justify-between px-5 sticky top-0 z-40">
      {/* Left: Sidebar toggle + Title + Breadcrumb */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => setOpen(!open)}
          className="text-muted-foreground hover:text-foreground"
        >
          {open ? <PanelLeftClose className="w-4 h-4" /> : <PanelLeft className="w-4 h-4" />}
        </Button>

        <div className="flex flex-col">
          <h1 className="text-sm font-semibold text-foreground leading-tight">{route.title}</h1>
          {route.section && (
            <nav className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <span>{route.section}</span>
              <span>/</span>
              <span className="text-foreground/70">{route.title}</span>
            </nav>
          )}
        </div>
      </div>

      {/* Right: Search + Notifications + Theme + User */}
      <div className="flex items-center gap-2">
        <div className="relative hidden md:block">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <input
            type="text"
            placeholder="ค้นหา..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-48 h-8 pl-8 pr-3 rounded-lg bg-white/[0.04] border border-white/[0.06] text-xs text-foreground placeholder:text-muted-foreground outline-none focus:border-gold/40 transition-colors"
          />
        </div>

        <Button variant="ghost" size="icon-sm" className="text-muted-foreground hover:text-foreground relative">
          <Bell className="w-4 h-4" />
          <span className="absolute -top-0.5 -right-0.5 size-2 rounded-full bg-danger" />
        </Button>

        <Button variant="ghost" size="icon-sm" onClick={toggle} className="text-muted-foreground hover:text-foreground">
          {theme === 'dark' ? '☀️' : '🌙'}
        </Button>

        <div className="w-px h-5 bg-white/[0.08] mx-1" />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-white/[0.04] transition-colors">
              <div className="size-7 rounded-full bg-gold/15 flex items-center justify-center text-xs font-bold text-gold">
                {(user?.full_name || user?.username || 'U').charAt(0).toUpperCase()}
              </div>
              <div className="hidden sm:flex flex-col items-start">
                <span className="text-xs font-medium text-foreground leading-tight">{user?.full_name || user?.username}</span>
                <span className="text-[10px] text-muted-foreground capitalize">{user?.role?.name}</span>
              </div>
              <ChevronDown className="w-3 h-3 text-muted-foreground" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={() => navigate('/settings')}>
              <User className="w-4 h-4 mr-2" />
              ตั้งค่าโปรไฟล์
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={logout} className="text-danger">
              <LogOut className="w-4 h-4 mr-2" />
              ออกจากระบบ
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}

export default Header;
