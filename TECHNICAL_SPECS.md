# Technical Specifications

## 1. Technology Stack

### Frontend
| Layer | Technology | Version | Purpose |
|-------|------------|---------|---------|
| Framework | React | 18.x | UI Components |
| Language | TypeScript | 5.x | Type Safety |
| Build Tool | Vite | 5.x | Fast builds |
| State | Zustand | 4.x | Simple state management |
| Styling | Tailwind CSS | 3.x | Utility-first CSS |
| UI Components | shadcn/ui | latest | Accessible components |
| Real-time | Socket.IO Client | 4.x | WebSocket |
| HTTP Client | Axios | 1.x | API calls |
| Forms | React Hook Form | 7.x | Form handling |
| Validation | Zod | 3.x | Schema validation |
| Router | React Router | 6.x | Routing |
| Charts | Recharts | 2.x | Analytics |

### Chat Widget (Embeddable)
| Layer | Technology | Version | Purpose |
|-------|------------|---------|---------|
| Framework | Preact | 10.x | Lightweight (3KB) |
| Bundler | Vite | 5.x | Small bundle |
| Styling | CSS-in-JS | - | No external deps |

### Backend
| Layer | Technology | Version | Purpose |
|-------|------------|---------|---------|
| Runtime | Node.js | 20.x LTS | Server |
| Framework | Fastify | 4.x | Fast HTTP server |
| Language | TypeScript | 5.x | Type Safety |
| ORM | Prisma | 5.x | Database access |
| Validation | Zod | 3.x | Input validation |
| Auth | JWT + Passport | - | Authentication |
| Real-time | Socket.IO | 4.x | WebSocket |
| Queue | BullMQ | 5.x | Job processing |
| Cache | ioredis | 5.x | Redis client |
| Email | Nodemailer | 6.x | Transactional email |
| File Upload | Multer + S3 | - | File handling |

### Database
| Type | Technology | Purpose |
|------|------------|---------|
| Primary | PostgreSQL 16 | Main database |
| Cache | Redis 7 | Sessions, cache, pub/sub |
| Search | Meilisearch | Full-text search (optional) |

### Infrastructure
| Layer | Technology | Purpose |
|-------|------------|---------|
| Container | Docker | Containerization |
| Orchestration | Docker Compose | Local dev |
| Reverse Proxy | Nginx | Load balancing |
| CDN | CloudFlare | Widget delivery |

---

## 2. Project Structure

```
nexvo/
├── apps/
│   ├── web/                    # Operator Dashboard (React)
│   │   ├── src/
│   │   │   ├── components/     # Reusable components
│   │   │   ├── pages/          # Route pages
│   │   │   ├── hooks/          # Custom hooks
│   │   │   ├── stores/         # Zustand stores
│   │   │   ├── services/       # API services
│   │   │   ├── utils/          # Utilities
│   │   │   └── types/          # TypeScript types
│   │   ├── public/
│   │   └── package.json
│   │
│   ├── widget/                 # Embeddable Chat Widget (Preact)
│   │   ├── src/
│   │   │   ├── components/
│   │   │   ├── core/           # Core chat logic
│   │   │   ├── styles/
│   │   │   └── index.tsx
│   │   └── package.json
│   │
│   └── api/                    # Backend API (Fastify)
│       ├── src/
│       │   ├── modules/        # Feature modules
│       │   │   ├── auth/
│       │   │   ├── organizations/
│       │   │   ├── users/
│       │   │   ├── visitors/
│       │   │   ├── conversations/
│       │   │   ├── messages/
│       │   │   ├── chatbots/
│       │   │   └── analytics/
│       │   ├── shared/         # Shared utilities
│       │   │   ├── database/
│       │   │   ├── redis/
│       │   │   ├── socket/
│       │   │   ├── queue/
│       │   │   └── utils/
│       │   ├── config/         # Configuration
│       │   └── index.ts        # Entry point
│       └── package.json
│
├── packages/
│   ├── shared/                 # Shared types & utilities
│   │   ├── src/
│   │   │   ├── types/          # Shared TypeScript types
│   │   │   ├── constants/      # Shared constants
│   │   │   └── utils/          # Shared utilities
│   │   └── package.json
│   │
│   ├── ui/                     # Shared UI components
│   │   ├── src/
│   │   └── package.json
│   │
│   └── database/               # Prisma schema & client
│       ├── prisma/
│       │   ├── schema.prisma
│       │   └── migrations/
│       └── package.json
│
├── docker/
│   ├── Dockerfile.api
│   ├── Dockerfile.web
│   └── docker-compose.yml
│
├── docs/                       # Documentation
├── scripts/                    # Build & deploy scripts
├── .env.example
├── package.json                # Root package.json
├── pnpm-workspace.yaml         # PNPM workspace
├── turbo.json                  # Turborepo config
└── tsconfig.json               # Root TypeScript config
```

