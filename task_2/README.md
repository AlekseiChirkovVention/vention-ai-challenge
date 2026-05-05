# EventPlatform — Lightweight Event Hosting & Attendance

A lightweight event hosting and attendance platform for running free community-style events end to end. Organizers publish events, attendees RSVP and receive digital passes, and checkers verify entry at the venue.

## Setup

```bash
# Install dependencies
npm install

# Set environment variables
cp .env.example .env   # then edit DATABASE_URL, JWT_SECRET

# Run database migrations
npx prisma migrate deploy

# Seed demo data (optional)
npx tsx scripts/seed.ts

# Start the server
npx tsx server/index.ts

# Start the frontend (separate terminal)
npm run dev
```

### Environment Variables

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | SQLite connection string (e.g., `file:./prisma/dev.db`) |
| `JWT_SECRET` | Secret key for JWT token signing |
| `VITE_API_URL` | API base URL for frontend (leave empty if using Vite proxy) |

---

## Main Flows

### 1. Publish an Event

1. **Sign up** at `/signup` with email and password
2. **Create a Host** at `/hosts/new` — provide name, slug, contact email, optional logo/bio
3. **Create an Event** at `/my-events` — fill in title, date/time, timezone, location (venue or online), cover image URL, visibility (public/unlisted), then click **Publish** (or **Save Draft** to publish later)
4. The event is now live on the **Explore** page at `/`
5. To manage: go to **Dashboard** → select your host → see upcoming/past events with stats

### 2. RSVP to an Event

1. Browse events on the **Explore** page at `/`
2. Use filters: search by name, filter by date range, location, or toggle "Include past events"
3. Click an event to view details
4. Click **RSVP** — if logged out, you'll be redirected to login first
5. If the event has capacity:
   - If spots available → status becomes **Confirmed** and you get a ticket
   - If full → status becomes **Waitlisted**
6. If someone cancels, the first waitlisted person is auto-promoted and notified via the notification bell
7. To cancel: click **Cancel RSVP** on the event page

### 3. View Your Ticket

1. Go to **My Tickets** at `/tickets`
2. Each ticket shows:
   - Event name and date
   - **QR code** containing your unique ticket code
   - **Add to Calendar** button to download an `.ics` file
3. Show the QR code at the venue for check-in

### 4. Check-in at the Venue

1. A host member or checker navigates to the event detail page and clicks **Check-in**
2. The check-in page shows:
   - **Total checked in** / total confirmed RSVPs (live counter, updates every 10 seconds)
   - Input field to enter a ticket code manually
3. Enter the ticket code → click **Check In**
   - Success: attendee is marked as checked in
   - Already checked in: shows "already checked in" message
   - Invalid code: shows error
4. **Undo**: recent check-ins can be undone within the session

---

## Additional Features

- **Host Teams**: Invite members with roles (host, checker) via invite links
- **Feedback**: Attendees can rate past events (1-5 stars + comment), editable within 24 hours
- **Gallery**: Attendees and hosts can upload photos (max 10 per user), hosts approve before public display
- **Reports**: Users can report events or photos; hosts review and hide/dismiss
- **Notifications**: Bell icon shows unread notifications (e.g., waitlist promotion)
- **CSV Export**: Hosts can export attendee lists from the dashboard
- **SEO**: Open Graph tags on event pages for social sharing

---

## Demo Credentials

After running the seed script:

| Role | Email | Password |
|------|-------|----------|
| Host | host@example.com | host123456 |
| Attendee | attendee@example.com | attendee123456 |
