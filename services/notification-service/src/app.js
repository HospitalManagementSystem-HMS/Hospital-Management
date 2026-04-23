const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");

const { notificationRoutes } = require("./routes/notificationRoutes");
const { internalRoutes } = require("./routes/internalRoutes");
const { activityRoutes } = require("./routes/activityRoutes");
const { notFound, errorHandler } = require("./utils/errors");

function createApp() {
  const app = express();
  app.disable("x-powered-by");

  app.use(helmet());
  app.use(cors());
  app.use(express.json({ limit: "1mb" }));
  app.use(morgan("tiny"));

  app.get("/health", (_req, res) => res.json({ ok: true, service: "notification" }));

  app.use(notificationRoutes);
  app.use(activityRoutes);
  app.use("/internal", internalRoutes);

  app.use(notFound);
  app.use(errorHandler);
  return app;
}

module.exports = { createApp };

