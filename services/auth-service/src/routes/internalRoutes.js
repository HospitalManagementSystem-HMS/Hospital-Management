const express = require("express");
const bcrypt = require("bcryptjs");
const { z } = require("zod");
const { User, USER_ROLES } = require("../models/User");
const { requireInternal } = require("../middleware/internalAuth");

const router = express.Router();
router.use(requireInternal);

const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  role: z.enum(USER_ROLES),
  overwriteIfExists: z.boolean().optional().default(false)
});

router.post("/users", async (req, res, next) => {
  try {
    const { email, password, role, overwriteIfExists } = createUserSchema.parse(req.body);

    const existing = await User.findOne({ email });
    if (existing && !overwriteIfExists) {
      return res.status(409).json({ error: "EMAIL_IN_USE" });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const user = existing
      ? await User.findOneAndUpdate({ _id: existing._id }, { passwordHash, role }, { new: true })
      : await User.create({ email, passwordHash, role });

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
    const users = await User.find({ _id: { $in: ids } }).select({ _id: 1, email: 1, role: 1 });
    return res.json({
      users: users.map((u) => ({ id: u._id.toString(), email: u.email, role: u.role }))
    });
  } catch (err) {
    return next(err);
  }
});

module.exports = { internalRoutes: router };

