const allClients = new Map();
const mobileClients = new Map(); // Map to track mobile client connections


 async function addClient(client) {
  console.log("🚀 ~ addClient ~ client:", client)
    allClients.set(client.identity, client);
}

async function getClient(identity) {
  console.log("🚀 ~ getClient ~ identity:", identity);
  let ws = await allClients.get(identity)
  return ws
}

function deleteClient(identity) {
  return allClients.delete(identity);
}

//For mobile App

 async function addMobileClient(clientId, ws) {
   console.log("🚀 ~ addMobileClient ~ clientId:", clientId)
   console.log("🚀 ~ addMobileClient ~ ws:", ws)
   mobileClients.set(clientId, ws);
  

}
async function getMobileClient(client) {
  let ws1 = await mobileClients.get( client);
  return ws1
}

 async function deleteMobileClient(client) {
     mobileClients.delete( client);
}


module.exports = {
  addClient,
  getClient,
  deleteClient,
  addMobileClient,
  getMobileClient,
  deleteMobileClient
};
