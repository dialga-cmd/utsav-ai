import {
  addCalendarDays,
  differenceInCalendarDays,
  formatCalendarDate,
  parseCalendarDate,
  startOfUtcDay,
} from "@/lib/engine/date";
import type { EventBrief } from "@/types/event";
import type {
  TaskUrgency,
  TimelineBuildResult,
  TimelinePlan,
  TimelineTask,
} from "@/types/plan";

interface TimelineTemplate {
  id: string;
  title: string;
  description: string;
  phase: string;
  leadDays: number;
}

const WEDDING_TASKS: readonly TimelineTemplate[] = [
  {
    id: "wedding-venue",
    title: "Book venue and tent house",
    description:
      "Lock the dates, capacity, parking, power backup and cancellation terms.",
    phase: "Foundation",
    leadDays: 270,
  },
  {
    id: "wedding-photographer",
    title: "Book photographer and videographer",
    description: "Agree coverage hours, deliverables and final album dates.",
    phase: "Foundation",
    leadDays: 180,
  },
  {
    id: "wedding-pandit",
    title: "Confirm pandit and puja samagri",
    description: "Share family customs and muhurat preferences; agree the rituals list.",
    phase: "Rituals",
    leadDays: 120,
  },
  {
    id: "wedding-caterer",
    title: "Shortlist caterer and do a tasting",
    description: "Confirm per-plate rate, veg/non-veg counters, staff and water.",
    phase: "Food",
    leadDays: 120,
  },
  {
    id: "wedding-attire",
    title: "Order wedding attire and fittings",
    description:
      "Keep alteration time for outfits, jewellery hire and family accessories.",
    phase: "Looks",
    leadDays: 105,
  },
  {
    id: "wedding-haldi",
    title: "Plan haldi ceremony",
    description: "Choose a daytime space, marigold decor, seating and simple snacks.",
    phase: "Ceremonies",
    leadDays: 90,
  },
  {
    id: "wedding-invites",
    title: "Send save-the-dates and invitations",
    description: "Finalise the guest count estimate, digital invites and printed cards.",
    phase: "Communication",
    leadDays: 75,
  },
  {
    id: "wedding-mehendi",
    title: "Book mehendi artist and plan mehendi",
    description: "Confirm artist capacity, shade preferences, seating and music.",
    phase: "Ceremonies",
    leadDays: 60,
  },
  {
    id: "wedding-decor",
    title: "Finalise decor and mandap design",
    description: "Approve the mood board, flower plan, entry, stage and removal timing.",
    phase: "Looks",
    leadDays: 60,
  },
  {
    id: "wedding-sangeet",
    title: "Lock sangeet performances and sound",
    description: "Build a run sheet, rehearsal slots, playlist and microphone plan.",
    phase: "Ceremonies",
    leadDays: 45,
  },
  {
    id: "wedding-music",
    title: "Confirm band, DJ and sound permits",
    description: "Check local sound limits, power load and the vendor's backup plan.",
    phase: "Entertainment",
    leadDays: 45,
  },
  {
    id: "wedding-pheras",
    title: "Finalise pheras and reception run sheet",
    description: "Share timings with the pandit, family leads and venue coordinator.",
    phase: "Ceremonies",
    leadDays: 30,
  },
  {
    id: "wedding-transport",
    title: "Arrange family and guest transport",
    description:
      "Confirm pickup points, drivers, waiting time and a night backup contact.",
    phase: "Logistics",
    leadDays: 21,
  },
  {
    id: "wedding-headcount",
    title: "Give final headcount to caterer",
    description: "Reconcile RSVPs, vendor meals and children's plates before the cutoff.",
    phase: "Food",
    leadDays: 10,
  },
  {
    id: "wedding-payments",
    title: "Release final vendor payments",
    description: "Keep signed quotes, receipts and a small cash contingency on hand.",
    phase: "Logistics",
    leadDays: 5,
  },
  {
    id: "wedding-reception",
    title: "Reception day-before checklist",
    description:
      "Confirm stage, seating, photo list, speeches, food service and return gifts.",
    phase: "Ceremonies",
    leadDays: 1,
  },
];

