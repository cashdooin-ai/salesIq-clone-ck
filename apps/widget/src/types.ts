export interface WidgetConfig {
  apiKey: string;
  apiUrl?: string;
  wsUrl?: string;
  position?: 'bottom-right' | 'bottom-left';
  primaryColor?: string;
  headerTitle?: string;
  headerSubtitle?: string;
  welcomeMessage?: string;
  requirePreChat?: boolean;
  preChatFields?: PreChatField[];
  autoOpen?: boolean;
  showBranding?: boolean;
  locale?: string;
}

export interface PreChatField {
  name: string;
  label: string;
  type: 'text' | 'email' | 'phone' | 'select';
  required: boolean;
  options?: string[];
}

export interface Message {
  id: string;
  type: 'visitor' | 'operator' | 'system';
  content: string;
  timestamp: number;
  senderName?: string;
  senderAvatar?: string;
  status?: 'sending' | 'sent' | 'failed';
}

export interface Visitor {
  id?: string;
  name?: string;
  email?: string;
  customFields?: Record<string, any>;
  sessionId?: string;
}

export interface ChatSession {
  id: string;
  visitorId: string;
  operatorId?: string;
  status: 'waiting' | 'active' | 'ended';
  startedAt: number;
  endedAt?: number;
}

export interface TypingStatus {
  isTyping: boolean;
  userName?: string;
}

export interface OperatorStatus {
  online: boolean;
  name?: string;
  avatar?: string;
  title?: string;
}

export interface SocketEvents {
  // Emitted events
  'visitor:init': (data: { visitorId?: string; sessionId?: string; apiKey: string }) => void;
  'message:send': (data: { message: string; visitorId: string; sessionId: string }) => void;
  'message:typing': (data: { isTyping: boolean; visitorId: string; sessionId: string }) => void;

  // Listened events
  'message:new': (message: Message) => void;
  'operator:typing': (data: TypingStatus) => void;
  'operator:status': (status: OperatorStatus) => void;
  'session:created': (session: ChatSession) => void;
  'session:ended': () => void;
  'error': (error: { message: string; code?: string }) => void;
}

export interface ChatState {
  messages: Message[];
  isConnected: boolean;
  isTyping: boolean;
  operatorStatus: OperatorStatus;
  session?: ChatSession;
  visitor?: Visitor;
}
