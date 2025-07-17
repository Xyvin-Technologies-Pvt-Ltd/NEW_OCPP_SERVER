require("dotenv").config();
const express = require("express");
const cors = require("cors");
const logger = require("morgan");
const authVerify = require("./src/middlewares/authVerify");
const ocppRoutes = require("./src/routes/ocppRoutes");
const { webSocketServer } = require('./src/wsInit');
//!DONOT DELETE
const { mobileWebSocketServer } = require("./src/wsInit/appWs"); //!DONOT DELETE
const errorHandler = require("./src/middlewares/errorMiddleware");
const createError = require('http-errors')
const PORT =  6500;
const connectDB = require("./src/db");
const app = express();
connectDB();
app.use(
  cors({
    origin: "*",
    credentials: true,
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

//! DONOT DELETEs
app.get("/api/health-check", (req, res) => {
  res.status(200).send("connected to ocppws!!");
});

//! DONOT DELETE
app.get("/api/health-check2", (req, res) => {
  res.status(200).send("connected to ocpp api!!");
});

app.use(logger("dev"));

app.use("/api/v1", authVerify, ocppRoutes);

// Start WebSocket serverr
webSocketServer
  .listen(5500)
  .then(() => {
    console.log("WebSocket Server started at 5500");
  })
  .catch((err) => {
    console.error("Error starting WebSocket server:", err);
  });

// 404
app.all("*", (req, res, next) => {
  const err = new createError(
    404,
    `Can't find the ${req.originalUrl} on the ocpp service server!`
  );
  next(err);
});

// Use the error-handling middleware
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Express app listening on port ${PORT}`);
});
// Export the Express app for use in other files
module.exports = app;

