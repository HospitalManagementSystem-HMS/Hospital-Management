const express = require("express");
const { z } = require("zod");
const { Appointment } = require("../models/Appointment");
const { requireAuth, requireRole } = require("../middleware/requireAuth");
const { lookupUsers } = require("../services/authLookup");
const { notify, logActivity, upsertMedicineReminder, upsertFollowUpReminder } = require("../services/notifier");

const router = express.Router();

function toISOString(date) {
  return new Date(date).toISOString();
}

const bookSchema = z.object({
  doctorId: z.string().min(1),
  startTime: z.string().datetime(),
  durationMinutes: z.number().int().positive().max(240).optional().default(30)
});

router.post("/appointments", requireAuth, requireRole("PATIENT"), async (req, res, next) => {
  try {
    const { doctorId, startTime, durationMinutes } = bookSchema.parse(req.body);
    const start = new Date(startTime);
    const end = new Date(start.getTime() + durationMinutes * 60 * 1000);

    const overlap = await Appointment.findOne({
      doctorId,
      status: { $ne: "REJECTED" },
      startTime: { $lt: end },
      endTime: { $gt: start }
    });

    if (overlap) return res.status(409).json({ error: "SLOT_UNAVAILABLE" });

    const appt = await Appointment.create({
      doctorId,
      patientId: req.user.id,
      startTime: start,
      endTime: end,
      status: "PENDING"
    });

    const users = await lookupUsers([doctorId, req.user.id]);
    const doctorEmail = users.get(doctorId)?.email || "doctor";
    const patientEmail = users.get(req.user.id)?.email || "patient";

    await notify({
      userId: doctorId,
      type: "APPOINTMENT_BOOKED",
      message: `New appointment request from ${patientEmail} for ${toISOString(start)}.`
    });

    await notify({
      userId: req.user.id,
      type: "APPOINTMENT_STATUS",
      message: `Appointment requested with ${doctorEmail} for ${toISOString(start)} (PENDING).`
    });

    await logActivity({
      actorUserId: req.user.id,
      action: "APPOINTMENT_BOOKED",
      details: { appointmentId: appt._id.toString(), doctorId, startTime: appt.startTime }
    });

    return res.status(201).json({ appointment: appt });
  } catch (err) {
    return next(err);
  }
});

router.get("/appointments/me", requireAuth, requireRole("PATIENT"), async (req, res, next) => {
  try {
    const appts = await Appointment.find({ patientId: req.user.id }).sort({ startTime: -1 });
    const doctorIds = appts.map((a) => a.doctorId);
    const users = await lookupUsers(doctorIds);
    return res.json({
      appointments: appts.map((a) => ({
        ...a.toObject(),
        doctorEmail: users.get(a.doctorId)?.email
      }))
    });
  } catch (err) {
    return next(err);
  }
});

router.get("/doctor/appointments", requireAuth, requireRole("DOCTOR"), async (req, res, next) => {
  try {
    const appts = await Appointment.find({ doctorId: req.user.id }).sort({ startTime: -1 });
    const patientIds = appts.map((a) => a.patientId);
    const users = await lookupUsers(patientIds);
    return res.json({
      appointments: appts.map((a) => ({
        ...a.toObject(),
        patientEmail: users.get(a.patientId)?.email
      }))
    });
  } catch (err) {
    return next(err);
  }
});

router.get("/admin/appointments", requireAuth, requireRole("ADMIN"), async (_req, res, next) => {
  try {
    const appts = await Appointment.find().sort({ createdAt: -1 }).limit(200);
    const ids = [];
    for (const a of appts) ids.push(a.doctorId, a.patientId);
    const users = await lookupUsers(ids);
    return res.json({
      appointments: appts.map((a) => ({
        ...a.toObject(),
        doctorEmail: users.get(a.doctorId)?.email,
        patientEmail: users.get(a.patientId)?.email
      }))
    });
  } catch (err) {
    next(err);
  }
});

const decisionSchema = z.object({
  status: z.enum(["ACCEPTED", "REJECTED"])
});

