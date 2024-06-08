const axios = require('axios');

const axiosErrorHandler = (error) => {
    // console.log(error)
    if (axios.isAxiosError(error)) {
        // Axios error handling
        console.log('Axios error:', error.message);
        if (error.response) {
            // The request was made and the server responded with a status code
            console.log('Url:', error.response.config ? error.response.config.url : "");
            console.log('Response data:', error.response.data);
            console.log('Status code:', error.response.status);
            // console.log('Headers:', error.response.headers);
        } else if (error.request) {
            console.log('No response received:', error.request);
        } else {
            console.log('Error setting up the request:', error.message);
        }
    } else {
        console.log('Non-Axios error:', error.message);
    }

    return false;
}

module.exports = {axiosErrorHandler}