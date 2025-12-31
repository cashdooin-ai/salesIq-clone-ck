import { MoreVertical, X, CheckCircle } from 'lucide-react';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import {
  Dropdown,
  DropdownTrigger,
  DropdownContent,
  DropdownItem,
  DropdownSeparator,
} from '@/components/ui/Dropdown';
import { useChatStore } from '@/stores/chatStore';
import type { Conversation } from '@/types';

interface ChatHeaderProps {
  conversation: Conversation;
}

export function ChatHeader({ conversation }: ChatHeaderProps) {
  const { updateConversationStatus, setActiveConversation } = useChatStore();

  const handleResolve = async () => {
    try {
      await updateConversationStatus(conversation.id, 'resolved');
    } catch (error) {
      console.error('Failed to resolve conversation:', error);
    }
  };

  const handleClose = async () => {
    try {
      await updateConversationStatus(conversation.id, 'closed');
      setActiveConversation(null);
    } catch (error) {
      console.error('Failed to close conversation:', error);
    }
  };

  const statusColors = {
    pending: 'warning',
    active: 'success',
    resolved: 'secondary',
    closed: 'secondary',
  } as const;

  return (
    <div className="flex items-center justify-between border-b bg-background px-6 py-4">
      <div className="flex items-center gap-4">
        <Avatar
          src={conversation.visitor.avatar}
          name={conversation.visitor.name || conversation.visitor.email || 'Anonymous'}
          size="lg"
          status={conversation.visitor.isOnline ? 'online' : 'offline'}
        />

        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold">
              {conversation.visitor.name || conversation.visitor.email || 'Anonymous Visitor'}
            </h2>
            <Badge variant={statusColors[conversation.status]}>
              {conversation.status}
            </Badge>
          </div>
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            {conversation.visitor.email && (
              <span>{conversation.visitor.email}</span>
            )}
            {conversation.visitor.location && (
              <span>
                {conversation.visitor.location.city}, {conversation.visitor.location.country}
              </span>
            )}
            {conversation.visitor.currentPage && (
              <span className="truncate max-w-xs">
                On: {conversation.visitor.currentPage}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {conversation.status !== 'resolved' && conversation.status !== 'closed' && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleResolve}
            className="gap-2"
          >
            <CheckCircle className="h-4 w-4" />
            Resolve
          </Button>
        )}

        <Dropdown>
          <DropdownTrigger asChild>
            <Button variant="ghost" size="sm">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownTrigger>
          <DropdownContent align="end">
            <DropdownItem onClick={handleResolve}>
              <CheckCircle className="mr-2 h-4 w-4" />
              Mark as Resolved
            </DropdownItem>
            <DropdownSeparator />
            <DropdownItem onClick={handleClose} className="text-destructive">
              <X className="mr-2 h-4 w-4" />
              Close Conversation
            </DropdownItem>
          </DropdownContent>
        </Dropdown>
      </div>
    </div>
  );
}
