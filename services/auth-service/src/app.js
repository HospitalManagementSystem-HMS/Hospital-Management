const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");

const { authRoutes } = require("./routes/authRoutes");
const { internalRoutes } = require("./routes/internalRoutes");
const { notFound, errorHandler } = require("./utils/errors");

function createApp() {
  const app = express();
  app.disable("x-powered-by");

  app.use(helmet());
  app.use(cors({
    origin: '*', // or specify 'http://13.201.62.153:3000'
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  }));
  app.use(express.json({ limit: "1mb" }));
  app.use(morgan("tiny"));

  app.get("/health", (_req, res) => res.json({ ok: true, service: "auth" }));

  app.use("/auth", authRoutes);
  app.use("/internal", internalRoutes);

  app.use(notFound);
  app.use(errorHandler);
  return app;
}

module.exports = { createApp };

