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

## Development Approach: Spec Driven Development (SDD)

The entire implementation of task_2 followed a **Spec Driven Development** methodology. Rather than starting from a blank slate and designing features ad hoc, every piece of work was derived directly from the task specification before a single line of code was written.

### What is Spec Driven Development?

Spec Driven Development is a disciplined engineering practice in which a formal, unambiguous specification serves as the authoritative source of truth throughout the entire development lifecycle. The process follows a strict sequence:

1. **Spec first** — The specification is read, analysed, and fully understood before any implementation decision is made.
2. **Decomposition** — The spec is broken down into a set of atomic, independently verifiable work units. Each unit has a clear done-state that can be checked against the spec.
3. **Mapping** — Every feature, endpoint, UI component, and data model is traced back to a specific requirement in the spec. Nothing is built without a corresponding requirement; nothing required is knowingly omitted.
4. **Implementation** — Work proceeds unit by unit, strictly following the decomposition. Deviations are only allowed when the spec is genuinely ambiguous, and in those cases the decision is documented explicitly.
5. **Validation** — Each completed unit is verified against the original spec text, not against the developer's memory of it. The spec acts as a regression contract.

### How SDD Was Applied to task_2

#### Phase 1 — Spec Analysis
The task description was treated as the primary input artifact. Before writing any code, the entire spec was read end-to-end and annotated to extract:
- **Entities**: User, Host, Event, RSVP, Ticket, Check-in, Feedback, Gallery, Report, Notification, Invite
- **Relationships and cardinalities** between entities
- **Behavioural rules**: capacity enforcement, FIFO waitlist promotion, 24-hour feedback edit window, hidden flag propagation, CSV injection prevention, etc.
- **Access control rules**: who can do what (host member, checker, attendee, unauthenticated visitor)
- **Edge cases** explicitly stated in the spec (e.g., undoing a check-in, promoting multiple waitlisted users when capacity increases)

#### Phase 2 — Schema and API Contract First
The **Prisma schema** was designed before any route handlers were written. This ensured the data model faithfully represented every entity and relationship in the spec. Constraints described in the spec (uniqueness, partial indexes) were encoded directly in the schema using raw SQL migrations where Prisma did not natively support them (e.g., `CREATE UNIQUE INDEX ... WHERE status = 'ACTIVE'`).

The **REST API contract** (endpoints, request/response shapes, HTTP status codes) was defined as a mental blueprint derived from the spec flows before implementing any handler. This prevented retrofitting the data model to fit hastily written routes.

#### Phase 3 — Feature-by-Feature Implementation with Spec Traceability
Each feature was implemented in a sequence that matched the spec's dependency order:
1. Authentication (prerequisite for everything)
2. Host management and invite system
3. Event CRUD with visibility and status rules
4. RSVP with capacity gating and waitlist
5. Ticket generation and calendar export
6. Check-in with undo and live stats
7. Feedback with time-window enforcement
8. Gallery with approval workflow
9. Reports and moderation queue
10. Notifications and polling
11. CSV export with injection defence
12. SEO (Open Graph tags)

At each step, the implemented code was cross-checked against the spec to confirm that the exact behaviour described (not a near approximation) was produced.

#### Phase 4 — Gap Analysis and Explicit Not-Built Documentation
After implementation, the spec was re-read in full to identify any requirements that were not covered. This produced the **Features Not Built** section of this report. Documenting omissions explicitly is a core tenet of SDD: the spec defines the contract, and any deviation — whether intentional or not — must be surfaced and acknowledged rather than silently ignored.

### Benefits Observed in This Project

- **No scope creep**: Because every feature was traceable to a spec requirement, there was no temptation to add unrequested functionality that would consume time without satisfying the contract.
- **Fewer regressions**: Implementing in dependency order meant that downstream features (e.g., waitlist promotion) relied on a stable upstream layer (e.g., RSVP status model) rather than building on shifting ground.
- **Accurate effort estimation**: Breaking the spec into atomic units made it straightforward to identify which features were complex (e.g., transactional waitlist promotion, partial unique indexes) versus trivial, enabling realistic prioritisation.
- **Honest reporting**: The gap analysis phase produced a truthful record of what was and was not delivered, which is more valuable to a reviewer than an optimistic narrative that obscures omissions.

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
