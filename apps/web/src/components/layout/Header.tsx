import { useState } from 'react';
import { LogOut, User, Circle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import {
  Dropdown,
  DropdownTrigger,
  DropdownContent,
  DropdownItem,
  DropdownLabel,
  DropdownSeparator,
  DropdownRadioGroup,
  DropdownRadioItem,
} from '@/components/ui/Dropdown';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import type { UserStatus } from '@/types';

export function Header() {
  const navigate = useNavigate();
  const { user, logout, updateStatus } = useAuth();
  const [status, setStatus] = useState<UserStatus>(user?.status || 'online');

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const handleStatusChange = (newStatus: UserStatus) => {
    setStatus(newStatus);
    updateStatus(newStatus);
  };

  const statusConfig = {
    online: { label: 'Online', color: 'bg-green-500' },
    away: { label: 'Away', color: 'bg-yellow-500' },
    busy: { label: 'Busy', color: 'bg-red-500' },
    offline: { label: 'Offline', color: 'bg-gray-400' },
  };

  return (
    <header className="flex h-16 items-center justify-between border-b bg-background px-6">
      <div className="flex items-center gap-4">
        <h1 className="text-xl font-semibold">Operator Dashboard</h1>
      </div>

      <div className="flex items-center gap-4">
        {/* Status Dropdown */}
        <Dropdown>
          <DropdownTrigger asChild>
            <button className="flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm transition-colors hover:bg-accent">
              <Circle
                className={cn('h-2.5 w-2.5 fill-current', statusConfig[status].color)}
              />
              <span>{statusConfig[status].label}</span>
            </button>
          </DropdownTrigger>
          <DropdownContent align="end">
            <DropdownLabel>Set Status</DropdownLabel>
            <DropdownSeparator />
            <DropdownRadioGroup value={status} onValueChange={handleStatusChange as (value: string) => void}>
              {Object.entries(statusConfig).map(([key, { label, color }]) => (
                <DropdownRadioItem key={key} value={key}>
                  <Circle className={cn('mr-2 h-2.5 w-2.5 fill-current', color)} />
                  {label}
                </DropdownRadioItem>
              ))}
            </DropdownRadioGroup>
          </DropdownContent>
        </Dropdown>

        {/* User Menu */}
        <Dropdown>
          <DropdownTrigger asChild>
            <button className="flex items-center gap-3 rounded-lg transition-colors hover:bg-accent p-1">
              <Avatar
                src={user?.avatar}
                name={user?.name || user?.email || ''}
                size="md"
                status={status}
              />
              <div className="hidden text-left md:block">
                <p className="text-sm font-medium">{user?.name}</p>
                <p className="text-xs text-muted-foreground">{user?.email}</p>
              </div>
            </button>
          </DropdownTrigger>
          <DropdownContent align="end" className="w-56">
            <DropdownLabel>My Account</DropdownLabel>
            <DropdownSeparator />
            <DropdownItem onClick={() => navigate('/settings')}>
              <User className="mr-2 h-4 w-4" />
              <span>Profile Settings</span>
            </DropdownItem>
            <DropdownSeparator />
            <DropdownItem onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" />
              <span>Log out</span>
            </DropdownItem>
          </DropdownContent>
        </Dropdown>
      </div>
    </header>
  );
}
