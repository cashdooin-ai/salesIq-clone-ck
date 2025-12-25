# Zoho SalesIQ Nova '25 - Competitive Analysis

## What is Nova '25?

Nova '25 is Zoho SalesIQ's biggest product update, featuring **25+ new features and enhancements** across AI, chatbots, messaging, workflow automation, and mobile capabilities. This release signals Zoho's push into **agentic AI** and advanced automation workflows.

---

## Complete Feature Breakdown

### 1. AI & GenAI Capabilities

| Feature | Description | Our Response |
|---------|-------------|--------------|
| **ChatGPT Integration** | Plug ChatGPT assistants into live chats and bots for contextual responses | ✅ We should support multiple LLMs (OpenAI, Claude, Gemini, open-source) |
| **Smart Suggestions** | AI suggests responses to operators during live chat | ✅ Include from MVP - essential feature |
| **Auto Chat Summaries** | AI generates summaries of conversations | ✅ Add with call summaries too |
| **Zia Answer Bot** | Finds KB articles, then ChatGPT summarizes into human-like response | ✅ Our advantage: Let users choose their LLM |
| **Hallucination Prevention** | Zia grounds responses in knowledge base first | ✅ Critical - implement RAG properly |

**Our Differentiation Opportunity:**
```
Zoho: Zia + ChatGPT only
Us: Multi-LLM Support
    ├── OpenAI (GPT-4, GPT-4o)
    ├── Anthropic Claude
    ├── Google Gemini
    ├── Open Source (Llama, Mistral)
    └── Self-hosted LLMs (for enterprise)
```

---

### 2. Zobot Enhancements

| Feature | Description | Our Response |
|---------|-------------|--------------|
| **Bot Templates** | Pre-built, customizable templates by industry | ✅ Build larger template library |
| **Import/Export Bots** | Reuse flows across portals | ✅ Essential - include in MVP |
| **Flow Reports** | Analytics on bot conversations - drop-offs, escalations | ✅ More granular than Zoho |
| **Hybrid Bots** | Combine AI + rule-based flows | ✅ Already planned |

**Our Differentiation Opportunity:**
- **Marketplace for Bot Templates** - Community-contributed templates
- **Version Control** - Git-like versioning for bot flows
- **A/B Testing** - Test different flows automatically
- **Collaborative Editing** - Multiple people edit same bot

---

### 3. WhatsApp & Messaging Channels

| Feature | Description | Our Response |
|---------|-------------|--------------|
| **WhatsApp Templates** | Create/manage templates in SalesIQ | ✅ Essential for WhatsApp |
| **Multi-WABA** | Multiple WhatsApp Business Accounts | ✅ Important for agencies |
| **Broadcast Messaging** | Bulk send with segmentation | ✅ Add with advanced filters |
| **Instagram Story Replies** | Turn story replies into chats | ✅ Cover all IG touchpoints |
| **Appointment Scheduling** | Book via WhatsApp/Telegram/LINE | ✅ Integrate calendar systems |

**Our Differentiation Opportunity:**
- **More Channels**: Add Twitter/X DMs, LinkedIn, Discord, Slack
- **Channel Analytics**: Compare performance across channels
- **Smart Channel Routing**: AI decides best channel for each customer
- **Omni-channel Campaigns**: Coordinate across all channels

---

### 4. AR Remote Assistance (Zoho Lens Integration)

| Feature | Description | Our Response |
|---------|-------------|--------------|
| **AR Camera Access** | See through customer's phone camera | 🔥 HIGH PRIORITY - Major differentiator |
| **Real-time Guidance** | Guide customers visually | ✅ Essential for hardware/IoT |
| **Smart Glass Support** | Works with AR glasses | ✅ Future-proof capability |

**Our Differentiation Opportunity:**
- **Built-in AR** - Don't require separate product like Zoho Lens
- **AR Annotations** - Draw on customer's view in real-time
- **Session Recording** - Record AR sessions for training
- **3D Object Overlay** - Show 3D models in customer's space

---

### 5. Workflow Automation

| Feature | Description | Our Response |
|---------|-------------|--------------|
| **Event Triggers** | Webhooks on chat missed, visitor tagged, etc. | ✅ More triggers than Zoho |
| **Admin Workflows** | Track portal changes | ✅ Include audit logging |
| **Data Workflows** | React to visitor/user activity | ✅ Expand with conditions |
| **Deluge Scripts** | Custom scripting | ✅ Use JavaScript (more universal) |

