const winston = require("winston");

const CATEGORY = "OCPP service";

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || "info",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.label({ label: CATEGORY }),
    winston.format.json()
  ),
  defaultMeta: { service: CATEGORY },
  transports: [new winston.transports.Console()],
});

module.exports = logger;
