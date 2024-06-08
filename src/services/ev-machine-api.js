const axios = require('axios');
require("dotenv").config();
const { getSecret } = require('../config/env.config');
const {axiosErrorHandler} = require('../utils/axiosErrorHandler');
const generateToken = require('../utils/generateToken');






let EV_URL;
let AUTH_SECRET;
let token;
const setURL = async () => {
    let EV_MACHINE_SERVICE_URL;

    try {
      if (process.env.NODE_ENV !== 'production') {
        EV_MACHINE_SERVICE_URL = process.env.EV_MACHINE_SERVICE_URL || 'http://localhost:5050';
      } else {
        const evUrlSecret = await getSecret();
        EV_MACHINE_SERVICE_URL = evUrlSecret.EV_MACHINE_SERVICE_URL;
        AUTH_SECRET = evUrlSecret.AUTH_SECRET;
      }

      EV_URL =  `${EV_MACHINE_SERVICE_URL}/api/v1` 
      token = await generateToken(AUTH_SECRET);

    } catch (error) {
      console.error('Error setting secrets:', error);
      process.exit(1);
    }
  };



const authenticateChargePoint = async (evMachineCPID) => {
    try {
        await setURL();


        const response = await axios.get(`${EV_URL}/evMachine/evMachineCPID/${evMachineCPID}`, {
          headers: {
            Authorization: `Bearer ${token}`,
        }
        })
        return response.data.status

    } catch (error) {
      axiosErrorHandler(error)
    }

}

const statusEVPoint = async (evMachineId, params) => {
    try {
        await setURL();
        const response = await axios.post(`${EV_URL}/evMachine/updateStatusConnector/${evMachineId}`,params, {
          headers: {
            Authorization: `Bearer ${token}`,
        }
        })
        return response.data.status

    } catch (error) {
      axiosErrorHandler(error)
    }

}

const statusCPID = async (evMachineId, status) => {
    try {
        await setURL();
        const response = await axios.post(`${EV_URL}/evMachine/updateStatusCPID/${evMachineId}`,{status}, {
          headers: {
            Authorization: `Bearer ${token}`,
        }
        }) //
        return response.data.status

    } catch (error) {
      axiosErrorHandler(error)
    }

}

const getChargingTariff = async (evMachineId) => {
  try {
      await setURL();
      
      const response = await axios.get(`${EV_URL}/evMachine/getChargingTariff/${evMachineId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
      }
      }) //
      // const response = await axios.get(`${EV_URL}/evMachine/getChargingTariff/${evMachineId}`) //
      return response.data
  } catch (error) {
    axiosErrorHandler(error)
  }

}


const getEvCount = async()=>{
  try {
    await setURL();
   
    const response = await axios.get(`${EV_URL}/evMachine/getCount`, {
      headers: {
        Authorization: `Bearer ${token}`,
    }
    }) //
    return response.data
} catch (error) {
  axiosErrorHandler(error)
}
}

const getCPID = async(data)=>{
  try {
    await setURL();
    const reqBody = data;
    const response = await axios.post(`${EV_URL}/evMachine/CPID`,{ locations:reqBody }, {
      headers: {
        Authorization: `Bearer ${token}`,
    },
    })
    return response.data
  } catch (error) {
    axiosErrorHandler(error)
  }
}



module.exports = {authenticateChargePoint, getEvCount,statusEVPoint,statusCPID, getChargingTariff, getCPID};

