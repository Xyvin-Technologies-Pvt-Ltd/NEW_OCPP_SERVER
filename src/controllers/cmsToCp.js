const { getClient } = require("../middlewares/clientsManager");
const saveLogs = require("../utils/saveLogs");

// Function to send a message to a specific client
async function sendMessageToClient(evID, messageType, payLoad) {
  const client = await getClient(evID);

  await saveLogs(evID, messageType, payLoad, "CMS");

  if (!client) {
    throw Error("EV Client not found");
  }

  let ocppCommand = messageType;
  let ocppPayload = payLoad;

  const response = await client.call(ocppCommand, ocppPayload);

  await saveLogs(evID, messageType, response, "CP");

  if (messageType === "GetConfiguration") {
    if (response) {
      console.log(`${ocppCommand} worked!`, response);
      return response;
    } else {
      console.log(`${ocppCommand} rejected.`);
      throw new Error(`${ocppCommand} rejected.`);
    }
  } else {
    if (response.status === "Accepted") {
      console.log(`${ocppCommand} worked!`, response);
      return response;
    } else {
      console.log(`${ocppCommand} rejected.`);
      throw new Error(`${ocppCommand} rejected.`);
    }
  }
}

module.exports = sendMessageToClient;
