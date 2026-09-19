const saveLogs = require('../../utils/saveLogs')
const { updateTransactionLog } = require('../../utils/transactionLog')
const { updateMeterAmount } = require('../../utils/updateMeter')
const OCPPTransaction = require('../../models/ocppTransaction')
const { pushLiveSessionUpdate, pushTransactionStopped } = require('../../utils/liveSessionPush')

/** Pull SoC from StopTransaction.transactionData when the CP sends it. */
function extractSocFromStopParams(params) {
  try {
    const blocks = params.transactionData
    if (!Array.isArray(blocks)) return null
    for (const block of blocks) {
      const samples = block.sampledValue || []
      for (const sample of samples) {
        if (sample.measurand === 'SoC' && sample.value != null && sample.value !== '') {
          return Number(sample.value)
        }
      }
    }
  } catch (error) {
    console.log('extractSocFromStopParams error', error.message)
  }
  return null
}



async function handleStopTransaction({ params, identity }) {
  console.log(`Server got StopTransaction Notification from ${identity}:`, params);

  let messageType = 'StopTransaction';
  const transactionId = params.transactionId
  const meterValue = params.meterStop / 1000 // meterStop is Wh → kWh
  try {

    await saveLogs(identity, messageType, params);

    const stopSoc = extractSocFromStopParams(params)

    // Bill any Wh after last MeterValues, sync lastMeterValue (+ SoC if present)
    await updateMeterAmount(transactionId, meterValue, "stopTransaction", stopSoc)
    await updateTransactionLog(params);

    const transaction = await OCPPTransaction.findOne({ transactionId: Number(transactionId) })
    const finalUnitUsed = transaction && transaction.meterStart != null
      ? (params.meterStop - transaction.meterStart) / 1000
      : 0

    const finalSoc = stopSoc != null
      ? stopSoc
      : (transaction?.currentSoc ?? 0)

    // Final live snapshot first so the app applies kWh + SoC before disconnect
    await pushLiveSessionUpdate(transactionId, {
      unitUsed: finalUnitUsed,
      percentage: finalSoc,
      status: 'Charging',
    })
    await pushTransactionStopped(transactionId, finalUnitUsed, finalSoc)
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
