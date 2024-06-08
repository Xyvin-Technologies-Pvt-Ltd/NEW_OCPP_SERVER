const { getMobileClient } = require('../middlewares/clientsManager');

// Function to send a message to a specific client
async function notifyClient (clientId, message) {
    const client = await getMobileClient(clientId)
    if (!client) {
        throw Error("EV Client not found");
    }

  
    const response = await client.send(message);



    if (response.status === 'Accepted') {
        console.log(`${ocppCommand} worked!`, response);
        return true
    } else {
        console.log(`${ocppCommand} rejected.`);
        throw new Error(`${ocppCommand} rejected.`);
    }



}

module.exports = notifyClient ;