const BIRTHDAY_TASKS: readonly TimelineTemplate[] = [
  {
    id: "birthday-venue",
    title: "Book venue or plan the home setup",
    description: "Confirm capacity, timing limits, parking, power and cleanup rules.",
    phase: "Foundation",
    leadDays: 45,
  },
  {
    id: "birthday-theme",
    title: "Choose theme and guest list",
    description: "Match the theme to the child's age, space and number of children.",
    phase: "Planning",
    leadDays: 35,
  },
  {
    id: "birthday-invites",
    title: "Send invitations",
    description: "Include age, timing, food, parking and RSVP details for parents.",
    phase: "Communication",
    leadDays: 21,
  },
  {
    id: "birthday-entertainer",
    title: "Book entertainer or activity host",
    description:
      "Confirm age-appropriate content, duration, space and background checks.",
    phase: "Activities",
    leadDays: 21,
  },
  {
    id: "birthday-decor",
    title: "Confirm cake and decor",
    description: "Approve eggless options, delivery timing, backdrop and cleanup.",
    phase: "Looks",
    leadDays: 14,
  },
  {
    id: "birthday-caterer",
    title: "Finalise food and drinks",
    description: "Plan child-friendly portions, allergies, water and serving staff.",
    phase: "Food",
    leadDays: 14,
  },
  {
    id: "birthday-gifts",
    title: "Pack return gifts and game prizes",
    description: "Check age suitability, choking hazards and an extra handful of gifts.",
    phase: "Activities",
    leadDays: 10,
  },
  {
    id: "birthday-headcount",
    title: "Confirm final headcount",
    description: "Reconcile RSVPs with cake portions, seating, plates and gifts.",
    phase: "Food",
    leadDays: 5,
  },
  {
    id: "birthday-setup",
    title: "Day-before setup and safety check",
    description: "Clear trip hazards, charge cameras, pack first aid and label food.",
    phase: "Logistics",
    leadDays: 1,
  },
];

const COMMUNITY_TASKS: readonly TimelineTemplate[] = [
  {
    id: "community-committee",
    title: "Form a small organising committee",
    description: "Name leads for permissions, money, volunteers, safety and programme.",
    phase: "Foundation",
    leadDays: 60,
  },
  {
    id: "community-permissions",
    title: "Apply for permissions",
    description: "Submit society, school or municipal requests and keep copies on site.",
    phase: "Approvals",
    leadDays: 45,
  },
  {
    id: "community-venue",
    title: "Confirm venue and access",
    description: "Check power, water, toilets, parking, accessibility and cleanup duty.",
    phase: "Foundation",
    leadDays: 30,
  },
  {
    id: "community-volunteers",
    title: "Open volunteer sign-up",
    description: "Assign two people per station and publish a simple WhatsApp group.",
    phase: "People",
    leadDays: 30,
  },
  {
    id: "community-safety",
    title: "Write the safety and crowd plan",
    description: "Mark exits, first aid, fire points, lost-child desk and a safety lead.",
    phase: "Safety",
    leadDays: 21,
  },
  {
    id: "community-promotion",
    title: "Start local promotion",
    description: "Share posters and notices with a clear date, time, entry and contact.",
    phase: "Communication",
    leadDays: 21,
  },
  {
    id: "community-sound",
    title: "Book sound, power and lighting",
    description: "Confirm load, backup, sound limits, operators and weather protection.",
    phase: "Logistics",
    leadDays: 14,
  },
  {
    id: "community-food",
    title: "Finalise food, water and waste",
    description:
      "Plan serving lines, allergies, drinking water and segregated waste bins.",
    phase: "Food",
    leadDays: 14,
  },
  {
    id: "community-programme",
    title: "Lock the programme run sheet",
    description: "Time every performance, game and speech; share it with all leads.",
    phase: "Programme",
    leadDays: 10,
  },
  {
    id: "community-decor",
    title: "Prepare reusable decor and signage",
    description: "Label directions, stage, help desk and first aid clearly.",
    phase: "Looks",
    leadDays: 7,
  },
  {
    id: "community-setup",
    title: "Setup, briefing and safety walkthrough",
    description:
      "Walk the site with volunteers, test sound and confirm emergency contacts.",
    phase: "Safety",
    leadDays: 1,
  },
];

