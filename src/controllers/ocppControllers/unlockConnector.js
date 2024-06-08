
const saveLogs = require('../../utils/saveLogs')


async function handleUnlockConnector({ params, identity }) {
    console.log(`Server got Unlock Connector Request from ${identity}:`, params);
  
    let messageType = 'UnlockConnector';
    await saveLogs(identity, messageType, params);
  
  
    return {
      CPID: identity,
      currentTime: new Date().toISOString(),
    };
  }
  


  module.exports = {handleUnlockConnector}