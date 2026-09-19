const OCPPTransaction = require('../models/ocppTransaction');
const { updateWalletTransaction } = require('../services/transaction-service-api');
const { reduceMoneyFromWallet } = require('../services/user-service-api');

/**
 * Deduct serviceAmount once per transaction (idempotent).
 * No-op when serviceAmount is missing/0 or already applied — preserves legacy flows.
 */
async function applyServiceFeeOnce(transactionId) {
  try {
    const claimed = await OCPPTransaction.findOneAndUpdate(
      {
        transactionId,
        serviceFeeApplied: { $ne: true },
        serviceAmount: { $gt: 0 },
      },
      {
        $set: { serviceFeeApplied: true },
      },
      { new: false }
    );

    if (!claimed) return false;

    const fee = Number(claimed.serviceAmount) || 0;
    if (fee <= 0) {
      await OCPPTransaction.updateOne(
        { transactionId },
        { $set: { serviceFeeApplied: false } }
      );
      return false;
    }

    const { status } = await reduceMoneyFromWallet(claimed.user, fee, 0);
    if (!status) {
      await OCPPTransaction.updateOne(
        { transactionId },
        { $set: { serviceFeeApplied: false } }
      );
      return false;
    }

    await OCPPTransaction.updateOne(
      { transactionId },
      { $inc: { totalAmount: fee } }
    );
    await updateWalletTransaction(claimed.user, fee, transactionId);
    return true;
  } catch (error) {
    console.log('applyServiceFeeOnce error', error);
    return false;
  }
}

module.exports = { applyServiceFeeOnce };
