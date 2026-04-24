const express = require("express");
const { z } = require("zod");
const { requireInternal } = require("../middleware/internalAuth");
const { Doctor } = require("../models/Doctor");
const { Patient } = require("../models/Patient");

const router = express.Router();
router.use(requireInternal);

const syncDoctorSchema = z.object({
  authUserId: z.string().min(1),
  email: z.string().email(),
  name: z.string().min(1),
  specialization: z.string().min(1),
  experienceYears: z.coerce.number().int().min(0).optional(),
  availabilitySlots: z.array(z.string()).optional()
});

router.post("/doctors/sync", async (req, res, next) => {
  try {
    const body = syncDoctorSchema.parse(req.body);
    const { authUserId, email, name, specialization } = body;
    const patch = { authUserId, email, name, specialization };
    if (body.experienceYears !== undefined) patch.experienceYears = body.experienceYears;
    if (body.availabilitySlots !== undefined) patch.availabilitySlots = body.availabilitySlots;
    const doctor = await Doctor.findOneAndUpdate({ authUserId }, patch, { upsert: true, new: true });
    res.json({ doctor: { id: doctor.authUserId } });
  } catch (err) {
    next(err);
  }
});

const syncPatientSchema = z.object({
  authUserId: z.string().min(1),
  email: z.string().email(),
  name: z.string().min(1)
});

router.post("/patients/sync", async (req, res, next) => {
  try {
    const { authUserId, email, name } = syncPatientSchema.parse(req.body);
    const patient = await Patient.findOneAndUpdate(
      { authUserId },
      { authUserId, email, name },
      { upsert: true, new: true }
    );
    res.json({ patient: { id: patient.authUserId } });
  } catch (err) {
    next(err);
  }
});

module.exports = { internalRoutes: router };

