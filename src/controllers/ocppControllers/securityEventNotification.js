
const saveLogs = require('../../utils/saveLogs')



async function handleSecurityEventNotification({ params, identity }) {

    console.log(`Server got StopNotification from ${identity}:`, params);
    let messageType = 'SecurityEventNotification';
    await saveLogs(identity, messageType, params);
  
    if (true) {
      return true
    } else {
      console.log(`Charging initiation failed for unauthorized user with ID tag ${idTag}`);
      return null;
    }
  }

  module.exports = {handleSecurityEventNotification}