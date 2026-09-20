const OCPPTransaction = require('../models/ocppTransaction')

/**
 * Mark open OCPP sessions as Completed so the user is not blocked from
 * starting a new charge (stuck Initiated/Progress after cancel / failed stop).
 */
async function closeOpenTransactions(filter, reason = 'Abandoned', statuses = ['Initiated', 'Progress']) {
  const result = await OCPPTransaction.updateMany(
    {
      ...filter,
      transaction_status: { $in: statuses },
    },
    {
      $set: {
        transaction_status: 'Completed',
        endTime: new Date(),
        closureReason: reason,
        closeBy: 'mobile',
      },
    }
  )
  return result
}

async function closeTransactionById(transactionId, reason = 'RemoteStop') {
  const txnId = Number(transactionId)
  if (!txnId) return null
  return OCPPTransaction.findOneAndUpdate(
    {
      transactionId: txnId,
      transaction_status: { $in: ['Initiated', 'Progress'] },
    },
    {
      $set: {
        transaction_status: 'Completed',
        endTime: new Date(),
        closureReason: reason,
        closeBy: 'mobile',
      },
    },
    { new: true }
  )
}

/** Default: only abandon Initiated (never started / stuck), keep Progress alive. */
async function closeOpenTransactionsForUser(
  userId,
  reason = 'Abandoned',
  statuses = ['Initiated']
) {
  if (!userId) return { modifiedCount: 0 }
  return closeOpenTransactions({ user: userId }, reason, statuses)
}

module.exports = {
  closeOpenTransactions,
  closeTransactionById,
  closeOpenTransactionsForUser,
}
