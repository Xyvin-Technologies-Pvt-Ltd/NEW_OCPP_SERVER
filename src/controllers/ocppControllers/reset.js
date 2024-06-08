
const saveLogs = require('../../utils/saveLogs')



async function handleReset({ params, identity }) {
    console.log(`Server got Reset Request from ${identity}:`, params);
  
    let messageType = 'Reset';
    await saveLogs(identity, messageType, params);
  
    return {
      CPID: identity,
      currentTime: new Date().toISOString(),
    };
  }

  module.exports ={handleReset}