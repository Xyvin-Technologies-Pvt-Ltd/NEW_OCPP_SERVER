const Joi = require("joi");

const isProduction = process.env.NODE_ENV === "production";

function applyDevelopmentDefaults() {
  if (isProduction) return;

  if (!process.env.MOBILE_WS_SHARED_SECRET?.trim()) {
    process.env.MOBILE_WS_SHARED_SECRET =
      "dev-mobile-ws-shared-secret-min-16";
    console.warn(
      "[env] MOBILE_WS_SHARED_SECRET was missing — using a dev default"
    );
  }

  const urls = [
    ["USER_SERVICE_URL", "http://localhost:5050"],
    ["EV_MACHINE_SERVICE_URL", "http://localhost:5050"],
    ["TRANSACTION_SERVICE_URL", "http://localhost:5050"],
    ["NOTIFICATION_SERVICE_URL", "http://localhost:5050"],
  ];
  for (const [key, fallback] of urls) {
    if (!process.env[key]?.trim()) {
      process.env[key] = fallback;
      console.warn(`[env] ${key} was missing — defaulted to ${fallback}`);
    }
  }

  if (!process.env.AUTH_SECRET?.trim()) {
    process.env.AUTH_SECRET = "development-auth-secret-change-me";
    console.warn("[env] AUTH_SECRET was missing — using insecure dev default");
  }

  const ats = process.env.ACCESS_TOKEN_SECRET?.trim() ?? "";
  if (ats.length < 8) {
    process.env.ACCESS_TOKEN_SECRET =
      "development-access-token-secret-min-eight";
    console.warn(
      "[env] ACCESS_TOKEN_SECRET was missing or shorter than 8 chars — using a dev default"
    );
  }
}

function buildSchema() {
  const accessMin = isProduction ? 16 : 8;

  return Joi.object({
    NODE_ENV: Joi.string()
      .valid("development", "production", "test")
      .default("development"),
    MONGO_URI: Joi.string()
      .pattern(/^mongodb(\+srv)?:\/\//)
      .required(),
    DB_NAME: Joi.string().min(1).required(),
    ACCESS_TOKEN_SECRET: Joi.string().min(accessMin).required(),
    AUTH_SECRET: Joi.string().min(8).required(),
    USER_SERVICE_URL: Joi.string().required(),
    EV_MACHINE_SERVICE_URL: Joi.string().required(),
    TRANSACTION_SERVICE_URL: Joi.string().required(),
    NOTIFICATION_SERVICE_URL: Joi.string().required(),
    CORS_ORIGIN: Joi.alternatives()
      .try(Joi.string(), Joi.array().items(Joi.string()))
      .required(),
    PORT_OCPP_HTTP: Joi.number().port().default(6500),
    MOBILE_WS_SHARED_SECRET: Joi.string().min(16).required(),
  }).unknown(true);
}

function validateEnv() {
  applyDevelopmentDefaults();

  let cors = process.env.CORS_ORIGIN;
  if (typeof cors === "string" && cors.includes(",")) {
    cors = cors
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  }

  const schema = buildSchema();

  const { error } = schema.validate(
    {
      ...process.env,
      CORS_ORIGIN: cors,
    },
    { abortEarly: false }
  );

  if (error) {
    const msg = error.details.map((d) => d.message).join("; ");
    throw new Error(`Environment validation failed: ${msg}`);
  }
}

module.exports = { validateEnv, schema: buildSchema() };
