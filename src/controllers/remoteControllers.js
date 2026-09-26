const { authenticateUserByUserId, getUserIdAndChargingTariff } = require('../services/user-service-api');
const sendMessageToClient = require('./cmsToCp');
const { closeOpenTransactionsForUser } = require('../utils/closeOpenTransactions');
const { markStopRequested } = require('../utils/markStopRequested');


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

        // Safe: clear stuck Initiated only (never Progress / live charging)
        try {
            const userData = await getUserIdAndChargingTariff(req.body.idTag)
            if (userData && userData._id) {
                await closeOpenTransactionsForUser(
                    userData._id,
                    'ClearedStaleInitiated',
                    ['Initiated']
                )
            }
        } catch (e) {
            console.log('remoteStart stale-session cleanup:', e.message)
        }

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

    try {
        // Tell charger to stop. Final meter still prefers StopTransaction when it
        // arrives; Finishing/Available after stopRequestedAt unblocks the app.
        await sendMessageToClient(evID, messageType, payload)
        await markStopRequested(payload.transactionId).catch((e) =>
            console.log('markStopRequested:', e.message)
        )
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
    const payload = {
        connectorId: Number(req.body.connectorId),
    }

    try {
        if (!Number.isFinite(payload.connectorId)) {
            return res.status(400).json({ success: false, message: 'connectorId is required' })
        }
        await sendMessageToClient(evID, messageType, payload)
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

