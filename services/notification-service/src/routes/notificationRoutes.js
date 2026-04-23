const express = require("express");
const { z } = require("zod");
const { Notification } = require("../models/Notification");
const { requireAuth } = require("../middleware/requireAuth");

const router = express.Router();

router.get("/notifications", requireAuth, async (req, res, next) => {
  try {
    const notifications = await Notification.find({ userId: req.user.id }).sort({ createdAt: -1 }).limit(200);
    res.json({ notifications });
  } catch (err) {
    next(err);
  }
});

const readSchema = z.object({ read: z.boolean().optional().default(true) });

router.post("/notifications/:id/read", requireAuth, async (req, res, next) => {
  try {
    const { read } = readSchema.parse(req.body || {});
    const n = await Notification.findById(req.params.id);
    if (!n) return res.status(404).json({ error: "NOT_FOUND" });
    if (n.userId !== req.user.id) return res.status(403).json({ error: "FORBIDDEN" });
    n.readStatus = read;
    await n.save();
    res.json({ notification: n });
  } catch (err) {
    next(err);
  }
});

module.exports = { notificationRoutes: router };

