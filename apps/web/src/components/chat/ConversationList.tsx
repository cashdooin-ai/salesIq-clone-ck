import { useEffect, useState } from 'react';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { ConversationItem } from './ConversationItem';
import { useChatStore } from '@/stores/chatStore';
import { cn } from '@/lib/utils';
import type { ConversationStatus } from '@/types';

export function ConversationList() {
  const { conversations, fetchConversations, isLoading } = useChatStore();
  const [filter, setFilter] = useState<ConversationStatus | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  const filteredConversations = conversations.filter((conv) => {
    const matchesFilter = filter === 'all' || conv.status === filter;
    const matchesSearch =
      !searchQuery ||
      conv.visitor.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      conv.visitor.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      conv.lastMessage?.content.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesFilter && matchesSearch;
  });

  const statusCounts = {
    all: conversations.length,
    pending: conversations.filter((c) => c.status === 'pending').length,
    active: conversations.filter((c) => c.status === 'active').length,
    resolved: conversations.filter((c) => c.status === 'resolved').length,
  };

  const filters: { value: ConversationStatus | 'all'; label: string }[] = [
    { value: 'all', label: 'All' },
    { value: 'pending', label: 'Pending' },
    { value: 'active', label: 'Active' },
    { value: 'resolved', label: 'Resolved' },
  ];

  return (
    <div className="flex h-full w-80 flex-col border-r bg-background">
      <div className="border-b p-4">
        <h2 className="mb-4 text-lg font-semibold">Conversations</h2>

        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        <div className="flex gap-2">
          {filters.map((item) => (
            <button
              key={item.value}
              onClick={() => setFilter(item.value)}
              className={cn(
                'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                filter === item.value
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              )}
            >
              {item.label}
              <Badge
                variant={filter === item.value ? 'secondary' : 'outline'}
                className="ml-1"
              >
                {statusCounts[item.value]}
              </Badge>
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex h-32 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        ) : filteredConversations.length === 0 ? (
          <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
            {searchQuery ? 'No conversations found' : 'No conversations yet'}
          </div>
        ) : (
          <div className="divide-y">
            {filteredConversations.map((conversation) => (
              <ConversationItem key={conversation.id} conversation={conversation} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
