// Nexvo Constants

// ============================================
// API
// ============================================

export const API_VERSION = 'v1';
export const API_PREFIX = `/api/${API_VERSION}`;

// ============================================
// Pagination
// ============================================

export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

// ============================================
// Rate Limits
// ============================================

export const RATE_LIMITS = {
  AUTH: { max: 5, windowMs: 60 * 1000 }, // 5 requests per minute
  API: { max: 100, windowMs: 60 * 1000 }, // 100 requests per minute
  WIDGET: { max: 30, windowMs: 60 * 1000 }, // 30 requests per minute
};

// ============================================
// JWT
// ============================================

export const JWT_ALGORITHM = 'HS256';
export const ACCESS_TOKEN_EXPIRY = '15m';
export const REFRESH_TOKEN_EXPIRY = '7d';

// ============================================
// WebSocket
// ============================================

export const WS_NAMESPACES = {
  OPERATOR: '/operator',
  WIDGET: '/widget',
};

export const WS_EVENTS = {
  // Conversation
  CONVERSATION_NEW: 'conversation:new',
  CONVERSATION_UPDATED: 'conversation:updated',
  CONVERSATION_ASSIGNED: 'conversation:assigned',
  CONVERSATION_JOIN: 'conversation:join',
  CONVERSATION_LEAVE: 'conversation:leave',

  // Message
  MESSAGE_NEW: 'message:new',
  MESSAGE_SEND: 'message:send',
  MESSAGE_TYPING: 'message:typing',
  MESSAGE_READ: 'message:read',

  // Visitor
  VISITOR_INIT: 'visitor:init',
  VISITOR_ONLINE: 'visitor:online',
  VISITOR_OFFLINE: 'visitor:offline',
  VISITOR_PAGEVIEW: 'visitor:pageview',

  // Operator
  OPERATOR_JOIN: 'operator:join',
  OPERATOR_STATUS: 'operator:status',
};

// ============================================
// Widget
// ============================================

export const WIDGET_DEFAULTS = {
  primaryColor: '#2563eb',
  position: 'bottom-right' as const,
  title: 'Chat with us',
  subtitle: 'We typically reply within minutes',
  offlineMessage: 'We are currently offline. Leave us a message!',
  autoOpenDelay: 5000,
};

// ============================================
// Scoring
// ============================================

export const SCORE_WEIGHTS = {
  PAGE_VIEW: 1,
  CHAT_INITIATED: 10,
  EMAIL_PROVIDED: 15,
  PHONE_PROVIDED: 15,
  RETURNING_VISITOR: 5,
  TIME_ON_SITE: 0.1, // per minute
};

// ============================================
// Error Codes
// ============================================

export const ERROR_CODES = {
  // Auth
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  TOKEN_INVALID: 'TOKEN_INVALID',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',

  // Validation
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INVALID_INPUT: 'INVALID_INPUT',

  // Resources
  NOT_FOUND: 'NOT_FOUND',
  ALREADY_EXISTS: 'ALREADY_EXISTS',
  CONFLICT: 'CONFLICT',

  // Rate Limiting
  RATE_LIMITED: 'RATE_LIMITED',

  // Server
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
};
