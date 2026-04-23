const env = require("./config/env");
const { connectMongo } = require("./db/mongoose");
const { createApp } = require("./app");
const { startScheduler } = require("./scheduler/scheduler");

async function main() {
  await connectMongo({ mongoUri: env.MONGO_URI, dbName: env.MONGO_DB_NAME });
  const app = createApp();
  app.listen(env.PORT, () => {
    // eslint-disable-next-line no-console
    console.log(`notification-service listening on :${env.PORT}`);
    startScheduler();
  });
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});

