const tryCatchHandler = (handlerFunction) => 
    async function (...args) {
        try {
            await handlerFunction(...args);
        } catch (error) {
            console.error("An error occurred:", error.message);
            // You can customize the error handling logic here
        }
    }

module.exports = {tryCatchHandler};