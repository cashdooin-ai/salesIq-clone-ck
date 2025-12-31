import { ConversationList } from '@/components/chat/ConversationList';
import { ChatPanel } from '@/components/chat/ChatPanel';
import { VisitorInfo } from '@/components/chat/VisitorInfo';

export function Dashboard() {
  return (
    <div className="flex h-full">
      <ConversationList />
      <ChatPanel />
      <VisitorInfo />
    </div>
  );
}