---

## 3. Database Schema

### Core Tables

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ============================================
// ORGANIZATION & USERS
// ============================================

model Organization {
  id          String   @id @default(cuid())
  name        String
  slug        String   @unique
  domain      String?
  logo        String?

  // Settings
  settings    Json     @default("{}")
  widgetConfig Json    @default("{}")

  // Plan
  plan        PlanType @default(FREE)

  // Timestamps
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  // Relations
  users       User[]
  visitors    Visitor[]
  conversations Conversation[]
  chatbots    Chatbot[]
  departments Department[]
  cannedResponses CannedResponse[]

  @@index([slug])
}

enum PlanType {
  FREE
  STARTER
  PRO
  ENTERPRISE
}

model User {
  id              String    @id @default(cuid())
  email           String    @unique
  passwordHash    String
  name            String
  avatar          String?
  role            UserRole  @default(OPERATOR)
  status          UserStatus @default(OFFLINE)

  // Organization
  organizationId  String
  organization    Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)

  // Department
  departmentId    String?
  department      Department? @relation(fields: [departmentId], references: [id])

  // Settings
  settings        Json      @default("{}")

  // Timestamps
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
  lastSeenAt      DateTime?

  // Relations
  conversations   Conversation[] @relation("OperatorConversations")
  messages        Message[]

  @@index([organizationId])
  @@index([email])
}

enum UserRole {
  OWNER
  ADMIN
  SUPERVISOR
  OPERATOR
}

enum UserStatus {
  ONLINE
  AWAY
  BUSY
  OFFLINE
}

model Department {
  id              String   @id @default(cuid())
  name            String
  description     String?

  organizationId  String
  organization    Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)

  // Routing rules
  routingRules    Json     @default("{}")

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  users           User[]
  conversations   Conversation[]

  @@index([organizationId])
}

// ============================================
// VISITORS & TRACKING
// ============================================

model Visitor {
  id              String   @id @default(cuid())

  // Identity
  visitorToken    String   @unique
  email           String?
  name            String?
  phone           String?
  avatar          String?

  // Organization
  organizationId  String
  organization    Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)

  // Metadata
  metadata        Json     @default("{}")
  tags            String[] @default([])

  // Scoring
  score           Int      @default(0)

  // Timestamps
  firstSeenAt     DateTime @default(now())
  lastSeenAt      DateTime @default(now())

  // Relations
  sessions        VisitorSession[]
  conversations   Conversation[]

  @@index([organizationId])
  @@index([visitorToken])
  @@index([email])
}

model VisitorSession {
  id              String   @id @default(cuid())

  visitorId       String
  visitor         Visitor  @relation(fields: [visitorId], references: [id], onDelete: Cascade)

  // Session Info
  ipAddress       String?
  userAgent       String?

  // Geo
  country         String?
  city            String?
  region          String?

  // Traffic Source
  referrer        String?
  utmSource       String?
  utmMedium       String?
  utmCampaign     String?

  // Landing
  landingPage     String?

  // Device
  device          String?  // desktop, mobile, tablet
  browser         String?
  os              String?

  // Timestamps
  startedAt       DateTime @default(now())
  endedAt         DateTime?

  // Relations
  pageViews       PageView[]

  @@index([visitorId])
  @@index([startedAt])
}

