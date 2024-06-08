const saveLogs = require('../../utils/saveLogs')
const {statusCPID} = require('../../services/ev-machine-api')
let HEARTBEAT_INTERVAL = 30; //30*1000(from front end)



async function handleBootNotification({ params, identity }) {
    try {
      console.log(`Server got Boot Notification from ${identity}:`, params);
      let messageType = 'BootNotification';
      await saveLogs(identity, messageType, params);
      let status = 'Available'
      try {
        await statusCPID(identity, status)
        await saveLogs(identity, 'Online', {});
      } catch (error) {
        console.log(error);
      }
      return {
        status: "Accepted",
        interval: HEARTBEAT_INTERVAL,
        currentTime: new Date().toISOString(),
      };
    }
    catch (error) {
      console.log(error);
    }
  }

  module.exports = { handleBootNotification }