router.patch("/appointments/:id/decision", requireAuth, requireRole("DOCTOR"), async (req, res, next) => {
  try {
    const { status } = decisionSchema.parse(req.body);
    const appt = await Appointment.findById(req.params.id);
    if (!appt) return res.status(404).json({ error: "NOT_FOUND" });
    if (appt.doctorId !== req.user.id) return res.status(403).json({ error: "FORBIDDEN" });
    if (appt.status !== "PENDING") return res.status(409).json({ error: "INVALID_STATUS_TRANSITION" });

    appt.status = status;
    await appt.save();

    const users = await lookupUsers([appt.doctorId, appt.patientId]);
    const doctorEmail = users.get(appt.doctorId)?.email || "doctor";

    await notify({
      userId: appt.patientId,
      type: "APPOINTMENT_STATUS",
      message: `Appointment with ${doctorEmail} for ${toISOString(appt.startTime)} was ${status}.`
    });

    await logActivity({
      actorUserId: req.user.id,
      action: "APPOINTMENT_DECISION",
      details: { appointmentId: appt._id.toString(), status }
    });

    return res.json({ appointment: appt });
  } catch (err) {
    return next(err);
  }
});

const consultationSchema = z.object({
  medicines: z
    .array(
      z.object({
        name: z.string().min(1),
        instructions: z.string().min(1)
      })
    )
    .min(1),
  notes: z.string().optional().default(""),
  followUpRecommended: z.boolean().optional().default(false),
  followUpDate: z.string().datetime().optional()
});

router.post("/appointments/:id/consultation", requireAuth, requireRole("DOCTOR"), async (req, res, next) => {
  try {
    const { medicines, notes, followUpRecommended, followUpDate } = consultationSchema.parse(req.body);
    const appt = await Appointment.findById(req.params.id);
    if (!appt) return res.status(404).json({ error: "NOT_FOUND" });
    if (appt.doctorId !== req.user.id) return res.status(403).json({ error: "FORBIDDEN" });
    if (appt.status !== "ACCEPTED") return res.status(409).json({ error: "INVALID_STATUS_TRANSITION" });

    appt.status = "COMPLETED";
    appt.prescription = { medicines, notes };
    if (followUpRecommended && followUpDate) {
      appt.followUpDate = new Date(followUpDate);
    } else {
      appt.followUpDate = undefined;
    }
    await appt.save();

    const users = await lookupUsers([appt.doctorId, appt.patientId]);
    const doctorEmail = users.get(appt.doctorId)?.email || "doctor";

    await notify({
      userId: appt.patientId,
      type: "PRESCRIPTION_ADDED",
      message: `Prescription added for your appointment with ${doctorEmail} on ${toISOString(appt.startTime)}.`
    });

    await upsertMedicineReminder({ userId: appt.patientId, appointmentId: appt._id.toString(), medicines });

    if (appt.followUpDate) {
      await upsertFollowUpReminder({ userId: appt.patientId, appointmentId: appt._id.toString(), dueAt: appt.followUpDate.toISOString() });
      await notify({
        userId: appt.patientId,
        type: "FOLLOW_UP",
        message: `Follow-up recommended on ${toISOString(appt.followUpDate)}.`
      });
    }

    await logActivity({
      actorUserId: req.user.id,
      action: "CONSULTATION_COMPLETED",
      details: { appointmentId: appt._id.toString(), followUpDate: appt.followUpDate }
    });

    return res.json({ appointment: appt });
  } catch (err) {
    return next(err);
  }
});

router.get("/appointments/:id", requireAuth, async (req, res, next) => {
  try {
    const appt = await Appointment.findById(req.params.id);
    if (!appt) return res.status(404).json({ error: "NOT_FOUND" });
    const isParticipant = appt.patientId === req.user.id || appt.doctorId === req.user.id || req.user.role === "ADMIN";
    if (!isParticipant) return res.status(403).json({ error: "FORBIDDEN" });
    return res.json({ appointment: appt });
  } catch (err) {
    return next(err);
  }
});

module.exports = { appointmentRoutes: router };

