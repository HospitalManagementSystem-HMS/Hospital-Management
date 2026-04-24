const mongoose = require("mongoose");

const USER_ROLES = ["ADMIN", "DOCTOR", "PATIENT"];

const userSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: USER_ROLES, required: true },
    name: { type: String, default: "" },
    phone: { type: String, default: "" }
  },
  { timestamps: true }
);

const User = mongoose.model("User", userSchema);

module.exports = { User, USER_ROLES };
