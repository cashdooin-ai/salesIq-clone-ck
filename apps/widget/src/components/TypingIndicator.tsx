import { h } from 'preact';

interface TypingIndicatorProps {
  userName?: string;
}

export function TypingIndicator({ userName }: TypingIndicatorProps) {
  return (
    <div className="nexvo-typing-indicator">
      <div className="nexvo-typing-avatar">
        <div className="nexvo-typing-avatar-placeholder"></div>
      </div>
      <div className="nexvo-typing-bubble">
        <span className="nexvo-typing-text">
          {userName || 'Agent'} is typing
        </span>
        <div className="nexvo-typing-dots">
          <span></span>
          <span></span>
          <span></span>
        </div>
      </div>
    </div>
  );
}
