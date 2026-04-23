const dotenv = require("dotenv");
const { z } = require("zod");

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.string().optional().default("development"),
  PORT: z.coerce.number().int().positive().default(4001),
  MONGO_URI: z.string().min(1),
  MONGO_DB_NAME: z.string().min(1).default("hms_auth"),
  JWT_SECRET: z.string().min(16),
  INTERNAL_API_KEY: z.string().min(8),
  USER_SERVICE_URL: z.string().url(),
  SEED: z
    .union([z.string(), z.boolean()])
    .optional()
    .transform((v) => (typeof v === "string" ? v.toLowerCase() === "true" : !!v))
    .default(false),
  SEED_ADMIN_EMAIL: z.string().email().optional(),
  SEED_ADMIN_PASSWORD: z.string().min(8).optional(),
  SEED_DOCTOR_EMAIL: z.string().email().optional(),
  SEED_DOCTOR_PASSWORD: z.string().min(8).optional(),
  SEED_DOCTOR_NAME: z.string().min(1).optional(),
  SEED_DOCTOR_SPECIALIZATION: z.string().min(1).optional(),
  SEED_PATIENT_EMAIL: z.string().email().optional(),
  SEED_PATIENT_PASSWORD: z.string().min(8).optional(),
  SEED_PATIENT_NAME: z.string().min(1).optional()
});

const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
  // eslint-disable-next-line no-console
  console.error("Invalid environment variables:", parsed.error.flatten().fieldErrors);
  process.exit(1);
}

module.exports = parsed.data;