model PageView {
  id              String   @id @default(cuid())

  sessionId       String
  session         VisitorSession @relation(fields: [sessionId], references: [id], onDelete: Cascade)

  url             String
  title           String?

  // Time
  enteredAt       DateTime @default(now())
  exitedAt        DateTime?
  timeSpent       Int?     // seconds

  @@index([sessionId])
}

// ============================================
// CONVERSATIONS & MESSAGES
// ============================================

model Conversation {
  id              String   @id @default(cuid())

  // Organization
  organizationId  String
  organization    Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)

  // Visitor
  visitorId       String
  visitor         Visitor  @relation(fields: [visitorId], references: [id], onDelete: Cascade)

  // Operator
  operatorId      String?
  operator        User?    @relation("OperatorConversations", fields: [operatorId], references: [id])

  // Department
  departmentId    String?
  department      Department? @relation(fields: [departmentId], references: [id])

  // Status
  status          ConversationStatus @default(PENDING)
  priority        Priority @default(NORMAL)

  // Channel
  channel         Channel  @default(WIDGET)

  // Metadata
  subject         String?
  tags            String[] @default([])
  metadata        Json     @default("{}")

  // Feedback
  rating          Int?     // 1-5
  feedback        String?

  // Timestamps
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  closedAt        DateTime?
  firstResponseAt DateTime?

  // Relations
  messages        Message[]

  @@index([organizationId])
  @@index([visitorId])
  @@index([operatorId])
  @@index([status])
  @@index([createdAt])
}

enum ConversationStatus {
  PENDING    // Waiting for operator
  ACTIVE     // In progress
  WAITING    // Waiting for visitor response
  RESOLVED   // Closed successfully
  MISSED     // No response
}

enum Priority {
  LOW
  NORMAL
  HIGH
  URGENT
}

enum Channel {
  WIDGET
  WHATSAPP
  FACEBOOK
  INSTAGRAM
  TELEGRAM
  EMAIL
  SMS
}

model Message {
  id              String   @id @default(cuid())

  conversationId  String
  conversation    Conversation @relation(fields: [conversationId], references: [id], onDelete: Cascade)

  // Sender
  senderType      SenderType
  senderId        String?  // visitorId or userId
  sender          User?    @relation(fields: [senderId], references: [id])

  // Content
  content         String
  contentType     MessageType @default(TEXT)

  // Attachments
  attachments     Json[]   @default([])

  // Metadata
  metadata        Json     @default("{}")

  // Status
  status          MessageStatus @default(SENT)

  // Timestamps
  createdAt       DateTime @default(now())
  readAt          DateTime?

  @@index([conversationId])
  @@index([createdAt])
}

enum SenderType {
  VISITOR
  OPERATOR
  BOT
  SYSTEM
}

enum MessageType {
  TEXT
  IMAGE
  FILE
  VIDEO
  AUDIO
  CARD      // Rich card
  BUTTONS   // Quick replies
  FORM      // Form input
}

enum MessageStatus {
  SENDING
  SENT
  DELIVERED
  READ
  FAILED
}

// ============================================
// CHATBOTS
// ============================================

model Chatbot {
  id              String   @id @default(cuid())

  organizationId  String
  organization    Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)

  name            String
  description     String?

  // Type
  type            ChatbotType @default(FLOW)

  // Flow data (for visual builder)
  flowData        Json     @default("{}")

  // Settings
  settings        Json     @default("{}")

  // Status
  isActive        Boolean  @default(false)

  // Triggers
  triggers        Json     @default("[]")

  // Timestamps
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@index([organizationId])
}

enum ChatbotType {
  FLOW       // Visual flow-based
  AI         // AI-powered
  HYBRID     // Flow + AI
}

// ============================================
// CANNED RESPONSES
// ============================================

model CannedResponse {
  id              String   @id @default(cuid())

  organizationId  String
  organization    Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)

  shortcut        String   // e.g., /hello
  title           String
  content         String

  category        String?

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@unique([organizationId, shortcut])
  @@index([organizationId])
}

// ============================================
// API KEYS (for widget authentication)
// ============================================

