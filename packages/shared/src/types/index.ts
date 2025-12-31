// Shared TypeScript Types

// ============================================
// API Response Types
// ============================================

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: ApiError;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
  };
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

// ============================================
// Auth Types
// ============================================

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  role: UserRole;
  organizationId: string;
  organizationSlug: string;
}

export type UserRole = 'OWNER' | 'ADMIN' | 'SUPERVISOR' | 'OPERATOR';
export type UserStatus = 'ONLINE' | 'AWAY' | 'BUSY' | 'OFFLINE';

// ============================================
// Conversation Types
// ============================================

export type ConversationStatus = 'PENDING' | 'ACTIVE' | 'WAITING' | 'RESOLVED' | 'MISSED';
export type Priority = 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
export type Channel = 'WIDGET' | 'WHATSAPP' | 'FACEBOOK' | 'INSTAGRAM' | 'TELEGRAM' | 'EMAIL' | 'SMS';

// ============================================
// Message Types
// ============================================

export type SenderType = 'VISITOR' | 'OPERATOR' | 'BOT' | 'SYSTEM';
export type MessageType = 'TEXT' | 'IMAGE' | 'FILE' | 'VIDEO' | 'AUDIO' | 'CARD' | 'BUTTONS' | 'FORM';
export type MessageStatus = 'SENDING' | 'SENT' | 'DELIVERED' | 'READ' | 'FAILED';

export interface Message {
  id: string;
  conversationId: string;
  senderType: SenderType;
  senderId?: string;
  content: string;
  contentType: MessageType;
  attachments: Attachment[];
  metadata: Record<string, unknown>;
  status: MessageStatus;
  createdAt: string;
  readAt?: string;
}

export interface Attachment {
  id: string;
  type: 'image' | 'file' | 'video' | 'audio';
  name: string;
  url: string;
  size: number;
  mimeType: string;
}

// ============================================
// Widget Types
// ============================================

export interface WidgetConfig {
  // Appearance
  primaryColor: string;
  position: 'bottom-right' | 'bottom-left';
  launcherIcon: 'chat' | 'message' | 'custom';
  customLauncherIcon?: string;

  // Branding
  title: string;
  subtitle?: string;
  logo?: string;

  // Behavior
  showOnMobile: boolean;
  showOnDesktop: boolean;
  autoOpen: boolean;
  autoOpenDelay: number;

  // Pre-chat form
  preChatForm: {
    enabled: boolean;
    fields: PreChatField[];
  };

  // Offline
  offlineMessage: string;
  showOfflineForm: boolean;

  // Language
  language: string;
  translations: Record<string, string>;
}

export interface PreChatField {
  name: string;
  label: string;
  type: 'text' | 'email' | 'phone' | 'select' | 'textarea';
  required: boolean;
  options?: string[];
}

// ============================================
// Visitor Types
// ============================================

export interface VisitorInfo {
  id: string;
  visitorToken: string;
  email?: string;
  name?: string;
  avatar?: string;
  score: number;
  tags: string[];
  metadata: Record<string, unknown>;
  firstSeenAt: string;
  lastSeenAt: string;
  currentPage?: string;
  isOnline: boolean;
}

export interface VisitorSession {
  id: string;
  ipAddress?: string;
  country?: string;
  city?: string;
  device?: string;
  browser?: string;
  os?: string;
  referrer?: string;
  landingPage?: string;
  startedAt: string;
  endedAt?: string;
}

// ============================================
// Socket Events
// ============================================

export interface ServerToClientEvents {
  'conversation:new': (conversation: unknown) => void;
  'conversation:updated': (conversation: unknown) => void;
  'conversation:assigned': (data: { conversationId: string; operatorId: string }) => void;
  'message:new': (message: Message) => void;
  'message:typing': (data: { conversationId: string; isTyping: boolean; senderType: SenderType }) => void;
  'message:read': (data: { conversationId: string; messageIds: string[] }) => void;
  'visitor:online': (visitor: VisitorInfo) => void;
  'visitor:offline': (visitorId: string) => void;
  'visitor:pageview': (data: { visitorId: string; url: string; title?: string }) => void;
  'operator:status': (data: { operatorId: string; status: UserStatus }) => void;
}

export interface ClientToServerEvents {
  'operator:join': (organizationId: string) => void;
  'operator:status': (status: UserStatus) => void;
  'conversation:join': (conversationId: string) => void;
  'conversation:leave': (conversationId: string) => void;
  'message:send': (data: { conversationId: string; content: string; contentType?: MessageType }) => void;
  'message:typing': (data: { conversationId: string; isTyping: boolean }) => void;
  'message:read': (data: { conversationId: string; messageIds: string[] }) => void;
}
