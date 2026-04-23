const mongoose = require("mongoose");

const medicineSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    instructions: { type: String, required: true }
  },
  { _id: false }
);

const reminderJobSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, index: true },
    appointmentId: { type: String, required: true, index: true },
    kind: { type: String, enum: ["MEDICINE"], required: true, default: "MEDICINE" },
    medicines: { type: [medicineSchema], default: [] },
    intervalSeconds: { type: Number, required: true },
    nextRunAt: { type: Date, required: true, index: true },
    active: { type: Boolean, default: true, index: true }
  },
  { timestamps: true }
);

reminderJobSchema.index({ userId: 1, appointmentId: 1, kind: 1 }, { unique: true });

const ReminderJob = mongoose.model("ReminderJob", reminderJobSchema);

module.exports = { ReminderJob };

