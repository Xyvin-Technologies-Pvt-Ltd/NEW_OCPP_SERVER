const axios = require("axios");
const { axiosErrorHandler } = require("../utils/axiosErrorHandler");
const generateToken = require("../utils/generateToken");

let USER_URL;
let token;
let configReady = false;

async function ensureServiceConfig() {
  if (configReady) return;
  const base = process.env.USER_SERVICE_URL;
  const payloadId = process.env.AUTH_SECRET;
  if (!base || !payloadId) {
    throw new Error("USER_SERVICE_URL and AUTH_SECRET are required");
  }
  USER_URL = `${base.replace(/\/+$/u, "")}/api/v1/users`;
  token = await generateToken(payloadId);
  configReady = true;
}

const authenticateUserByRFID = async (rfidTag) => {
  try {
    await ensureServiceConfig();
    const response = await axios.get(
      `${USER_URL}/transaction/rfid-authenticate/${rfidTag}`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    const res = response.data;
    if (!res.status) throw new Error("Unauthorized from user service");
    return res.status;
  } catch (error) {
    axiosErrorHandler(error, "authenticateUserByRFID");
    return false;
  }
};

const authenticateUserByUserId = async (userId) => {
  try {
    await ensureServiceConfig();
    const response = await axios.get(
      `${USER_URL}/transaction/authenticate/${userId}`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    return response.data.status;
  } catch (error) {
    axiosErrorHandler(error, "authenticateUserByUserId");
    return false;
  }
};

const addUserSessionUpdate = async (data) => {
  try {
    await ensureServiceConfig();
    const response = await axios.put(
      `${USER_URL}/transaction/increaseSessions`,
      data,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return response.data.status;
  } catch (error) {
    axiosErrorHandler(error, "addUserSessionUpdate");
    return false;
  }
};

const getUserIdAndChargingTariff = async (rfidTag) => {
  try {
    await ensureServiceConfig();
    const response = await axios.get(
      `${USER_URL}/getChargingTariff/fromRfid/${rfidTag}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return response.data.status ? response.data.result : null;
  } catch (error) {
    axiosErrorHandler(error, "getUserIdAndChargingTariff");
    return null;
  }
};

const reduceMoneyFromWallet = async (userId, amount, energyConsumed) => {
  try {
    await ensureServiceConfig();
    const response = await axios.put(
      `${USER_URL}/deductFromWallet/${userId}`,
      { amount, unitsUsed: energyConsumed },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return {
      status: response.data.status,
      walletAmount:
        response.data.result && response.data.result.walletAmount
          ? response.data.result.walletAmount
          : null,
    };
  } catch (error) {
    axiosErrorHandler(error, "reduceMoneyFromWallet");
    return { status: false, walletAmount: null };
  }
};

const getUserDeviceToken = async (userId) => {
  try {
    await ensureServiceConfig();
    const response = await axios.get(`${USER_URL}/getFirebaseId/${userId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data.status ? response.data.result : null;
  } catch (error) {
    axiosErrorHandler(error, "getUserDeviceToken");
    return null;
  }
};

module.exports = {
  getUserDeviceToken,
  authenticateUserByRFID,
  authenticateUserByUserId,
  getUserIdAndChargingTariff,
  reduceMoneyFromWallet,
  addUserSessionUpdate,
};
