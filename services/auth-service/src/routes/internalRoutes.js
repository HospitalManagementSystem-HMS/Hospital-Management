const express = require("express");
const bcrypt = require("bcryptjs");
const { z } = require("zod");
const mongoose = require("mongoose");
const { User, USER_ROLES } = require("../models/User");
const { requireInternal } = require("../middleware/internalAuth");
const { signUserToken } = require("../utils/token");

const router = express.Router();
router.use(requireInternal);

const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  role: z.enum(USER_ROLES),
  overwriteIfExists: z.boolean().optional().default(false),
  name: z.string().optional().default(""),
  phone: z.string().optional().default("")
});

router.post("/users", async (req, res, next) => {
  try {
    const { email, password, role, overwriteIfExists, name, phone } = createUserSchema.parse(req.body);

    const existing = await User.findOne({ email });
    if (existing && !overwriteIfExists) {
      return res.status(409).json({ error: "EMAIL_IN_USE" });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const user = existing
      ? await User.findOneAndUpdate(
          { _id: existing._id },
          {
            passwordHash,
            role,
            ...(name !== undefined ? { name } : {}),
            ...(phone !== undefined ? { phone } : {})
          },
          { new: true }
        )
      : await User.create({ email, passwordHash, role, name: name || "", phone: phone || "" });

    return res.status(existing ? 200 : 201).json({ user: { id: user._id.toString(), email: user.email, role: user.role } });
  } catch (err) {
    return next(err);
  }
});

const lookupSchema = z.object({
  ids: z.array(z.string().min(1)).max(100)
});

router.post("/users/lookup", async (req, res, next) => {
  try {
    const { ids } = lookupSchema.parse(req.body);
    const objectIds = ids.map((id) => new mongoose.Types.ObjectId(id));
    const users = await User.find({ _id: { $in: objectIds } }).select({ _id: 1, email: 1, role: 1, name: 1, phone: 1 });
    return res.json({
      users: users.map((u) => ({
        id: u._id.toString(),
        email: u.email,
        role: u.role,
        name: u.name || "",
        phone: u.phone || ""
      }))
    });
  } catch (err) {
    return next(err);
  }
});

router.get("/users/:id", async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) return res.status(400).json({ error: "INVALID_ID" });
    const user = await User.findById(req.params.id).select({ _id: 1, email: 1, role: 1, name: 1, phone: 1 });
    if (!user) return res.status(404).json({ error: "NOT_FOUND" });
    return res.json({
      user: {
        id: user._id.toString(),
        email: user.email,
        role: user.role,
        name: user.name || "",
        phone: user.phone || ""
      }
    });
  } catch (err) {
    return next(err);
  }
});

const verifyPasswordSchema = z.object({
  password: z.string().min(1)
});

router.post("/users/:id/verify-password", async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) return res.status(400).json({ error: "INVALID_ID" });
    const { password } = verifyPasswordSchema.parse(req.body);
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: "NOT_FOUND" });
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return res.status(401).json({ error: "INVALID_PASSWORD" });
    return res.json({ ok: true });
  } catch (err) {
    return next(err);
  }
});

const patchUserSchema = z.object({
  email: z.string().email().optional(),
  name: z.string().optional(),
  phone: z.string().optional(),
  newPassword: z.string().min(8).optional()
});

router.patch("/users/:id", async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) return res.status(400).json({ error: "INVALID_ID" });
    const body = patchUserSchema.parse(req.body);
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: "NOT_FOUND" });

    if (body.email && body.email !== user.email) {
      const taken = await User.findOne({ email: body.email, _id: { $ne: user._id } });
      if (taken) return res.status(409).json({ error: "EMAIL_IN_USE" });
      user.email = body.email;
    }
    if (body.name !== undefined) user.name = body.name;
    if (body.phone !== undefined) user.phone = body.phone;
    if (body.newPassword) {
      user.passwordHash = await bcrypt.hash(body.newPassword, 12);
    }
    await user.save();

    const token = signUserToken(user);
    return res.json({
      user: { id: user._id.toString(), email: user.email, role: user.role, name: user.name || "", phone: user.phone || "" },
      token
    });
  } catch (err) {
    return next(err);
  }
});

router.delete("/users/:id", async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) return res.status(400).json({ error: "INVALID_ID" });
    const result = await User.deleteOne({ _id: req.params.id });
    if (result.deletedCount === 0) return res.status(404).json({ error: "NOT_FOUND" });
    return res.json({ ok: true });
  } catch (err) {
    return next(err);
  }
});

module.exports = { internalRoutes: router };
