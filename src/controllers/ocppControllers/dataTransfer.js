
const saveLogs = require('../../utils/saveLogs')


async function handleDataTransfer({ params, identity }) {
  
    let messageType = 'DataTransfer';
    await saveLogs(identity, messageType, params);
  
  
    return {
      CPID: identity,
      currentTime: new Date().toISOString(),
    };
  }
  

  module.exports = {handleDataTransfer}