**Our Differentiation Opportunity:**
```
┌─────────────────────────────────────────────────────────────┐
│              ADVANCED WORKFLOW ENGINE                        │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  TRIGGERS           CONDITIONS          ACTIONS              │
│  ─────────          ──────────          ───────              │
│  • Chat started     • Lead score > X    • Send email         │
│  • Chat missed      • Visit count > Y   • Create CRM record  │
│  • Visitor tagged   • Time of day       • Assign operator    │
│  • Page visited     • Geo location      • Trigger webhook    │
│  • Cart abandoned   • Custom field      • Send SMS           │
│  • Score changed    • Segment match     • Slack notification │
│  • Bot completed    • AI sentiment      • Update tag         │
│  • Payment made     • Custom JS         • Run script         │
│                                                              │
│  VISUAL WORKFLOW BUILDER (like Zapier)                      │
└─────────────────────────────────────────────────────────────┘
```

---

### 6. Team & Security

| Feature | Description | Our Response |
|---------|-------------|--------------|
| **Custom User Profiles** | Granular permissions | ✅ Full RBAC from start |
| **Agent Whisper** | Private messages during monitoring | ✅ Include with screen takeover |
| **Profanity Filter** | Auto-mask abusive messages | ✅ Configurable word lists |
| **Auto Chat End** | End chats on abuse | ✅ With escalation rules |

**Our Differentiation Opportunity:**
- **Real-time Coaching** - AI suggests how to improve responses
- **Compliance Mode** - Auto-flag sensitive topics (PCI, HIPAA)
- **Team Analytics** - Detailed performance comparisons
- **Quality Scoring** - AI-based QA on conversations

---

### 7. Mobile & TV Apps

| Feature | Description | Our Response |
|---------|-------------|--------------|
| **Voice Calls in SDK** | Customers call from mobile app | ✅ WebRTC-based |
| **Agent App Upgrades** | Templates, tagging, summaries | ✅ Feature parity with web |
| **Apple TV App** | KPI dashboard on big screen | ✅ Web dashboard + TV mode |
| **Android TV App** | Same for Android TVs | ✅ Responsive TV interface |

**Our Differentiation Opportunity:**
- **Widgets for iOS/Android** - Home screen widgets
- **Watch App** - Quick replies from Apple Watch/Wear OS
- **Desktop App** - Native macOS/Windows (not just browser)
- **PWA** - Installable web app

---

## 8. Features Zoho Still Lacks (Our Opportunities)

| Gap in Nova '25 | Our Solution |
|-----------------|--------------|
| No session replay | Built-in session replay |
| No co-browsing | One-click co-browse |
| No video chat | Native video calling |
| No white-label | Full agency program |
| Single LLM (ChatGPT) | Multi-LLM support |
| No self-hosted | On-premise option |
| No marketplace | Plugin marketplace |
| Zoho-only integrations | Universal integrations |
| No conversation commerce | In-chat payments |
| No headless SDK | Headless architecture |

---

## 9. Nova '25 Feature Priority Matrix

### What Zoho Got Right (Must Have)

| Priority | Feature | Reason |
|----------|---------|--------|
| 🔴 Critical | ChatGPT/AI Integration | Market expectation now |
| 🔴 Critical | Bot Templates | Reduces time-to-value |
| 🔴 Critical | WhatsApp Broadcast | High-demand channel |
| 🔴 Critical | Workflow Automation | Automation is key |
| 🟠 High | AI Chat Summaries | Saves operator time |
| 🟠 High | Multi-WABA Support | Agency requirement |
| 🟠 High | Flow Reports | Bot optimization |

### What Zoho Did That's Innovative (Should Have)

| Priority | Feature | Reason |
|----------|---------|--------|
| 🟠 High | AR Remote Assistance | Unique differentiator |
| 🟠 High | Agent Whisper | Training tool |
| 🟡 Medium | TV App Dashboard | Nice for sales floors |
| 🟡 Medium | Instagram Story Replies | Emerging channel |

### What Zoho Missed (Our Advantage)

| Priority | Feature | Opportunity |
|----------|---------|-------------|
| 🔴 Critical | Session Replay | Major gap |
| 🔴 Critical | Co-Browsing | Support essential |
| 🔴 Critical | Video Chat | Customer expectation |
| 🔴 Critical | White-Label | Business model |
| 🟠 High | Multi-LLM | Flexibility |
| 🟠 High | Self-Hosted | Enterprise need |
| 🟠 High | GraphQL API | Developer experience |

