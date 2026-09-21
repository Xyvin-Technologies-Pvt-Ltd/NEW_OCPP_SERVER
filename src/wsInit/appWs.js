const WebSocket = require('ws');
const mobileWebSocketServer = new WebSocket.Server({ port: 7535 });

const { addMobileClient, deleteMobileClient } = require('../middlewares/clientsManager')
const OCPPTransaction = require('../models/ocppTransaction')
const { pushLiveSessionUpdate } = require('../utils/liveSessionPush')




//!ws
async function initializeMobileSocket() {

    mobileWebSocketServer.on('connection', async function connection(ws, req) {


        const clientId = req.url.split('/').pop(); // Implement this to extract client ID from request

        await addMobileClient(clientId, ws)

        ws.on('close', async function () {
            // Pass ws so we don't wipe a newer reconnect for the same txn
            await deleteMobileClient(clientId, ws);
        });

        ws.on('error', function (err) {
            console.log('mobile ws error', clientId, err.message);
        });

        ws.on('message', function incoming(message) {
            console.log('message came from front end')
        });

        // Optionally send a welcome message or transaction status
        ws.send(JSON.stringify({ message: 'Connected to transaction WebSocket' }));

        // Push current session snapshot immediately so UI does not wait for first MeterValues
        try {
            const txnId = Number(clientId)
            if (txnId) {
                const ongoing = await OCPPTransaction.findOne({
                    transactionId: txnId,
                    transaction_status: { $in: ['Initiated', 'Progress'] },
                })
                if (ongoing) {
                    // Energy/balance only — do not force status (avoids Initiated/Charging UI glitches)
                    await pushLiveSessionUpdate(txnId, {
                        skipStatus: true,
                    })
                }
            }
        } catch (error) {
            console.log('WS connect live snapshot error', error.message)
        }
    });

}
initializeMobileSocket();
module.exports = { mobileWebSocketServer };
