const saveLogs = require('../../utils/saveLogs')



async function handleFirmwareStatusNotification({ params, identity }) {
  
    let messageType = 'FirmwareStatusNotification';
    await saveLogs(identity, messageType, params);
  
  
    return {
      CPID: identity,
      currentTime: new Date().toISOString(),
    };
  }

  
  module.exports ={handleFirmwareStatusNotification}