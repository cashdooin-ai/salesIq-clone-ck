import { ChatHeader } from './ChatHeader';
import { MessageList } from './MessageList';
import { ChatInput } from './ChatInput';
import { useChatStore } from '@/stores/chatStore';

export function ChatPanel() {
  const { activeConversation } = useChatStore();

  if (!activeConversation) {
    return (
      <div className="flex h-full flex-1 items-center justify-center bg-muted/20">
        <div className="text-center">
          <div className="mb-4 text-6xl">💬</div>
          <h2 className="mb-2 text-xl font-semibold">No conversation selected</h2>
          <p className="text-sm text-muted-foreground">
            Select a conversation from the list to start chatting
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-1 flex-col">
      <ChatHeader conversation={activeConversation} />
      <MessageList conversationId={activeConversation.id} />
      <ChatInput conversationId={activeConversation.id} />
    </div>
  );
}