const TASKS_BY_EVENT = {
  wedding: WEDDING_TASKS,
  birthday: BIRTHDAY_TASKS,
  community: COMMUNITY_TASKS,
} satisfies Record<EventBrief["eventType"], readonly TimelineTemplate[]>;

const URGENT_COMPRESSION_RATIO = 0.8;
const TIGHT_COMPRESSION_RATIO = 0.25;
const URGENT_WINDOW_DAYS = 2;
const TIGHT_WINDOW_DAYS = 7;

function urgencyFor(
  dueOffset: number,
  compressionRatio: number,
  daysUntil: number,
): TaskUrgency {
  if (daysUntil <= URGENT_WINDOW_DAYS) return "urgent";
  if (compressionRatio >= URGENT_COMPRESSION_RATIO) return "urgent";
  if (dueOffset <= URGENT_WINDOW_DAYS) return "urgent";
  if (compressionRatio >= TIGHT_COMPRESSION_RATIO || dueOffset <= TIGHT_WINDOW_DAYS) {
    return "tight";
  }
  return "on_track";
}

/**
 * Build a backward-planned schedule in whole calendar days. When the event is
 * sooner than the longest lead time, long-lead tasks are pulled into the
 * remaining window and marked tight or urgent.
 */
export function buildTimeline(
  brief: EventBrief,
  options: { now?: Date } = {},
): TimelineBuildResult {
  const eventDate = parseCalendarDate(brief.eventDate);
  if (!eventDate) {
    return {
      ok: false,
      code: "INVALID_DATE",
      error: "Choose a valid event date in YYYY-MM-DD format.",
    };
  }

  const today = startOfUtcDay(options.now ?? new Date());
  const daysUntil = differenceInCalendarDays(today, eventDate);

  if (daysUntil < 0) {
    return {
      ok: false,
      code: "PAST_DATE",
      error: "The event date is in the past. Choose today or a future date.",
    };
  }

  const templates = TASKS_BY_EVENT[brief.eventType];
  const maxLeadDays = Math.max(...templates.map((task) => task.leadDays));
  const compressed = daysUntil < maxLeadDays;

  const tasks: TimelineTask[] = templates.map((template) => {
    const taskNeedsCompression = template.leadDays > daysUntil;
    const dueOffset = taskNeedsCompression
      ? Math.max(0, daysUntil - Math.floor((daysUntil * template.leadDays) / maxLeadDays))
      : daysUntil - template.leadDays;

    const compressionRatio =
      template.leadDays > 0 ? Math.max(0, 1 - daysUntil / template.leadDays) : 0;

    return {
      id: template.id,
      title: template.title,
      description: template.description,
      phase: template.phase,
      leadDays: template.leadDays,
      dueDate: formatCalendarDate(addCalendarDays(today, dueOffset)),
      urgency: urgencyFor(dueOffset, compressionRatio, daysUntil),
      compressed: taskNeedsCompression,
      done: false,
    };
  });

  tasks.sort(
    (a, b) =>
      a.dueDate.localeCompare(b.dueDate) ||
      b.leadDays - a.leadDays ||
      a.title.localeCompare(b.title),
  );

  const plan: TimelinePlan = {
    eventDate: brief.eventDate,
    daysUntil,
    compressed,
    tasks,
  };

  return { ok: true, plan };
}
