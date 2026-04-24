const express = require("express");
const { requireInternal } = require("../middleware/internalAuth");
const { Appointment } = require("../models/Appointment");

const router = express.Router();
router.use(requireInternal);

router.get("/stats", async (_req, res, next) => {
  try {
    const [totalAppointments, pending, accepted, rejected, completed, activeDoctorIds] = await Promise.all([
      Appointment.countDocuments(),
      Appointment.countDocuments({ status: "PENDING" }),
      Appointment.countDocuments({ status: "ACCEPTED" }),
      Appointment.countDocuments({ status: "REJECTED" }),
      Appointment.countDocuments({ status: "COMPLETED" }),
      Appointment.distinct("doctorId", { status: { $in: ["PENDING", "ACCEPTED"] } })
    ]);
    res.json({
      totalAppointments,
      byStatus: { PENDING: pending, ACCEPTED: accepted, REJECTED: rejected, COMPLETED: completed },
      activeDoctors: activeDoctorIds.length
    });
  } catch (err) {
    next(err);
  }
});

router.get("/doctors/:doctorId/appointments", async (req, res, next) => {
  try {
    const appointments = await Appointment.find({ doctorId: req.params.doctorId }).sort({ startTime: -1 }).limit(200);
    res.json({ appointments });
  } catch (err) {
    next(err);
  }
});

router.get("/patients/:patientId/appointments", async (req, res, next) => {
  try {
    const appointments = await Appointment.find({ patientId: req.params.patientId }).sort({ startTime: -1 }).limit(200);
    res.json({ appointments });
  } catch (err) {
    next(err);
  }
});

module.exports = { internalRoutes: router };
