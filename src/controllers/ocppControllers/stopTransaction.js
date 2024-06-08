const { getMobileClient } = require('../../middlewares/clientsManager');
const saveLogs = require('../../utils/saveLogs')
const { updateTransactionLog } = require('../../utils/transactionLog')
const { updateMeterAmount } = require('../../utils/updateMeter')



async function handleStopTransaction({ params, identity }) {
  console.log(`Server got StopTransaction Notification from ${identity}:`, params);

  let messageType = 'StopTransaction';
  const transactionId = params.transactionId
  const meterValue = params.meterStop / 1000 //meter value in Wh so /1000 to convert it to kWh
  try {

    await saveLogs(identity, messageType, params);

    await updateMeterAmount(transactionId, meterValue, "stopTransaction")
    await updateTransactionLog(params);

    const mobileClient = transactionId.toString()
    const mobileWs = await getMobileClient(mobileClient);
    
    if (mobileWs) {
      let result = { type: 'Transaction Stopped'}
      mobileWs.send(JSON.stringify(result));
  } else {
      console.log('Client Not Found', mobileClient)
  }
  } catch (error) {
    console.log('Stop Transaction Error :', error)
  }

  if (transactionId) {
    return {
      transactionId,
      idTagInfo: {
        status: "Accepted",
      },
    };
  } else {
    return {
      transactionId: 0,
      idTagInfo: {
        status: "Invalid",
      },
    };
  }


}


module.exports = { handleStopTransaction }