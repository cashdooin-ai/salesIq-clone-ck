import { h } from 'preact';
import { useState } from 'preact/hooks';
import { WidgetConfig, Message, OperatorStatus, Visitor } from '../types';
import { Header } from './Header';
import { MessageList } from './MessageList';
import { Input } from './Input';
import { PreChatForm } from './PreChatForm';

interface ChatWindowProps {
  config: WidgetConfig;
  messages: Message[];
  isConnected: boolean;
  isTyping: boolean;
  operatorStatus: OperatorStatus;
  isInitialized: boolean;
  error: string | null;
  onClose: () => void;
  onMinimize: () => void;
  onSendMessage: (message: string) => void;
  onTyping: (isTyping: boolean) => void;
  onInitChat: (visitorData?: Partial<Visitor>) => void;
}

export function ChatWindow({
  config,
  messages,
  isConnected,
  isTyping,
  operatorStatus,
  isInitialized,
  error,
  onClose,
  onMinimize,
  onSendMessage,
  onTyping,
  onInitChat,
}: ChatWindowProps) {
  const [showPreChat, setShowPreChat] = useState(config.requirePreChat && !isInitialized);

  const handlePreChatSubmit = (visitorData: Partial<Visitor>) => {
    onInitChat(visitorData);
    setShowPreChat(false);
  };

  const handleSkipPreChat = () => {
    onInitChat();
    setShowPreChat(false);
  };

  return (
    <div className="nexvo-chat-window">
      <Header
        title={config.headerTitle || 'Chat with us'}
        subtitle={config.headerSubtitle}
        operatorStatus={operatorStatus}
        primaryColor={config.primaryColor || '#4F46E5'}
        onClose={onClose}
        onMinimize={onMinimize}
      />

      {error && (
        <div className="nexvo-error-banner">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path
              d="M8 16A8 8 0 1 0 8 0a8 8 0 0 0 0 16zM7 4h2v5H7V4zm0 6h2v2H7v-2z"
              fill="currentColor"
            />
          </svg>
          <span>{error}</span>
        </div>
      )}

      {showPreChat ? (
        <div className="nexvo-chat-content">
          <PreChatForm
            fields={config.preChatFields}
            onSubmit={handlePreChatSubmit}
            primaryColor={config.primaryColor || '#4F46E5'}
          />

          {!config.requirePreChat && (
            <button className="nexvo-skip-prechat" onClick={handleSkipPreChat}>
              Skip and start chatting
            </button>
          )}
        </div>
      ) : (
        <>
          <MessageList
            messages={messages}
            isTyping={isTyping}
            operatorName={operatorStatus.name}
          />

          <Input
            onSend={onSendMessage}
            onTyping={onTyping}
            disabled={!isConnected}
            placeholder={isConnected ? 'Type a message...' : 'Connecting...'}
            primaryColor={config.primaryColor || '#4F46E5'}
          />

          {config.showBranding && (
            <div className="nexvo-branding">
              Powered by <a href="https://nexvo.io" target="_blank" rel="noopener noreferrer">Nexvo</a>
            </div>
          )}
        </>
      )}
    </div>
  );
}
