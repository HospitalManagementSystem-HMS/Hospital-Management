const env = require("./config/env");
const { connectMongo } = require("./db/mongoose");
const { createApp } = require("./app");
const { startSeedLoop } = require("./seed/seed");
const bcrypt = require("bcryptjs");
const { User } = require("./models/User");

async function seedAdmin() {
  const existingAdmin = await User.findOne({ email: "admin@hospital.com" });
  if (!existingAdmin) {
    const passwordHash = await bcrypt.hash("admin123", 12);
    await User.create({
      email: "admin@hospital.com",
      passwordHash,
      role: "ADMIN",
      name: "System Admin"
    });
  }
}

async function main() {
  await connectMongo({ mongoUri: env.MONGO_URI, dbName: env.MONGO_DB_NAME });
  await seedAdmin();

  const app = createApp();
  app.listen(env.PORT, () => {
    // eslint-disable-next-line no-console
    console.log(`auth-service listening on :${env.PORT}`);
    startSeedLoop();
  });
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});

