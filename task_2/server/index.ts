import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import { Prisma } from "@prisma/client";
import { randomUUID } from "crypto";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import path from "path";
import { fileURLToPath } from "url";
import { prisma } from "./prisma";
import { requireAuth, AuthRequest } from "./middleware/auth";
import {
  assertHostMember,
  canViewHidden,
  isEventPast,
  escapeCsvCell,
  slugifyTitle,
  parseNotification,
  validateImageUrl,
  mapKeysToSnake,
} from "./helpers";

if (!process.env.JWT_SECRET) {
  throw new Error("JWT_SECRET is not defined");
}

const JWT_SECRET = process.env.JWT_SECRET;

const app = express();
const PORT = process.env.PORT ?? 4000;
const SALT_ROUNDS = 10;
const DUMMY_HASH = "$2b$10$CwTycUXWue0Thq9StjUM0uJ8z3zYh5YhZ8aA1H3s7lG4xZ6k5yQeK";

app.use(cors());
app.use(express.json());

app.get("/health", (_req: Request, res: Response) => {
  res.json({ status: "ok" });
});

// Optional auth — attaches user if token present, but doesn't 401
const optionalAuth = (req: AuthRequest, _res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith("Bearer ")) {
    try {
      const token = authHeader.split(" ")[1];
      const payload = jwt.verify(token, JWT_SECRET) as { userId: string };
      req.user = payload;
    } catch { /* ignore invalid token */ }
  }
  next();
};

async function assertEventEditAccess(eventId: string, userId: string) {
  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event) return { error: 404 as const, event: null };

  const isCreator = event.creatorId === userId;
  const isHostMember = event.hostId
    ? !!(await prisma.hostMember.findFirst({
        where: { hostId: event.hostId, userId, role: "host" },
      }))
    : false;

  if (!isCreator && !isHostMember) return { error: 403 as const, event };
  return { error: null, event };
}

app.post("/api/signup", async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    const user = await prisma.user.create({
      data: {
        email: email.trim().toLowerCase(),
        password: hashedPassword,
      },
    });

    return res.status(201).json({ id: user.id, email: user.email });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return res.status(409).json({ error: "User already exists" });
    }
    return res.status(500).json({ error: "Internal server error" });
  }
});

app.post("/api/login", async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    const hashToCompare = user ? user.password : DUMMY_HASH;
    const isValid = await bcrypt.compare(password, hashToCompare);

    if (!user || !isValid) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const token = jwt.sign(
      { userId: user.id },
      JWT_SECRET as string,
      { expiresIn: "7d" }
    );

    return res.status(200).json({
      id: user.id,
      email: user.email,
      token,
    });
  } catch (error) {
    return res.status(500).json({ error: "Internal server error" });
  }
});

app.get("/api/me", requireAuth, (req: any, res) => {
  res.json({ userId: req.user.userId });
});

app.post("/api/events", requireAuth, async (req: any, res) => {
  try {
    const {
      title, description, date, end_date, timezone, venue_address,
      online_link, cover_image_url, visibility, status, host_id, capacity,
    } = req.body;

    if (!title || !date) {
      return res.status(400).json({ error: "Title and date are required" });
    }

    const vis = visibility ?? "public";
    if (vis !== "public" && vis !== "unlisted") {
      return res.status(400).json({ error: "visibility must be 'public' or 'unlisted'" });
    }

    const st = status ?? "published";
    if (st !== "draft" && st !== "published") {
      return res.status(400).json({ error: "status must be 'draft' or 'published'" });
    }

    const startDate = new Date(date);
    if (end_date) {
      const endDate = new Date(end_date);
      if (endDate <= startDate) {
        return res.status(400).json({ error: "End date must be after start date" });
      }
    }

    if (cover_image_url) {
      try { new URL(cover_image_url); } catch { return res.status(400).json({ error: "Cover image URL must be a valid URL" }); }
    }

    const event = await prisma.event.create({
      data: {
        title,
        description: description || null,
        date: startDate,
        endDate: end_date ? new Date(end_date) : null,
        timezone: timezone || "UTC",
        capacity: capacity ?? null,
        venueAddress: venue_address || null,
        onlineLink: online_link || null,
        coverImageUrl: cover_image_url || null,
        visibility: vis,
        status: st,
        isPaid: false,
        creatorId: req.user.userId,
        hostId: host_id || null,
      },
    });

    return res.status(201).json(event);
  } catch {
    return res.status(500).json({ error: "Internal server error" });
  }
});

app.get("/api/events", async (req, res) => {
  try {
    const {
      search, date_from, date_to, location, include_past,
      page: pageStr, per_page: perPageStr,
    } = req.query as Record<string, string | undefined>;

    const page = Math.max(1, parseInt(pageStr || "1", 10) || 1);
    const perPage = Math.min(100, Math.max(1, parseInt(perPageStr || "20", 10) || 20));

    const where: any = {
      status: "published",
      visibility: "public",
      hidden: false,
    };

    if (include_past !== "true") {
      where.date = { ...(where.date || {}), gte: new Date() };
    }

    if (date_from) {
      where.date = { ...(where.date || {}), gte: new Date(date_from) };
    }
    if (date_to) {
      where.date = { ...(where.date || {}), lte: new Date(date_to) };
    }

    if (search) {
      where.OR = [
        { title: { contains: search } },
        { description: { contains: search } },
      ];
    }

    if (location) {
      where.venueAddress = { contains: location };
    }

    const [events, total] = await Promise.all([
      prisma.event.findMany({
        where,
        orderBy: { date: "asc" },
        skip: (page - 1) * perPage,
        take: perPage,
      }),
      prisma.event.count({ where }),
    ]);

    return res.status(200).json({ data: events, total, page, per_page: perPage });
  } catch {
    return res.status(500).json({ error: "Internal server error" });
  }
});

