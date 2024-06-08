const WebSocket = require('ws');
const mobileWebSocketServer = new WebSocket.Server({ port: 7535 });

const { addMobileClient, deleteMobileClient } = require('../middlewares/clientsManager')




//!ws
async function initializeMobileSocket() {

    mobileWebSocketServer.on('connection', async function connection(ws, req) {


        const clientId = req.url.split('/').pop(); // Implement this to extract client ID from request

        await addMobileClient(clientId, ws)
       

        ws.on('close', async function () {
            await deleteMobileClient(clientId);
        });

        ws.on('message', function incoming(message) {
            console.log('message came from front end')
        });

        // Optionally send a welcome message or transaction status
        ws.send(JSON.stringify({ message: 'Connected to transaction WebSocket' }));
    });

}
initializeMobileSocket();
module.exports = { mobileWebSocketServer };