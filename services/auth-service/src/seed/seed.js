const axios = require("axios");
const bcrypt = require("bcryptjs");
const env = require("../config/env");
const { User } = require("../models/User");

async function ensureUser({ email, password, role, name }) {
  const existing = await User.findOne({ email });
  if (existing) return existing;
  const passwordHash = await bcrypt.hash(password, 12);
  return User.create({ email, passwordHash, role, name: name || "", phone: "" });
}

async function syncDoctorProfile({ authUserId, email, name, specialization }) {
  await axios.post(
    `${env.USER_SERVICE_URL}/internal/doctors/sync`,
    { authUserId, email, name, specialization },
    { headers: { "x-internal-api-key": env.INTERNAL_API_KEY } }
  );
}

async function syncPatientProfile({ authUserId, email, name }) {
  await axios.post(
    `${env.USER_SERVICE_URL}/internal/patients/sync`,
    { authUserId, email, name },
    { headers: { "x-internal-api-key": env.INTERNAL_API_KEY } }
  );
}

async function seedOnce() {
  if (!env.SEED) return { done: true };
  if (!env.SEED_ADMIN_EMAIL || !env.SEED_ADMIN_PASSWORD) return { done: true };

  const admin = await ensureUser({ email: env.SEED_ADMIN_EMAIL, password: env.SEED_ADMIN_PASSWORD, role: "ADMIN", name: "System Admin" });

  if (env.SEED_DOCTOR_EMAIL && env.SEED_DOCTOR_PASSWORD) {
    const doctor = await ensureUser({
      email: env.SEED_DOCTOR_EMAIL,
      password: env.SEED_DOCTOR_PASSWORD,
      role: "DOCTOR",
      name: env.SEED_DOCTOR_NAME || "Doctor"
    });
    if (env.SEED_DOCTOR_NAME && env.SEED_DOCTOR_SPECIALIZATION) {
      await syncDoctorProfile({
        authUserId: doctor._id.toString(),
        email: doctor.email,
        name: env.SEED_DOCTOR_NAME,
        specialization: env.SEED_DOCTOR_SPECIALIZATION
      });
    }
  }

  if (env.SEED_PATIENT_EMAIL && env.SEED_PATIENT_PASSWORD) {
    const patient = await ensureUser({
      email: env.SEED_PATIENT_EMAIL,
      password: env.SEED_PATIENT_PASSWORD,
      role: "PATIENT",
      name: env.SEED_PATIENT_NAME || "Patient"
    });
    if (env.SEED_PATIENT_NAME) {
      await syncPatientProfile({
        authUserId: patient._id.toString(),
        email: patient.email,
        name: env.SEED_PATIENT_NAME
      });
    }
  }

  return { done: true, adminId: admin._id.toString() };
}

function startSeedLoop() {
  if (!env.SEED) return;

  let attempts = 0;
  const maxAttempts = 60;

  const tick = async () => {
    attempts += 1;
    try {
      await seedOnce();
      // eslint-disable-next-line no-console
      console.log("[seed] completed");
    } catch (err) {
      // eslint-disable-next-line no-console
      console.log(`[seed] attempt ${attempts} failed; retrying...`);
      if (attempts < maxAttempts) {
        setTimeout(tick, 5000);
      } else {
        // eslint-disable-next-line no-console
        console.log("[seed] giving up after max attempts");
      }
      return;
    }
  };

  setTimeout(tick, 2000);
}

module.exports = { startSeedLoop };

