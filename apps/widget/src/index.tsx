import { h, render } from 'preact';
import { Widget } from './Widget';
import { getConfig } from './config';
import './styles/widget.css';

// Initialize widget when DOM is ready
function initWidget() {
  try {
    // Get configuration from script tag
    const config = getConfig();

    // Create container for widget
    const container = document.createElement('div');
    container.id = 'nexvo-widget-root';
    document.body.appendChild(container);

    // Render widget
    render(<Widget config={config} />, container);

    console.log('[Nexvo Widget] Initialized successfully');

    // Expose global API for custom interactions
    (window as any).NexvoWidget = {
      open: () => {
        // This will be enhanced to programmatically control the widget
        const launcher = document.querySelector('.nexvo-launcher') as HTMLButtonElement;
        launcher?.click();
      },
      close: () => {
        // This will be enhanced
        const closeBtn = document.querySelector('.nexvo-header-btn:last-child') as HTMLButtonElement;
        closeBtn?.click();
      },
      version: '1.0.0',
    };
  } catch (error) {
    console.error('[Nexvo Widget] Initialization failed:', error);
  }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initWidget);
} else {
  initWidget();
}

export { Widget };
