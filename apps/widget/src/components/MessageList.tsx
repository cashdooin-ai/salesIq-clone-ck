import { h } from 'preact';
import { useEffect, useRef } from 'preact/hooks';
import { Message as MessageType } from '../types';
import { Message } from './Message';
import { TypingIndicator } from './TypingIndicator';

interface MessageListProps {
  messages: MessageType[];
  isTyping: boolean;
  operatorName?: string;
}

export function MessageList({ messages, isTyping, operatorName }: MessageListProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = (smooth = true) => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({
        behavior: smooth ? 'smooth' : 'auto',
        block: 'end',
      });
    }
  };

  useEffect(() => {
    // Scroll to bottom when new messages arrive or typing status changes
    scrollToBottom();
  }, [messages.length, isTyping]);

  useEffect(() => {
    // Initial scroll without animation
    scrollToBottom(false);
  }, []);

  return (
    <div className="nexvo-messages" ref={containerRef}>
      <div className="nexvo-messages-container">
        {messages.length === 0 && (
          <div className="nexvo-messages-empty">
            <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
              <circle cx="32" cy="32" r="30" stroke="#E5E7EB" strokeWidth="2"/>
              <path d="M20 26H44M20 34H36" stroke="#E5E7EB" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            <p>Start a conversation</p>
          </div>
        )}

        {messages.map((message) => (
          <Message key={message.id} message={message} />
        ))}

        {isTyping && <TypingIndicator userName={operatorName} />}

        <div ref={messagesEndRef} />
      </div>
    </div>
  );
}
