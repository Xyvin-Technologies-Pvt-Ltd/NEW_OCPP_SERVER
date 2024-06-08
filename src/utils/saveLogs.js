const OCPPLOG = require('../models/ocppLogs')



async function saveLogs(identity, messageType, params, source) {
    try {
  
  
      let log = {
        source: source || 'CP',
        CPID: identity,
        messageType: messageType,
        payload: params
      }
  
  
      let ocpp_log = await OCPPLOG(log);
      await ocpp_log.save()
    } catch (error) {
      console.log(error + `Error saving`)
  
    }
  }

  module.exports = saveLogs