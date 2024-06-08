const { deleteMobileClient, getMobileClient } = require('../middlewares/clientsManager');
const { authenticateUserByUserId } = require('../services/user-service-api');
const sendMessageToClient = require('./cmsToCp');
const { remoteStopTransactionFunction } = require('./remoteControllerUtils');


exports.remoteStartTransaction = async (req, res, next) => {
    const evID = req.params.evID;
    const messageType = 'RemoteStartTransaction';
    const payLoad = {
        idTag: req.body.idTag,
        connectorId: req.body.connectorId,
    }
    try {
        let isAuthenticated = await authenticateUserByUserId(req.body.idTag)
        if (!isAuthenticated) return res.status(400).json({ success: false, message: `Authentication failed - no money` })

        await sendMessageToClient(evID, messageType, payLoad)
        res.status(200).json({ status: true, message: `${messageType} command set` })

    } catch (error) {
        next(error);
    }

}

exports.remoteStopTransaction = async (req, res, next) => {
    const evID = req.params.evID;
    const messageType = 'RemoteStopTransaction';
    const payload = { transactionId: Number(req.body.transactionId) }
    const mobClient = req.body.transactionId;

    try {
        await sendMessageToClient(evID, messageType, payload)
        const mobileWs = await getMobileClient(mobClient)
        if (mobileWs) {
            mobileWs.send(JSON.stringify({ type: 'transactionStop' }));
            mobileWs.close();
            deleteMobileClient(mobClient)
        } else {
        }
        //test
        res.status(200).json({ status: true, message: `${messageType} command set` })

    } catch (error) {
        next(error);
    }
}

exports.resetEV = async (req, res, next) => {
    const evID = req.params.evID;
    const messageType = 'Reset';
    const payload = req.body
    try {
        await sendMessageToClient(evID, messageType, payload)
        res.status(200).json({ success: true, message: `${messageType} command set` })

    } catch (error) {
        next(error);
    }

}

exports.clearCache = async (req, res, next) => {
    const evID = req.params.evID;
    const messageType = 'ClearCache';
    const payload = {}
    try {
        await sendMessageToClient(evID, messageType, payload)
        res.status(200).json({ success: true, message: `${messageType} command set` })

    } catch (error) {
        next(error);
    }

}


exports.unlockConnector = async (req, res, next) => {
    const evID = req.params.evID;
    const messageType = 'UnlockConnector';

    try {
        await sendMessageToClient(evID, messageType)
        res.status(200).json({ success: true, message: `${messageType} command set` })

    } catch (error) {
        next(error);
    }

}

exports.changeAvailability = async (req, res, next) => {
    const evID = req.params.evID;
    const messageType = 'ChangeAvailability';
    const payload = req.body

    payload.connectorId = Number(payload.connectorId)

    try {
        const response = await sendMessageToClient(evID, messageType, payload)
        res.status(200).json({ success: true, message: `${messageType} command set`, data: response })

    } catch (error) {
        next(error);
    }

}

exports.triggerMessage = async (req, res, next) => {
    const evID = req.params.evID;
    const messageType = 'TriggerMessage';
    const payload = req.body
    const validRequestedMessage = [
        "BootNotification",
        "DiagnosticsStatusNotification",
        "FirmwareStatusNotification",
        "Heartbeat",
        "MeterValues",
        "StatusNotification"
    ]

    if (!payload.requestedMessage) throw new Error("'requestedMessage' is required field")
    if (!validRequestedMessage.includes(payload.requestedMessage)) throw new Error(`'requestedMessage' should be one of ${validRequestedMessage.join(', ')}`)

    if (payload.connectorId) payload.connectorId = Number(payload.connectorId)

    try {
        const response = await sendMessageToClient(evID, messageType, payload)
        res.status(200).json({ success: true, message: `${messageType} command set`, data: response})

    } catch (error) {
        next(error);
    }

}

exports.updateFirmware = async (req, res, next) => {
    const evID = req.params.evID;
    const messageType = 'UpdateFirmware';
    const payload = req.body

    payload.retries = Number(payload.retries)
    payload.retryInterval = Number(payload.retryInterval)

    try {
        await sendMessageToClient(evID, messageType, payload)
        res.status(200).json({ success: true, message: `${messageType} command set` })

    } catch (error) {
        next(error);
    }
}

exports.getDiagonostics = async (req, res, next) => {
    const evID = req.params.evID;
    const messageType = 'GetDiagnostics';
    const payload = req.body

    try {
        payload.retries = Number(payload.retries)
        payload.retryInterval = Number(payload.retryInterval)

        await sendMessageToClient(evID, messageType, payload)
        res.status(200).json({ success: true, message: `${messageType} command set` })

    } catch (error) {
        next(error);
    }
}

exports.getConfiguration = async (req, res, next) => {
    const evID = req.params.evID;
    const messageType = 'GetConfiguration';
    const payload = req.body

    try {
        const data = await sendMessageToClient(evID, messageType, payload)
        res.status(200).json({ success: true, message: `${messageType} command set`, data })

    } catch (error) {
        next(error);
    }
}

exports.sendLocalList = async (req, res, next) => {
    const evID = req.params.evID;
    const messageType = 'SendLocalList';
    const payload = req.body

    const validUpdateType = [
        "Differential",
        "Full"
    ]

    if (!payload.listVersion) throw new Error("'listVersion' is required field")
    if (!payload.updateType) throw new Error("'updateType' is required field")
    if (!validUpdateType.includes(payload.updateType)) throw new Error(`'updateType' should be one of ${validUpdateType.join(', ')}`)

    payload.listVersion = Number(payload.listVersion)

    try {
        await sendMessageToClient(evID, messageType, payload)
        res.status(200).json({ success: true, message: `${messageType} command set` })

    } catch (error) {
        next(error);
    }

}

exports.changeConfig = async (req, res, next) => {
    const evID = req.params.evID;
    const messageType = 'ChangeConfiguration';
    const payload = req.body

    try {
        await sendMessageToClient(evID, messageType, payload)
        res.status(200).json({ success: true, message: `${messageType} command set` })

    } catch (error) {
        next(error);
    }

}

