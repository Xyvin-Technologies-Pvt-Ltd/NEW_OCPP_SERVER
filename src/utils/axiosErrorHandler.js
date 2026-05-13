const axios = require("axios");

const axiosErrorHandler = (error, context = "") => {
  const label = context ? ` ${context}` : "";
  if (axios.isAxiosError(error)) {
    if (error.response) {
      console.error(
        `[axios${label}]`,
        error.response.status,
        error.response.config?.url,
        error.response.data
      );
    } else if (error.request) {
      console.error(`[axios${label}] no response`);
    }
  } else {
    console.error(`[axios${label}]`, error.message);
  }
};

module.exports = { axiosErrorHandler };
