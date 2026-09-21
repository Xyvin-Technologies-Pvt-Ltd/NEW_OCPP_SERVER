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
   const prev = mobileClients.get(clientId)
   // Replace previous socket for this txn — otherwise the old `close` handler
   // deletes the NEW client from the map when the orphaned socket finally dies.
   if (prev && prev !== ws) {
     try {
       prev.removeAllListeners?.('close')
       prev.close()
     } catch (e) {
       console.log('addMobileClient close prev error:', e.message)
     }
   }
   mobileClients.set(clientId, ws);
}

async function getMobileClient(client) {
  let ws1 = await mobileClients.get( client);
  return ws1
}

 /** Only remove if [ws] is still the mapped client (or ws omitted). */
 async function deleteMobileClient(clientId, ws) {
   const current = mobileClients.get(clientId)
   if (ws != null && current && current !== ws) {
     console.log('deleteMobileClient skip — newer socket owns', clientId)
     return false
   }
   return mobileClients.delete(clientId);
}


module.exports = {
  addClient,
  getClient,
  deleteClient,
  addMobileClient,
  getMobileClient,
  deleteMobileClient
};
