import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

const SALT_ROUNDS = 10;

// Static IDs for idempotent seeding
const USER_HOST_ID = "seed_user_host_1";
const USER_ATTENDEE_ID = "seed_user_attendee_1";
const HOST_ID = "seed_host_1";
const HOST_MEMBER_ID = "seed_host_member_1";
const EVENT_UPCOMING_ID = "seed_event_upcoming_1";
const EVENT_PAST_ID = "seed_event_past_1";
const EVENT_DRAFT_ID = "seed_event_draft_1";
const RSVP_ID = "seed_rsvp_1";
const TICKET_ID = "seed_ticket_1";
const CHECKIN_ID = "seed_checkin_1";
const FEEDBACK_ID = "seed_feedback_1";
const NOTIFICATION_ID = "seed_notification_1";

async function main() {
  console.log("🌱 Seeding database...");

  const hostPassword = await bcrypt.hash("host123456", SALT_ROUNDS);
  const attendeePassword = await bcrypt.hash("attendee123456", SALT_ROUNDS);

  // Users
  const hostUser = await prisma.user.upsert({
    where: { id: USER_HOST_ID },
    create: { id: USER_HOST_ID, email: "host@example.com", password: hostPassword, name: "Demo Host" },
    update: {},
  });

  const attendeeUser = await prisma.user.upsert({
    where: { id: USER_ATTENDEE_ID },
    create: { id: USER_ATTENDEE_ID, email: "attendee@example.com", password: attendeePassword, name: "Demo Attendee" },
    update: {},
  });

  // Host
  await prisma.host.upsert({
    where: { id: HOST_ID },
    create: {
      id: HOST_ID,
      ownerId: hostUser.id,
      name: "Demo Community",
      slug: "demo-community",
      bio: "A demo community for testing events.",
      contactEmail: "host@example.com",
    },
    update: {},
  });

  // Host Member
  await prisma.hostMember.upsert({
    where: { id: HOST_MEMBER_ID },
    create: { id: HOST_MEMBER_ID, hostId: HOST_ID, userId: hostUser.id, role: "host" },
    update: {},
  });

  // Events
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(18, 0, 0, 0);

  const lastWeek = new Date();
  lastWeek.setDate(lastWeek.getDate() - 7);
  lastWeek.setHours(18, 0, 0, 0);

  const lastWeekEnd = new Date(lastWeek);
  lastWeekEnd.setHours(21, 0, 0, 0);

  await prisma.event.upsert({
    where: { id: EVENT_UPCOMING_ID },
    create: {
      id: EVENT_UPCOMING_ID,
      title: "Community Meetup",
      description: "Join us for networking and talks about web development.",
      date: tomorrow,
      timezone: "America/New_York",
      capacity: 50,
      venueAddress: "123 Main St, New York, NY",
      status: "published",
      visibility: "public",
      creatorId: hostUser.id,
      hostId: HOST_ID,
    },
    update: {},
  });

  await prisma.event.upsert({
    where: { id: EVENT_PAST_ID },
    create: {
      id: EVENT_PAST_ID,
      title: "Past Workshop",
      description: "A workshop that already happened.",
      date: lastWeek,
      endDate: lastWeekEnd,
      timezone: "America/New_York",
      capacity: 30,
      venueAddress: "456 Oak Ave, Brooklyn, NY",
      status: "published",
      visibility: "public",
      creatorId: hostUser.id,
      hostId: HOST_ID,
    },
    update: {},
  });

  await prisma.event.upsert({
    where: { id: EVENT_DRAFT_ID },
    create: {
      id: EVENT_DRAFT_ID,
      title: "Draft Event",
      description: "This event is not yet published.",
      date: tomorrow,
      timezone: "UTC",
      status: "draft",
      visibility: "public",
      creatorId: hostUser.id,
      hostId: HOST_ID,
    },
    update: {},
  });

  // RSVP + Ticket for past event
  await prisma.rSVP.upsert({
    where: { id: RSVP_ID },
    create: {
      id: RSVP_ID,
      userId: attendeeUser.id,
      eventId: EVENT_PAST_ID,
      status: "CONFIRMED",
    },
    update: {},
  });

  await prisma.ticket.upsert({
    where: { id: TICKET_ID },
    create: { id: TICKET_ID, rsvpId: RSVP_ID, code: "SEED-TICKET-001" },
    update: {},
  });

  // Check-in
  await prisma.checkin.upsert({
    where: { id: CHECKIN_ID },
    create: {
      id: CHECKIN_ID,
      ticketId: TICKET_ID,
      eventId: EVENT_PAST_ID,
      checkedInBy: hostUser.id,
    },
    update: {},
  });

  // Feedback
  await prisma.feedback.upsert({
    where: { id: FEEDBACK_ID },
    create: {
      id: FEEDBACK_ID,
      eventId: EVENT_PAST_ID,
      userId: attendeeUser.id,
      rating: 4,
      comment: "Great workshop, learned a lot!",
    },
    update: {},
  });

  // Notification
  await prisma.notification.upsert({
    where: { id: NOTIFICATION_ID },
    create: {
      id: NOTIFICATION_ID,
      userId: attendeeUser.id,
      type: "waitlist_promoted",
      payload: JSON.stringify({ eventId: EVENT_PAST_ID, eventTitle: "Past Workshop" }),
    },
    update: {},
  });

  console.log("✅ Seeding complete!");
  console.log("   Host user: host@example.com / host123456");
  console.log("   Attendee:  attendee@example.com / attendee123456");
}

main()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
