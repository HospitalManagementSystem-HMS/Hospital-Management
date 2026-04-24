const cron = require("node-cron");
const env = require("../config/env");
const { todayKeyInTimeZone } = require("../utils/dateKey");
const { ReminderJob } = require("../models/ReminderJob");
const { FollowUpJob } = require("../models/FollowUpJob");
const { Notification } = require("../models/Notification");

const SLOT_LABEL = {
  MORNING: "Morning (08:30)",
  NOON: "Noon (12:30)",
  NIGHT: "Night (19:30)"
};

function formatMedicineMessage(medicines, slot) {
  const label = SLOT_LABEL[slot] || slot;
  return `${label}: ${medicines.map((m) => `${m.name} — ${m.instructions}`).join("; ")}`;
}

async function fireMedicineSlot(slot) {
  const tz = env.MED_REMINDER_TZ;
  const today = todayKeyInTimeZone(tz);
  const dateField = slot === "MORNING" ? "morningNotifiedDate" : slot === "NOON" ? "noonNotifiedDate" : "nightNotifiedDate";

  const jobs = await ReminderJob.find({ active: true }).limit(500);

  for (const job of jobs) {
    if (job[dateField] === today) continue;

    const toRemind = (job.medicines || []).filter((m) => Array.isArray(m.schedule) && m.schedule.includes(slot));
    if (toRemind.length === 0) continue;

    await Notification.create({
      userId: job.userId,
      type: "MEDICINE_REMINDER",
      message: formatMedicineMessage(toRemind, slot),
      readStatus: false
    });

    job[dateField] = today;
    await job.save();
  }
}

async function runFollowUpTick() {
  const now = new Date();
  const dueFollow = await FollowUpJob.find({ done: false, dueAt: { $lte: now } })
    .sort({ dueAt: 1 })
    .limit(20);

  for (const job of dueFollow) {
    await Notification.create({
      userId: job.userId,
      type: "FOLLOW_UP_REMINDER",
      message: `Follow-up reminder due now (${job.dueAt.toISOString()}).`,
      readStatus: false
    });
    job.done = true;
    await job.save();
  }
}

function startScheduler() {
  const tz = env.MED_REMINDER_TZ;

  cron.schedule(
    "30 8 * * *",
    () => {
      fireMedicineSlot("MORNING").catch((err) => console.error("[scheduler] morning failed", err));
    },
    { timezone: tz }
  );

  cron.schedule(
    "30 12 * * *",
    () => {
      fireMedicineSlot("NOON").catch((err) => console.error("[scheduler] noon failed", err));
    },
    { timezone: tz }
  );

  cron.schedule(
    "30 19 * * *",
    () => {
      fireMedicineSlot("NIGHT").catch((err) => console.error("[scheduler] night failed", err));
    },
    { timezone: tz }
  );

  const followMs = env.FOLLOW_UP_POLL_SECONDS * 1000;
  setInterval(() => {
    runFollowUpTick().catch((err) => console.error("[scheduler] follow-up tick failed", err));
  }, followMs);

  // eslint-disable-next-line no-console
  console.log(`[scheduler] medicine reminders at 08:30, 12:30, 19:30 (${tz}); follow-up poll every ${env.FOLLOW_UP_POLL_SECONDS}s`);
}

module.exports = { startScheduler };
