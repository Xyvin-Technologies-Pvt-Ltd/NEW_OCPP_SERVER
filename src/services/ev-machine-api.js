const axios = require("axios");
const { axiosErrorHandler } = require("../utils/axiosErrorHandler");
const generateToken = require("../utils/generateToken");

let EV_URL;
let token;
let configReady = false;

async function ensureServiceConfig() {
  if (configReady) return;
  const base = process.env.EV_MACHINE_SERVICE_URL;
  const payloadId = process.env.AUTH_SECRET;
  if (!base || !payloadId) {
    throw new Error("EV_MACHINE_SERVICE_URL and AUTH_SECRET are required");
  }
  EV_URL = `${base.replace(/\/+$/u, "")}/api/v1`;
  token = await generateToken(payloadId);
  configReady = true;
}

const authenticateChargePoint = async (evMachineCPID) => {
  try {
    await ensureServiceConfig();
    const response = await axios.get(`${EV_URL}/evMachine/evMachineCPID/${evMachineCPID}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data.status;
  } catch (error) {
    axiosErrorHandler(error, "authenticateChargePoint");
    return false;
  }
};

const statusEVPoint = async (evMachineId, params) => {
  try {
    await ensureServiceConfig();
    const response = await axios.post(
      `${EV_URL}/evMachine/updateStatusConnector/${evMachineId}`,
      params,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return response.data.status;
  } catch (error) {
    axiosErrorHandler(error, "statusEVPoint");
    return false;
  }
};

const statusCPID = async (evMachineId, status) => {
  try {
    await ensureServiceConfig();
    const response = await axios.post(
      `${EV_URL}/evMachine/updateStatusCPID/${evMachineId}`,
      { status },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return response.data.status;
  } catch (error) {
    axiosErrorHandler(error, "statusCPID");
    return false;
  }
};

const getChargingTariff = async (evMachineId) => {
  try {
    await ensureServiceConfig();
    const response = await axios.get(
      `${EV_URL}/evMachine/getChargingTariff/${evMachineId}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return response.data;
  } catch (error) {
    axiosErrorHandler(error, "getChargingTariff");
    return null;
  }
};

const getEvCount = async () => {
  try {
    await ensureServiceConfig();
    const response = await axios.get(`${EV_URL}/evMachine/getCount`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  } catch (error) {
    axiosErrorHandler(error, "getEvCount");
    return null;
  }
};

const getCPID = async (data) => {
  try {
    await ensureServiceConfig();
    const response = await axios.post(
      `${EV_URL}/evMachine/CPID`,
      { locations: data },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return response.data;
  } catch (error) {
    axiosErrorHandler(error, "getCPID");
    return null;
  }
};

module.exports = {
  authenticateChargePoint,
  getEvCount,
  statusEVPoint,
  statusCPID,
  getChargingTariff,
  getCPID,
};
