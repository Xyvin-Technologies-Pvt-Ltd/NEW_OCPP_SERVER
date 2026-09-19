
const { remoteStopTransactionFunction } = require('../controllers/remoteControllerUtils')
const OCPPTransaction = require('../models/ocppTransaction')
const { updateWalletTransaction } = require('../services/transaction-service-api')
const { reduceMoneyFromWallet } = require('../services/user-service-api')
const { applyServiceFeeOnce } = require('./applyServiceFee')


async function updateMeterAmount(transactionId, meterValue, actionType, currentSoc, chargeSpeed) {
  let userWalletUpdated = false
  //get transaction details from db, which contains user, chargingTariff
  // Incremental bill stays Δenergy × chargingTariff (energyRate). Service fee is once elsewhere.
  const transactionData = await OCPPTransaction.findOne({ transactionId })
  if (!transactionData) throw new Error(`Transaction with id ${transactionId} not found`)
  const lastMeterValue = transactionData.lastMeterValue
  const { user, chargingTariff } = transactionData

  // meterValue / lastMeterValue are in kWh; bill only the incremental delta
  const energyConsumed = meterValue - lastMeterValue
  const totalAmount = energyConsumed * chargingTariff

  if (totalAmount > 0 && (actionType === "meterValues" || actionType === "stopTransaction")) {
    const { status } = await reduceMoneyFromWallet(user, totalAmount, energyConsumed)
    if (!status) {
      if (actionType === "meterValues") {
        await remoteStopTransactionFunction(transactionData.cpid, transactionData.transactionId)
      } else {
        console.log(`StopTransaction wallet update failed for ${transactionId}; finalizing meter anyway`)
      }
    } else {
      userWalletUpdated = true
      await updateWalletTransaction(transactionData.user, totalAmount, transactionData.transactionId)
    }
  }

  // Always sync final register on stop (even when delta is 0 or wallet bill failed)
  if (actionType === "stopTransaction") {
    let updateBody = { lastMeterValue: meterValue }
    if (currentSoc) updateBody.currentSoc = currentSoc
    if (chargeSpeed) updateBody.chargeSpeed = chargeSpeed

    const update = { $set: updateBody }
    if (userWalletUpdated && totalAmount > 0) {
      update.$inc = { totalAmount: totalAmount }
    }
    await OCPPTransaction.updateOne({ transactionId }, update)
    return
  }

  // Mid-session: only advance meter/billing when wallet was charged for this delta
  if (!userWalletUpdated) return

  let updateBody = { lastMeterValue: meterValue }
  if (transactionData.transaction_status != "Completed") updateBody.transaction_status = "Progress"

  if (currentSoc) updateBody.currentSoc = currentSoc
  if (!transactionData.startSoc && currentSoc) updateBody.startSoc = currentSoc
  if (chargeSpeed) updateBody.chargeSpeed = chargeSpeed

  await OCPPTransaction.updateOne({ transactionId }, {
    $set: updateBody,
    $inc: { totalAmount: totalAmount }
  })

  // Retry one-time service fee if start-time wallet deduct failed (no-op when already applied / 0)
  if (actionType === "meterValues" && !transactionData.serviceFeeApplied && Number(transactionData.serviceAmount) > 0) {
    await applyServiceFeeOnce(transactionId)
  }
}


module.exports = { updateMeterAmount }
