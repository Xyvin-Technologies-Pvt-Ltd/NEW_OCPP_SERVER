
const saveLogs = require('../../utils/saveLogs')
const { statusEVPoint } = require('../../services/ev-machine-api')

async function handleStatusNotification({ params, identity }) {
    console.log(`Server got StatusNotification from ${identity}:`, params);
    const cpid = identity;
    let messageType = 'StatusNotification';
    await saveLogs(identity, messageType, params);

    try {
        // Production-safe: do NOT auto-complete Progress/Initiated here.
        // Charger status flaps (Finishing/Available) during real stops and would
        // kill live billing sessions. Completion stays on StopTransaction only.
        const status = await statusEVPoint(cpid, params)

        if (status) {
            return {
                idTagInfo: {
                    status: "Accepted",
                },
            };
        } else {
            return {
                idTagInfo: {
                    status: "Blocked",
                },
            };
        }
    } catch (error) {
        console.log(error)
        return {
            idTagInfo: {
                status: "Blocked",
            },
        };
    }
}

module.exports = { handleStatusNotification }
