# Rouge Dashboard

> **Production-Ready** Enterprise-grade Next.js 15 dashboard for internal operations, featuring AI-powered tools, database-backed authentication, real-time collaboration, and comprehensive project management capabilities.

[![Next.js](https://img.shields.io/badge/Next.js-15.5.4-black)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.2.0-blue)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-4.1-38bdf8)](https://tailwindcss.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Neon-blue)](https://neon.tech/)
[![License](https://img.shields.io/badge/License-Private-red)](LICENSE)
[![Status](https://img.shields.io/badge/Status-Production%20Ready-success)](https://rougevc.com)

---

## 📋 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Project Structure](#project-structure)
- [Available Tools](#available-tools)
- [API Documentation](#api-documentation)
- [Database Schema](#database-schema)
- [Authentication](#authentication)
- [Deployment](#deployment)
- [Development](#development)
- [Testing](#testing)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)
- [License](#license)

---

## 🎯 Overview

Rouge Dashboard is a production-ready, enterprise-grade internal operations platform built with Next.js 15, React 19, and TypeScript. It provides a comprehensive suite of AI-powered tools for project management, content automation, startup discovery, and team collaboration.

### Key Highlights

- **🤖 AI-Powered Tools** - Integrated with Gemini AI, DeepSeek, and OpenAI
- **🔐 Enterprise Security** - Database-backed authentication with Rouge email restriction, account lockout, audit logging
- **📊 Real-Time Analytics** - Google Analytics 4 integration with custom dashboards
- **💾 Robust Database** - PostgreSQL (Neon) with Drizzle ORM, comprehensive schema
- **🎨 Modern UI** - Tailwind CSS 4 with dark mode, animations, mobile-first design
- **📱 Fully Responsive** - Progressive enhancement, WCAG 2.1 AA compliant
- **⚡ High Performance** - Optimized builds, code splitting, caching, rate limiting
- **🌐 Production Ready** - Deployed at rougevc.com with enterprise-grade features

---

## ✨ Features

### Core Features

- **🏠 Dashboard Hub** - Centralized access to all tools with search and favorites
- **📝 Work Tracker** - Comprehensive project management with task tracking
- **🎫 Ticketing System** - Support request management with Slack notifications
- **👥 User Management** - Role-based access control with email allowlists
- **🌓 Dark Mode** - System-aware theme switching
- **📊 Analytics** - Real-time usage tracking and reporting
- **🔔 Notifications** - Email and Slack integration for alerts
- **💬 AI Chatbot** - Floating assistant on all pages

### AI-Powered Tools

1. **AgTech Event Finder** 🌾
   - Discover upcoming AgTech conventions and expos
   - AI-powered search with location-based filtering
   - Export to CSV, multiple view modes
   - Real-time event discovery with caching

2. **Agritech Startup Seeker** 🚀
   - Find and analyze agritech startups
   - Scoring system for investment readiness
   - Contact research and CRM integration
   - Batch processing with job queue

3. **Sentiment Analyzer** 📊
   - Analyze public sentiment about companies using AI-powered news analysis
   - Real-time news article search via Google Custom Search API
   - AI sentiment classification with Gemini or DeepSeek models
   - Sentiment types: Positive, Negative, Neutral with detailed reasoning
   - Advanced filtering, sorting, and export to CSV
   - Search history tracking with clear functionality
   - Country-specific search (US, UK, CA, AU, IN) or worldwide
   - Usage monitoring with 100 searches per day limit per user
   - Automatic data cleanup (90+ days old articles removed)

4. **AI News Daily** 📰
   - Curated daily AI news and insights
   - Smart filtering and bookmarking
   - Article preview and summarization
   - Share and export capabilities

5. **Content Idea Automation** 💡
   - AI-powered content calendar generation
   - LinkedIn post ideas and captions
   - Hashtag suggestions
   - Editorial calendar management

6. **Cold Connect Automator** 📧
   - Personalized cold outreach campaigns
   - Notion and Google Sheets integration
   - AI message generation
   - Campaign analytics and tracking

7. **Agritech Universities** 🎓
   - Database of agritech research institutions
   - TTO (Technology Transfer Office) information
   - Incubation records and LinkedIn profiles
   - Export and filtering capabilities

8. **AI Tools Request Form** 📋
   - Submit custom AI tool requests
   - Structured requirement gathering
   - Ticket tracking and status updates
   - Team collaboration features

---

## 🛠️ Tech Stack

### Frontend
- **Framework:** Next.js 15.5 (App Router)
- **UI Library:** React 19.2
- **Language:** TypeScript 5.9
- **Styling:** Tailwind CSS 4.1
- **Components:** Radix UI, shadcn/ui
- **Icons:** Lucide React
- **Animations:** Framer Motion
- **Forms:** React Hook Form + Zod
- **State:** React Context + Hooks

### Backend
- **Runtime:** Node.js 20+
- **API:** Next.js API Routes
- **Database:** PostgreSQL (Neon)
- **ORM:** Drizzle ORM
- **Authentication:** NextAuth.js
- **Email:** SendGrid
- **Notifications:** Slack Webhooks

### AI Services
- **Primary:** Google Gemini AI
- **Secondary:** DeepSeek AI
- **Alternative:** OpenAI GPT-4

### DevOps
- **Version Control:** Git
- **Package Manager:** npm
- **Linting:** ESLint
- **Testing:** Jest + React Testing Library
- **Build:** Next.js Build System
- **Deployment:** Vercel / Custom

---

## 🚀 Getting Started

### Prerequisites

- Node.js 20.x or higher
- npm 10.x or higher
- PostgreSQL database (Neon recommended)
- Google OAuth credentials (for authentication)
- Gemini API key (for AI features)

### Quick Start

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd Rouge-Dashboard
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   ```
   Edit `.env.local` with your credentials (see [Environment Variables](#environment-variables))

4. **Set up the database**
   ```bash
   npm run db
   ```

5. **Run the development server**
   ```bash
   npm run dev
   ```

6. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

### Production Build

```bash
npm run build
npm start
```

---

## 🔐 Environment Variables

Create a `.env.local` file in the root directory with the following variables:

### Required Variables

```env
# Database
DATABASE_URL=postgresql://user:password@host:5432/database

# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-super-secure-random-secret-here

# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret

# AI Services (at least one required)
GEMINI_API_KEY=your-gemini-api-key-here
DEEPSEEK_API_KEY=sk-your-deepseek-api-key-here
```

### Optional Variables

```env
# Email (SendGrid)
SENDGRID_API_KEY=SG.your-sendgrid-api-key
SENDGRID_FROM_EMAIL=noreply@yourdomain.com
AI_TEAM_EMAIL=ai-team@yourdomain.com

# Slack Notifications
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK

# Google Analytics
NEXT_PUBLIC_GOOGLE_ANALYTICS_ID=G-XXXXXXXXXX
GA4_PROPERTY_ID=123456789
GA_SERVICE_ACCOUNT_JSON_PATH=./config/google-analytics-service.json

# SendGrid for email notifications and password resets
SENDGRID_API_KEY=SG.your-sendgrid-api-key
# Verified SendGrid sender email (a3@rougevc.com is the verified sender)
SENDGRID_FROM_EMAIL=a3@rougevc.com
# Admin emails are fetched dynamically from database

# Cold Outreach
NOTION_API_KEY=your-notion-api-key
NOTION_DATABASE_ID=your-notion-database-id
GOOGLE_SHEETS_API_KEY=your-google-sheets-api-key
GOOGLE_SHEETS_CLIENT_EMAIL=your-service-account@domain.iam.gserviceaccount.com
GOOGLE_SHEETS_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

# Development Only (NEVER in production)
NEXT_PUBLIC_DISABLE_AUTH=false
```

See `.env.example` for complete documentation of all variables.

---

## 📁 Project Structure

```
Rouge-Dashboard/
├── app/                          # Next.js App Router
│   ├── (auth)/                   # Authentication routes
│   │   └── signin/               # Sign-in page
│   ├── (route)/                  # Protected routes
│   │   ├── home/                 # Dashboard home
│   │   ├── agtech-events/        # AgTech Event Finder
│   │   ├── settings/             # User settings
│   │   ├── help/                 # Help documentation
│   │   └── tools/                # Tool pages
│   ├── api/                      # API routes
│   │   ├── agtech-events/        # Event finder API
│   │   ├── auth/                 # NextAuth API
│   │   ├── companies/            # Companies CRUD
│   │   ├── contents/             # Content management
│   │   ├── tickets/              # Ticketing system
│   │   ├── tracker/              # Work tracker
│   │   ├── cold-outreach/        # Cold outreach APIs
│   │   └── tools/                # Tool-specific APIs
│   ├── globals.css               # Global styles
│   ├── layout.tsx                # Root layout
│   └── page.tsx                  # Landing page
├── components/                   # React components
│   ├── agtech-event-finder/      # Event finder components
│   ├── cold-connect-automator/   # Cold outreach components
│   ├── dialogs/                  # Dialog components
│   ├── ui/                       # shadcn/ui components
│   ├── AppSidebar.tsx            # Desktop sidebar
│   ├── MobileSidebar.tsx         # Mobile sidebar
│   ├── Topbar.tsx                # Top navigation
│   ├── ChatbotWidget.tsx         # AI chatbot
│   └── ...                       # Other components
├── lib/                          # Utility libraries
│   ├── agtech-event-finder/      # Event finder services
│   ├── cold-outreach/            # Cold outreach services
│   ├── startup_seeker/           # Startup seeker services
│   ├── university_scraping/      # University scraper
│   ├── validations/              # Validation schemas
│   ├── auth.ts                   # Authentication logic
│   ├── ai-service.ts             # AI service wrapper
│   └── utils.ts                  # Utility functions
├── hooks/                        # Custom React hooks
│   ├── cold-connect-automator/   # Cold outreach hooks
│   ├── use-mobile.ts             # Mobile detection
│   └── use-toast.ts              # Toast notifications
├── types/                        # TypeScript types
│   ├── agtech-event-finder.ts    # Event finder types
│   ├── index.ts                  # Global types
│   └── ...                       # Other type definitions
├── utils/                        # Utility functions
│   ├── dbConfig.tsx              # Database configuration
│   └── schema.tsx                # Drizzle schema
├── public/                       # Static assets
├── .env.example                  # Environment template
├── .env.local                    # Local environment (gitignored)
├── drizzle.config.ts             # Drizzle configuration
├── middleware.ts                 # Next.js middleware
├── next.config.ts                # Next.js configuration
├── tailwind.config.ts            # Tailwind configuration
├── tsconfig.json                 # TypeScript configuration
└── package.json                  # Dependencies
```

---

## 🔧 Available Tools

### 1. AgTech Event Finder
**Route:** `/agtech-events`

Discover and track AgTech startup events worldwide.

**Features:**
- AI-powered event discovery
- Location-based search with geolocation
- Advanced filters (price, date, keyword)
- Grid and list view modes
- Export to CSV
- Event caching for performance
- Database persistence

**Usage:**
1. Enter a location or use geolocation
2. Browse discovered events
3. Apply filters to refine results
4. Export filtered results to CSV
5. Click "Register Now" to visit event pages

---

### 2. Agritech Startup Seeker
**Route:** `/tools/startup-seeker`

Find and analyze agritech startups with AI-powered scoring.

**Features:**
- Generate startup profiles with AI
- Multi-factor scoring system
- Contact research automation
- Export to CSV
- Database persistence
- Priority flagging

**Scoring Criteria:**
- Location Score (0-100)
- Readiness Score (0-100)
- Feasibility Score (0-100)
- Rouge Score (weighted average)

---

### 3. AI News Daily
**Route:** `/tools/ai-news-daily`

Stay updated with curated AI news and insights.

**Features:**
- Daily news aggregation
- Article preview with OG images
- Smart filtering and search
- Bookmarking and sharing
- Article summarization
- Pagination

---

### 4. Content Idea Automation
**Route:** `/tools/content-idea-automation`

Generate LinkedIn content calendars with AI.

**Features:**
- Monthly content planning
- Post ideas and captions
- Hashtag suggestions
- Special occasion tracking
- Export to CSV
- Status management

---

### 5. Cold Connect Automator
**Route:** `/tools/cold-connect-automator`

Automate personalized cold outreach campaigns.

**Features:**
- Contact management with CRM
- AI message personalization
- Campaign tracking
- Template library
- Notion and Google Sheets sync
- Analytics dashboard
- A/B testing
- Sequence automation

**Sub-pages:**
- `/tools/cold-connect-automator/contacts` - Contact management
- `/tools/cold-connect-automator/campaigns` - Campaign management
- `/tools/cold-connect-automator/templates` - Template library
- `/tools/cold-connect-automator/analytics` - Performance analytics
- `/tools/cold-connect-automator/settings` - Integration settings

---

### 6. Agritech Universities
**Route:** `/tools/agritech-universities`

Explore agritech research institutions worldwide.

**Features:**
- University database
- TTO information
- Incubation records
- LinkedIn profile links
- Export to CSV
- Filtering by country/region

---

### 7. Work Tracker
**Route:** `/tools/work-tracker`

Comprehensive project and task management.

**Features:**
- Task creation and editing
- Status tracking
- Deadline management
- Team assignment
- Progress monitoring
- Filtering and search
- Export capabilities
- Real-time updates

---

### 8. AI Tools Request Form
**Route:** `/tools/ai-tools-request-form`

Submit requests for custom AI tools.

**Features:**
- Structured requirement gathering
- Ticket creation
- Status tracking
- Team collaboration
- Email notifications
- Slack integration

---

## 📡 API Documentation

### Authentication

All API routes require authentication unless specified otherwise.

**Headers:**
```
Cookie: next-auth.session-token=<token>
```

### Rate Limiting

- **AgTech Events API:** 10 requests/minute per user
- **Other APIs:** No explicit limit (use responsibly)

### API Routes

#### AgTech Events

**POST** `/api/agtech-events`

Search for AgTech events by location.

**Request:**
```json
{
  "location": "San Francisco, CA"
}
```

**Response:**
```json
{
  "events": [
    {
      "eventName": "AgTech Innovation Summit 2025",
      "date": "November 12-14, 2025",
      "location": "San Francisco, CA",
      "description": "Leading AgTech conference...",
      "price": "$299",
      "registrationLink": "https://..."
    }
  ],
  "searchedLocation": "San Francisco, CA",
  "timestamp": "2025-10-11T09:00:00.000Z"
}
```

**Status Codes:**
- `200` - Success
- `401` - Unauthorized
- `429` - Rate limit exceeded
- `500` - Server error

---

#### Work Tracker

**GET** `/api/tracker`

Get all work items with optional filtering.

**Query Parameters:**
- `q` - Search query
- `unit` - Filter by unit
- `status` - Filter by status
- `page` - Page number (default: 1)
- `pageSize` - Items per page (default: 50)

**POST** `/api/tracker`

Create a new work item.

**Request:**
```json
{
  "task": "Implement feature X",
  "unit": "Engineering",
  "status": "In Progress",
  "assignedTo": "John Doe",
  "deadline": "2025-12-31"
}
```

---

#### Tickets

**GET** `/api/tickets`

Get all support tickets.

**POST** `/api/tickets`

Create a new ticket.

**Request:**
```json
{
  "title": "Feature Request",
  "description": "Need a new tool for...",
  "requestedBy": "user@company.com",
  "status": "Open",
  "team": "AI Team"
}
```

---

#### Companies

**GET** `/api/companies`

Get all companies.

**POST** `/api/companies`

Create a new company.

**Request:**
```json
{
  "companyName": "AgriTech Innovations",
  "region": "North America",
  "contactEmail": "contact@agritech.com"
}
```

---

## 🗄️ Database Schema

### Core Tables

#### `agtech_events`
Stores discovered AgTech events.

```sql
CREATE TABLE agtech_events (
  id UUID PRIMARY KEY,
  event_name VARCHAR NOT NULL,
  date VARCHAR NOT NULL,
  location VARCHAR NOT NULL,
  description TEXT NOT NULL,
  price VARCHAR NOT NULL,
  registration_link VARCHAR NOT NULL,
  search_location VARCHAR NOT NULL,
  user_id VARCHAR NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### `agtech_event_search_history`
Tracks user search history.

```sql
CREATE TABLE agtech_event_search_history (
  id UUID PRIMARY KEY,
  user_id VARCHAR NOT NULL,
  location VARCHAR NOT NULL,
  results_count INTEGER NOT NULL,
  searched_at TIMESTAMP DEFAULT NOW()
);
```

#### `agritech_startups`
Stores startup profiles and scores.

```sql
CREATE TABLE agritech_startups (
  id UUID PRIMARY KEY,
  name VARCHAR NOT NULL,
  city VARCHAR,
  website VARCHAR NOT NULL,
  description TEXT NOT NULL,
  location_score INTEGER NOT NULL,
  readiness_score INTEGER NOT NULL,
  feasibility_score INTEGER NOT NULL,
  rogue_score INTEGER NOT NULL,
  justification TEXT NOT NULL,
  is_priority BOOLEAN DEFAULT FALSE,
  contact_info JSONB,
  user_id VARCHAR NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### `workTracker`
Project and task management.

```sql
CREATE TABLE workTracker (
  id UUID PRIMARY KEY,
  task VARCHAR,
  unit VARCHAR,
  status VARCHAR,
  deadline VARCHAR,
  assigned_to VARCHAR,
  last_updated VARCHAR,
  work_start VARCHAR,
  member_update VARCHAR
);
```

#### `tickets`
Support and feature requests.

```sql
CREATE TABLE tickets (
  id UUID PRIMARY KEY,
  title VARCHAR NOT NULL,
  description VARCHAR NOT NULL,
  requested_by VARCHAR NOT NULL,
  status VARCHAR NOT NULL,
  team VARCHAR,
  department VARCHAR,
  problem_statement VARCHAR,
  expected_outcome VARCHAR,
  due_date VARCHAR,
  impact VARCHAR
);
```

### Cold Outreach Tables

- `cold_outreach_contacts` - Contact management
- `cold_outreach_campaigns` - Campaign tracking
- `cold_outreach_messages` - Message history
- `cold_outreach_templates` - Email templates
- `contact_segments` - Contact segmentation
- `analytics_events` - Event tracking
- `activity_logs` - Audit trail

See `utils/schema.tsx` for complete schema definitions.

---

## 🔐 Authentication

### Enterprise-Grade Security

Rouge Dashboard uses **database-backed authentication** with comprehensive security features:

- ✅ **Rouge Email Restriction** - Only `.rouge@gmail.com` and `@rougevc.com` emails allowed
- ✅ **Strong Password Requirements** - 8+ chars, uppercase, lowercase, number, special character
- ✅ **Account Lockout** - Automatic lockout after 5 failed attempts (15 minutes)
- ✅ **Password Reset** - Secure token-based reset via email
- ✅ **Audit Logging** - All authentication events tracked
- ✅ **Session Management** - Secure session tokens with device tracking

### Authentication Providers

1. **Google OAuth** (Recommended)
   - Requires `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`
   - Automatic user creation on first sign-in
   - Profile picture and email sync
   - Rouge email validation

2. **Email/Password** (Database-Backed)
   - Secure signup with password strength validation
   - Bcrypt password hashing (12 salt rounds)
   - Password reset via SendGrid email
   - Account lockout protection

### Authentication Flow

#### Sign Up
1. Visit `/signup`
2. Enter first name, last name, Rouge email (.rouge@gmail.com or @rougevc.com), password
3. Account created in database
4. Welcome email sent (if SendGrid configured)
5. Redirect to sign in

#### Sign In
1. Visit `/signin`
2. Choose Google OAuth or email/password
3. Account validated and session created
4. Redirect to dashboard

#### Password Reset
1. Visit `/forgot-password`
2. Enter email address
3. Receive reset link via email
4. Set new password at `/reset-password?token=TOKEN`
5. All sessions revoked for security

### Database Tables

- `users` - User accounts and authentication
- `sessions` - Active user sessions
- `audit_logs` - Security and activity logs
- `password_reset_tokens` - Password reset tokens
- `email_verification_tokens` - Email verification (future)

### Development Bypass

**⚠️ NEVER use in production!**

```env
NEXT_PUBLIC_DISABLE_AUTH=true
```

This bypasses all authentication checks for local development only.

---

## 🚀 Deployment

### Vercel (Recommended)

1. **Connect your repository**
   ```bash
   vercel
   ```

2. **Set environment variables**
   - Go to Project Settings → Environment Variables
   - Add all required variables from `.env.example`

3. **Deploy**
   ```bash
   vercel --prod
   ```

### Custom Server

1. **Build the application**
   ```bash
   npm run build
   ```

2. **Start the server**
   ```bash
   npm start
   ```

3. **Use a process manager**
   ```bash
   pm2 start npm --name "rouge-dashboard" -- start
   ```

### Docker

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --legacy-peer-deps
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

```bash
docker build -t rouge-dashboard .
docker run -p 3000:3000 --env-file .env.local rouge-dashboard
```

---

## 💻 Development

### Available Scripts

```bash
# Development
npm run dev              # Start dev server (port 3000)

# Building
npm run build            # Production build
npm start                # Start production server

# Database
npm run db               # Push schema to database
npm run db:studio        # Open Drizzle Studio

# Testing
npm test                 # Run all tests
npm run test:startup-seeker  # Run specific tests

# Linting
npm run lint             # Run ESLint

# Scraping
npm run scrape:test      # Test enterprise scraping
```

### Code Style

- **TypeScript** - Strict mode enabled
- **ESLint** - Next.js recommended config
- **Prettier** - Auto-formatting on save
- **Naming Conventions:**
  - Components: PascalCase
  - Files: kebab-case or PascalCase
  - Functions: camelCase
  - Constants: UPPER_SNAKE_CASE

### Git Workflow

1. Create a feature branch
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. Make your changes and commit
   ```bash
   git add .
   git commit -m "feat: add new feature"
   ```

3. Push and create a pull request
   ```bash
   git push origin feature/your-feature-name
   ```

### Commit Message Format

Follow [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation changes
- `style:` - Code style changes
- `refactor:` - Code refactoring
- `test:` - Test changes
- `chore:` - Build/config changes

---

## 🧪 Testing

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm test -- --watch

# Run tests with coverage
npm test -- --coverage

# Run specific test file
npm test -- SearchForm.test.tsx
```

### Test Structure

```
__tests__/
├── components/
│   ├── SearchForm.test.tsx
│   └── EventCard.test.tsx
├── lib/
│   ├── gemini-service.test.ts
│   └── auth.test.ts
└── api/
    └── agtech-events.test.ts
```

### Writing Tests

```typescript
import { render, screen } from '@testing-library/react';
import { SearchForm } from '@/components/agtech-event-finder/SearchForm';

describe('SearchForm', () => {
  it('renders search input', () => {
    render(<SearchForm onSearch={jest.fn()} isLoading={false} />);
    expect(screen.getByPlaceholderText(/enter a city/i)).toBeInTheDocument();
  });
});
```

---

## 🐛 Troubleshooting

### Common Issues

#### Build Errors

**Issue:** `Module not found` errors
```bash
# Clear cache and reinstall
rm -rf node_modules .next
npm install --legacy-peer-deps
```

**Issue:** TypeScript errors
```bash
# Check TypeScript version
npm list typescript

# Rebuild TypeScript
npm run build
```

#### Database Issues

**Issue:** `DATABASE_URL is not set`
```bash
# Check .env.local file exists
# Verify DATABASE_URL is set correctly
```

**Issue:** Schema sync errors
```bash
# Force push schema
npm run db
```

#### Authentication Issues

**Issue:** `Unauthorized` errors
```bash
# Check NEXTAUTH_SECRET is set
# Verify NEXTAUTH_URL matches your domain
# Clear browser cookies
```

**Issue:** Google OAuth not working
```bash
# Verify GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET
# Check authorized redirect URIs in Google Console
# Add: http://localhost:3000/api/auth/callback/google
```

#### Performance Issues

**Issue:** Slow page loads
```bash
# Check bundle size
npm run build

# Analyze bundle
npm install -g @next/bundle-analyzer
ANALYZE=true npm run build
```

**Issue:** API timeouts
```bash
# Check database connection
# Verify API rate limits
# Review server logs
```

### Debug Mode

Enable debug logging:

```env
DEBUG=true
NODE_ENV=development
```

### Getting Help

1. Check the [Troubleshooting](#troubleshooting) section
2. Review error logs in `.next/` directory
3. Check browser console for client-side errors
4. Review server logs for API errors
5. Contact the development team

---

## 📚 Additional Resources

### Documentation

- [Next.js Documentation](https://nextjs.org/docs)
- [React Documentation](https://react.dev)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [Drizzle ORM Documentation](https://orm.drizzle.team)
- [NextAuth.js Documentation](https://next-auth.js.org)

### Tools

- [Drizzle Studio](https://orm.drizzle.team/drizzle-studio/overview) - Database GUI
- [Vercel Dashboard](https://vercel.com/dashboard) - Deployment platform
- [Neon Console](https://console.neon.tech) - PostgreSQL hosting

### APIs

- [Google Gemini AI](https://ai.google.dev/docs)
- [DeepSeek AI](https://platform.deepseek.com/docs)
- [OpenAI API](https://platform.openai.com/docs)
- [SendGrid API](https://docs.sendgrid.com)

---

## 🤝 Contributing

We welcome contributions! Please follow these guidelines:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Write/update tests
5. Update documentation
6. Submit a pull request

### Code Review Process

1. All PRs require review from at least one team member
2. All tests must pass
3. Code must follow style guidelines
4. Documentation must be updated

---

## 📄 License

This project is private and proprietary. All rights reserved.

**© 2025 Rouge. Unauthorized copying or distribution is prohibited.**

---

## 👥 Team

- **Project Lead:** TBD
- **Development Team:** TBD
- **QA Team:** TBD
- **DevOps:** TBD

---

## 📞 Support

For support, please contact:
- **Email:** Contact your admin team (emails are managed dynamically in the system)
- **Slack:** #rouge-dashboard
- **Issues:** Create a GitHub issue

---

## 🎉 Acknowledgments

Built with ❤️ using:
- [Next.js](https://nextjs.org)
- [React](https://react.dev)
- [Tailwind CSS](https://tailwindcss.com)
- [shadcn/ui](https://ui.shadcn.com)
- [Drizzle ORM](https://orm.drizzle.team)
- [Vercel](https://vercel.com)

---

**Last Updated:** October 11, 2025  
**Version:** 0.1.0  
**Status:** Production Ready ✅


---

## 🎯 Project Status

### ✅ Production Ready

The Rouge Dashboard is **fully complete and production-ready** with all features implemented, tested, and deployed.

#### Completed Features

**Authentication & Security**
- ✅ Database-backed authentication system
- ✅ Rouge email restriction (.rouge@gmail.com and @rougevc.com)
- ✅ Google OAuth integration
- ✅ Email/password authentication with bcrypt
- ✅ Account lockout after 5 failed attempts
- ✅ Password reset via SendGrid email
- ✅ Comprehensive audit logging
- ✅ Session management with device tracking
- ✅ Protected routes and API endpoints

**AI-Powered Tools**
- ✅ AgTech Event Finder - AI-powered event discovery
- ✅ Agritech Startup Seeker - Startup analysis and scoring
- ✅ AI News Daily - Curated AI news feed
- ✅ Content Idea Automation - LinkedIn content generation
- ✅ Cold Connect Automator - Personalized outreach campaigns
- ✅ Agritech Universities - Research institution database

**Core Features**
- ✅ Dashboard hub with search and favorites
- ✅ Work tracker with project management
- ✅ Ticketing system with Slack notifications
- ✅ User management and settings
- ✅ Real-time analytics with Google Analytics 4
- ✅ Email notifications via SendGrid
- ✅ Dark mode with system awareness
- ✅ Mobile-responsive design

**Database & Backend**
- ✅ PostgreSQL database on Neon
- ✅ Drizzle ORM with comprehensive schema
- ✅ 15+ database tables for all features
- ✅ Rate limiting and caching
- ✅ Error monitoring and logging
- ✅ API route protection

**UI/UX**
- ✅ Modern dark theme with Tailwind CSS 4
- ✅ Smooth animations with Framer Motion
- ✅ Accessible components (WCAG 2.1 AA)
- ✅ Professional email templates
- ✅ Loading states and error handling
- ✅ Toast notifications

#### Deployment

- **Production URL:** https://rougevc.com
- **Database:** Neon PostgreSQL
- **Hosting:** Vercel
- **Email:** SendGrid
- **Analytics:** Google Analytics 4

#### Code Quality

- ✅ TypeScript throughout (100% type coverage)
- ✅ No TypeScript errors
- ✅ No console errors
- ✅ ESLint configured
- ✅ Clean code structure
- ✅ Comprehensive error handling
- ✅ Security best practices
- ✅ Performance optimized

#### Documentation

- ✅ Comprehensive README
- ✅ Environment variable documentation
- ✅ API documentation
- ✅ Database schema documentation
- ✅ Authentication flow documentation
- ✅ Deployment guide
- ✅ Troubleshooting guide

---

**Version:** 1.0.0  
**Status:** ✅ **PRODUCTION READY**  
**Domain:** https://rougevc.com  
**Contact:** Admin team (managed dynamically in system)
