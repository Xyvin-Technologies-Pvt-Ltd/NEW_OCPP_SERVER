const sendMessageToClient = require('./cmsToCp');

exports.remoteStopTransactionFunction = async (evID, transactionId) => {
    const messageType = 'RemoteStopTransaction';
    const payload = { transactionId: Number(transactionId) }

    // Do not close mobile WS here — handleStopTransaction pushes final kWh/SoC first.
    await sendMessageToClient(evID, messageType, payload)

    return `${messageType} command set`
}
