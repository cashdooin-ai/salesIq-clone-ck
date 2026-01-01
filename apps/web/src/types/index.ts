export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  role: 'operator' | 'admin' | 'agent';
  organizationId: string;
  status: 'online' | 'away' | 'busy' | 'offline';
}

export interface Visitor {
  id: string;
  name?: string;
  email?: string;
  location?: {
    country: string;
    city: string;
    ip: string;
  };
  browser?: string;
  os?: string;
  device?: string;
  pageViews: number;
  currentPage: string;
  visitedPages: VisitedPage[];
  score: number;
  firstVisit: Date;
  lastSeen: Date;
  sessionDuration: number;
  isOnline: boolean;
  tags?: string[];
}

export interface VisitedPage {
  url: string;
  title: string;
  timestamp: Date;
  duration: number;
}

export interface Conversation {
  id: string;
  visitorId: string;
  visitor: Visitor;
  operatorId?: string;
  operator?: User;
  status: 'pending' | 'active' | 'resolved' | 'closed';
  messages: Message[];
  unreadCount: number;
  createdAt: Date;
  updatedAt: Date;
  lastMessage?: Message;
  tags?: string[];
  rating?: number;
  notes?: string;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  senderType: 'visitor' | 'operator';
  senderName: string;
  senderAvatar?: string;
  content: string;
  type: 'text' | 'file' | 'image' | 'system';
  fileUrl?: string;
  fileName?: string;
  timestamp: Date;
  isRead: boolean;
}

export interface TypingIndicator {
  conversationId: string;
  userId: string;
  userName: string;
  userType: 'visitor' | 'operator';
}

export interface Notification {
  id: string;
  type: 'new_conversation' | 'new_message' | 'visitor_online' | 'system';
  title: string;
  message: string;
  timestamp: Date;
  isRead: boolean;
  actionUrl?: string;
}

export interface OperatorStats {
  activeConversations: number;
  pendingConversations: number;
  resolvedToday: number;
  averageResponseTime: number;
  satisfactionScore: number;
  onlineVisitors: number;
}

export type UserStatus = 'online' | 'away' | 'busy' | 'offline';
export type ConversationStatus = 'pending' | 'active' | 'resolved' | 'closed';
export type MessageType = 'text' | 'file' | 'image' | 'system';

// Chatbot types
export type BotNodeType = 'start' | 'message' | 'question' | 'buttons' | 'condition' | 'action' | 'end';
export type ChatbotStatus = 'draft' | 'active' | 'inactive';

export interface BotButton {
  label: string;
  value: string;
}

export interface BotCondition {
  field: string;
  operator: 'equals' | 'contains' | 'greater_than' | 'less_than' | 'not_equals';
  value: string;
}

export interface BotAction {
  type: 'assign' | 'tag' | 'webhook' | 'email' | 'update_field';
  params: Record<string, any>;
}

export interface BotNodeData {
  label: string;
  content?: string;
  buttons?: BotButton[];
  condition?: BotCondition;
  action?: BotAction;
  inputType?: 'text' | 'email' | 'number' | 'phone';
  variableName?: string;
}

export interface BotNode {
  id: string;
  type: BotNodeType;
  data: BotNodeData;
  position: { x: number; y: number };
}

export interface BotEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
  label?: string;
}

export interface ChatbotFlow {
  nodes: BotNode[];
  edges: BotEdge[];
}

export interface Chatbot {
  id: string;
  name: string;
  description?: string;
  status: ChatbotStatus;
  flow: ChatbotFlow;
  triggers?: {
    urls?: string[];
    delay?: number;
    scrollPercentage?: number;
  };
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  organizationId: string;
}
