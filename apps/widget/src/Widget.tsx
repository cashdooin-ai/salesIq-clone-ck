import { h } from 'preact';
import { useEffect } from 'preact/hooks';
import { WidgetConfig } from './types';
import { useWidget } from './hooks/useWidget';
import { useChat } from './hooks/useChat';
import { Launcher } from './components/Launcher';
import { ChatWindow } from './components/ChatWindow';

interface WidgetProps {
  config: WidgetConfig;
}

export function Widget({ config }: WidgetProps) {
  const { isOpen, isMinimized, open, close, toggle, minimize } = useWidget(config.autoOpen);

  const {
    messages,
    isConnected,
    isTyping,
    operatorStatus,
    isInitialized,
    error,
    sendMessage,
    setTyping,
    initChat,
  } = useChat(config);

  useEffect(() => {
    // Initialize chat if not requiring pre-chat form
    if (!config.requirePreChat && !isInitialized) {
      initChat();
    }
  }, [config.requirePreChat, isInitialized, initChat]);

  // Calculate unread messages (messages received while chat is closed)
  const unreadCount = isOpen ? 0 : messages.filter(
    msg => msg.type === 'operator' && msg.timestamp > (Date.now() - 60000)
  ).length;

  const handleOpen = () => {
    open();
    // Initialize chat if needed
    if (!isInitialized && !config.requirePreChat) {
      initChat();
    }
  };

  return (
    <div className={`nexvo-widget nexvo-widget-${config.position || 'bottom-right'}`}>
      {isOpen && !isMinimized && (
        <ChatWindow
          config={config}
          messages={messages}
          isConnected={isConnected}
          isTyping={isTyping}
          operatorStatus={operatorStatus}
          isInitialized={isInitialized}
          error={error}
          onClose={close}
          onMinimize={minimize}
          onSendMessage={sendMessage}
          onTyping={setTyping}
          onInitChat={initChat}
        />
      )}

      <Launcher
        onClick={isOpen ? toggle : handleOpen}
        isOpen={isOpen && !isMinimized}
        primaryColor={config.primaryColor || '#4F46E5'}
        unreadCount={unreadCount}
      />
    </div>
  );
}
