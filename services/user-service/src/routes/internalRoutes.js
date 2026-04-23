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
  specialization: z.string().min(1)
});

router.post("/doctors/sync", async (req, res, next) => {
  try {
    const { authUserId, email, name, specialization } = syncDoctorSchema.parse(req.body);
    const doctor = await Doctor.findOneAndUpdate(
      { authUserId },
      { authUserId, email, name, specialization },
      { upsert: true, new: true }
    );
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

