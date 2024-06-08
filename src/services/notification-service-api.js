const axios = require("axios"); // Import Axios for making HTTP requests
require("dotenv").config();
const { axiosErrorHandler } = require("../utils/axiosErrorHandler");
const { getSecret } = require('../config/env.config');
const generateToken = require("../utils/generateToken");

let NOTIFICATION_URL;
let AUTH_SECRET;
let token;
const setURL = async () => {
  let NOTIFICATION_SERVICE_URL;

  try {
    if (process.env.NODE_ENV !== "production") {
      NOTIFICATION_SERVICE_URL = process.env.NOTIFICATION_SERVICE_URL || "http://localhost:5050";
    } else {
      const userUrlSecret = await getSecret();
      NOTIFICATION_SERVICE_URL = userUrlSecret.NOTIFICATION_SERVICE_URL;
      AUTH_SECRET = userUrlSecret.AUTH_SECRET;
      token = await generateToken(AUTH_SECRET);
    }

    NOTIFICATION_URL = `${NOTIFICATION_SERVICE_URL}/api/v1/notification`;
  } catch (error) {
    console.error("Error setting secrets:", error);
    process.exit(1);
  }
};


const saveNotification = async (title, body, user) => {
  try {
    await setURL();

    const response = await axios.post(
      `${NOTIFICATION_URL}/save`,
      { title, body, users: [user] },
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    let res = response.data;
    if (!res.status) throw new Error(`Some error from service connections/UnAuthorized`);
    return res.status;
  } catch (error) {
    axiosErrorHandler(error);
  }
};

module.exports = { saveNotification };
