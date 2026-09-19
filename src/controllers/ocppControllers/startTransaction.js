
const saveLogs = require('../../utils/saveLogs')
const { generateUniqueTransactionID } = require('../../utils/uniqueNumber');
const { getUserIdAndChargingTariff, getUserDeviceToken } = require('../../services/user-service-api')
const { getChargingTariff } = require('../../services/ev-machine-api')
const { saveTransactionLog } = require('../../utils/transactionLog')
const { sendPushNotification } = require('../firebaseController')
const { normalizeTariff } = require('../../utils/normalizeTariff')
const { applyServiceFeeOnce } = require('../../utils/applyServiceFee')


async function handleStartTransaction({ params, identity }) {
    try {
        console.log(`Server got StartTransaction Notification from ${identity}:`, params);

        let chargingTariff, tax, serviceAmount = 0, value
        const idTag = params.idTag;
        const messageType = 'StartTransaction';
        await saveLogs(identity, messageType, params);

        const transactionId = await generateUniqueTransactionID(9);  //! MongoDb Save 
        const userData = await getUserIdAndChargingTariff(idTag)
        if (!userData) throw new Error('User data not found')
        const transactionMode = idTag.length < 11 ? 'mobile' : 'rfid';

        // Prefer user tariff when present (same gate as before: chargingTariff).
        // Also accept energyRate from new oxium payload.
        if (userData.chargingTariff || userData.energyRate) {
            const tariff = normalizeTariff(userData)
            if (!tariff) throw new Error('Invalid user charging tariff')
            chargingTariff = tariff.energyRate
            tax = tariff.tax !== undefined ? tariff.tax : userData.tax
            serviceAmount = tariff.serviceAmount
            value = tariff.value
        }
        else {
            const chargingTariffResult = await getChargingTariff(identity)
            if (!chargingTariffResult.status) throw new Error('charging tariff data not found')

            const tariff = normalizeTariff(chargingTariffResult.result)
            if (!tariff) throw new Error('Invalid EV charging tariff')
            // Legacy EV path used result.total — normalizeTariff maps total → energyRate
            chargingTariff = tariff.energyRate
            tax = tariff.tax !== undefined ? tariff.tax : chargingTariffResult.result.tax
            serviceAmount = tariff.serviceAmount
            value = tariff.value
        }

        // const userId = isMongoId(idTag) ? idTag : await getUserId(params.idTag)
        const userId = userData._id
        try {
            let transaction_status = "Initiated"
            await saveTransactionLog(
                identity,
                params,
                transaction_status,
                transactionId,
                chargingTariff,
                userId,
                tax,
                transactionMode,
                { serviceAmount, value }
            );

            // Non-blocking for OCPP Accept: retry on meter/stop if wallet deduct fails
            await applyServiceFeeOnce(transactionId)
        } catch (error) {
            console.log(' Error', error)
        }



        if (transactionId) {

            let payload = {
                title: 'Transaction Started',
                body: `Your transaction ${transactionId} has started`,
            }

            const userDeviceToken = await getUserDeviceToken(userId); // Implement this function to retrieve the user's device token
            if (userDeviceToken) {
                sendPushNotification(userDeviceToken, payload, transactionId, userId);
            }
            return {
                transactionId,
                idTagInfo: {
                    status: "Accepted",
                },
            };
        } else {
            return {
                transactionId: 0,
                idTagInfo: {
                    status: "Invalid",
                },
            };
        }
    }
    catch (error) {
        console.log(error)
    }
}








module.exports = { handleStartTransaction }
