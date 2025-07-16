require("dotenv").config();
const axios = require('axios'); // Import Axios for making HTTP requests
const { axiosErrorHandler } = require('../utils/axiosErrorHandler')
const { getSecret } = require('../config/env.config');
const generateToken = require('../utils/generateToken');


let USER_URL;
let AUTH_SECRET='Nz9rG9y6dA3jT5wP8qZ4xW6sVeK2iS3uQ5oX8vC7bP';
let token;
const setURL = async () => {
    let USER_SERVICE_URL;

    try {
        if (process.env.NODE_ENV === 'production') {
            USER_SERVICE_URL = process.env.USER_SERVICE_URL || 'http://localhost:5050';
        } else {
            const userUrlSecret = await getSecret();
            USER_SERVICE_URL = userUrlSecret.USER_SERVICE_URL;
            AUTH_SECRET = userUrlSecret.AUTH_SECRET;
            token = await generateToken(AUTH_SECRET);
        }

        USER_URL = `${USER_SERVICE_URL}/api/v1/users`

    } catch (error) {
        console.error('Error setting secrets:', error);
        process.exit(1);
    }
};



const authenticateUserByRFID = async (rfidTag) => {
    try {
        await setURL();

        const response = await axios.get(`${USER_URL}/transaction/rfid-authenticate/${rfidTag}`, {
            headers: {
                Authorization: `Bearer ${token}`,
            }
        })
console.log(token)
        let res = response.data
        if (!res.status) throw new Error(`Some error from service connections/UnAuthorized`)
        return res.status
    } catch (error) {
        axiosErrorHandler(error)
    }

}


const authenticateUserByUserId = async (userId) => {
    try {
        await setURL();
        const response = await axios.get(`${USER_URL}/transaction/authenticate/${userId}`, {
            headers: {
                Authorization: `Bearer ${token}`,
            }
        })
        return response.data.status

    } catch (error) {
        axiosErrorHandler(error)

    }

}

const addUserSessionUpdate = async (data) => {
    try {
        await setURL();

        const response = await axios.put(`${USER_URL}/transaction/increaseSessions`, data, {
            headers: {
                Authorization: `Bearer ${token}`,
            }
        })
        return response.data.status

    } catch (error) {
        axiosErrorHandler(error)

    }

}


// const getUserId = async (rfidTag) => {
//     try {
//         await setURL();
//         const response = await axios.get(`${USER_URL}/getUserIdFromRfid/${rfidTag}`)
//         return response.data.status ? response.data.userId : null
//     } catch (error) {
//         axiosErrorHandler(error)
//     }
// }

const getUserIdAndChargingTariff = async (rfidTag) => {
    try {
        await setURL();
        const response = await axios.get(`${USER_URL}/getChargingTariff/fromRfid/${rfidTag}`, {
            headers: {
                Authorization: `Bearer ${token}`,
            }
        })
        return response.data.status ? response.data.result : null
    } catch (error) {
        axiosErrorHandler(error)
    }
}

const reduceMoneyFromWallet = async (userId, amount, energyConsumed) => {
    try {
        await setURL();
        console.log('userId, amount, energyConsumed', userId, amount, energyConsumed);
        const response = await axios.put(`${USER_URL}/deductFromWallet/${userId}`, { amount, unitsUsed: energyConsumed }, {
            headers: {
                Authorization: `Bearer ${token}`,
            }
        })
        return {
            status: response.data.status,
            walletAmount: response.data.result && response.data.result.walletAmount ? response.data.result.walletAmount : null,
        }
    } catch (error) {
        axiosErrorHandler(error)

        return {
            status: false,
            walletAmount: null, 
        }
    }
}


//for firebase
const getUserDeviceToken = async (userId) => {
    try {
        await setURL();
        const response = await axios.get(`${USER_URL}/getFirebaseId/${userId}`, {
            headers: {
                Authorization: `Bearer ${token}`,
            }
        })
        return response.data.status ? response.data.result : null
    } catch (error) {
        axiosErrorHandler(error)
    }
}

module.exports = { getUserDeviceToken, authenticateUserByRFID, authenticateUserByUserId, getUserIdAndChargingTariff, reduceMoneyFromWallet, addUserSessionUpdate };

