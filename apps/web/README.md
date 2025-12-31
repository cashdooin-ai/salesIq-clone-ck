# Operator Dashboard - Web Application

A modern, real-time operator dashboard for managing customer conversations, built with React, TypeScript, and Vite.

## Features

- **Real-time Chat Interface**: Live conversations with visitors using Socket.IO
- **Visitor Tracking**: Monitor online visitors and their behavior
- **Conversation Management**: Handle multiple conversations with status tracking
- **Typing Indicators**: Real-time typing status updates
- **User Status**: Set operator status (Online, Away, Busy, Offline)
- **Responsive Design**: Works on desktop and mobile devices
- **Modern UI**: Built with Tailwind CSS and Radix UI components
- **State Management**: Zustand for efficient state management
- **Type-Safe**: Full TypeScript support

## Tech Stack

- **Framework**: React 18
- **Language**: TypeScript
- **Build Tool**: Vite
- **Routing**: React Router v6
- **State Management**: Zustand
- **Real-time**: Socket.IO Client
- **API Client**: Axios
- **UI Components**: Radix UI
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **Date Handling**: date-fns

## Getting Started

### Prerequisites

- Node.js 18+ and npm/yarn
- Backend API server running (see `/apps/api`)

### Installation

1. Install dependencies:

```bash
npm install
```

2. Create environment file:

```bash
cp .env.example .env
```

3. Update `.env` with your configuration:

```env
VITE_API_URL=http://localhost:4000/api
VITE_SOCKET_URL=http://localhost:4000
```

### Development

Start the development server:

```bash
npm run dev
```

The application will be available at `http://localhost:3000`

### Build

Build for production:

```bash
npm run build
```

Preview production build:

```bash
npm run preview
```

## Project Structure

```
apps/web/
├── src/
│   ├── components/       # React components
│   │   ├── layout/      # Layout components (Sidebar, Header, Layout)
│   │   ├── chat/        # Chat-related components
│   │   ├── visitors/    # Visitor components
│   │   └── ui/          # Reusable UI components
│   ├── pages/           # Page components
│   ├── stores/          # Zustand stores
│   ├── services/        # API and Socket services
│   ├── hooks/           # Custom React hooks
│   ├── types/           # TypeScript type definitions
│   ├── lib/             # Utility functions
│   ├── App.tsx          # Main app component
│   └── main.tsx         # Application entry point
├── public/              # Static assets
├── index.html           # HTML template
├── package.json         # Dependencies and scripts
├── tsconfig.json        # TypeScript configuration
├── vite.config.ts       # Vite configuration
├── tailwind.config.js   # Tailwind CSS configuration
└── README.md           # This file
```

## Key Components

### Layout Components

- **Layout**: Main layout wrapper with sidebar and header
- **Sidebar**: Navigation sidebar with route links
- **Header**: Top header with user menu and status toggle

### Chat Components

- **ConversationList**: List of all conversations with filters
- **ConversationItem**: Individual conversation preview
- **ChatPanel**: Main chat interface
- **ChatHeader**: Chat header with visitor info
- **MessageList**: Messages display with typing indicators
- **Message**: Single message component
- **ChatInput**: Message composer with typing detection
- **VisitorInfo**: Visitor details sidebar

### Pages

- **Login**: Authentication page
- **Dashboard**: Main inbox/chat page
- **Visitors**: Online visitors list
- **Settings**: User settings and preferences
- **NotFound**: 404 error page

## State Management

The application uses Zustand for state management with three main stores:

- **authStore**: Authentication and user state
- **chatStore**: Conversations and messages state
- **visitorStore**: Visitor tracking state

## Real-time Events

Socket.IO events handled by the application:

### Conversation Events
- `conversation:new` - New conversation created
- `conversation:update` - Conversation updated
- `conversation:assigned` - Conversation assigned to operator

### Message Events
- `message:new` - New message received
- `message:read` - Messages marked as read

### Typing Events
- `typing:start` - User started typing
- `typing:stop` - User stopped typing

### Visitor Events
- `visitor:online` - Visitor came online
- `visitor:offline` - Visitor went offline
- `visitor:update` - Visitor info updated

## API Integration

The app communicates with the backend API for:

- Authentication (login/logout)
- Fetching conversations and messages
- Managing conversation status
- Visitor data and statistics
- File uploads

## Styling

The application uses:

- **Tailwind CSS**: Utility-first CSS framework
- **CSS Variables**: For theming support
- **Radix UI**: Accessible component primitives
- **Custom Components**: Styled with Tailwind classes

## Browser Support

- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `VITE_API_URL` | Backend API URL | `http://localhost:4000/api` |
| `VITE_SOCKET_URL` | Socket.IO server URL | `http://localhost:4000` |
| `VITE_ENV` | Environment name | `development` |

## Development Tips

1. **Hot Module Replacement**: Vite provides instant HMR for fast development
2. **Type Checking**: Run `tsc --noEmit` to check types without building
3. **Linting**: Use ESLint for code quality checks
4. **Path Aliases**: Use `@/` to import from the `src` directory

## Troubleshooting

### Socket Connection Issues

If Socket.IO fails to connect:
- Verify the backend server is running
- Check `VITE_SOCKET_URL` in `.env`
- Ensure CORS is configured on the backend

### Build Errors

If you encounter build errors:
- Clear `node_modules` and reinstall: `rm -rf node_modules && npm install`
- Clear Vite cache: `rm -rf .vite`
- Check TypeScript errors: `npm run build`

## License

MIT License - see LICENSE file for details
