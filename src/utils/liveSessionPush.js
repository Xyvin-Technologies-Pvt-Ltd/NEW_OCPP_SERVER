const { getMobileClient } = require('../middlewares/clientsManager')
const OCPPTransaction = require('../models/ocppTransaction')
const { getBalance } = require('../controllers/mobile-apis')

/**
 * Push live charging snapshot to the mobile WS for a transaction.
 * unitUsed is session energy in kWh: (currentRegisterKwh - meterStartWh/1000)
 */
async function pushLiveSessionUpdate(transactionId, overrides = {}) {
  const txnId = Number(transactionId)
  if (!txnId) return false

  const mobileWs = await getMobileClient(txnId.toString())
  if (!mobileWs) {
    console.log('Client Not Found', txnId)
    return false
  }

  const transaction = await OCPPTransaction.findOne({ transactionId: txnId })
  if (!transaction) return false

  let unitUsed
  if (overrides.unitUsed != null) {
    unitUsed = Number(overrides.unitUsed)
  } else {
    const meterStartKwh = transaction.meterStart ? transaction.meterStart / 1000 : 0
    unitUsed = (transaction.lastMeterValue || 0) - meterStartKwh
  }

  let balance = overrides.balance
  if (balance == null) {
    try {
      balance = await getBalance(txnId)
    } catch (error) {
      console.log('pushLiveSessionUpdate getBalance error', error.message)
      balance = 0
    }
  }

  const percentage = overrides.percentage != null
    ? overrides.percentage
    : (transaction.currentSoc ?? 0)

  const result = {
    type: 'SoC',
    percentage: String(Math.round(Number(percentage) || 0)),
    unitUsed: Number(Number(unitUsed).toFixed(2)),
    balance: Number(Number(balance).toFixed(2)),
    status: overrides.status || 'Charging',
  }

  mobileWs.send(JSON.stringify(result))
  return true
}

async function pushTransactionStopped(transactionId, unitUsed, percentage) {
  const txnId = Number(transactionId)
  if (!txnId) return false

  const mobileWs = await getMobileClient(txnId.toString())
  if (!mobileWs) {
    console.log('Client Not Found', txnId)
    return false
  }

  const payload = { type: 'Transaction Stopped' }
  if (unitUsed != null) payload.unitUsed = Number(Number(unitUsed).toFixed(2))
  if (percentage != null && percentage !== '') {
    payload.percentage = String(Math.round(Number(percentage)))
  }
  mobileWs.send(JSON.stringify(payload))
  return true
}

module.exports = { pushLiveSessionUpdate, pushTransactionStopped }
