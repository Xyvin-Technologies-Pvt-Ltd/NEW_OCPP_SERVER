const OCPPLOG = require('../models/ocppLogs')
const { buildSearchText } = require('./logSearch')



async function saveLogs(identity, messageType, params, source) {
    try {
  
  
      let log = {
        source: source || 'CP',
        CPID: identity,
        messageType: messageType,
        payload: params,
        searchText: buildSearchText({
          CPID: identity,
          messageType,
          source: source || 'CP',
          payload: params,
        }),
      }
  
  
      let ocpp_log = await OCPPLOG(log);
      await ocpp_log.save()
    } catch (error) {
      console.log(error + `Error saving`)
  
    }
  }

  module.exports = saveLogs