import { h } from 'preact';
import { useState, useRef, useEffect } from 'preact/hooks';

interface InputProps {
  onSend: (message: string) => void;
  onTyping: (isTyping: boolean) => void;
  disabled?: boolean;
  placeholder?: string;
  primaryColor: string;
}

export function Input({
  onSend,
  onTyping,
  disabled = false,
  placeholder = 'Type a message...',
  primaryColor,
}: InputProps) {
  const [message, setMessage] = useState('');
  const [isComposing, setIsComposing] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const typingTimeoutRef = useRef<number>();

  useEffect(() => {
    // Auto-focus input
    inputRef.current?.focus();
  }, []);

  const handleChange = (e: Event) => {
    const target = e.target as HTMLTextAreaElement;
    setMessage(target.value);

    // Auto-resize textarea
    target.style.height = 'auto';
    target.style.height = Math.min(target.scrollHeight, 120) + 'px';

    // Typing indicator logic
    if (target.value.trim()) {
      onTyping(true);

      // Clear existing timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      // Set new timeout to stop typing
      typingTimeoutRef.current = window.setTimeout(() => {
        onTyping(false);
      }, 1000);
    } else {
      onTyping(false);
    }
  };

  const handleSubmit = (e?: Event) => {
    e?.preventDefault();

    if (!message.trim() || disabled || isComposing) return;

    onSend(message.trim());
    setMessage('');
    onTyping(false);

    // Clear typing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Reset textarea height
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey && !isComposing) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <form className="nexvo-input" onSubmit={handleSubmit}>
      <div className="nexvo-input-wrapper">
        <textarea
          ref={inputRef}
          className="nexvo-input-field"
          value={message}
          onInput={handleChange}
          onKeyDown={handleKeyDown}
          onCompositionStart={() => setIsComposing(true)}
          onCompositionEnd={() => setIsComposing(false)}
          placeholder={placeholder}
          disabled={disabled}
          rows={1}
          aria-label="Message input"
        />

        <button
          type="submit"
          className="nexvo-input-send"
          disabled={!message.trim() || disabled}
          style={{
            backgroundColor: message.trim() && !disabled ? primaryColor : undefined,
          }}
          aria-label="Send message"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path
              d="M18 2L9 11M18 2L12 18L9 11M18 2L2 8L9 11"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>
    </form>
  );
}
