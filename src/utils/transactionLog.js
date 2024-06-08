
const OCPPTransaction = require('../models/ocppTransaction')
const { updateWalletTransaction } = require('../services/transaction-service-api');
const { addUserSessionUpdate } = require('../services/user-service-api');



async function saveTransactionLog(identity, params, transaction_status, transactionId, chargingTariff, userId, tax, transactionMode) {
  // Implement logic to save the transaction log to MongoDB using the OCPPTransaction model
  try {

    const transactionLog = new OCPPTransaction({
      transactionId: transactionId,
      startTime: new Date(),
      idTag: params.idTag,
      cpid: identity,
      connectorId: params.connectorId,
      meterStart: params.meterStart,
      transactionMode: transactionMode,
      chargingTariff: chargingTariff,
      user: userId,
      lastMeterValue: params.meterStart ? params.meterStart / 1000 : 0, //meterStart is in wh format, using /1000 to save it in kWh
      transaction_status: transaction_status,
      tax,
      // Add other fields based on params 
    });

    await transactionLog.save();
  } catch (error) {
    console.log('Error saving transaction log' + error)
  }
}


async function updateTransactionLog(params) {
  // Implement logic to save the transaction log to MongoDB using the OCPPTransaction model
  try {

    const transactionId = params.transactionId;
    const transactionData = await OCPPTransaction.findOne({ transactionId: transactionId })

    // const walletTransactionId = await updateWalletTransaction(transactionData.user, transactionData.totalAmount, transactionId)

    if (!transactionData) throw new Error(400, 'Transaction not found')
let totalUnits = (params.meterStop - transactionData.meterStart) / 1000
// let totalAmount = totalUnits * transactionData.chargingTariff

    const updatedTransaction = {

      endTime: new Date(),
      meterStop: params.meterStop,
      closureReason: params.reason,
      closeBy: 'mobile',
      // walletTransactionId: walletTransactionId,
      transaction_status: "Completed",
     totalUnits: totalUnits,
    //  totalAmount:totalAmount
    };

    let userupdateData = await OCPPTransaction.findByIdAndUpdate(transactionData._id, { $set: updatedTransaction }, { new: true });
    if (userupdateData) {

      //! for rfid as well
      let userId = userupdateData.user;
      let unitsConsumed = (userupdateData.meterStop - userupdateData.meterStart) / 1000
      let package = { userId: userId, unitsConsumed: unitsConsumed }
      try {
        await addUserSessionUpdate(package)
        console.log("User updated")


      } catch (error) {
        console.error('User not Updated')

      }
    }

  } catch (error) {
    console.log('Error saving transaction log' + error)
  }
}

module.exports = { saveTransactionLog, updateTransactionLog }