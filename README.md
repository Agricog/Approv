# Approv

**Professional client approval workflows for architecture and design practices.**

Approv streamlines the design approval process by providing a secure, trackable system for sending deliverables to clients and collecting their feedback.

## Features

- **Secure Approval Links** - Token-based access, no client login required
- **Monday.com Integration** - Two-way sync with your project boards
- **Client Portal** - Clients can view all their projects in one place
- **Analytics Dashboard** - Track approval rates, response times, bottlenecks
- **Multi-channel Notifications** - Email, SMS, and Slack reminders
- **Audit Trail** - Full history of all approvals and changes
- **WCAG 2.1 AA Accessible** - Inclusive design for all users
- **PWA Support** - Works offline, installable on mobile

## Tech Stack

**Frontend**
- React 18 + TypeScript
- Vite
- Tailwind CSS
- React Router

**Backend**
- Node.js + Express
- Prisma ORM
- PostgreSQL (Neon)
- Clerk Authentication

**Infrastructure**
- Railway (hosting)
- Resend (email)
- Twilio (SMS)
- Sentry (error tracking)

## Project Structure

```
approv/
├── src/                    # Frontend React app
│   ├── components/         # UI components
│   ├── pages/              # Route pages
│   ├── hooks/              # Custom React hooks
│   ├── services/           # API clients
│   ├── types/              # TypeScript types
│   └── utils/              # Utilities
├── api/                    # Backend Express API
│   └── src/
│       ├── routes/         # API endpoints
│       ├── middleware/     # Auth, validation, security
│       └── lib/            # Database, logging
├── prisma/                 # Database schema & migrations
└── public/                 # Static assets
```

## Getting Started

### Prerequisites

- Node.js 20+
- Docker (for local database)
- Neon account (for production database)
- Clerk account (for authentication)

### 1. Clone and Install

```bash
git clone https://github.com/your-org/approv.git
cd approv

# Install frontend dependencies
npm install

# Install backend dependencies
cd api && npm install && cd ..
```

### 2. Start Local Services

```bash
# Start PostgreSQL, Redis, Mailhog
docker-compose up -d
```

### 3. Configure Environment

```bash
# Frontend
cp .env.example .env

# Backend
cp api/.env.example api/.env
```

Edit `api/.env`:
```env
DATABASE_URL=postgresql://approv:approv_dev_password@localhost:5432/approv
DIRECT_URL=postgresql://approv:approv_dev_password@localhost:5432/approv
CLERK_SECRET_KEY=sk_test_xxx
```

### 4. Setup Database

```bash
cd api

# Generate Prisma client
npx prisma generate

# Push schema to database
npx prisma db push

# Seed with demo data
npx prisma db seed
```

### 5. Run Development Servers

```bash
# Terminal 1 - Frontend (http://localhost:5173)
npm run dev

# Terminal 2 - Backend (http://localhost:3001)
cd api && npm run dev
```

### 6. Test Demo Approval

Open: `http://localhost:5173/approve/demo-approval-002`

## Environment Variables

### Frontend (.env)

| Variable | Description |
|----------|-------------|
| `VITE_API_URL` | Backend API URL |
| `VITE_SENTRY_DSN` | Sentry DSN for error tracking |
| `VITE_CLERK_PUBLISHABLE_KEY` | Clerk public key |

### Backend (api/.env)

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection (pooled) |
| `DIRECT_URL` | PostgreSQL connection (direct) |
| `CLERK_SECRET_KEY` | Clerk secret key |
| `CLERK_WEBHOOK_SECRET` | Clerk webhook signing secret |
| `RESEND_API_KEY` | Resend API key for emails |
| `TWILIO_ACCOUNT_SID` | Twilio account SID |
| `TWILIO_AUTH_TOKEN` | Twilio auth token |
| `SENTRY_DSN` | Sentry DSN |
| `MONDAY_API_TOKEN` | Monday.com API token |
| `MONDAY_WEBHOOK_SECRET` | Monday.com webhook secret |

## Deployment

### Railway

1. Connect your GitHub repository to Railway
2. Add a PostgreSQL database (or use Neon)
3. Set environment variables
4. Deploy

```bash
# Railway CLI
railway login
railway link
railway up
```

### Database Migrations (Production)

```bash
cd api
npx prisma migrate deploy
```

## API Endpoints

### Public (No Auth)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Health check |
| GET | `/api/csrf-token` | Get CSRF token |
| GET | `/api/approvals/:token` | Get approval by token |
| POST | `/api/approvals/:token/respond` | Submit approval response |

### Authenticated

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/projects` | List projects |
| POST | `/api/projects` | Create project |
| GET | `/api/projects/:id` | Get project |
| PATCH | `/api/projects/:id` | Update project |
| POST | `/api/projects/:id/approvals` | Create approval |
| GET | `/api/dashboard` | Dashboard metrics |
| GET | `/api/dashboard/analytics` | Analytics data |

### Client Portal

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/portal` | Client's projects |
| GET | `/api/portal/projects/:id` | Project details |

## Security

Approv follows OWASP Top 10 2024 guidelines:

- **CSRF Protection** - Token-based with secure cookies
- **Rate Limiting** - Per-endpoint limits
- **Input Validation** - Zod schemas on all endpoints
- **SQL Injection** - Prisma ORM with parameterized queries
- **XSS Prevention** - DOMPurify sanitization
- **SSRF Protection** - URL validation, blocked internal IPs
- **Audit Logging** - Full trail with PII redaction

## License

Proprietary - Autaimate Ltd © 2024

## Support

- Documentation: https://docs.approv.co.uk
- Email: support@approv.co.uk