model ApiKey {
  id              String   @id @default(cuid())

  organizationId  String

  key             String   @unique
  name            String

  // Permissions
  permissions     String[] @default([])

  // Usage
  lastUsedAt      DateTime?

  // Status
  isActive        Boolean  @default(true)

  createdAt       DateTime @default(now())
  expiresAt       DateTime?

  @@index([key])
  @@index([organizationId])
}
```

---

## 4. API Endpoints

### Authentication
```
POST   /api/v1/auth/register          # Register organization + user
POST   /api/v1/auth/login             # Login
POST   /api/v1/auth/logout            # Logout
POST   /api/v1/auth/refresh           # Refresh token
POST   /api/v1/auth/forgot-password   # Request password reset
POST   /api/v1/auth/reset-password    # Reset password
GET    /api/v1/auth/me                # Get current user
```

### Organizations
```
GET    /api/v1/organizations/:id           # Get organization
PUT    /api/v1/organizations/:id           # Update organization
GET    /api/v1/organizations/:id/settings  # Get settings
PUT    /api/v1/organizations/:id/settings  # Update settings
GET    /api/v1/organizations/:id/widget    # Get widget config
PUT    /api/v1/organizations/:id/widget    # Update widget config
```

### Users
```
GET    /api/v1/users                  # List users
POST   /api/v1/users                  # Create user
GET    /api/v1/users/:id              # Get user
PUT    /api/v1/users/:id              # Update user
DELETE /api/v1/users/:id              # Delete user
PUT    /api/v1/users/:id/status       # Update online status
```

### Visitors
```
GET    /api/v1/visitors               # List visitors
GET    /api/v1/visitors/online        # List online visitors
GET    /api/v1/visitors/:id           # Get visitor
PUT    /api/v1/visitors/:id           # Update visitor
GET    /api/v1/visitors/:id/sessions  # Get visitor sessions
GET    /api/v1/visitors/:id/conversations # Get visitor conversations
```

### Conversations
```
GET    /api/v1/conversations          # List conversations
POST   /api/v1/conversations          # Create conversation
GET    /api/v1/conversations/:id      # Get conversation
PUT    /api/v1/conversations/:id      # Update conversation
POST   /api/v1/conversations/:id/assign    # Assign operator
POST   /api/v1/conversations/:id/transfer  # Transfer to department/operator
POST   /api/v1/conversations/:id/close     # Close conversation
GET    /api/v1/conversations/:id/messages  # Get messages
POST   /api/v1/conversations/:id/messages  # Send message
```

### Chatbots
```
GET    /api/v1/chatbots               # List chatbots
POST   /api/v1/chatbots               # Create chatbot
GET    /api/v1/chatbots/:id           # Get chatbot
PUT    /api/v1/chatbots/:id           # Update chatbot
DELETE /api/v1/chatbots/:id           # Delete chatbot
POST   /api/v1/chatbots/:id/activate  # Activate chatbot
POST   /api/v1/chatbots/:id/test      # Test chatbot
```

### Canned Responses
```
GET    /api/v1/canned-responses       # List canned responses
POST   /api/v1/canned-responses       # Create canned response
PUT    /api/v1/canned-responses/:id   # Update canned response
DELETE /api/v1/canned-responses/:id   # Delete canned response
```

### Analytics
```
GET    /api/v1/analytics/overview     # Dashboard overview
GET    /api/v1/analytics/conversations # Conversation metrics
GET    /api/v1/analytics/visitors     # Visitor metrics
GET    /api/v1/analytics/operators    # Operator performance
GET    /api/v1/analytics/chatbots     # Chatbot metrics
```

### Widget API (Public)
```
POST   /api/v1/widget/init            # Initialize widget session
POST   /api/v1/widget/track           # Track page view/event
POST   /api/v1/widget/conversation    # Start conversation
GET    /api/v1/widget/conversation/:id # Get conversation
POST   /api/v1/widget/message         # Send message
GET    /api/v1/widget/messages        # Get messages
POST   /api/v1/widget/typing          # Typing indicator
```

---

## 5. WebSocket Events

### Namespace: /operator
```typescript
// Client → Server
'operator:join'              // Join organization room
'operator:status'            // Update online status
'conversation:join'          // Join conversation room
'conversation:leave'         // Leave conversation room
'message:send'               // Send message
'message:typing'             // Typing indicator
'message:read'               // Mark as read

