
const saveLogs = require('../../utils/saveLogs')
const { statusEVPoint } = require('../../services/ev-machine-api')
const { finalizeRequestedStopIfNeeded } = require('../../utils/finalizeRequestedStop')

async function handleStatusNotification({ params, identity }) {
    console.log(`Server got StatusNotification from ${identity}:`, params);
    const cpid = identity;
    let messageType = 'StatusNotification';
    await saveLogs(identity, messageType, params);

    try {
        // Do NOT auto-complete every Finishing/Available flap (would kill live billing).
        // Only finalize when RemoteStop already set stopRequestedAt — then the app
        // must leave "Finishing..." even if StopTransaction is delayed until unplug.
        await finalizeRequestedStopIfNeeded(cpid, params).catch((e) =>
            console.log('finalizeRequestedStopIfNeeded:', e.message)
        )

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