app.get("/api/my-events", requireAuth, async (req: any, res) => {
  try {
    const userId = req.user.userId;

    // Find all hosts the user is a member of
    const memberships = await prisma.hostMember.findMany({
      where: { userId },
      select: { hostId: true, role: true },
    });
    const hostIds = memberships.map((m) => m.hostId);

    // Events: created by user OR belonging to hosts where user is a member
    const events = await prisma.event.findMany({
      where: {
        OR: [
          { creatorId: userId },
          ...(hostIds.length > 0 ? [{ hostId: { in: hostIds } }] : []),
        ],
      },
      orderBy: { date: "asc" },
      include: { host: { select: { id: true, name: true, slug: true } } },
    });

    // Deduplicate by event id
    const seen = new Set<string>();
    const unique = events.filter((e) => {
      if (seen.has(e.id)) return false;
      seen.add(e.id);
      return true;
    });

    // Attach user's role for each event
    const hostRoleMap = new Map(memberships.map((m) => [m.hostId, m.role]));
    const result = unique.map((e) => ({
      ...e,
      userRole: e.hostId ? (hostRoleMap.get(e.hostId) ?? (e.creatorId === userId ? "host" : null)) : (e.creatorId === userId ? "creator" : null),
    }));

    return res.status(200).json(result);
  } catch {
    return res.status(500).json({ error: "Internal server error" });
  }
});

app.post("/api/events/:eventId/rsvp", requireAuth, async (req: any, res) => {
  try {
    const { eventId } = req.params;
    const userId = req.user.userId;

    const event = await prisma.event.findUnique({ where: { id: eventId } });
    if (!event) {
      return res.status(404).json({ error: "Event not found" });
    }
    if (event.hidden) {
      return res.status(403).json({ error: "Event not available" });
    }

    const existing = await prisma.rSVP.findUnique({
      where: { userId_eventId: { userId, eventId } },
    });
    if (existing) {
      return res.status(409).json({ error: "Already RSVPed to this event" });
    }

    // known race condition — acceptable for MVP
    const confirmedCount = await prisma.rSVP.count({
      where: { eventId, status: "CONFIRMED" },
    });

    if (event.capacity === null || confirmedCount < event.capacity) {
      const result = await prisma.$transaction(async (tx) => {
        const rsvp = await tx.rSVP.create({
          data: { userId, eventId, status: "CONFIRMED" },
        });
        const ticket = await tx.ticket.create({
          data: { rsvpId: rsvp.id },
        });
        return { rsvp, ticket };
      });

      return res.status(201).json({
        rsvp: { id: result.rsvp.id, status: result.rsvp.status, createdAt: result.rsvp.createdAt },
        ticket: { id: result.ticket.id, code: result.ticket.code, createdAt: result.ticket.createdAt },
      });
    }

    const rsvp = await prisma.rSVP.create({
      data: { userId, eventId, status: "WAITLISTED" },
    });

    return res.status(201).json({
      rsvp: { id: rsvp.id, status: rsvp.status, createdAt: rsvp.createdAt },
      ticket: null,
    });
  } catch {
    return res.status(500).json({ error: "Internal server error" });
  }
});

app.delete("/api/events/:eventId/rsvp", requireAuth, async (req: any, res) => {
  try {
    const { eventId } = req.params;
    const userId = req.user.userId;

    const rsvp = await prisma.rSVP.findUnique({
      where: { userId_eventId: { userId, eventId } },
    });
    if (!rsvp) {
      return res.status(404).json({ error: "RSVP not found" });
    }

    if (rsvp.status === "CONFIRMED") {
      const event = await prisma.event.findUnique({ where: { id: eventId }, select: { title: true } });
      await prisma.$transaction(async (tx) => {
        await tx.rSVP.delete({ where: { id: rsvp.id } });

        const nextWaitlisted = await tx.rSVP.findFirst({
          where: { eventId, status: "WAITLISTED" },
          orderBy: { createdAt: "asc" },
        });

        if (nextWaitlisted) {
          await tx.rSVP.update({
            where: { id: nextWaitlisted.id },
            data: { status: "CONFIRMED" },
          });
          await tx.ticket.create({
            data: { rsvpId: nextWaitlisted.id },
          });
          await tx.notification.create({
            data: {
              userId: nextWaitlisted.userId,
              type: "waitlist_promoted",
              payload: JSON.stringify({ eventId, eventTitle: event?.title ?? "Unknown Event" }),
            },
          });
        }
      });
    } else {
      await prisma.rSVP.delete({ where: { id: rsvp.id } });
    }

    return res.status(204).send();
  } catch {
    return res.status(500).json({ error: "Internal server error" });
  }
});

app.get("/api/tickets", requireAuth, async (req: any, res) => {
  try {
    const userId = req.user.userId;

    const rsvps = await prisma.rSVP.findMany({
      where: {
        userId,
        status: "CONFIRMED",
      },
      include: {
        ticket: true,
        event: true,
      },
      orderBy: { event: { date: "asc" } },
    });

    const tickets = rsvps
      .filter((r) => r.ticket !== null)
      .map((r) => ({
        id: r.ticket!.id,
        code: r.ticket!.code,
        createdAt: r.ticket!.createdAt,
        event: {
          id: r.event.id,
          title: r.event.title,
          date: r.event.date,
          description: r.event.description,
          hidden: r.event.hidden,
        },
      }));

    return res.status(200).json(tickets);
  } catch {
    return res.status(500).json({ error: "Internal server error" });
  }
});

app.get("/api/events/:eventId", optionalAuth, async (req: AuthRequest, res) => {
  try {
    const eventId = req.params.eventId as string;
    const event = await prisma.event.findUnique({
      where: { id: eventId },
    });
    if (!event) {
      return res.status(404).json({ error: "Event not found" });
    }

    // Visibility rules
    if (event.status === "draft") {
      const userId = req.user?.userId;
      if (!userId) return res.status(404).json({ error: "Event not found" });
      const { error } = await assertEventEditAccess(event.id, userId);
      if (error) return res.status(404).json({ error: "Event not found" });
    }

    // Hidden check
    if (event.hidden) {
      const allowed = await canViewHidden(req.user?.userId ?? null, event);
      if (!allowed) {
        return res.status(200).json({ removed: true, id: event.id, title: "Event removed" });
      }
    }

    return res.json(event);
  } catch {
    return res.status(500).json({ error: "Internal server error" });
  }
});

