const mongoose = require("mongoose");

const doctorSchema = new mongoose.Schema(
  {
    authUserId: { type: String, required: true, unique: true, index: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    name: { type: String, required: true },
    specialization: { type: String, required: true },
    experienceYears: { type: Number, default: 0 },
    availabilitySlots: { type: [String], default: [] }
  },
  { timestamps: true }
);

const Doctor = mongoose.model("Doctor", doctorSchema);

module.exports = { Doctor };

