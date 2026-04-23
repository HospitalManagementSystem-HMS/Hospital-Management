const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");

const { apiRoutes } = require("./routes/apiRoutes");

function createApp() {
  const app = express();
  app.disable("x-powered-by");

  app.use(helmet());
  app.use(cors());
  app.use(express.json({ limit: "1mb" }));
  app.use(morgan("tiny"));

  app.get("/health", (_req, res) => res.json({ ok: true, service: "api-gateway" }));
  app.use("/api", apiRoutes);

  app.use((_req, res) => res.status(404).json({ error: "NOT_FOUND" }));
  return app;
}

module.exports = { createApp };