app.get("/api/events/:eventId/rsvp-status", requireAuth, async (req: any, res) => {
  try {
    const rsvp = await prisma.rSVP.findFirst({
      where: {
        userId: req.user.userId,
        eventId: req.params.eventId,
      },
    });
    return res.json({ status: rsvp?.status ?? null });
  } catch {
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ── Host endpoints ──────────────────────────────────────────

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

async function uniqueSlug(name: string): Promise<string> {
  const base = generateSlug(name);
  let candidate = base;
  let suffix = 2;
  while (await prisma.host.findUnique({ where: { slug: candidate } })) {
    candidate = `${base}-${suffix}`;
    suffix++;
  }
  return candidate;
}

app.post("/api/hosts", requireAuth, async (req: any, res) => {
  try {
    const { name, bio, contact_email, logo_url } = req.body;

    if (!name || typeof name !== "string" || name.trim().length === 0 || name.trim().length > 100) {
      return res.status(400).json({ error: "Name is required and must be 1-100 characters" });
    }
    if (!contact_email || typeof contact_email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact_email)) {
      return res.status(400).json({ error: "A valid contact email is required" });
    }
    if (logo_url !== undefined && logo_url !== null && logo_url !== "") {
      try { new URL(logo_url); } catch { return res.status(400).json({ error: "Logo URL must be a valid URL" }); }
    }
    if (bio !== undefined && bio !== null && typeof bio === "string" && bio.length > 1000) {
      return res.status(400).json({ error: "Bio must be 1000 characters or fewer" });
    }

    const slug = await uniqueSlug(name.trim());

    const host = await prisma.$transaction(async (tx) => {
      const h = await tx.host.create({
        data: {
          ownerId: req.user.userId,
          name: name.trim(),
          slug,
          bio: bio || null,
          contactEmail: contact_email.trim(),
          logoUrl: logo_url || null,
        },
      });
      await tx.hostMember.create({
        data: { hostId: h.id, userId: req.user.userId, role: "host" },
      });
      return h;
    });

    return res.status(201).json({
      id: host.id,
      name: host.name,
      slug: host.slug,
      bio: host.bio,
      contact_email: host.contactEmail,
      logo_url: host.logoUrl,
      created_at: host.createdAt,
    });
  } catch {
    return res.status(500).json({ error: "Internal server error" });
  }
});


// ── Host :hostId routes (MUST be before :slug to avoid route conflicts) ──

app.get("/api/hosts/:hostId/members", requireAuth, async (req: any, res) => {
  try {
    const membership = await prisma.hostMember.findFirst({
      where: { hostId: req.params.hostId, userId: req.user.userId, role: "host" },
    });
    if (!membership) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const members = await prisma.hostMember.findMany({
      where: { hostId: req.params.hostId, userId: { not: null } },
      include: { user: { select: { id: true, email: true, name: true } } },
      orderBy: { createdAt: "asc" },
    });

    return res.json(
      members.map((m) => ({
        id: m.id,
        user_id: m.userId,
        role: m.role,
        created_at: m.createdAt,
        user: m.user,
      }))
    );
  } catch {
    return res.status(500).json({ error: "Internal server error" });
  }
});

app.post("/api/hosts/:hostId/invite-links", requireAuth, async (req: any, res) => {
  try {
    const { role } = req.body;
    if (role !== "host" && role !== "checker") {
      return res.status(400).json({ error: "Role must be 'host' or 'checker'" });
    }

    const membership = await prisma.hostMember.findFirst({
      where: { hostId: req.params.hostId, userId: req.user.userId, role: "host" },
    });
    if (!membership) {
      return res.status(403).json({ error: "Forbidden" });
    }

    let template = await prisma.hostMember.findFirst({
      where: { hostId: req.params.hostId, role, userId: null, inviteToken: { not: null } },
    });

    if (!template) {
      template = await prisma.hostMember.create({
        data: {
          hostId: req.params.hostId,
          userId: null,
          role,
          inviteToken: randomUUID(),
        },
      });
    }

    const appUrl = process.env.APP_URL || `${req.protocol}://${req.get("host")}`;
    return res.json({ inviteUrl: `${appUrl}/invite/${template.inviteToken}` });
  } catch {
    return res.status(500).json({ error: "Internal server error" });
  }
});

app.get("/api/hosts/:hostId/dashboard", requireAuth, async (req: any, res) => {
  try {
    const hostId = req.params.hostId;
    const result = await assertHostMember(req.user.userId, { kind: "host", id: hostId }, ["host"]);
    if (result.error === 404) return res.status(404).json({ error: "Host not found" });
    if (result.error === 403) return res.status(403).json({ error: "Access denied" });

    const [host, events] = await Promise.all([
      prisma.host.findUnique({ where: { id: hostId }, select: { id: true, name: true, slug: true, logoUrl: true, bio: true } }),
      prisma.event.findMany({ where: { hostId }, orderBy: { date: "asc" } }),
    ]);

    if (!host) return res.status(404).json({ error: "Host not found" });

    const eventIds = events.map((e) => e.id);

    const [rsvpGroups, checkinCounts] = await Promise.all([
      prisma.rSVP.groupBy({
        by: ["eventId", "status"],
        where: { eventId: { in: eventIds } },
        _count: { id: true },
      }),
      prisma.checkin.groupBy({
        by: ["eventId"],
        where: { eventId: { in: eventIds }, undone: false },
        _count: { id: true },
      }),
    ]);

    const statsMap = new Map<string, { going: number; waitlist: number; checked_in: number }>();
    for (const eid of eventIds) {
      statsMap.set(eid, { going: 0, waitlist: 0, checked_in: 0 });
    }
    for (const g of rsvpGroups) {
      const entry = statsMap.get(g.eventId)!;
      if (g.status === "CONFIRMED") entry.going = g._count.id;
      if (g.status === "WAITLISTED") entry.waitlist = g._count.id;
    }
    for (const c of checkinCounts) {
      const entry = statsMap.get(c.eventId)!;
      entry.checked_in = c._count.id;
    }

    const now = Date.now();
    const upcoming: any[] = [];
    const past: any[] = [];

    for (const e of events) {
      const effectiveEnd = e.endDate ?? e.date;
      const item = {
        event: {
          id: e.id, title: e.title, date: e.date.toISOString(),
          end_date: e.endDate?.toISOString() ?? null,
          status: e.status, visibility: e.visibility, hidden: e.hidden,
          capacity: e.capacity, venue_address: e.venueAddress,
        },
        stats: statsMap.get(e.id) ?? { going: 0, waitlist: 0, checked_in: 0 },
      };
      if (effectiveEnd.getTime() < now) {
        past.push(item);
      } else {
        upcoming.push(item);
      }
    }
    past.reverse(); // most recent past first

    // Pending reports count
    const hostPhotoIds = await prisma.galleryPhoto.findMany({
      where: { eventId: { in: eventIds } },
      select: { id: true },
    }).then((ps) => ps.map((p) => p.id));

    const pendingReportsCount = await prisma.report.count({
      where: {
        status: "pending",
        OR: [
          { targetType: "event", targetId: { in: eventIds } },
          ...(hostPhotoIds.length > 0 ? [{ targetType: "gallery_photo", targetId: { in: hostPhotoIds } }] : []),
        ],
      },
    });

    return res.json({
      host: { id: host.id, name: host.name, slug: host.slug, logo_url: host.logoUrl, bio: host.bio },
      upcoming,
      past,
      pending_reports_count: pendingReportsCount,
    });
  } catch {
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ── Reports ─────────────────────────────────────────────

app.post("/api/reports", requireAuth, async (req: any, res) => {
  try {
    const userId = req.user.userId;
    const { target_type, target_id, reason } = req.body;

    if (!["event", "gallery_photo"].includes(target_type)) {
      return res.status(400).json({ error: "target_type must be 'event' or 'gallery_photo'" });
    }
    if (!target_id || typeof target_id !== "string") {
      return res.status(400).json({ error: "target_id is required" });
    }
    if (!reason || typeof reason !== "string" || reason.trim().length < 10 || reason.trim().length > 500) {
      return res.status(400).json({ error: "reason must be between 10 and 500 characters" });
    }

    // Validate target exists
    if (target_type === "event") {
      const event = await prisma.event.findUnique({ where: { id: target_id } });
      if (!event) return res.status(404).json({ error: "Target not found" });
    } else {
      const photo = await prisma.galleryPhoto.findUnique({ where: { id: target_id } });
      if (!photo) return res.status(404).json({ error: "Target not found" });
    }

    try {
      const report = await prisma.report.create({
        data: { reporterId: userId, targetType: target_type, targetId: target_id, reason: reason.trim() },
      });
      return res.status(201).json({ id: report.id, status: report.status, created_at: report.createdAt.toISOString() });
    } catch (err: any) {
      if (err?.code === "P2002") {
        return res.status(409).json({ error: "You have already reported this" });
      }
      throw err;
    }
  } catch {
    return res.status(500).json({ error: "Internal server error" });
  }
});

app.get("/api/hosts/:hostId/reports", requireAuth, async (req: any, res) => {
  try {
    const hostId = req.params.hostId;
    const result = await assertHostMember(req.user.userId, { kind: "host", id: hostId }, ["host"]);
    if (result.error === 404) return res.status(404).json({ error: "Host not found" });
    if (result.error === 403) return res.status(403).json({ error: "Access denied" });

    const hostEventIds = await prisma.event.findMany({
      where: { hostId },
      select: { id: true },
    }).then((es) => es.map((e) => e.id));

    const hostPhotoIds = await prisma.galleryPhoto.findMany({
      where: { eventId: { in: hostEventIds } },
      select: { id: true },
    }).then((ps) => ps.map((p) => p.id));

    const orConditions: any[] = [
      { targetType: "event", targetId: { in: hostEventIds } },
    ];
    if (hostPhotoIds.length > 0) {
      orConditions.push({ targetType: "gallery_photo", targetId: { in: hostPhotoIds } });
    }

    const reports = await prisma.report.findMany({
      where: { status: "pending", OR: orConditions },
      orderBy: { createdAt: "desc" },
    });

    return res.json(reports.map((r) => ({
      id: r.id,
      target_type: r.targetType,
      target_id: r.targetId,
      reason: r.reason,
      status: r.status,
      created_at: r.createdAt.toISOString(),
    })));
  } catch {
    return res.status(500).json({ error: "Internal server error" });
  }
});

app.patch("/api/reports/:reportId", requireAuth, async (req: any, res) => {
  try {
    const { reportId } = req.params;
    const userId = req.user.userId;
    const { action } = req.body;

    if (!["hide", "dismiss"].includes(action)) {
      return res.status(400).json({ error: "action must be 'hide' or 'dismiss'" });
    }

    const report = await prisma.report.findUnique({ where: { id: reportId } });
    if (!report) return res.status(404).json({ error: "Report not found" });
    if (report.status !== "pending") return res.status(400).json({ error: "Report already resolved" });

    // Resolve ownership chain
    let hostId: string | null = null;
    if (report.targetType === "event") {
      const event = await prisma.event.findUnique({ where: { id: report.targetId }, select: { hostId: true } });
      hostId = event?.hostId ?? null;
    } else if (report.targetType === "gallery_photo") {
      const photo = await prisma.galleryPhoto.findUnique({ where: { id: report.targetId }, select: { eventId: true } });
      if (photo) {
        const event = await prisma.event.findUnique({ where: { id: photo.eventId }, select: { hostId: true } });
        hostId = event?.hostId ?? null;
      }
    }

    if (!hostId) return res.status(403).json({ error: "Access denied" });
    const memberResult = await assertHostMember(userId, { kind: "host", id: hostId }, ["host"]);
    if (memberResult.error) return res.status(403).json({ error: "Access denied" });

    // Transactional update
    const newStatus = action === "hide" ? "resolved" : "dismissed";
    await prisma.$transaction(async (tx) => {
      await tx.report.update({
        where: { id: reportId },
        data: { status: newStatus, reviewedBy: userId, reviewedAt: new Date() },
      });
      if (action === "hide") {
        if (report.targetType === "event") {
          await tx.event.update({ where: { id: report.targetId }, data: { hidden: true } });
        } else if (report.targetType === "gallery_photo") {
          await tx.galleryPhoto.update({ where: { id: report.targetId }, data: { hidden: true } });
        }
      }
    });

    return res.json({
      id: reportId,
      status: newStatus,
      reviewed_at: new Date().toISOString(),
    });
  } catch {
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ── CSV Export ───────────────────────────────────────────
app.get("/api/events/:eventId/export/csv", requireAuth, async (req: any, res) => {
  try {
    const { eventId } = req.params;
    const result = await assertHostMember(req.user.userId, { kind: "event", id: eventId }, ["host"]);
    if (result.error === 404) return res.status(404).json({ error: "Event not found" });
    if (result.error === 403) return res.status(403).json({ error: "Access denied" });

    const event = await prisma.event.findUnique({ where: { id: eventId }, select: { title: true, id: true } });
    if (!event) return res.status(404).json({ error: "Event not found" });

    const rsvps = await prisma.rSVP.findMany({
      where: { eventId },
      include: {
        user: { select: { name: true, email: true } },
        ticket: {
          include: {
            checkins: { where: { undone: false }, take: 1 },
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    const headers = "Name,Email,RSVP Status,Check-in Time";
    const rows = rsvps.map((r) => {
      const name = escapeCsvCell(r.user.name || "");
      const email = escapeCsvCell(r.user.email);
      const status = escapeCsvCell(r.status === "CONFIRMED" ? "confirmed" : "waitlist");
      const checkinTime = r.ticket?.checkins?.[0]
        ? escapeCsvCell(r.ticket.checkins[0].checkedInAt.toISOString())
        : "";
      return `${name},${email},${status},${checkinTime}`;
    });

    const csvBody = headers + "\n" + rows.join("\n");
    const filename = slugifyTitle(event.title, event.id) + "-attendees.csv";

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    return res.send("\uFEFF" + csvBody);
  } catch {
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ── Host :slug route (MUST be after :hostId routes) ──
app.get("/api/hosts/:slug", async (req, res) => {
  try {
    const host = await prisma.host.findUnique({ where: { slug: req.params.slug } });
    if (!host) {
      return res.status(404).json({ error: "Host not found" });
    }
    const events = await prisma.event.findMany({
      where: { hostId: host.id, hidden: false, status: "published" },
      orderBy: { date: "desc" },
    });
    return res.json({
      id: host.id,
      name: host.name,
      slug: host.slug,
      bio: host.bio,
      contact_email: host.contactEmail,
      logo_url: host.logoUrl,
      created_at: host.createdAt,
      events: events.map((e) => ({
        id: e.id, title: e.title, date: e.date.toISOString(),
        description: e.description,
      })),
    });
  } catch {
    return res.status(500).json({ error: "Internal server error" });
  }
});

app.get("/api/invite/:token", async (req, res) => {
  try {
    const template = await prisma.hostMember.findUnique({
      where: { inviteToken: req.params.token },
      include: { host: { select: { id: true, name: true, slug: true } } },
    });
    if (!template || template.userId !== null) {
      return res.status(404).json({ error: "Invalid invite token" });
    }
    return res.json({ hostName: template.host.name, hostSlug: template.host.slug, role: template.role });
  } catch {
    return res.status(500).json({ error: "Internal server error" });
  }
});

app.post("/api/invite/:token/accept", requireAuth, async (req: any, res) => {
  try {
    const template = await prisma.hostMember.findUnique({
      where: { inviteToken: req.params.token },
      include: { host: { select: { id: true, name: true, slug: true } } },
    });
    if (!template || template.userId !== null) {
      return res.status(404).json({ error: "Invalid invite token" });
    }

    const existing = await prisma.hostMember.findFirst({
      where: { hostId: template.hostId, userId: req.user.userId },
    });
    if (existing) {
      return res.status(409).json({ error: "Already a member of this host" });
    }

    await prisma.hostMember.create({
      data: { hostId: template.hostId, userId: req.user.userId, role: template.role },
    });

    return res.json({ host: template.host, role: template.role });
  } catch {
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ── Publish / Unpublish / Duplicate ─────────────────────

app.patch("/api/events/:id/publish", requireAuth, async (req: any, res) => {
  try {
    const { error } = await assertEventEditAccess(req.params.id, req.user.userId);
    if (error === 404) return res.status(404).json({ error: "Event not found" });
    if (error === 403) return res.status(403).json({ error: "Forbidden" });

    const updated = await prisma.event.update({
      where: { id: req.params.id },
      data: { status: "published" },
    });
    return res.json({ data: updated });
  } catch {
    return res.status(500).json({ error: "Internal server error" });
  }
});

app.patch("/api/events/:id/unpublish", requireAuth, async (req: any, res) => {
  try {
    const { error } = await assertEventEditAccess(req.params.id, req.user.userId);
    if (error === 404) return res.status(404).json({ error: "Event not found" });
    if (error === 403) return res.status(403).json({ error: "Forbidden" });

    const updated = await prisma.event.update({
      where: { id: req.params.id },
      data: { status: "draft" },
    });
    return res.json({ data: updated });
  } catch {
    return res.status(500).json({ error: "Internal server error" });
  }
});

app.post("/api/events/:id/duplicate", requireAuth, async (req: any, res) => {
  try {
    const { error, event } = await assertEventEditAccess(req.params.id, req.user.userId);
    if (error === 404 || !event) return res.status(404).json({ error: "Event not found" });
    if (error === 403) return res.status(403).json({ error: "Forbidden" });

    const duplicate = await prisma.event.create({
      data: {
        title: `Copy of ${event.title}`,
        description: event.description,
        date: event.date,
        endDate: event.endDate,
        timezone: event.timezone,
        capacity: event.capacity,
        venueAddress: event.venueAddress,
        onlineLink: event.onlineLink,
        coverImageUrl: event.coverImageUrl,
        visibility: event.visibility,
        status: "draft",
        isPaid: false,
        creatorId: req.user.userId,
        hostId: event.hostId,
      },
    });

    return res.status(201).json({ data: duplicate });
  } catch {
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ── Edit Event ──────────────────────────────────────────
app.patch("/api/events/:id", requireAuth, async (req: any, res) => {
  try {
    const { error, event } = await assertEventEditAccess(req.params.id, req.user.userId);
    if (error === 404 || !event) return res.status(404).json({ error: "Event not found" });
    if (error === 403) return res.status(403).json({ error: "Forbidden" });

    const {
      title, description, date, end_date, timezone, venue_address,
      online_link, cover_image_url, visibility, status, capacity,
    } = req.body;

    if (title !== undefined && (typeof title !== "string" || title.trim().length < 1)) {
      return res.status(400).json({ error: "Title cannot be empty" });
    }
    if (visibility !== undefined && visibility !== "public" && visibility !== "unlisted") {
      return res.status(400).json({ error: "visibility must be 'public' or 'unlisted'" });
    }
    if (status !== undefined && status !== "draft" && status !== "published") {
      return res.status(400).json({ error: "status must be 'draft' or 'published'" });
    }
    if (cover_image_url !== undefined && cover_image_url !== null && cover_image_url !== "") {
      try { new URL(cover_image_url); } catch { return res.status(400).json({ error: "Cover image URL must be a valid URL" }); }
    }
    if (capacity !== undefined && capacity !== null && capacity !== "" && (isNaN(Number(capacity)) || Number(capacity) < 1)) {
      return res.status(400).json({ error: "Capacity must be a positive number" });
    }

    const startDate = date ? new Date(date) : event.date;
    const endDate = end_date !== undefined ? (end_date ? new Date(end_date) : null) : event.endDate;
    if (endDate && endDate <= startDate) {
      return res.status(400).json({ error: "End date must be after start date" });
    }

    const oldCapacity = event.capacity;
    const newCapacity: number | null = capacity !== undefined
      ? (capacity === null || capacity === "" ? null : Number(capacity))
      : event.capacity;

    const updated = await prisma.event.update({
      where: { id: req.params.id },
      data: {
        ...(title !== undefined ? { title: title.trim() } : {}),
        ...(description !== undefined ? { description: description || null } : {}),
        ...(date !== undefined ? { date: startDate } : {}),
        ...(end_date !== undefined ? { endDate } : {}),
        ...(timezone !== undefined ? { timezone } : {}),
        ...(venue_address !== undefined ? { venueAddress: venue_address || null } : {}),
        ...(online_link !== undefined ? { onlineLink: online_link || null } : {}),
        ...(cover_image_url !== undefined ? { coverImageUrl: cover_image_url || null } : {}),
        ...(visibility !== undefined ? { visibility } : {}),
        ...(status !== undefined ? { status } : {}),
        ...(capacity !== undefined ? { capacity: newCapacity } : {}),
      },
    });

    // Promote waitlisted users if capacity increased or became unlimited
    if (capacity !== undefined) {
      let shouldPromote = false;
      if (newCapacity === null && oldCapacity !== null) {
        shouldPromote = true; // became unlimited
      } else if (newCapacity !== null && oldCapacity !== null && newCapacity > oldCapacity) {
        shouldPromote = true; // finite increase
      }

      if (shouldPromote) {
        const confirmedCount = await prisma.rSVP.count({ where: { eventId: req.params.id, status: "CONFIRMED" } });
        const slotsAvailable = newCapacity === null ? null : newCapacity - confirmedCount;

        if (slotsAvailable === null || slotsAvailable > 0) {
          const waitlisted = await prisma.rSVP.findMany({
            where: { eventId: req.params.id, status: "WAITLISTED" },
            orderBy: { createdAt: "asc" },
            ...(slotsAvailable !== null ? { take: slotsAvailable } : {}),
          });

          for (const rsvp of waitlisted) {
            await prisma.$transaction(async (tx) => {
              await tx.rSVP.update({ where: { id: rsvp.id }, data: { status: "CONFIRMED" } });
              await tx.ticket.create({ data: { rsvpId: rsvp.id } });
              await tx.notification.create({
                data: {
                  userId: rsvp.userId,
                  type: "waitlist_promoted",
                  payload: JSON.stringify({ eventId: req.params.id, eventTitle: updated.title }),
                },
              });
            });
          }
        }
      }
    }

    return res.json(updated);
  } catch {
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ── My Hosts ────────────────────────────────────────────
app.get("/api/my-hosts", requireAuth, async (req: any, res) => {
  try {
    const memberships = await prisma.hostMember.findMany({
      where: { userId: req.user.userId },
      include: { host: { select: { id: true, name: true, slug: true, logoUrl: true } } },
    });
    return res.json({
      items: memberships.map((m) => ({
        host_id: m.hostId,
        role: m.role,
        host: {
          id: m.host.id,
          name: m.host.name,
          slug: m.host.slug,
          logo_url: m.host.logoUrl,
        },
      })),
    });
  } catch {
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ── Check-in ────────────────────────────────────────────
app.get("/api/events/:eventId/checkin/stats", requireAuth, async (req: any, res) => {
  try {
    const { eventId } = req.params;
    const result = await assertHostMember(req.user.userId, { kind: "event", id: eventId }, ["host", "checker"]);
    if (result.error === 404) return res.status(404).json({ error: "Event not found" });
    if (result.error === 403) return res.status(403).json({ error: "Access denied" });

    const [going, waitlist, checkedIn] = await Promise.all([
      prisma.rSVP.count({ where: { eventId, status: "CONFIRMED" } }),
      prisma.rSVP.count({ where: { eventId, status: "WAITLISTED" } }),
      prisma.checkin.count({ where: { eventId, undone: false } }),
    ]);

    return res.json({ going, waitlist, checked_in: checkedIn });
  } catch {
    return res.status(500).json({ error: "Internal server error" });
  }
});

app.post("/api/events/:eventId/checkin", requireAuth, async (req: any, res) => {
  try {
    const { eventId } = req.params;
    const { code } = req.body;
    const userId = req.user.userId;

    const result = await assertHostMember(userId, { kind: "event", id: eventId }, ["host", "checker"]);
    if (result.error === 404) return res.status(404).json({ error: "Event not found" });
    if (result.error === 403) return res.status(403).json({ error: "Access denied" });

    if (!code || typeof code !== "string") {
      return res.status(400).json({ error: "Ticket code is required" });
    }

    const ticket = await prisma.ticket.findFirst({
      where: { code, rsvp: { eventId } },
      include: { rsvp: { include: { user: true } } },
    });

    if (!ticket) {
      return res.status(404).json({ error: "Ticket not found" });
    }

    if (ticket.rsvp.status !== "CONFIRMED") {
      return res.status(400).json({ error: "RSVP is not confirmed" });
    }

    try {
      const checkin = await prisma.$transaction(async (tx) => {
        const existing = await tx.checkin.findFirst({
          where: { ticketId: ticket.id, undone: false },
        });
        if (existing) {
          throw { status: 409, message: "Already checked in", checked_in_at: existing.checkedInAt.toISOString() };
        }
        return tx.checkin.create({
          data: { ticketId: ticket.id, eventId, checkedInBy: userId },
        });
      });

      return res.json({
        success: true,
        attendee: {
          name: ticket.rsvp.user.name || ticket.rsvp.user.email,
          email: ticket.rsvp.user.email,
        },
        checked_in_at: checkin.checkedInAt.toISOString(),
      });
    } catch (err: any) {
      if (err?.status === 409) {
        return res.status(409).json({ error: err.message, checked_in_at: err.checked_in_at });
      }
      // P2002 = unique constraint (partial index)
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
        return res.status(409).json({ error: "Already checked in" });
      }
      throw err;
    }
  } catch (err: any) {
    if (err?.status) return res.status(err.status).json({ error: err.message });
    return res.status(500).json({ error: "Internal server error" });
  }
});

app.post("/api/events/:eventId/checkin/undo", requireAuth, async (req: any, res) => {
  try {
    const { eventId } = req.params;
    const { code } = req.body;
    const userId = req.user.userId;

    const result = await assertHostMember(userId, { kind: "event", id: eventId }, ["host", "checker"]);
    if (result.error === 404) return res.status(404).json({ error: "Event not found" });
    if (result.error === 403) return res.status(403).json({ error: "Access denied" });

    if (!code || typeof code !== "string") {
      return res.status(400).json({ error: "Ticket code is required" });
    }

    const ticket = await prisma.ticket.findFirst({
      where: { code, rsvp: { eventId } },
    });

    if (!ticket) {
      return res.status(404).json({ error: "Ticket not found" });
    }

    const checkin = await prisma.checkin.findFirst({
      where: { ticketId: ticket.id, undone: false },
    });

    if (!checkin) {
      return res.status(404).json({ error: "No active check-in found" });
    }

    await prisma.checkin.update({
      where: { id: checkin.id },
      data: { undone: true, undoneAt: new Date(), undoneBy: userId },
    });

    return res.json({ success: true });
  } catch {
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ── Notifications ───────────────────────────────────────
app.get("/api/notifications", requireAuth, async (req: any, res) => {
  try {
    const userId = req.user.userId;
    const [notifications, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 50,
      }),
      prisma.notification.count({ where: { userId, read: false } }),
    ]);
    return res.json({
      items: notifications.map(parseNotification),
      unread_count: unreadCount,
    });
  } catch {
    return res.status(500).json({ error: "Internal server error" });
  }
});

app.patch("/api/notifications/:id/read", requireAuth, async (req: any, res) => {
  try {
    const notification = await prisma.notification.findFirst({
      where: { id: req.params.id, userId: req.user.userId },
    });
    if (!notification) {
      return res.status(404).json({ error: "Notification not found" });
    }
    await prisma.notification.update({
      where: { id: notification.id },
      data: { read: true },
    });
    return res.json({ success: true });
  } catch {
    return res.status(500).json({ error: "Internal server error" });
  }
});

app.patch("/api/notifications/read-all", requireAuth, async (req: any, res) => {
  try {
    await prisma.notification.updateMany({
      where: { userId: req.user.userId, read: false },
      data: { read: true },
    });
    return res.json({ success: true });
  } catch {
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ── Feedback ────────────────────────────────────────────
app.post("/api/events/:eventId/feedback", requireAuth, async (req: any, res) => {
  try {
    const { eventId } = req.params;
    const userId = req.user.userId;
    const { rating, comment } = req.body;

    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      return res.status(400).json({ error: "Rating must be an integer 1-5" });
    }
    if (comment !== undefined && comment !== null && typeof comment === "string" && comment.length > 2000) {
      return res.status(400).json({ error: "Comment must be 2000 characters or fewer" });
    }

    const event = await prisma.event.findUnique({ where: { id: eventId } });
    if (!event) return res.status(404).json({ error: "Event not found" });
    if (!isEventPast(event)) return res.status(400).json({ error: "Feedback can only be submitted for past events" });

    const rsvp = await prisma.rSVP.findFirst({ where: { userId, eventId, status: "CONFIRMED" } });
    if (!rsvp) return res.status(403).json({ error: "You must have a confirmed RSVP to submit feedback" });

    try {
      const feedback = await prisma.feedback.create({
        data: { eventId, userId, rating, comment: comment || null },
      });
      return res.status(201).json({
        id: feedback.id,
        rating: feedback.rating,
        comment: feedback.comment,
        created_at: feedback.createdAt.toISOString(),
      });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
        return res.status(409).json({ error: "You have already submitted feedback for this event" });
      }
      throw err;
    }
  } catch {
    return res.status(500).json({ error: "Internal server error" });
  }
});

app.patch("/api/events/:eventId/feedback", requireAuth, async (req: any, res) => {
  try {
    const { eventId } = req.params;
    const userId = req.user.userId;
    const { rating, comment } = req.body;

    if (rating !== undefined && (!Number.isInteger(rating) || rating < 1 || rating > 5)) {
      return res.status(400).json({ error: "Rating must be an integer 1-5" });
    }
    if (comment !== undefined && comment !== null && typeof comment === "string" && comment.length > 2000) {
      return res.status(400).json({ error: "Comment must be 2000 characters or fewer" });
    }

    const feedback = await prisma.feedback.findFirst({ where: { eventId, userId } });
    if (!feedback) return res.status(404).json({ error: "Feedback not found" });

    const hoursSinceCreation = (Date.now() - feedback.createdAt.getTime()) / (1000 * 60 * 60);
    if (hoursSinceCreation >= 24) {
      return res.status(403).json({ error: "Edit window has closed" });
    }

    const updated = await prisma.feedback.update({
      where: { id: feedback.id },
      data: {
        ...(rating !== undefined ? { rating } : {}),
        ...(comment !== undefined ? { comment: comment || null } : {}),
      },
    });

    return res.json({
      id: updated.id,
      rating: updated.rating,
      comment: updated.comment,
      created_at: updated.createdAt.toISOString(),
    });
  } catch {
    return res.status(500).json({ error: "Internal server error" });
  }
});

app.get("/api/events/:eventId/feedback", optionalAuth, async (req: AuthRequest, res) => {
  try {
    const eventId = req.params.eventId as string;
    const userId = req.user?.userId;
    const mine = req.query.mine === "true";

    // Hidden event check
    const event = await prisma.event.findUnique({ where: { id: eventId }, select: { hidden: true, creatorId: true, hostId: true } });
    if (!event) return res.status(404).json({ error: "Event not found" });
    if (event.hidden) {
      const allowed = await canViewHidden(userId ?? null, event);
      if (!allowed) return res.json({ average_rating: 0, count: 0, items: [] });
    }

    if (mine) {
      const userId = req.user?.userId;
      if (!userId) return res.status(401).json({ error: "Unauthorized" });

      const feedback = await prisma.feedback.findFirst({ where: { eventId, userId } });
      return res.json({
        feedback: feedback ? {
          id: feedback.id,
          rating: feedback.rating,
          comment: feedback.comment,
          created_at: feedback.createdAt.toISOString(),
        } : null,
      });
    }

    const feedbacks = await prisma.feedback.findMany({
      where: { eventId },
      orderBy: { createdAt: "desc" },
      take: 200,
    });

    const count = feedbacks.length;
    const average_rating = count > 0
      ? feedbacks.reduce((sum, f) => sum + f.rating, 0) / count
      : 0;

    return res.json({
      average_rating,
      count,
      items: feedbacks.map((f) => ({
        id: f.id,
        rating: f.rating,
        comment: f.comment,
        created_at: f.createdAt.toISOString(),
      })),
    });
  } catch {
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ── Gallery ─────────────────────────────────────────────
app.post("/api/events/:eventId/gallery", requireAuth, async (req: any, res) => {
  try {
    const { eventId } = req.params;
    const userId = req.user.userId;
    const { image_url } = req.body;

    if (!image_url || typeof image_url !== "string") {
      return res.status(400).json({ error: "image_url is required" });
    }

    const event = await prisma.event.findUnique({ where: { id: eventId } });
    if (!event) return res.status(404).json({ error: "Event not found" });

    // Check: confirmed RSVP or host member
    const rsvp = await prisma.rSVP.findFirst({ where: { userId, eventId, status: "CONFIRMED" } });
    const hostMember = event.hostId
      ? await prisma.hostMember.findFirst({ where: { hostId: event.hostId, userId } })
      : null;

    if (!rsvp && !hostMember) {
      return res.status(403).json({ error: "You must have a confirmed RSVP or be a host member" });
    }

    await validateImageUrl(image_url);

    const photoCount = await prisma.galleryPhoto.count({ where: { eventId, uploadedBy: userId } });
    if (photoCount >= 10) {
      return res.status(429).json({ error: "You have reached the maximum of 10 photos for this event" });
    }

    const photo = await prisma.galleryPhoto.create({
      data: { eventId, imageUrl: image_url, uploadedBy: userId },
    });

    return res.status(201).json({
      id: photo.id,
      image_url: photo.imageUrl,
      uploaded_by: photo.uploadedBy,
      approved: photo.approved,
      pending_approval: photo.pendingApproval,
      hidden: photo.hidden,
      created_at: photo.createdAt.toISOString(),
    });
  } catch (err: any) {
    if (err?.status === 400) return res.status(400).json({ error: err.message });
    return res.status(500).json({ error: "Internal server error" });
  }
});

app.get("/api/events/:eventId/gallery", optionalAuth, async (req: AuthRequest, res) => {
  try {
    const eventId = req.params.eventId as string;
    const userId = req.user?.userId as string | undefined;

    const event = await prisma.event.findUnique({ where: { id: eventId }, select: { hostId: true, hidden: true, creatorId: true } });
    if (!event) return res.status(404).json({ error: "Event not found" });

    let isHostMember = false;
    if (userId && event.hostId) {
      const member = await prisma.hostMember.findFirst({
        where: { hostId: event.hostId, userId, role: "host" },
      });
      isHostMember = !!member;
    }

    // If event is hidden and user is not authorized → empty
    if (event.hidden && !isHostMember) {
      const allowed = await canViewHidden(userId ?? null, event);
      if (!allowed) return res.json({ items: [] });
    }

    const where: any = { eventId };
    if (!isHostMember) {
      where.approved = true;
      where.hidden = false;
    }

    const photos = await prisma.galleryPhoto.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });

    return res.json({
      items: photos.map((p) => ({
        id: p.id,
        image_url: p.imageUrl,
        uploaded_by: p.uploadedBy,
        approved: p.approved,
        pending_approval: p.pendingApproval,
        hidden: p.hidden,
        created_at: p.createdAt.toISOString(),
      })),
    });
  } catch {
    return res.status(500).json({ error: "Internal server error" });
  }
});

app.patch("/api/gallery/:photoId/approve", requireAuth, async (req: any, res) => {
  try {
    const photo = await prisma.galleryPhoto.findUnique({ where: { id: req.params.photoId } });
    if (!photo) return res.status(404).json({ error: "Photo not found" });

    const event = await prisma.event.findUnique({ where: { id: photo.eventId }, select: { hostId: true } });
    if (!event?.hostId) return res.status(403).json({ error: "Access denied" });

    const member = await prisma.hostMember.findFirst({
      where: { hostId: event.hostId, userId: req.user.userId, role: "host" },
    });
    if (!member) return res.status(403).json({ error: "Access denied" });

    await prisma.galleryPhoto.update({
      where: { id: photo.id },
      data: { approved: true, pendingApproval: false, approvedBy: req.user.userId, approvedAt: new Date() },
    });

    return res.json({ success: true });
  } catch {
    return res.status(500).json({ error: "Internal server error" });
  }
});

app.delete("/api/gallery/:photoId", requireAuth, async (req: any, res) => {
  try {
    const photo = await prisma.galleryPhoto.findUnique({ where: { id: req.params.photoId } });
    if (!photo) return res.status(404).json({ error: "Photo not found" });

    const isUploader = photo.uploadedBy === req.user.userId;
    let isHostMember = false;
    if (!isUploader) {
      const event = await prisma.event.findUnique({ where: { id: photo.eventId }, select: { hostId: true } });
      if (event?.hostId) {
        const member = await prisma.hostMember.findFirst({
          where: { hostId: event.hostId, userId: req.user.userId },
        });
        isHostMember = !!member;
      }
    }

    if (!isUploader && !isHostMember) {
      return res.status(403).json({ error: "Access denied" });
    }

    await prisma.galleryPhoto.delete({ where: { id: photo.id } });
    return res.status(204).send();
  } catch {
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ── Serve frontend in production ────────────────────────
if (process.env.NODE_ENV === "production") {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const distPath = path.join(__dirname, "..", "dist");
  app.use(express.static(distPath));
  app.get("*", (_req: Request, res: Response) => {
    res.sendFile(path.join(distPath, "index.html"));
  });
}

// ── Global error handler ─────────────────────────────────
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err);
  res.status(err.status || 500).json({ error: "Internal Server Error" });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
