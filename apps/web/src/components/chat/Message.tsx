import { Avatar } from '@/components/ui/Avatar';
import { formatMessageTime, cn } from '@/lib/utils';
import type { Message as MessageType } from '@/types';

interface MessageProps {
  message: MessageType;
  isOwn: boolean;
}

export function Message({ message, isOwn }: MessageProps) {
  return (
    <div className={cn('flex items-start gap-3', isOwn && 'flex-row-reverse')}>
      <Avatar
        src={message.senderAvatar}
        name={message.senderName}
        size="md"
      />

      <div className={cn('flex max-w-[70%] flex-col', isOwn && 'items-end')}>
        <div className="mb-1 flex items-center gap-2">
          <span className={cn('text-sm font-medium', isOwn && 'order-2')}>
            {message.senderName}
          </span>
          <span className={cn('text-xs text-muted-foreground', isOwn && 'order-1')}>
            {formatMessageTime(message.timestamp)}
          </span>
        </div>

        <div
          className={cn(
            'rounded-lg px-4 py-2 shadow-sm',
            isOwn
              ? 'bg-primary text-primary-foreground'
              : 'bg-white text-foreground'
          )}
        >
          {message.type === 'text' ? (
            <p className="whitespace-pre-wrap break-words">{message.content}</p>
          ) : message.type === 'image' ? (
            <div>
              <img
                src={message.fileUrl}
                alt={message.fileName}
                className="max-h-64 rounded"
              />
              {message.content && (
                <p className="mt-2 whitespace-pre-wrap break-words">{message.content}</p>
              )}
            </div>
          ) : message.type === 'file' ? (
            <div>
              <a
                href={message.fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 underline"
              >
                <span>📎</span>
                <span>{message.fileName}</span>
              </a>
              {message.content && (
                <p className="mt-2 whitespace-pre-wrap break-words">{message.content}</p>
              )}
            </div>
          ) : (
            <p className="italic text-muted-foreground">{message.content}</p>
          )}
        </div>
      </div>
    </div>
  );
}
