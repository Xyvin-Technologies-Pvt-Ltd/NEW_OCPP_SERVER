const saveLogs = require('../../utils/saveLogs')
const { updateTransactionLog } = require('../../utils/transactionLog')
const { updateMeterAmount } = require('../../utils/updateMeter')
const OCPPTransaction = require('../../models/ocppTransaction')
const { pushLiveSessionUpdate, pushTransactionStopped } = require('../../utils/liveSessionPush')

/**
 * Charger confirmed stop. DB must become Completed even if wallet/WS push fails,
 * otherwise activeSession keeps returning a ghost Progress session forever.
 */
async function handleStopTransaction({ params, identity }) {
  console.log(`Server got StopTransaction Notification from ${identity}:`, params);

  const messageType = 'StopTransaction'
  const transactionId = params.transactionId
  const meterValue = params.meterStop / 1000 // meterStop is Wh → kWh

  await saveLogs(identity, messageType, params).catch((e) =>
    console.log('StopTransaction saveLogs error:', e.message)
  )

  // 1) Final meter / wallet delta (best effort)
  try {
    await updateMeterAmount(transactionId, meterValue, 'stopTransaction')
  } catch (error) {
    console.log('StopTransaction updateMeterAmount error:', error.message)
  }

  // 2) Mark Completed via normal stop path (wallet/user side-effects)
  try {
    await updateTransactionLog(params)
  } catch (error) {
    // updateTransactionLog often swallows errors internally — still guarantee below
    console.log('StopTransaction updateTransactionLog error:', error.message)
  }

  // 3) Guarantee Completed even if updateTransactionLog no-op'd / swallowed errors.
  // Idempotent: only touches Initiated|Progress. This is what stops ghost activeSession.
  try {
    const forced = await OCPPTransaction.findOneAndUpdate(
      {
        transactionId: Number(transactionId),
        transaction_status: { $in: ['Initiated', 'Progress'] },
      },
      {
        $set: {
          transaction_status: 'Completed',
          endTime: new Date(),
          meterStop: params.meterStop,
          closureReason: params.reason || 'StopTransaction',
          closeBy: 'charger',
        },
      },
      { new: true }
    )
    if (forced) {
      console.log(
        `StopTransaction ensured Completed for txn ${transactionId}`
      )
    }
  } catch (e2) {
    console.log('StopTransaction ensure-Complete error:', e2.message)
  }

  // 4) Notify mobile app (best effort — must not block completion)
  try {
    const transaction = await OCPPTransaction.findOne({
      transactionId: Number(transactionId),
    })
    const finalUnitUsed =
      transaction && transaction.meterStart != null
        ? (params.meterStop - transaction.meterStart) / 1000
        : 0

    await pushLiveSessionUpdate(transactionId, {
      unitUsed: finalUnitUsed,
      skipPercentage: true,
      status: 'Disconnected',
    })
    await pushTransactionStopped(transactionId, finalUnitUsed)
  } catch (error) {
    console.log('StopTransaction live push error:', error.message)
  }

  if (transactionId) {
    return {
      transactionId,
      idTagInfo: { status: 'Accepted' },
    }
  }
  return {
    transactionId: 0,
    idTagInfo: { status: 'Invalid' },
  }
}

module.exports = { handleStopTransaction }
