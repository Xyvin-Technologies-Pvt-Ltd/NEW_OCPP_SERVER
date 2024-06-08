
const { remoteStopTransactionFunction } = require('../controllers/remoteControllerUtils')
const OCPPTransaction = require('../models/ocppTransaction')
const { updateWalletTransaction } = require('../services/transaction-service-api')
const { reduceMoneyFromWallet } = require('../services/user-service-api')


async function updateMeterAmount(transactionId, meterValue, actionType, currentSoc, chargeSpeed) {
  let userWalletUpdated
  //get transaction details from db, which contains user, chargingTariff
  const transactionData = await OCPPTransaction.findOne({ transactionId })
  if (!transactionData) throw new Error(`Transaction with id ${transactionId} not found`)
  const lastMeterValue = transactionData.lastMeterValue
  const { user, chargingTariff } = transactionData

  // if (meterValue < lastMeterValue) throw new Error(`Last meter value(${lastMeterValue}) greater than current meter value(${meterValue})`)
  const energyConsumed = meterValue - lastMeterValue // find energy consumed by finding diff between current meter value and last meter value
  const totalAmount = energyConsumed * chargingTariff

  if (totalAmount && actionType === "meterValues") {
    const { status, walletAmount } = await reduceMoneyFromWallet(user, totalAmount, energyConsumed)
    // if (!status) throw new Error('User Wallet could not be updated')
    if (!status) await remoteStopTransactionFunction(transactionData.cpid, transactionData.transactionId)
    else {
      userWalletUpdated = true
      await updateWalletTransaction(transactionData.user, totalAmount, transactionData.transactionId)
    }
  }

  //If user wallet is not updated due to any issues, the transaction shouldn't be updated as well
  if (!userWalletUpdated) return

  let updateBody = { lastMeterValue: meterValue, }
  if (transactionData.transaction_status != "Completed") updateBody.transaction_status = "Progress" //if transaction is already completed, don't update transaction_status

  if (currentSoc) updateBody.currentSoc = currentSoc
  if (!transactionData.startSoc && currentSoc) updateBody.startSoc = currentSoc

  if (chargeSpeed) updateBody.chargeSpeed = chargeSpeed

  await OCPPTransaction.updateOne({ transactionId }, {
    $set: updateBody,
    $inc: { totalAmount: totalAmount }
  })
}


module.exports = { updateMeterAmount }