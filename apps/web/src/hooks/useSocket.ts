import { useEffect, useCallback } from 'react';
import { socketService } from '@/services/socket';
import { useChatStore } from '@/stores/chatStore';
import { useVisitorStore } from '@/stores/visitorStore';
import { useAuthStore } from '@/stores/authStore';
import { playNotificationSound, showDesktopNotification } from '@/lib/utils';
import type { Conversation, Message, Visitor, TypingIndicator } from '@/types';

export function useSocket() {
  const { user, isAuthenticated } = useAuthStore();
  const {
    addConversation,
    updateConversation,
    addMessage,
    addTypingIndicator,
    removeTypingIndicator,
    activeConversationId,
    incrementUnreadCount,
  } = useChatStore();
  const { addVisitor, updateVisitor, removeVisitor } = useVisitorStore();

  // Handle new conversation
  const handleNewConversation = useCallback(
    (conversation: Conversation) => {
      addConversation(conversation);
      playNotificationSound();
      showDesktopNotification('New Conversation', {
        body: `New chat from ${conversation.visitor.name || 'Anonymous'}`,
      });
    },
    [addConversation]
  );

  // Handle conversation update
  const handleConversationUpdate = useCallback(
    (conversation: Conversation) => {
      updateConversation(conversation);
    },
    [updateConversation]
  );

  // Handle new message
  const handleNewMessage = useCallback(
    (message: Message) => {
      addMessage(message);

      // Don't notify if message is from current user
      if (message.senderId === user?.id) {
        return;
      }

      // Increment unread count if not viewing this conversation
      if (activeConversationId !== message.conversationId) {
        incrementUnreadCount(message.conversationId);
        playNotificationSound();
        showDesktopNotification('New Message', {
          body: `${message.senderName}: ${message.content}`,
        });
      }
    },
    [addMessage, user?.id, activeConversationId, incrementUnreadCount]
  );

  // Handle typing indicators
  const handleTypingStart = useCallback(
    (indicator: TypingIndicator) => {
      // Don't show typing indicator for current user
      if (indicator.userId === user?.id) {
        return;
      }
      addTypingIndicator(indicator);
    },
    [addTypingIndicator, user?.id]
  );

  const handleTypingStop = useCallback(
    (indicator: TypingIndicator) => {
      removeTypingIndicator(indicator.conversationId, indicator.userId);
    },
    [removeTypingIndicator]
  );

  // Handle visitor events
  const handleVisitorOnline = useCallback(
    (visitor: Visitor) => {
      addVisitor(visitor);
    },
    [addVisitor]
  );

  const handleVisitorOffline = useCallback(
    (visitorId: string) => {
      removeVisitor(visitorId);
    },
    [removeVisitor]
  );

  const handleVisitorUpdate = useCallback(
    (visitor: Visitor) => {
      updateVisitor(visitor);
    },
    [updateVisitor]
  );

  useEffect(() => {
    if (!isAuthenticated || !user) {
      return;
    }

    // Setup socket event listeners
    socketService.onNewConversation(handleNewConversation);
    socketService.onConversationUpdate(handleConversationUpdate);
    socketService.onNewMessage(handleNewMessage);
    socketService.onTyping(handleTypingStart);
    socketService.onStopTyping(handleTypingStop);
    socketService.onVisitorOnline(handleVisitorOnline);
    socketService.onVisitorOffline(handleVisitorOffline);
    socketService.onVisitorUpdate(handleVisitorUpdate);

    // Cleanup on unmount
    return () => {
      socketService.removeAllListeners();
    };
  }, [
    isAuthenticated,
    user,
    handleNewConversation,
    handleConversationUpdate,
    handleNewMessage,
    handleTypingStart,
    handleTypingStop,
    handleVisitorOnline,
    handleVisitorOffline,
    handleVisitorUpdate,
  ]);

  return {
    isConnected: socketService.isConnected(),
    sendMessage: socketService.sendMessage.bind(socketService),
    sendTyping: socketService.sendTyping.bind(socketService),
    sendStopTyping: socketService.sendStopTyping.bind(socketService),
    joinConversation: socketService.joinConversation.bind(socketService),
    leaveConversation: socketService.leaveConversation.bind(socketService),
  };
}
