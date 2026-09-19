const saveLogs = require('../../utils/saveLogs')
const { updateTransactionLog } = require('../../utils/transactionLog')
const { updateMeterAmount } = require('../../utils/updateMeter')
const OCPPTransaction = require('../../models/ocppTransaction')
const { pushLiveSessionUpdate, pushTransactionStopped } = require('../../utils/liveSessionPush')



async function handleStopTransaction({ params, identity }) {
  console.log(`Server got StopTransaction Notification from ${identity}:`, params);

  let messageType = 'StopTransaction';
  const transactionId = params.transactionId
  const meterValue = params.meterStop / 1000 // meterStop is Wh → kWh
  try {

    await saveLogs(identity, messageType, params);

    // Bill any Wh after last MeterValues, sync lastMeterValue to meterStop
    await updateMeterAmount(transactionId, meterValue, "stopTransaction")
    await updateTransactionLog(params);

    const transaction = await OCPPTransaction.findOne({ transactionId: Number(transactionId) })
    const finalUnitUsed = transaction && transaction.meterStart != null
      ? (params.meterStop - transaction.meterStart) / 1000
      : 0

    // Final live snapshot first so the app applies kWh before disconnect
    await pushLiveSessionUpdate(transactionId, {
      unitUsed: finalUnitUsed,
      percentage: transaction?.currentSoc ?? 0,
      status: 'Charging',
    })
    await pushTransactionStopped(transactionId, finalUnitUsed)
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
