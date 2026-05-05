
# Fix MyEventsPage Gaps

## Problem
The MyEventsPage is missing several task requirements:
- No **capacity** input field in the event creation form
- No **Publish/Unpublish/Duplicate** quick-action buttons on the event list
- No **text search or status filter** on the event list
- Event list items don't show **status badges** (draft/published), **hidden badge**, or **Ended badge**

## Changes

### 1. `src/pages/MyEventsPage.tsx` — Full rewrite

**Event interface**: Expand to include `status`, `visibility`, `hidden`, `hostId` (already returned by API).

**Form additions**:
- Add capacity input field (`<input type="number">`) between the location section and cover image section
- Include `capacity` in the submit body as `capacity: capacity ? Number(capacity) : null`

**Event list improvements**:
- Add search input and status dropdown filter above the list
- Each event card shows: title (linked to detail page), status badge, visibility badge, hidden badge (if hidden), ended badge (if past)
- Quick-action buttons per event:
  - Draft events: **Publish** button
  - Published events: **Unpublish** button
  - All events: **Duplicate** button
- Actions call existing API endpoints (`PATCH /api/events/:id/publish`, `PATCH /api/events/:id/unpublish`, `POST /api/events/:id/duplicate`)
- Collapse the creation form into a `<details>` element to declutter the page

**Filter logic**: Client-side filtering on `title` (text search) and `status` (dropdown: all/draft/published).

### 2. No backend changes needed
The `GET /api/my-events` endpoint already returns all Event fields from Prisma. The frontend just needs to use them.
