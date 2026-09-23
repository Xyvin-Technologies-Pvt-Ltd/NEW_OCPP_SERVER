const OCPPTransaction = require('../models/ocppTransaction')
const mongoose = require('mongoose')

/** Initiated with no Progress for this long → safe to auto-complete. */
const STALE_INITIATED_MS = 15 * 60 * 1000

/**
 * Progress with no meter/DB updates for this long AND connector clearly idle
 * → orphan (charger stopped without StopTransaction, or CSMS was down).
 * 45m >> typical MeterValues interval (30–60s), so live charges stay safe.
 */
const STALE_PROGRESS_MS = 45 * 60 * 1000

const IDLE_CONNECTOR_STATUSES = new Set([
  'Available',
  'Unavailable',
  'Faulted',
])

async function closeOpenTransactions(filter, reason = 'Abandoned', statuses = ['Initiated']) {
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
        closeBy: 'system',
      },
    }
  )
  return result
}

async function closeTransactionById(transactionId, reason = 'RemoteStop', statuses = ['Initiated', 'Progress']) {
  const txnId = Number(transactionId)
  if (!txnId) return null
  return OCPPTransaction.findOneAndUpdate(
    {
      transactionId: txnId,
      transaction_status: { $in: statuses },
    },
    {
      $set: {
        transaction_status: 'Completed',
        endTime: new Date(),
        closureReason: reason,
        closeBy: 'system',
      },
    },
    { new: true }
  )
}

async function closeOpenTransactionsForUser(
  userId,
  reason = 'Abandoned',
  statuses = ['Initiated']
) {
  if (!userId) return { modifiedCount: 0 }
  return closeOpenTransactions({ user: userId }, reason, statuses)
}

async function _connectorStatus(cpid, connectorId) {
  const machine = await mongoose.connection.db
    .collection('evmachines')
    .findOne({ CPID: cpid }, { projection: { connectors: 1 } })
  if (!machine || !Array.isArray(machine.connectors)) return null
  const conn = machine.connectors.find(
    (c) => Number(c.connectorId) === Number(connectorId)
  )
  return conn ? String(conn.status || '') : null
}

/**
 * Production-safe: only close Initiated older than STALE_INITIATED_MS.
 */
async function closeStaleInitiatedIfNeeded(txn) {
  if (!txn || txn.transaction_status !== 'Initiated') return false
  const started = new Date(txn.startTime || txn.createdAt || 0).getTime()
  if (!started || Number.isNaN(started)) return false
  if (Date.now() - started < STALE_INITIATED_MS) return false

  await closeTransactionById(txn.transactionId, 'StaleInitiated', ['Initiated'])
  console.log(
    `Closed stale Initiated txn ${txn.transactionId} (age > ${STALE_INITIATED_MS / 60000}m)`
  )
  return true
}

/**
 * Production-safe orphan Progress cleanup — BOTH required:
 *  1) No DB updates for STALE_PROGRESS_MS (no MeterValues / activity)
 *  2) Connector status is clearly idle (Available / Unavailable / Faulted)
 *
 * Does NOT close on Finishing/Preparing/Charging/Suspended alone.
 * Does NOT close from StatusNotification in real time.
 */
async function closeStaleProgressOrphanIfNeeded(txn) {
  if (!txn || txn.transaction_status !== 'Progress') return false

  const lastActivity = new Date(
    txn.updatedAt || txn.startTime || txn.createdAt || 0
  ).getTime()
  if (!lastActivity || Number.isNaN(lastActivity)) return false
  if (Date.now() - lastActivity < STALE_PROGRESS_MS) return false

  const status = await _connectorStatus(txn.cpid, txn.connectorId)
  if (!status || !IDLE_CONNECTOR_STATUSES.has(status)) {
    return false
  }

  await closeTransactionById(
    txn.transactionId,
    `StaleProgressOrphan:${status}`,
    ['Progress']
  )
  console.log(
    `Closed orphan Progress txn ${txn.transactionId} — no activity > ${STALE_PROGRESS_MS / 60000}m and connector ${status}`
  )
  return true
}

/** Run all production-safe stale checks for one txn. */
async function closeStaleOpenSessionIfNeeded(txn) {
  if (await closeStaleInitiatedIfNeeded(txn)) return true
  if (await closeStaleProgressOrphanIfNeeded(txn)) return true
  return false
}

module.exports = {
  STALE_INITIATED_MS,
  STALE_PROGRESS_MS,
  closeOpenTransactions,
  closeTransactionById,
  closeOpenTransactionsForUser,
  closeStaleInitiatedIfNeeded,
  closeStaleProgressOrphanIfNeeded,
  closeStaleOpenSessionIfNeeded,
}
