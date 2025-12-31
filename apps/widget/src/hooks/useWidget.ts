import { useState, useEffect } from 'preact/hooks';

interface UseWidgetReturn {
  isOpen: boolean;
  isMinimized: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
  minimize: () => void;
  maximize: () => void;
}

export function useWidget(autoOpen: boolean = false): UseWidgetReturn {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);

  useEffect(() => {
    // Auto-open widget if configured
    if (autoOpen) {
      const timer = setTimeout(() => {
        setIsOpen(true);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [autoOpen]);

  const open = () => {
    setIsOpen(true);
    setIsMinimized(false);
  };

  const close = () => {
    setIsOpen(false);
    setIsMinimized(false);
  };

  const toggle = () => {
    setIsOpen(prev => !prev);
    setIsMinimized(false);
  };

  const minimize = () => {
    setIsMinimized(true);
  };

  const maximize = () => {
    setIsMinimized(false);
  };

  return {
    isOpen,
    isMinimized,
    open,
    close,
    toggle,
    minimize,
    maximize,
  };
}
