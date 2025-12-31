import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { useChatStore } from '@/stores/chatStore';
import { cn, formatMessageTime, truncateText } from '@/lib/utils';
import type { Conversation } from '@/types';

interface ConversationItemProps {
  conversation: Conversation;
}

export function ConversationItem({ conversation }: ConversationItemProps) {
  const { activeConversationId, setActiveConversation } = useChatStore();
  const isActive = activeConversationId === conversation.id;

  const handleClick = () => {
    setActiveConversation(conversation.id);
  };

  const statusColors = {
    pending: 'warning',
    active: 'success',
    resolved: 'secondary',
    closed: 'secondary',
  } as const;

  return (
    <button
      onClick={handleClick}
      className={cn(
        'w-full px-4 py-3 text-left transition-colors hover:bg-accent',
        isActive && 'bg-accent'
      )}
    >
      <div className="flex items-start gap-3">
        <Avatar
          src={conversation.visitor.avatar}
          name={conversation.visitor.name || conversation.visitor.email || 'Anonymous'}
          size="md"
          status={conversation.visitor.isOnline ? 'online' : 'offline'}
        />

        <div className="min-w-0 flex-1">
          <div className="mb-1 flex items-center justify-between gap-2">
            <h3 className="truncate font-medium">
              {conversation.visitor.name || conversation.visitor.email || 'Anonymous Visitor'}
            </h3>
            {conversation.lastMessage && (
              <span className="flex-shrink-0 text-xs text-muted-foreground">
                {formatMessageTime(conversation.lastMessage.timestamp)}
              </span>
            )}
          </div>

          <div className="mb-2 flex items-center gap-2">
            <Badge variant={statusColors[conversation.status]} className="text-xs">
              {conversation.status}
            </Badge>
            {conversation.visitor.location && (
              <span className="text-xs text-muted-foreground">
                {conversation.visitor.location.city}, {conversation.visitor.location.country}
              </span>
            )}
          </div>

          <div className="flex items-center justify-between gap-2">
            <p className="truncate text-sm text-muted-foreground">
              {conversation.lastMessage
                ? truncateText(conversation.lastMessage.content, 50)
                : 'No messages yet'}
            </p>
            {conversation.unreadCount > 0 && (
              <span className="flex h-5 min-w-[20px] flex-shrink-0 items-center justify-center rounded-full bg-primary px-1.5 text-xs font-semibold text-primary-foreground">
                {conversation.unreadCount}
              </span>
            )}
          </div>
        </div>
      </div>
    </button>
  );
}
