const { authenticateUserByRFID, authenticateUserByUserId } = require('../../services/user-service-api')
const saveLogs = require('../../utils/saveLogs')

async function handleAuthorization({ params, identity }) {
    const messageType = 'Authorization';

    try {
        // CP → CMS request (RFID tap / idTag authorize)
        await saveLogs(identity, messageType, params, 'CP');
    } catch (error) {
        console.log('Error saving Authorization request log:', error.message);
    }

    const idTag = params.idTag;
    let isAuthorized = false;
    try {
        // user unique id: alphanumeric length 10; RFID serial: length != 10
        if (idTag.length == 10) {
            isAuthorized = await authenticateUserByUserId(idTag)
        } else {
            isAuthorized = await authenticateUserByRFID(idTag)
        }
    } catch (error) {
        console.log(error);
    }

    const response = isAuthorized
        ? { idTagInfo: { status: 'Accepted' } }
        : { idTagInfo: { status: 'Blocked' } };

    try {
        // CMS → CP conf so charger logs show Accepted / Blocked
        await saveLogs(identity, messageType, response, 'CMS');
    } catch (error) {
        console.log('Error saving Authorization response log:', error.message);
    }

    return response;
}


module.exports = { handleAuthorization }
