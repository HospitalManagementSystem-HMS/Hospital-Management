const express = require("express");
const env = require("../config/env");
const { authenticateOptional, requireAuth, requireRole } = require("../middleware/auth");
const { proxyToService } = require("../utils/proxy");

const router = express.Router();
router.use(authenticateOptional);

// Auth
router.post("/auth/register", (req, res) => proxyToService({ req, res, baseURL: env.AUTH_SERVICE_URL, path: "/auth/register" }));
router.post("/auth/login", (req, res) => proxyToService({ req, res, baseURL: env.AUTH_SERVICE_URL, path: "/auth/login" }));
router.get("/auth/me", requireAuth, (req, res) => proxyToService({ req, res, baseURL: env.AUTH_SERVICE_URL, path: "/auth/me" }));

// Public doctors list
router.get("/doctors", (req, res) => proxyToService({ req, res, baseURL: env.USER_SERVICE_URL, path: "/doctors" }));

// Profiles
router.get("/users/me", requireAuth, (req, res) => proxyToService({ req, res, baseURL: env.USER_SERVICE_URL, path: "/users/me" }));

// Admin (user-service)
router.post("/admin/doctors", requireAuth, requireRole("ADMIN"), (req, res) =>
  proxyToService({ req, res, baseURL: env.USER_SERVICE_URL, path: "/admin/doctors" })
);
router.get("/admin/doctors", requireAuth, requireRole("ADMIN"), (req, res) =>
  proxyToService({ req, res, baseURL: env.USER_SERVICE_URL, path: "/admin/doctors" })
);
router.get("/admin/patients", requireAuth, requireRole("ADMIN"), (req, res) =>
  proxyToService({ req, res, baseURL: env.USER_SERVICE_URL, path: "/admin/patients" })
);
router.get("/admin/analytics", requireAuth, requireRole("ADMIN"), (req, res) =>
  proxyToService({ req, res, baseURL: env.USER_SERVICE_URL, path: "/admin/analytics" })
);
router.get("/admin/doctors/:id", requireAuth, requireRole("ADMIN"), (req, res) =>
  proxyToService({ req, res, baseURL: env.USER_SERVICE_URL, path: `/admin/doctors/${req.params.id}` })
);
router.get("/admin/patients/:id", requireAuth, requireRole("ADMIN"), (req, res) =>
  proxyToService({ req, res, baseURL: env.USER_SERVICE_URL, path: `/admin/patients/${req.params.id}` })
);

// Admin (appointment + notification)
router.get("/admin/appointments", requireAuth, requireRole("ADMIN"), (req, res) =>
  proxyToService({ req, res, baseURL: env.APPOINTMENT_SERVICE_URL, path: "/admin/appointments" })
);
router.get("/admin/activities", requireAuth, requireRole("ADMIN"), (req, res) =>
  proxyToService({ req, res, baseURL: env.NOTIFICATION_SERVICE_URL, path: "/activities" })
);

// Patient appointments
router.post("/appointments", requireAuth, requireRole("PATIENT"), (req, res) =>
  proxyToService({ req, res, baseURL: env.APPOINTMENT_SERVICE_URL, path: "/appointments" })
);
router.get("/appointments/me", requireAuth, requireRole("PATIENT"), (req, res) =>
  proxyToService({ req, res, baseURL: env.APPOINTMENT_SERVICE_URL, path: "/appointments/me" })
);

// Doctor appointments + consultation
router.get("/doctor/appointments", requireAuth, requireRole("DOCTOR"), (req, res) =>
  proxyToService({ req, res, baseURL: env.APPOINTMENT_SERVICE_URL, path: "/doctor/appointments" })
);
router.patch("/appointments/:id/decision", requireAuth, requireRole("DOCTOR"), (req, res) =>
  proxyToService({ req, res, baseURL: env.APPOINTMENT_SERVICE_URL, path: `/appointments/${req.params.id}/decision` })
);
router.post("/appointments/:id/prescription", requireAuth, requireRole("DOCTOR"), (req, res) =>
  proxyToService({ req, res, baseURL: env.APPOINTMENT_SERVICE_URL, path: `/appointments/${req.params.id}/prescription` })
);
router.patch("/appointments/:id/consultation-notes", requireAuth, requireRole("DOCTOR"), (req, res) =>
  proxyToService({ req, res, baseURL: env.APPOINTMENT_SERVICE_URL, path: `/appointments/${req.params.id}/consultation-notes` })
);
router.post("/appointments/:id/consultation", requireAuth, requireRole("DOCTOR"), (req, res) =>
  proxyToService({ req, res, baseURL: env.APPOINTMENT_SERVICE_URL, path: `/appointments/${req.params.id}/consultation` })
);

router.get("/appointments/:id", requireAuth, (req, res) =>
  proxyToService({ req, res, baseURL: env.APPOINTMENT_SERVICE_URL, path: `/appointments/${req.params.id}` })
);

// Notifications
router.get("/notifications", requireAuth, (req, res) => proxyToService({ req, res, baseURL: env.NOTIFICATION_SERVICE_URL, path: "/notifications" }));
router.post("/notifications/:id/read", requireAuth, (req, res) =>
  proxyToService({ req, res, baseURL: env.NOTIFICATION_SERVICE_URL, path: `/notifications/${req.params.id}/read` })
);

module.exports = { apiRoutes: router };
