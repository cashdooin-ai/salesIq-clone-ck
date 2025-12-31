# Nexvo Chat Widget

An embeddable, production-ready chat widget for the Nexvo customer engagement platform. Built with Preact for optimal performance (~3KB), with real-time messaging via Socket.IO.

## Features

- **Lightweight**: ~3KB gzipped (Preact-based)
- **Real-time messaging**: Socket.IO integration
- **Pre-chat forms**: Collect visitor information before chat
- **Typing indicators**: Real-time typing status
- **Mobile responsive**: Works seamlessly on all devices
- **Customizable**: Colors, text, and branding options
- **Self-contained**: Single JavaScript bundle with inlined styles
- **Production-ready**: TypeScript, optimized builds, error handling

## Installation

### For Customers

Add this single script tag to your website, just before the closing `</body>` tag:

```html
<script
  src="https://cdn.nexvo.io/widget.js"
  data-api-key="your-api-key-here"
></script>
```

### Configuration Options

Customize the widget using data attributes:

```html
<script
  src="https://cdn.nexvo.io/widget.js"
  data-api-key="your-api-key-here"
  data-primary-color="#4F46E5"
  data-header-title="Chat with us"
  data-header-subtitle="We typically reply in a few minutes"
  data-welcome-message="Hi! How can we help you today?"
  data-position="bottom-right"
  data-auto-open="false"
  data-require-prechat="false"
  data-show-branding="true"
></script>
```

#### Available Options

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `data-api-key` | string | *required* | Your Nexvo API key |
| `data-api-url` | string | `https://api.nexvo.io` | API endpoint URL |
| `data-ws-url` | string | `wss://api.nexvo.io` | WebSocket endpoint URL |
| `data-primary-color` | string | `#4F46E5` | Primary brand color |
| `data-header-title` | string | `Chat with us` | Chat header title |
| `data-header-subtitle` | string | `We typically reply in a few minutes` | Chat header subtitle |
| `data-welcome-message` | string | `Hi there! How can we help you today?` | Initial message |
| `data-position` | `bottom-right` \| `bottom-left` | `bottom-right` | Widget position |
| `data-auto-open` | boolean | `false` | Auto-open widget on load |
| `data-require-prechat` | boolean | `false` | Require pre-chat form |
| `data-show-branding` | boolean | `true` | Show "Powered by Nexvo" |
| `data-locale` | string | `en` | Language locale |

## Development

### Prerequisites

- Node.js 18+
- npm or yarn

### Setup

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Type checking
npm run typecheck
```

### Development Server

The development server runs at `http://localhost:5173` with hot module replacement.

### Project Structure

```
apps/widget/
├── src/
│   ├── index.tsx              # Entry point
│   ├── Widget.tsx             # Main widget component
│   ├── config.ts              # Configuration management
│   ├── types.ts               # TypeScript type definitions
│   ├── components/
│   │   ├── Launcher.tsx       # Chat bubble button
│   │   ├── ChatWindow.tsx     # Main chat window
│   │   ├── Header.tsx         # Chat header
│   │   ├── MessageList.tsx    # Message list container
│   │   ├── Message.tsx        # Individual message
│   │   ├── Input.tsx          # Message input field
│   │   ├── PreChatForm.tsx    # Pre-chat form
│   │   └── TypingIndicator.tsx # Typing indicator
│   ├── hooks/
│   │   ├── useChat.ts         # Chat state and logic
│   │   └── useWidget.ts       # Widget UI state
│   ├── services/
│   │   ├── api.ts             # REST API service
│   │   └── socket.ts          # Socket.IO service
│   └── styles/
│       └── widget.css         # All widget styles
├── public/
│   └── index.html             # Development preview
├── package.json
├── tsconfig.json
├── vite.config.ts
└── README.md
```

## Architecture

### Components

- **Widget**: Main container, manages state and configuration
- **Launcher**: Floating button to open/close chat
- **ChatWindow**: Chat interface container
- **Header**: Displays title, status, and controls
- **MessageList**: Scrollable message list with auto-scroll
- **Message**: Individual message bubble
- **Input**: Message input with send button
- **PreChatForm**: Optional form before chat starts
- **TypingIndicator**: Shows when operator is typing

### State Management

- **useWidget**: Manages open/close/minimize state
- **useChat**: Handles messages, connection, typing, and socket events

### Services

- **ApiService**: REST API communication
- **SocketService**: Real-time WebSocket communication

### Socket Events

#### Emitted Events

- `visitor:init`: Initialize visitor session
- `message:send`: Send a message
- `message:typing`: Update typing status

#### Listened Events

- `message:new`: New message received
- `operator:typing`: Operator typing status
- `operator:status`: Operator online/offline status
- `session:created`: Chat session created
- `session:ended`: Chat session ended
- `error`: Error occurred

## Building for Production

```bash
npm run build
```

This creates:
- `dist/nexvo-widget.js` - Minified, self-contained bundle
- All styles are inlined (no separate CSS file)
- Source maps for debugging

### Build Configuration

The build is optimized using Vite with the following features:

- **Tree shaking**: Remove unused code
- **Minification**: Terser with console removal
- **Code splitting disabled**: Single bundle for easy embedding
- **CSS inlining**: All styles included in JS bundle
- **IIFE format**: Immediately-invoked function expression

## Browser Support

- Chrome/Edge: Last 2 versions
- Firefox: Last 2 versions
- Safari: Last 2 versions
- Mobile browsers: iOS Safari 12+, Chrome Android 90+

## Performance

- **Bundle size**: ~15KB gzipped (including Preact + Socket.IO)
- **Load time**: < 100ms on 3G
- **First paint**: Immediate (launcher button)
- **Runtime**: 60 FPS animations

## Security

- API key validation
- XSS protection via Preact
- CORS-compliant
- No external dependencies at runtime
- CSP-compatible

## API Integration

The widget communicates with the Nexvo backend via:

1. **REST API** (`/api/widget/*`):
   - Initialize visitor session
   - Get operator status
   - Upload files
   - Get chat history

2. **WebSocket** (`/widget` namespace):
   - Real-time messaging
   - Typing indicators
   - Presence updates

### Backend Requirements

Your backend must implement:

- Socket.IO server with `/widget` namespace
- REST endpoints for initialization and status
- Session and visitor management

## Customization

### Custom Styling

While the widget is self-contained, you can override styles using high-specificity selectors:

```css
#nexvo-widget-root .nexvo-launcher {
  width: 70px !important;
  height: 70px !important;
}
```

### Programmatic Control

Access the widget programmatically:

```javascript
// Open widget
window.NexvoWidget.open();

// Close widget
window.NexvoWidget.close();

// Get version
console.log(window.NexvoWidget.version);
```

## Troubleshooting

### Widget not appearing

1. Check that the script tag has `data-api-key`
2. Verify the API key is valid
3. Check browser console for errors
4. Ensure no CSP blocking the script

### Connection issues

1. Verify `data-api-url` and `data-ws-url` are correct
2. Check CORS settings on your backend
3. Ensure WebSocket is not blocked by firewall
4. Check browser console for socket errors

### Styling conflicts

1. The widget uses a unique prefix (`nexvo-`) for all classes
2. All styles are scoped to `#nexvo-widget-root`
3. Widget has `z-index: 999999`

## License

MIT

## Support

For issues and questions:
- Documentation: https://docs.nexvo.io
- Email: support@nexvo.io
- GitHub Issues: https://github.com/nexvo/widget
