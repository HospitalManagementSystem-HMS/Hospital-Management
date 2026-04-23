const mongoose = require("mongoose");

const activityLogSchema = new mongoose.Schema(
  {
    actorUserId: { type: String, required: false },
    action: { type: String, required: true, index: true },
    details: { type: Object, default: {} }
  },
  { timestamps: true }
);

activityLogSchema.index({ createdAt: -1 });

const ActivityLog = mongoose.model("ActivityLog", activityLogSchema);

module.exports = { ActivityLog };

