

const saveLogs = require('../../utils/saveLogs')
const { statusEVPoint } = require('../../services/ev-machine-api')
const { closeOpenTransactions } = require('../../utils/closeOpenTransactions')


async function handleStatusNotification({ params, identity }) {
    console.log(`Server got StatusNotification from ${identity}:`, params);
    const cpid = identity;
    //should review later
    let messageType = 'StatusNotification';
    await saveLogs(identity, messageType, params);

    try {
        const status = await statusEVPoint(cpid, params)

        // When the gun goes idle, close any open OCPP txs for that connector
        // so activeSession does not keep returning a dead Progress session.
        const connectorStatus = params && params.status;
        const connectorId = params && params.connectorId;
        if (
            connectorId != null &&
            ['Available', 'Finishing', 'Faulted', 'Unavailable'].includes(connectorStatus)
        ) {
            try {
                await closeOpenTransactions(
                    { cpid, connectorId: Number(connectorId) },
                    `StatusNotification:${connectorStatus}`,
                    ['Initiated', 'Progress']
                );
            } catch (e) {
                console.log('closeOpenTransactions on StatusNotification:', e.message);
            }
        }

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