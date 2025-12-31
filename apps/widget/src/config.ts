import { WidgetConfig } from './types';

export const DEFAULT_CONFIG: Partial<WidgetConfig> = {
  position: 'bottom-right',
  primaryColor: '#4F46E5',
  headerTitle: 'Chat with us',
  headerSubtitle: 'We typically reply in a few minutes',
  welcomeMessage: 'Hi there! How can we help you today?',
  requirePreChat: false,
  autoOpen: false,
  showBranding: true,
  locale: 'en',
  apiUrl: 'https://api.nexvo.io',
  wsUrl: 'wss://api.nexvo.io',
};

export function getConfig(): WidgetConfig {
  // Get config from script tag attributes
  const scriptTag = document.querySelector('script[data-api-key]') as HTMLScriptElement;

  if (!scriptTag) {
    throw new Error('Nexvo Widget: script tag with data-api-key not found');
  }

  const apiKey = scriptTag.getAttribute('data-api-key');

  if (!apiKey) {
    throw new Error('Nexvo Widget: data-api-key attribute is required');
  }

  const config: WidgetConfig = {
    apiKey,
    position: (scriptTag.getAttribute('data-position') as any) || DEFAULT_CONFIG.position,
    primaryColor: scriptTag.getAttribute('data-primary-color') || DEFAULT_CONFIG.primaryColor,
    headerTitle: scriptTag.getAttribute('data-header-title') || DEFAULT_CONFIG.headerTitle,
    headerSubtitle: scriptTag.getAttribute('data-header-subtitle') || DEFAULT_CONFIG.headerSubtitle,
    welcomeMessage: scriptTag.getAttribute('data-welcome-message') || DEFAULT_CONFIG.welcomeMessage,
    requirePreChat: scriptTag.getAttribute('data-require-prechat') === 'true',
    autoOpen: scriptTag.getAttribute('data-auto-open') === 'true',
    showBranding: scriptTag.getAttribute('data-show-branding') !== 'false',
    locale: scriptTag.getAttribute('data-locale') || DEFAULT_CONFIG.locale,
    apiUrl: scriptTag.getAttribute('data-api-url') || DEFAULT_CONFIG.apiUrl,
    wsUrl: scriptTag.getAttribute('data-ws-url') || DEFAULT_CONFIG.wsUrl,
  };

  return config;
}

export function getStoredVisitorId(): string | null {
  try {
    return localStorage.getItem('nexvo_visitor_id');
  } catch {
    return null;
  }
}

export function setStoredVisitorId(visitorId: string): void {
  try {
    localStorage.setItem('nexvo_visitor_id', visitorId);
  } catch {
    // Ignore localStorage errors
  }
}

export function getStoredSessionId(): string | null {
  try {
    return sessionStorage.getItem('nexvo_session_id');
  } catch {
    return null;
  }
}

export function setStoredSessionId(sessionId: string): void {
  try {
    sessionStorage.setItem('nexvo_session_id', sessionId);
  } catch {
    // Ignore sessionStorage errors
  }
}
