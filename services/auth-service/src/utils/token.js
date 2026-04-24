const jwt = require("jsonwebtoken");
const env = require("../config/env");

function signUserToken(user) {
  return jwt.sign({ sub: user._id.toString(), email: user.email, role: user.role }, env.JWT_SECRET, { expiresIn: "7d" });
}

module.exports = { signUserToken };
