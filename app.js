require("dotenv").config();

const { validateEnv } = require("./src/config/validateEnv");
validateEnv();

const connectDB = require("./src/db");
const { webSocketServer } = require("./src/wsInit");
require("./src/wsInit/appWs");

const express = require("express");
const cors = require("cors");
const logger = require("morgan");
const helmet = require("helmet");
const mongoSanitize = require("express-mongo-sanitize");
const rateLimit = require("express-rate-limit");

const requestIdMiddleware = require("./src/middlewares/requestIdMiddleware");
const authVerify = require("./src/middlewares/authVerify");
const ocppRoutes = require("./src/routes/ocppRoutes");
const errorHandler = require("./src/middlewares/errorMiddleware");
const createError = require("http-errors");

const corsOriginRaw = process.env.CORS_ORIGIN;
let corsOrigin;
if (
  corsOriginRaw &&
  !corsOriginRaw.includes(",") &&
  corsOriginRaw !== "*"
) {
  corsOrigin = corsOriginRaw.trim();
} else if (corsOriginRaw && corsOriginRaw.includes(",")) {
  corsOrigin = corsOriginRaw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
} else {
  corsOrigin = corsOriginRaw;
}

const app = express();
app.disable("x-powered-by");

app.use(requestIdMiddleware);
app.use(helmet());
app.use(
  mongoSanitize({
    replaceWith: "_",
  })
);
app.use(express.json({ limit: "200kb" }));
app.use(express.urlencoded({ extended: true }));

const allowCredentials = corsOriginRaw !== "*" && corsOriginRaw !== "";
app.use(
  cors({
    origin: corsOrigin,
    credentials: allowCredentials,
  })
);

const PORT = Number(process.env.PORT_OCPP_HTTP) || 6500;

//! DONOT DELETEs
app.get("/api/health-check", (req, res) => {
  res.status(200).send("connected to ocppws!!");
});

//! DONOT DELETE
app.get("/api/health-check2", (req, res) => {
  res.status(200).send("connected to ocpp api!!");
});

if (process.env.NODE_ENV !== "production") {
  app.use(logger("dev"));
} else {
  app.use(logger("combined"));
}

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: Number(process.env.RATE_LIMIT_MAX) || 2000,
});
app.use("/api/", apiLimiter);

app.use("/api/v1", authVerify, ocppRoutes);

app.all("*", (req, res, next) => {
  next(
    new createError(
      404,
      `Can't find the ${req.originalUrl} on the ocpp service server!`
    )
  );
});

app.use(errorHandler);

module.exports = app;

connectDB()
  .then(async () => {
    try {
      await webSocketServer.listen(5500);
      console.log("WebSocket Server started at 5500");
    } catch (err) {
      console.error("Error starting WebSocket server:", err);
      process.exit(1);
    }
    app.listen(PORT, () => {
      console.log(`Express app listening on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error("Startup failed:", err);
    process.exit(1);
  });
