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

// Public doctors + availability
router.get("/doctors", (req, res) => proxyToService({ req, res, baseURL: env.USER_SERVICE_URL, path: "/doctors" }));
router.get("/doctors/:id/availability", (req, res) =>
  proxyToService({ req, res, baseURL: env.USER_SERVICE_URL, path: `/doctors/${req.params.id}/availability` })
);

// Profiles (legacy)
router.get("/users/me", requireAuth, (req, res) => proxyToService({ req, res, baseURL: env.USER_SERVICE_URL, path: "/users/me" }));

// Profile management (user-service)
router.get("/profile/me", requireAuth, (req, res) => proxyToService({ req, res, baseURL: env.USER_SERVICE_URL, path: "/profile/me" }));
router.put("/profile/update", requireAuth, (req, res) => proxyToService({ req, res, baseURL: env.USER_SERVICE_URL, path: "/profile/update" }));

// Doctor availability (user-service)
router.get("/doctor/availability", requireAuth, requireRole("DOCTOR"), (req, res) =>
  proxyToService({ req, res, baseURL: env.USER_SERVICE_URL, path: "/doctor/availability" })
);
router.post("/doctor/availability", requireAuth, requireRole("DOCTOR"), (req, res) =>
  proxyToService({ req, res, baseURL: env.USER_SERVICE_URL, path: "/doctor/availability" })
);
router.patch("/doctor/availability/:slotId", requireAuth, requireRole("DOCTOR"), (req, res) =>
  proxyToService({ req, res, baseURL: env.USER_SERVICE_URL, path: `/doctor/availability/${req.params.slotId}` })
);
router.delete("/doctor/availability/:slotId", requireAuth, requireRole("DOCTOR"), (req, res) =>
  proxyToService({ req, res, baseURL: env.USER_SERVICE_URL, path: `/doctor/availability/${req.params.slotId}` })
);

// Admin (user-service)
router.post("/admin/doctors", requireAuth, requireRole("ADMIN"), (req, res) =>
  proxyToService({ req, res, baseURL: env.USER_SERVICE_URL, path: "/admin/doctors" })
);
router.post("/admin/doctor", requireAuth, requireRole("ADMIN"), (req, res) =>
  proxyToService({ req, res, baseURL: env.USER_SERVICE_URL, path: "/admin/doctor" })
);
router.delete("/admin/doctor/:id", requireAuth, requireRole("ADMIN"), (req, res) =>
  proxyToService({ req, res, baseURL: env.USER_SERVICE_URL, path: `/admin/doctor/${req.params.id}` })
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
router.post("/appointment/book", requireAuth, requireRole("PATIENT"), (req, res) =>
  proxyToService({ req, res, baseURL: env.APPOINTMENT_SERVICE_URL, path: "/appointment/book" })
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
