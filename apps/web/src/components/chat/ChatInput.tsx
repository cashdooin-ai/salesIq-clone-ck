import { useState, useRef, useCallback, useEffect } from 'react';
import { Send, Paperclip, Smile } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useChatStore } from '@/stores/chatStore';
import { useSocket } from '@/hooks/useSocket';

interface ChatInputProps {
  conversationId: string;
}

export function ChatInput({ conversationId }: ChatInputProps) {
  const [message, setMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const { sendMessage, error, clearError } = useChatStore();
  const { sendTyping, sendStopTyping } = useSocket();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleTyping = useCallback(() => {
    if (!isTyping) {
      setIsTyping(true);
      sendTyping(conversationId);
    }

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set new timeout to stop typing indicator
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      sendStopTyping(conversationId);
    }, 1000);
  }, [conversationId, isTyping, sendTyping, sendStopTyping]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value);
    handleTyping();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedMessage = message.trim();
    if (!trimmedMessage) return;

    try {
      await sendMessage(conversationId, trimmedMessage);
      setMessage('');
      setIsTyping(false);
      sendStopTyping(conversationId);

      // Clear typing timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      // Reset textarea height
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [message]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      if (isTyping) {
        sendStopTyping(conversationId);
      }
    };
  }, [conversationId, isTyping, sendStopTyping]);

  return (
    <form onSubmit={handleSubmit} className="border-t bg-background p-4">
      {error && (
        <div className="mb-2 rounded-md bg-destructive/10 p-2 text-sm text-destructive">
          {error}
          <button
            type="button"
            onClick={clearError}
            className="ml-2 underline"
          >
            Dismiss
          </button>
        </div>
      )}

      <div className="flex items-end gap-2">
        <div className="flex gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-10 w-10 p-0"
            title="Attach file"
          >
            <Paperclip className="h-5 w-5" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-10 w-10 p-0"
            title="Add emoji"
          >
            <Smile className="h-5 w-5" />
          </Button>
        </div>

        <div className="flex-1">
          <textarea
            ref={textareaRef}
            value={message}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder="Type your message..."
            className="w-full resize-none rounded-lg border border-input bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            rows={1}
            style={{ maxHeight: '120px' }}
          />
        </div>

        <Button
          type="submit"
          variant="primary"
          size="sm"
          className="h-10 w-10 p-0"
          disabled={!message.trim()}
        >
          <Send className="h-5 w-5" />
        </Button>
      </div>

      <p className="mt-2 text-xs text-muted-foreground">
        Press Enter to send, Shift + Enter for new line
      </p>
    </form>
  );
}
