const express = require("express");
const { ActivityLog } = require("../models/ActivityLog");
const { requireAuth, requireRole } = require("../middleware/requireAuth");

const router = express.Router();

router.get("/activities", requireAuth, requireRole("ADMIN"), async (_req, res, next) => {
  try {
    const activities = await ActivityLog.find().sort({ createdAt: -1 }).limit(200);
    res.json({ activities });
  } catch (err) {
    next(err);
  }
});

module.exports = { activityRoutes: router };