// Server → Client
'conversation:new'           // New conversation
'conversation:updated'       // Conversation updated
'conversation:assigned'      // Assigned to you
'message:new'                // New message
'message:typing'             // Visitor typing
'visitor:online'             // Visitor came online
'visitor:offline'            // Visitor went offline
'visitor:pageview'           // Visitor page change
'operator:status-changed'    // Operator status change
```

### Namespace: /widget
```typescript
// Client → Server
'visitor:init'               // Initialize visitor
'visitor:pageview'           // Track page view
'conversation:start'         // Start conversation
'message:send'               // Send message
'message:typing'             // Typing indicator
'message:read'               // Mark as read

// Server → Client
'conversation:started'       // Conversation created
'message:new'                // New message from operator
'message:typing'             // Operator typing
'operator:assigned'          // Operator assigned
'operator:status'            // Operator online/offline
```

---

## 6. Environment Variables

```bash
# .env.example

# App
NODE_ENV=development
PORT=3001
API_URL=http://localhost:3001
WEB_URL=http://localhost:3000
WIDGET_URL=http://localhost:3002

# Database
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/nexvo

# Redis
REDIS_URL=redis://localhost:6379

# JWT
JWT_SECRET=your-super-secret-key-change-in-production
JWT_EXPIRES_IN=7d
JWT_REFRESH_SECRET=your-refresh-secret-key
JWT_REFRESH_EXPIRES_IN=30d

# Encryption
ENCRYPTION_KEY=your-32-character-encryption-key

# Email (SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
EMAIL_FROM=noreply@nexvo.io

# File Storage (S3 Compatible)
S3_ENDPOINT=http://localhost:9000
S3_BUCKET=nexvo
S3_ACCESS_KEY=minioadmin
S3_SECRET_KEY=minioadmin

# Optional: OpenAI for AI features
OPENAI_API_KEY=sk-xxxxx

# Optional: Analytics
POSTHOG_API_KEY=
POSTHOG_HOST=

# Widget
WIDGET_ALLOWED_ORIGINS=*
```

---

## 7. Docker Setup

```yaml
# docker/docker-compose.yml

version: '3.8'

services:
  postgres:
    image: postgres:16-alpine
    container_name: nexvo-postgres
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: nexvo
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    container_name: nexvo-redis
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

  minio:
    image: minio/minio
    container_name: nexvo-minio
    command: server /data --console-address ":9001"
    environment:
      MINIO_ROOT_USER: minioadmin
      MINIO_ROOT_PASSWORD: minioadmin
    ports:
      - "9000:9000"
      - "9001:9001"
    volumes:
      - minio_data:/data

volumes:
  postgres_data:
  redis_data:
  minio_data:
```

---

## 8. Security Specifications

### Authentication
- JWT tokens with short expiry (15 min access, 7 day refresh)
- Bcrypt password hashing (cost factor 12)
- Rate limiting on auth endpoints (5 attempts per minute)
- Secure HTTP-only cookies for refresh tokens

### Authorization
- Role-based access control (RBAC)
- Organization-level data isolation
- API key authentication for widget

### Data Protection
- HTTPS only in production
- Input sanitization (XSS prevention)
- SQL injection prevention (Prisma parameterized queries)
- CORS configuration
- CSP headers

### Widget Security
- Domain whitelisting
- API key validation
- Rate limiting per visitor

---

## Next Steps

1. **Initialize Project** - Set up monorepo with pnpm
2. **Database Setup** - Create Prisma schema and migrations
3. **API Foundation** - Create Fastify server with basic routes
4. **Authentication** - Implement JWT auth flow
5. **WebSocket Server** - Set up Socket.IO
6. **Widget MVP** - Build embeddable chat widget
7. **Dashboard MVP** - Build operator interface
