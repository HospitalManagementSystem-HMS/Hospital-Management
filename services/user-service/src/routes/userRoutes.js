const express = require("express");
const axios = require("axios");
const { z } = require("zod");
const env = require("../config/env");
const { requireAuth, requireRole } = require("../middleware/requireAuth");
const { Doctor } = require("../models/Doctor");
const { Patient } = require("../models/Patient");

const router = express.Router();

router.get("/users/me", requireAuth, async (req, res, next) => {
  try {
    if (req.user.role === "DOCTOR") {
      const doctor = await Doctor.findOne({ authUserId: req.user.id });
      return res.json({ profile: doctor ? { ...doctor.toObject(), id: doctor.authUserId } : null });
    }
    if (req.user.role === "PATIENT") {
      const patient = await Patient.findOne({ authUserId: req.user.id });
      return res.json({ profile: patient ? { ...patient.toObject(), id: patient.authUserId } : null });
    }
    return res.json({ profile: { id: req.user.id, email: req.user.email, role: req.user.role } });
  } catch (err) {
    return next(err);
  }
});

const createDoctorSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8),
  specialization: z.string().min(1)
});

router.post("/admin/doctors", requireAuth, requireRole("ADMIN"), async (req, res, next) => {
  try {
    const { name, email, password, specialization } = createDoctorSchema.parse(req.body);

    const resp = await axios.post(
      `${env.AUTH_SERVICE_URL}/internal/users`,
      { email, password, role: "DOCTOR" },
      { headers: { "x-internal-api-key": env.INTERNAL_API_KEY } }
    );

    const authUserId = resp.data.user.id;

    const doctor = await Doctor.findOneAndUpdate(
      { authUserId },
      { authUserId, email, name, specialization },
      { upsert: true, new: true }
    );

    await axios.post(
      `${env.NOTIFICATION_SERVICE_URL}/internal/activity`,
      { actorUserId: req.user.id, action: "DOCTOR_CREATED", details: { doctorId: authUserId, email, specialization } },
      { headers: { "x-internal-api-key": env.INTERNAL_API_KEY } }
    );

    return res.status(201).json({ doctor: { id: doctor.authUserId, name: doctor.name, email: doctor.email, specialization: doctor.specialization } });
  } catch (err) {
    return next(err);
  }
});

module.exports = { userRoutes: router };
