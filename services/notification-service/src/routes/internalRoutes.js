const express = require("express");
const { z } = require("zod");
const env = require("../config/env");
const { requireInternal } = require("../middleware/internalAuth");
const { Notification } = require("../models/Notification");
const { ReminderJob } = require("../models/ReminderJob");
const { FollowUpJob } = require("../models/FollowUpJob");
const { ActivityLog } = require("../models/ActivityLog");

const router = express.Router();
router.use(requireInternal);

const notifySchema = z.object({
  userId: z.string().min(1),
  type: z.string().min(1),
  message: z.string().min(1)
});

router.post("/notify", async (req, res, next) => {
  try {
    const { userId, type, message } = notifySchema.parse(req.body);
    const notification = await Notification.create({ userId, type, message, readStatus: false });
    res.status(201).json({ notification });
  } catch (err) {
    next(err);
  }
});

const medicinesSchema = z.object({
  userId: z.string().min(1),
  appointmentId: z.string().min(1),
  medicines: z
    .array(
      z.object({
        name: z.string().min(1),
        instructions: z.string().min(1)
      })
    )
    .min(1)
});

router.post("/reminders/medicine", async (req, res, next) => {
  try {
    const { userId, appointmentId, medicines } = medicinesSchema.parse(req.body);
    const intervalSeconds = env.MED_REMINDER_INTERVAL_SECONDS;
    const nextRunAt = new Date(Date.now() + intervalSeconds * 1000);

    const job = await ReminderJob.findOneAndUpdate(
      { userId, appointmentId, kind: "MEDICINE" },
      { userId, appointmentId, kind: "MEDICINE", medicines, intervalSeconds, nextRunAt, active: true },
      { upsert: true, new: true }
    );
    res.json({ job });
  } catch (err) {
    next(err);
  }
});

const followSchema = z.object({
  userId: z.string().min(1),
  appointmentId: z.string().min(1),
  dueAt: z.string().datetime()
});

router.post("/reminders/followup", async (req, res, next) => {
  try {
    const { userId, appointmentId, dueAt } = followSchema.parse(req.body);
    const job = await FollowUpJob.findOneAndUpdate(
      { userId, appointmentId, kind: "FOLLOW_UP" },
      { userId, appointmentId, kind: "FOLLOW_UP", dueAt: new Date(dueAt), done: false },
      { upsert: true, new: true }
    );
    res.json({ job });
  } catch (err) {
    next(err);
  }
});

const activitySchema = z.object({
  actorUserId: z.string().min(1).optional(),
  action: z.string().min(1),
  details: z.any().optional()
});

router.post("/activity", async (req, res, next) => {
  try {
    const { actorUserId, action, details } = activitySchema.parse(req.body);
    const activity = await ActivityLog.create({ actorUserId, action, details: details || {} });
    res.status(201).json({ activity });
  } catch (err) {
    next(err);
  }
});

module.exports = { internalRoutes: router };

