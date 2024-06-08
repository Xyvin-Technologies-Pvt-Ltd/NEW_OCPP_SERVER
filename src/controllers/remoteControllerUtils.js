const sendMessageToClient = require('./cmsToCp');
const { deleteMobileClient, getMobileClient } = require('../middlewares/clientsManager');

exports.remoteStopTransactionFunction = async (evID, transactionId) => {
    const messageType = 'RemoteStopTransaction';
    const mobClient = transactionId
    const payload = { transactionId: Number(transactionId) }

    await sendMessageToClient(evID, messageType, payload)
    const mobileWs = await getMobileClient(mobClient)
    if (mobileWs) {
        mobileWs.send(JSON.stringify({ type: 'transactionStop' }));
        mobileWs.close();
        deleteMobileClient(mobClient)
    }
    else {
    }

    return `${messageType} command set`
}