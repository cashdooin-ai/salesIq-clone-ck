import { useEffect, useRef } from 'react';
import { Message } from './Message';
import { useChatStore } from '@/stores/chatStore';
import { useAuthStore } from '@/stores/authStore';
import { scrollToBottom } from '@/lib/utils';

interface MessageListProps {
  conversationId: string;
}

export function MessageList({ conversationId }: MessageListProps) {
  const { messages, typingIndicators } = useChatStore();
  const { user } = useAuthStore();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const conversationMessages = messages[conversationId] || [];
  const conversationTyping = typingIndicators.filter(
    (t) => t.conversationId === conversationId && t.userId !== user?.id
  );

  useEffect(() => {
    scrollToBottom(containerRef.current);
  }, [conversationMessages, conversationTyping]);

  if (conversationMessages.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center bg-muted/10">
        <div className="text-center">
          <p className="text-muted-foreground">No messages yet</p>
          <p className="text-sm text-muted-foreground">Start the conversation</p>
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="flex-1 overflow-y-auto bg-muted/10 p-6">
      <div className="space-y-4">
        {conversationMessages.map((message) => (
          <Message
            key={message.id}
            message={message}
            isOwn={message.senderId === user?.id}
          />
        ))}

        {conversationTyping.length > 0 && (
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-sm font-medium">
              {conversationTyping[0].userName[0]}
            </div>
            <div className="rounded-lg bg-white px-4 py-2 shadow-sm">
              <div className="flex gap-1">
                <span className="h-2 w-2 animate-pulse-dot rounded-full bg-gray-400" />
                <span
                  className="h-2 w-2 animate-pulse-dot rounded-full bg-gray-400"
                  style={{ animationDelay: '0.2s' }}
                />
                <span
                  className="h-2 w-2 animate-pulse-dot rounded-full bg-gray-400"
                  style={{ animationDelay: '0.4s' }}
                />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>
    </div>
  );
}
