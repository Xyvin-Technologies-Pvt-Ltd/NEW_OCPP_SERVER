const axios = require("axios");
const { axiosErrorHandler } = require("../utils/axiosErrorHandler");
const generateToken = require("../utils/generateToken");

let TRANSACTION_URL;
let token;
let configReady = false;

async function ensureServiceConfig() {
  if (configReady) return;
  const base = process.env.TRANSACTION_SERVICE_URL;
  const payloadId = process.env.AUTH_SECRET;
  if (!base || !payloadId) {
    throw new Error("TRANSACTION_SERVICE_URL and AUTH_SECRET are required");
  }
  TRANSACTION_URL = `${base.replace(/\/+$/u, "")}/api/v1/walletTransaction`;
  token = await generateToken(payloadId);
  configReady = true;
}

const updateWalletTransaction = async (user, amount, transactionId) => {
  try {
    await ensureServiceConfig();
    const postData = {
      user,
      amount,
      type: "charging deduction",
      status: "success",
      userWalletUpdated: true,
      transactionId,
    };
    const response = await axios.post(
      `${TRANSACTION_URL}/createOrUpdate`,
      postData,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return response.data ? response.data._id : null;
  } catch (error) {
    axiosErrorHandler(error, "updateWalletTransaction");
    return null;
  }
};

module.exports = { updateWalletTransaction };
