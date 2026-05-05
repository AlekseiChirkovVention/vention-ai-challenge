import { prisma } from "./prisma";

// ── canViewHidden ────────────────────────────────────────
// Single-entity only. NEVER use in loops or list endpoints.

export async function canViewHidden(
  userId: string | null,
  event: { creatorId: string; hostId: string | null }
): Promise<boolean> {
  if (!userId) return false;
  if (userId === event.creatorId) return true;
  if (!event.hostId) return false;
  const member = await prisma.hostMember.findFirst({
    where: { hostId: event.hostId, userId },
  });
  return !!member;
}

// ── Types ────────────────────────────────────────────────

type HostRef =
  | { kind: "event"; id: string }
  | { kind: "host"; id: string };

interface HostMemberResult {
  error: 404 | 403 | null;
  hostId?: string;
  member?: { id: string; role: string; userId: string };
}

// ── assertHostMember ─────────────────────────────────────

export async function assertHostMember(
  userId: string,
  ref: HostRef,
  allowedRoles: string[]
): Promise<HostMemberResult> {
  let hostId: string | null = null;

  if (ref.kind === "host") {
    hostId = ref.id;
    const host = await prisma.host.findUnique({ where: { id: hostId } });
    if (!host) return { error: 404 };
  } else {
    const event = await prisma.event.findUnique({
      where: { id: ref.id },
      select: { hostId: true },
    });
    if (!event) return { error: 404 };
    if (!event.hostId) return { error: 403 };
    hostId = event.hostId;
  }

  const member = await prisma.hostMember.findFirst({
    where: { hostId, userId, role: { in: allowedRoles } },
  });

  if (!member) return { error: 403 };

  return {
    error: null,
    hostId,
    member: { id: member.id, role: member.role, userId: member.userId! },
  };
}

// ── isEventPast ──────────────────────────────────────────

export function isEventPast(event: { date: Date; endDate?: Date | null }): boolean {
  const effectiveEnd = event.endDate ?? event.date;
  return effectiveEnd.getTime() < Date.now();
}

// ── escapeCsvCell ────────────────────────────────────────

export function escapeCsvCell(value: string): string {
  if (!value) return "";
  const dangerous = /^[=+\-@\t\r]/;
  let cell = value;
  if (dangerous.test(cell)) {
    cell = "'" + cell;
  }
  if (cell.includes(",") || cell.includes('"') || cell.includes("\n")) {
    cell = '"' + cell.replace(/"/g, '""') + '"';
  }
  return cell;
}

// ── slugifyTitle ─────────────────────────────────────────

export function slugifyTitle(title: string, fallbackId: string): string {
  const slug = title
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return slug || `event-${fallbackId.slice(0, 8)}`;
}

// ── parseNotification ────────────────────────────────────

export function parseNotification(n: {
  id: string;
  userId: string;
  type: string;
  payload: string;
  read: boolean;
  createdAt: Date;
}) {
  let parsed: Record<string, unknown> = {};
  try {
    parsed = JSON.parse(n.payload);
  } catch {
    /* ignore bad JSON */
  }
  return {
    id: n.id,
    type: n.type,
    read: n.read,
    created_at: n.createdAt.toISOString(),
    ...parsed,
  };
}

// ── validateImageUrl ─────────────────────────────────────

const IMAGE_HOST_WHITELIST = [
  "imgur.com",
  "i.imgur.com",
  "cloudinary.com",
  "res.cloudinary.com",
  "unsplash.com",
  "images.unsplash.com",
  "githubusercontent.com",
  "raw.githubusercontent.com",
];

export async function validateImageUrl(url: string): Promise<void> {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw { status: 400, message: "Invalid image URL" };
  }

  if (url.length > 2048) {
    throw { status: 400, message: "Invalid image URL" };
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw { status: 400, message: "Invalid image URL" };
  }

  const hostname = parsed.hostname.toLowerCase();
  const allowed = IMAGE_HOST_WHITELIST.some(
    (wl) => hostname === wl || hostname.endsWith("." + wl)
  );
  if (!allowed) {
    throw { status: 400, message: "Invalid image URL" };
  }

  try {
    const res = await fetch(url, {
      method: "HEAD",
      redirect: "manual",
      signal: AbortSignal.timeout(5000),
    });
    if (res.status >= 300) {
      throw { status: 400, message: "Invalid image URL" };
    }
    const ct = res.headers.get("content-type") || "";
    if (!ct.startsWith("image/")) {
      throw { status: 400, message: "Invalid image URL" };
    }
  } catch (err: any) {
    if (err?.status === 400) throw err;
    throw { status: 400, message: "Invalid image URL" };
  }
}

// ── mapKeysToSnake / mapKeysToCamel ──────────────────────

function toSnakeCase(str: string): string {
  return str.replace(/[A-Z]/g, (c) => "_" + c.toLowerCase());
}

function toCamelCase(str: string): string {
  return str.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
}

export function mapKeysToSnake(obj: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const key of Object.keys(obj)) {
    result[toSnakeCase(key)] = obj[key];
  }
  return result;
}

export function mapKeysToCamel(obj: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const key of Object.keys(obj)) {
    result[toCamelCase(key)] = obj[key];
  }
  return result;
}

// ── requireOwnHostMembership ─────────────────────────────

export async function requireOwnHostMembership(
  userId: string,
  hostId: string
): Promise<boolean> {
  const member = await prisma.hostMember.findFirst({
    where: { hostId, userId },
  });
  return !!member;
}
