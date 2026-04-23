const jwt = require("jsonwebtoken");
const env = require("../config/env");

function authenticateOptional(req, res, next) {
  const header = req.header("authorization");
  if (!header) return next();
  const [scheme, token] = header.split(" ");
  if (scheme !== "Bearer" || !token) return res.status(401).json({ error: "UNAUTHORIZED" });
  try {
    const payload = jwt.verify(token, env.JWT_SECRET);
    req.user = { id: payload.sub, email: payload.email, role: payload.role };
    return next();
  } catch {
    return res.status(401).json({ error: "UNAUTHORIZED" });
  }
}

function requireAuth(req, res, next) {
  if (!req.user) return res.status(401).json({ error: "UNAUTHORIZED" });
  return next();
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) return res.status(403).json({ error: "FORBIDDEN" });
    return next();
  };
}

module.exports = { authenticateOptional, requireAuth, requireRole };

