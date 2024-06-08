const axios = require('axios'); // Import Axios for making HTTP requests
require("dotenv").config();
const { axiosErrorHandler } = require('../utils/axiosErrorHandler')

const { getSecret } = require('../config/env.config');
const generateToken = require('../utils/generateToken');

let TRANSACTION_URL;
let AUTH_SECRET;
let token;




const setURL = async () => {
    let TRANSACTION_SERVICE_URL;

    try {
        if (process.env.NODE_ENV !== 'production') {
            TRANSACTION_SERVICE_URL = process.env.TRANSACTION_SERVICE_URL || 'http://localhost:5050';
        } else {
            const urlSecret = await getSecret();
            TRANSACTION_SERVICE_URL = urlSecret.TRANSACTION_SERVICE_URL;
            AUTH_SECRET = urlSecret.AUTH_SECRET;
            token = await generateToken(AUTH_SECRET);

        }

        TRANSACTION_URL = `${TRANSACTION_SERVICE_URL}/api/v1/walletTransaction`

    } catch (error) {
        console.error('Error setting secrets:', error);
        process.exit(1);
    }
};



const updateWalletTransaction = async (user, amount, transactionId) => {
    try {
        await setURL();

        const postData = {
            "user": user,
            "amount": amount,
            "type": "charging deduction",
            "status": "success",
            userWalletUpdated: true,
            transactionId: transactionId,
        }

        // Make a POST request
        const response = await axios.post(`${TRANSACTION_URL}/createOrUpdate`, postData, {
            headers: {
                Authorization: `Bearer ${token}`,
            }
        }) 
        return response.data ? response.data._id : null
    } catch (error) {
        axiosErrorHandler(error)
    }
}


module.exports = { updateWalletTransaction };

