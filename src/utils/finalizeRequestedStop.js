const OCPPTransaction = require('../models/ocppTransaction')
const { updateMeterAmount } = require('./updateMeter')
const { pushLiveSessionUpdate, pushTransactionStopped } = require('./liveSessionPush')

/**
 * After RemoteStop: real chargers often sit in Finishing until cable unplug and
 * delay StopTransaction. That left the app on "Finishing..." forever.
 *
 * When we already requested stop and the connector reports Finishing/Available,
 * finalize with lastMeterValue so the UI leaves Finishing. A later StopTransaction
 * still reconciles any extra Wh (incremental billing).
 */
async function finalizeRequestedStopIfNeeded(cpid, params = {}) {
  const status = String(params.status || '')
  if (status !== 'Finishing' && status !== 'Available') return false

  const connectorId = Number(params.connectorId)
  if (!cpid || !connectorId) return false

  const txn = await OCPPTransaction.findOne({
    cpid: String(cpid),
    connectorId,
    transaction_status: { $in: ['Initiated', 'Progress'] },
    stopRequestedAt: { $exists: true, $ne: null },
  })
  if (!txn) return false

  const transactionId = txn.transactionId
  const meterStartWh = txn.meterStart != null ? Number(txn.meterStart) : 0
  const lastKwh = Number(txn.lastMeterValue) || (meterStartWh / 1000)
  const meterStopWh = Math.round(lastKwh * 1000)

  console.log(
    `RemoteStop finalize on ${status}: txn ${transactionId} @ ${lastKwh} kWh (awaiting optional StopTransaction reconcile)`
  )

  try {
    await updateMeterAmount(transactionId, lastKwh, 'stopTransaction')
  } catch (e) {
    console.log('finalizeRequestedStop updateMeterAmount:', e.message)
  }

  try {
    await OCPPTransaction.findOneAndUpdate(
      {
        transactionId: Number(transactionId),
        transaction_status: { $in: ['Initiated', 'Progress'] },
      },
      {
        $set: {
          transaction_status: 'Completed',
          endTime: new Date(),
          meterStop: meterStopWh,
          closureReason: `RemoteStop:${status}`,
          closeBy: 'system',
          totalUnits: lastKwh - meterStartWh / 1000,
        },
      }
    )
  } catch (e) {
    console.log('finalizeRequestedStop ensure-Complete:', e.message)
  }

  const finalUnitUsed =
    meterStartWh > 0 ? lastKwh - meterStartWh / 1000 : lastKwh

  try {
    await pushLiveSessionUpdate(transactionId, {
      unitUsed: finalUnitUsed,
      skipPercentage: true,
      status: 'Disconnected',
    })
    await pushTransactionStopped(transactionId, finalUnitUsed)
  } catch (e) {
    console.log('finalizeRequestedStop live push:', e.message)
  }

  return true
}

module.exports = { finalizeRequestedStopIfNeeded }