---

## 10. Revised Implementation Priority

Based on Nova '25 analysis, here's our updated roadmap:

### Phase 1: MVP (Weeks 1-6)
```
Essential Features:
├── Chat Widget (modern, customizable)
├── Operator Dashboard
├── Basic AI (OpenAI integration)
├── Bot Builder with Templates
├── WhatsApp Integration
├── Workflow Automation (basic)
└── Analytics Dashboard
```

### Phase 2: Parity+ (Weeks 7-12)
```
Match & Exceed Zoho:
├── Multi-LLM Support (Claude, Gemini, etc.)
├── Bot Import/Export
├── Flow Analytics
├── WhatsApp Broadcast
├── Instagram/Facebook Channels
├── AI Chat Summaries
├── Agent Whisper
└── Mobile SDK with Voice
```

### Phase 3: Differentiation (Weeks 13-18)
```
Features Zoho Lacks:
├── Session Replay
├── Co-Browsing
├── Video Chat
├── In-Chat Payments
├── Advanced Workflow Builder
├── API (REST + GraphQL)
└── White-Label Foundation
```

### Phase 4: Market Leadership (Weeks 19-24)
```
Advanced Features:
├── AR Remote Assistance (built-in)
├── White-Label Program Launch
├── Self-Hosted Option
├── Plugin Marketplace
├── TV Dashboard Mode
└── Conversation Commerce Suite
```

---

## 11. Competitive Positioning

### Our Positioning Statement

> **"The open, AI-powered customer engagement platform that gives you everything Zoho SalesIQ offers—plus session replay, co-browsing, video chat, and white-label capabilities—with the freedom to choose your AI provider and deploy anywhere."**

### Feature Comparison Table (Marketing)

| Feature | Zoho SalesIQ Nova '25 | Our Platform |
|---------|----------------------|--------------|
| Live Chat | ✅ | ✅ |
| AI Chatbot | ✅ (Zia + ChatGPT) | ✅ (Multi-LLM) |
| Bot Builder | ✅ | ✅ (+ Marketplace) |
| WhatsApp | ✅ | ✅ |
| Instagram | ✅ | ✅ |
| Workflows | ✅ | ✅ (Visual Builder) |
| AR Support | ✅ (Via Zoho Lens) | ✅ (Built-in) |
| **Session Replay** | ❌ | ✅ |
| **Co-Browsing** | ❌ | ✅ |
| **Video Chat** | ❌ | ✅ |
| **White-Label** | ❌ | ✅ |
| **Self-Hosted** | ❌ | ✅ |
| **Multi-LLM** | ❌ | ✅ |
| **GraphQL API** | ❌ | ✅ |
| **In-Chat Payments** | ❌ | ✅ |

---

## 12. Key Takeaways

### What Nova '25 Teaches Us

1. **AI is table stakes** - Must have LLM integration from day one
2. **Templates matter** - Pre-built solutions reduce time-to-value
3. **Omnichannel is expected** - WhatsApp, Instagram, Telegram minimum
4. **Automation is key** - Workflow automation drives efficiency
5. **Mobile-first** - Strong mobile experience required
6. **AR is emerging** - Early investment pays off

### Our Strategic Response

1. **Embrace AI, but offer choice** - Don't lock customers into one LLM
2. **Build what Zoho can't** - Session replay, co-browse, video, white-label
3. **Developer-first** - Better API, headless SDK, self-hosted option
4. **Agency-friendly** - White-label creates new distribution channel
5. **Move fast** - Nova '25 raises the bar; we need to exceed it

---

## Sources

- [Zoho SalesIQ Nova '25 Official](https://www.zoho.com/salesiq/nova-25.html)
- [Nova '25 Blog Announcement](https://www.zoho.com/blog/salesiq/nova-2025.html)
- [Nova '25 Deep Dive](https://www.zoho.com/blog/salesiq/deep-dive-into-nova-2025.html)
- [Zenatta Nova '25 Analysis](https://zenatta.com/whats-new-in-zoho-salesiq-nova-25-update/)
- [Product Hunt Launch](https://www.producthunt.com/products/zoho-salesiq-nova-25)
- [Erphub ChatGPT Integration](https://www.erphub.com/blogs/post/salesiq-nova-with-chatgpt-and-zia-ai-integration-for-businesses-with-zoho)
