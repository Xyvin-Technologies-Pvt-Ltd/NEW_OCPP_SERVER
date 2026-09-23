const sendMessageToClient = require('./cmsToCp');
const { markStopRequested } = require('../utils/markStopRequested');

exports.remoteStopTransactionFunction = async (evID, transactionId) => {
    const messageType = 'RemoteStopTransaction';
    const payload = { transactionId: Number(transactionId) }

    // Do not close mobile WS here — handleStopTransaction / Finishing finalize pushes first.
    await sendMessageToClient(evID, messageType, payload)
    await markStopRequested(payload.transactionId).catch((e) =>
        console.log('markStopRequested:', e.message)
    )

    return `${messageType} command set`
}
