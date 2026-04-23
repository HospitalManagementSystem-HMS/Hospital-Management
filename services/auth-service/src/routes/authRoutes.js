const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const axios = require("axios");
const { z } = require("zod");
const env = require("../config/env");
const { User, USER_ROLES } = require("../models/User");
const { requireAuth } = require("../middleware/requireAuth");

const router = express.Router();

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1)
});

router.post("/register", async (req, res, next) => {
  try {
    const { email, password, name } = registerSchema.parse(req.body);
    const existing = await User.findOne({ email });
    if (existing) return res.status(409).json({ error: "EMAIL_IN_USE" });

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await User.create({ email, passwordHash, role: "PATIENT" });

    try {
      await axios.post(
        `${env.USER_SERVICE_URL}/internal/patients/sync`,
        { authUserId: user._id.toString(), email, name },
        { headers: { "x-internal-api-key": env.INTERNAL_API_KEY } }
      );
    } catch (e) {
      await User.deleteOne({ _id: user._id });
      return res.status(502).json({ error: "PROFILE_SYNC_FAILED" });
    }

    const token = jwt.sign(
      { sub: user._id.toString(), email: user.email, role: user.role },
      env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    return res.status(201).json({ token, user: { id: user._id, email: user.email, role: user.role } });
  } catch (err) {
    return next(err);
  }
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
});

router.post("/login", async (req, res, next) => {
  try {
    const { email, password } = loginSchema.parse(req.body);
    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ error: "INVALID_CREDENTIALS" });

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return res.status(401).json({ error: "INVALID_CREDENTIALS" });

    const token = jwt.sign(
      { sub: user._id.toString(), email: user.email, role: user.role },
      env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    return res.json({ token, user: { id: user._id, email: user.email, role: user.role } });
  } catch (err) {
    return next(err);
  }
});

router.get("/me", requireAuth, async (req, res) => {
  res.json({ user: req.user });
});

router.get("/roles", (_req, res) => {
  res.json({ roles: USER_ROLES });
});

module.exports = { authRoutes: router };

