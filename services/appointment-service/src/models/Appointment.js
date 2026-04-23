const mongoose = require("mongoose");

const APPOINTMENT_STATUSES = ["PENDING", "ACCEPTED", "REJECTED", "COMPLETED"];

const medicineSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    instructions: { type: String, required: true }
  },
  { _id: false }
);

const prescriptionSchema = new mongoose.Schema(
  {
    medicines: { type: [medicineSchema], default: [] },
    notes: { type: String, default: "" }
  },
  { _id: false }
);

const appointmentSchema = new mongoose.Schema(
  {
    doctorId: { type: String, required: true, index: true },
    patientId: { type: String, required: true, index: true },
    startTime: { type: Date, required: true, index: true },
    endTime: { type: Date, required: true },
    status: { type: String, enum: APPOINTMENT_STATUSES, required: true, default: "PENDING", index: true },
    prescription: { type: prescriptionSchema, default: undefined },
    followUpDate: { type: Date, default: undefined }
  },
  { timestamps: true }
);

appointmentSchema.index({ doctorId: 1, startTime: 1 });

const Appointment = mongoose.model("Appointment", appointmentSchema);

module.exports = { Appointment, APPOINTMENT_STATUSES };

