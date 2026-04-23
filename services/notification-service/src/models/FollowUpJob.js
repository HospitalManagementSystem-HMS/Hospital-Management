const mongoose = require("mongoose");

const followUpJobSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, index: true },
    appointmentId: { type: String, required: true, index: true },
    kind: { type: String, enum: ["FOLLOW_UP"], required: true, default: "FOLLOW_UP" },
    dueAt: { type: Date, required: true, index: true },
    done: { type: Boolean, default: false, index: true }
  },
  { timestamps: true }
);

followUpJobSchema.index({ userId: 1, appointmentId: 1, kind: 1 }, { unique: true });

const FollowUpJob = mongoose.model("FollowUpJob", followUpJobSchema);

module.exports = { FollowUpJob };

