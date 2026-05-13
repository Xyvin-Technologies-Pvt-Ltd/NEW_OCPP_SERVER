const axios = require("axios");
const { axiosErrorHandler } = require("../utils/axiosErrorHandler");
const generateToken = require("../utils/generateToken");

let NOTIFICATION_URL;
let token;
let configReady = false;

async function ensureServiceConfig() {
  if (configReady) return;
  const base = process.env.NOTIFICATION_SERVICE_URL;
  const payloadId = process.env.AUTH_SECRET;
  if (!base || !payloadId) {
    throw new Error("NOTIFICATION_SERVICE_URL and AUTH_SECRET are required");
  }
  NOTIFICATION_URL = `${base.replace(/\/+$/u, "")}/api/v1/notification`;
  token = await generateToken(payloadId);
  configReady = true;
}

const saveNotification = async (title, body, user) => {
  try {
    await ensureServiceConfig();
    const response = await axios.post(
      `${NOTIFICATION_URL}/save`,
      { title, body, users: [user] },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const result = response.data;
    if (!result.status)
      throw new Error("Notification service unauthorized or failed");
    return result.status;
  } catch (error) {
    axiosErrorHandler(error, "saveNotification");
    return false;
  }
};

module.exports = { saveNotification };
