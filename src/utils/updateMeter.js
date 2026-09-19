
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
    if (currentSoc != null && currentSoc !== '') {
      updateBody.currentSoc = Number(currentSoc)
    }
    if (chargeSpeed) updateBody.chargeSpeed = chargeSpeed

    const update = { $set: updateBody }
    if (userWalletUpdated && totalAmount > 0) {
      update.$inc = { totalAmount: totalAmount }
    }
    await OCPPTransaction.updateOne({ transactionId }, update)
    return
  }

  // Mid-session: always persist SoC / speed so stop snapshot is not stale.
  // Only advance lastMeterValue + bill when wallet charged this delta.
  if (totalAmount > 0 && !userWalletUpdated) {
    if (currentSoc != null && currentSoc !== '') {
      await OCPPTransaction.updateOne(
        { transactionId },
        { $set: { currentSoc: Number(currentSoc) } }
      )
    }
    return
  }

  let updateBody = {}
  if (userWalletUpdated) {
    updateBody.lastMeterValue = meterValue
    if (transactionData.transaction_status != "Completed") {
      updateBody.transaction_status = "Progress"
    }
  }

  if (currentSoc != null && currentSoc !== '') {
    updateBody.currentSoc = Number(currentSoc)
    if (!transactionData.startSoc) updateBody.startSoc = Number(currentSoc)
  }
  if (chargeSpeed) updateBody.chargeSpeed = chargeSpeed

  if (Object.keys(updateBody).length === 0) return

  const update = { $set: updateBody }
  if (userWalletUpdated && totalAmount > 0) {
    update.$inc = { totalAmount: totalAmount }
  }
  await OCPPTransaction.updateOne({ transactionId }, update)

  // Retry one-time service fee if start-time wallet deduct failed (no-op when already applied / 0)
  if (actionType === "meterValues" && !transactionData.serviceFeeApplied && Number(transactionData.serviceAmount) > 0) {
    await applyServiceFeeOnce(transactionId)
  }
}


module.exports = { updateMeterAmount }
