import { h } from 'preact';
import { Message as MessageType } from '../types';

interface MessageProps {
  message: MessageType;
}

export function Message({ message }: MessageProps) {
  const isVisitor = message.type === 'visitor';
  const isSystem = message.type === 'system';

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  if (isSystem) {
    return (
      <div className="nexvo-message nexvo-message-system">
        <div className="nexvo-message-content">
          <p className="nexvo-message-text">{message.content}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`nexvo-message ${isVisitor ? 'nexvo-message-visitor' : 'nexvo-message-operator'}`}>
      {!isVisitor && message.senderAvatar && (
        <div className="nexvo-message-avatar">
          <img src={message.senderAvatar} alt={message.senderName || 'Operator'} />
        </div>
      )}

      <div className="nexvo-message-bubble">
        {!isVisitor && message.senderName && (
          <div className="nexvo-message-sender">{message.senderName}</div>
        )}

        <div className="nexvo-message-content">
          <p className="nexvo-message-text">{message.content}</p>
        </div>

        <div className="nexvo-message-meta">
          <span className="nexvo-message-time">{formatTime(message.timestamp)}</span>
          {isVisitor && message.status && (
            <span className="nexvo-message-status">
              {message.status === 'sending' && '○'}
              {message.status === 'sent' && '✓'}
              {message.status === 'failed' && '✗'}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
