const express = require("express");
const { Doctor } = require("../models/Doctor");

const router = express.Router();

router.get("/doctors", async (_req, res, next) => {
  try {
    const doctors = await Doctor.find().sort({ createdAt: -1 }).select({ authUserId: 1, name: 1, specialization: 1, email: 1 });
    res.json({
      doctors: doctors.map((d) => ({
        id: d.authUserId,
        name: d.name,
        specialization: d.specialization,
        email: d.email
      }))
    });
  } catch (err) {
    next(err);
  }
});

module.exports = { publicRoutes: router };

