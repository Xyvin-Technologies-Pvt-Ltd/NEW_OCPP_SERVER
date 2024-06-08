
const saveLogs = require('../../utils/saveLogs')




async function handleClearCache({ params, identity }) {
    let messageType = 'ClearCache';
    await saveLogs(identity, messageType, params);
  
    return {
      CPID: identity,
      currentTime: new Date().toISOString(),
    };
  }
  

  module.exports = {handleClearCache}