# Project Report — EventPlatform

## Tools and Techniques Used

### Languages & Runtimes
- **TypeScript** — used for both frontend and backend to catch type errors at compile time
- **Node.js 20** — runtime for the Express server

### Frontend
- **React 18** + **Vite** — SPA framework and dev server with HMR
- **Tailwind CSS** — utility-first styling
- **React Router v6** — client-side routing
- **react-helmet-async** — Open Graph meta tag injection
- **qrcode.react** — QR code generation for tickets

### Backend
- **Express.js** — HTTP server and REST API
- **Prisma ORM** — database schema management, migrations, and query builder
- **SQLite** — zero-config embedded database (via Prisma)
- **bcrypt** — password hashing (10 salt rounds)
- **jsonwebtoken** — stateless JWT authentication
- **tsx** — TypeScript execution for server without a compile step
- **multer** — file upload middleware (used for gallery flow)

### DevOps & Tooling
- **Render.com** — full-stack deployment (Node.js Web Service with ephemeral SQLite)
- **GitHub** — version control and public repository hosting
- **Windsurf (Cascade AI)** — AI-assisted coding for scaffolding, code review, and feature implementation

### Techniques
- **Polling** (10s check-in stats, 30s notifications) instead of WebSockets for simplicity
- **FIFO waitlist promotion** via ordered Prisma queries and `$transaction` to avoid double-booking
- **Idempotent seed** using deterministic string IDs and `upsert` to allow re-runs without duplication
- **CSV injection defense** — all cell values prefixed to neutralise formula injection
- **Partial unique indexes** — SQLite `CREATE UNIQUE INDEX ... WHERE` for check-in and report dedup
- **Hidden flag propagation** — moderated content uses a `hidden` boolean; no cascading deletes

---

## Architecture Overview

The application is a full-stack web app with clear separation between frontend and backend:

- **Frontend**: React 18 + TypeScript + Vite + Tailwind CSS
- **Backend**: Express.js (TypeScript) running on Node.js
- **Database**: SQLite via Prisma ORM
- **Authentication**: JWT-based (bcrypt password hashing, Bearer tokens)

The frontend communicates with the backend via REST API calls. In development, Vite proxies `/api` requests to the Express server on port 4000.

## Features Built

### Core Flows
- **User authentication**: Signup, login, JWT token management
- **Host management**: Create hosts with name/slug/bio/logo, invite members with roles (host, checker)
- **Event CRUD**: Create events with title, description, date/time, end date, timezone, location (venue/online), cover image, visibility (public/unlisted), status (draft/published)
- **Explore page**: Search, date range filter, location filter, past events toggle, paginated results
- **RSVP system**: Confirm/waitlist based on capacity, automatic waitlist promotion on cancellation
- **Ticket system**: QR code generation, .ics calendar file download
- **Check-in system**: Code-based check-in with live polling stats (10s interval), undo capability

### Additional Features
- **Feedback**: 1-5 star ratings with optional comments, 24-hour edit window, one feedback per user per event
- **Gallery**: Photo uploads with image URL validation (hostname whitelist + HEAD request), 10-photo per-user limit, host approval workflow
- **Reports & Moderation**: Report events or gallery photos, host reviews with hide/dismiss actions (transactional), hidden flag propagation across all public endpoints
- **Notifications**: Waitlist promotion notifications, notification bell with 30s polling, mark read/read all
- **Dashboard**: Per-host dashboard with event stats (going/waitlist/checked-in), pending reports count, CSV export with UTF-8 BOM and injection defense
- **SEO**: Open Graph meta tags via react-helmet-async, HelmetProvider wrapping root

### Security Measures
- Role-based access control via `assertHostMember` helper
- Image URL validation with hostname whitelist
- CSV injection defense via `escapeCsvCell`
- Partial unique indexes for dedup (active check-ins, pending reports)
- JWT token verification middleware
- Password hashing with bcrypt (10 salt rounds)
- Timing-safe password comparison (dummy hash for non-existent users)

## Features Not Built

- **Paid events**: The Free/Paid toggle is shown in the UI but the Paid option is disabled with "Coming soon" tooltip. No payment integration was implemented.
- **Real-time updates**: Polling was chosen over WebSockets for simplicity and reliability.
- **Email notifications**: Notifications are in-app only; no email delivery system was implemented.
- **Image uploads**: Gallery uses URL-based image references with validation, not direct file uploads.

## Notable Decisions

1. **Polling over WebSockets**: Check-in stats poll every 10s, notifications every 30s, both with `visibilitychange` cleanup. This avoids WebSocket infrastructure complexity while providing adequate real-time feel.

2. **Partial unique indexes**: SQLite-compatible `CREATE UNIQUE INDEX ... WHERE` for active check-in dedup and pending report dedup, avoiding application-level race conditions.

3. **JWT authentication**: Stateless auth with Bearer tokens. No refresh token rotation — acceptable for MVP scope.

4. **Hidden flag propagation**: Instead of cascading deletes, moderated content is hidden via a boolean flag. Public endpoints filter `hidden: false`; single-entity endpoints use `canViewHidden` for authorized access. Existing tickets remain visible to owners with a "moderated" indicator.

5. **Image URL whitelist**: Gallery photos use URLs from approved hostnames (imgur, cloudinary, unsplash, GitHub) validated via HEAD request, avoiding the need for file storage infrastructure.

6. **SQLite**: Chosen for zero-config development. The Prisma schema is database-agnostic and could be migrated to PostgreSQL for production.

7. **Static seed IDs**: The seed script uses deterministic string IDs for idempotent re-runs without data duplication.
