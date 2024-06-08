
const saveLogs = require('../../utils/saveLogs')



async function handleChangeConfiguration({ params, identity }) {
  
    let messageType = 'Change Configuration';
    try {
      await saveLogs(identity, messageType, params);

  } catch (error) {
    console.log(error);
  }
  
    return {
      CPID: identity,
      currentTime: new Date().toISOString(),
    };
  }

  module.exports ={handleChangeConfiguration}