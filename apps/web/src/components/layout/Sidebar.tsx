import { NavLink } from 'react-router-dom';
import { MessageSquare, Users, Settings, BarChart3 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useChatStore } from '@/stores/chatStore';
import { useVisitorStore } from '@/stores/visitorStore';

export function Sidebar() {
  const { conversations } = useChatStore();
  const { onlineVisitors } = useVisitorStore();

  const totalUnread = conversations.reduce((sum, conv) => sum + conv.unreadCount, 0);
  const onlineCount = onlineVisitors.length;

  const navItems = [
    {
      to: '/',
      icon: MessageSquare,
      label: 'Inbox',
      badge: totalUnread,
    },
    {
      to: '/visitors',
      icon: Users,
      label: 'Visitors',
      badge: onlineCount,
    },
    {
      to: '/analytics',
      icon: BarChart3,
      label: 'Analytics',
    },
    {
      to: '/settings',
      icon: Settings,
      label: 'Settings',
    },
  ];

  return (
    <aside className="flex w-16 flex-col items-center border-r bg-background py-4">
      <div className="mb-8">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <span className="text-xl font-bold">S</span>
        </div>
      </div>

      <nav className="flex flex-1 flex-col gap-2">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              cn(
                'group relative flex h-12 w-12 items-center justify-center rounded-lg transition-colors',
                isActive
                  ? 'bg-accent text-accent-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              )
            }
          >
            {({ isActive }) => (
              <>
                <item.icon className="h-5 w-5" />
                {item.badge !== undefined && item.badge > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-primary px-1 text-xs font-semibold text-primary-foreground">
                    {item.badge > 99 ? '99+' : item.badge}
                  </span>
                )}
                <div className="absolute left-full ml-2 hidden rounded bg-gray-900 px-2 py-1 text-xs text-white group-hover:block">
                  {item.label}
                </div>
              </>
            )}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
