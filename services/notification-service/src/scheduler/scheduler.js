const env = require("../config/env");
const { ReminderJob } = require("../models/ReminderJob");
const { FollowUpJob } = require("../models/FollowUpJob");
const { Notification } = require("../models/Notification");

function formatMedicineMessage(medicines) {
  return `Medicine reminder: ${medicines.map((m) => `${m.name} (${m.instructions})`).join(", ")}`;
}

async function runTick() {
  const now = new Date();

  const dueMedicine = await ReminderJob.find({ active: true, nextRunAt: { $lte: now } })
    .sort({ nextRunAt: 1 })
    .limit(20);

  for (const job of dueMedicine) {
    await Notification.create({
      userId: job.userId,
      type: "MEDICINE_REMINDER",
      message: formatMedicineMessage(job.medicines),
      readStatus: false
    });
    job.nextRunAt = new Date(Date.now() + job.intervalSeconds * 1000);
    await job.save();
  }

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
  const ms = env.SCHEDULER_TICK_SECONDS * 1000;
  setInterval(() => {
    runTick().catch((err) => {
      // eslint-disable-next-line no-console
      console.error("[scheduler] tick failed", err);
    });
  }, ms);
}

module.exports = { startScheduler };

