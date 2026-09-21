const OCPPTransaction = require('../models/ocppTransaction')

/**
 * Mark that the CSMS asked the charger to stop (RemoteStopTransaction).
 * Kept in a tiny module to avoid circular requires with updateMeter.
 */
async function markStopRequested(transactionId) {
  const txnId = Number(transactionId)
  if (!txnId) return null
  return OCPPTransaction.findOneAndUpdate(
    {
      transactionId: txnId,
      transaction_status: { $in: ['Initiated', 'Progress'] },
    },
    { $set: { stopRequestedAt: new Date() } },
    { new: true }
  )
}

module.exports = { markStopRequested }
