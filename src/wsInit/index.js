const { RPCServer, createRPCError } = require("ocpp-rpc");
const { v4: uuidv4 } = require('uuid');
const {authenticateChargePoint} = require('../services/ev-machine-api');
const { addClient,  deleteClient } = require('../middlewares/clientsManager');
const {handleAuthorization} = require('../controllers/ocppControllers/authorization')
const {handleBootNotification} = require('../controllers/ocppControllers/bootNotification')
const {handleUnlockConnector} = require('../controllers/ocppControllers/unlockConnector')
const {handleReset} = require('../controllers/ocppControllers/reset.js')
const {handleStatusNotification} = require('../controllers/ocppControllers/statusNotification')
const {handleFirmwareStatusNotification} = require('../controllers/ocppControllers/firmwareStatusNotification.js')
const {handleClearCache} = require('../controllers/ocppControllers/clearCache')
const {handleDataTransfer} = require('../controllers/ocppControllers/dataTransfer.js')
const {handleSecurityEventNotification} = require('../controllers/ocppControllers/securityEventNotification.js')
const {handleHeartbeat} = require('../controllers/ocppControllers/heartBeat.js')
const {handleStartTransaction} = require('../controllers/ocppControllers/startTransaction')
const {handleStopTransaction} = require('../controllers/ocppControllers/stopTransaction')
const {handleMeterValues} = require('../controllers/ocppControllers/meterValue.js');
const { handleChangeConfiguration } = require("../controllers/ocppControllers/changeConfig.js");



// WebSocket
const webSocketServer = new RPCServer({
    protocols: ["ocpp1.6"],
    // strictMode: true,
});

async function initializeWebSocket(server) {
    server.auth(async (accept, reject, handshake) => {
        try {
            // Your authentication logic
            const query = handshake.identity;
            const chargePointIdentity = query.split('/').pop();
            // Perform your authentication logic here
            const isAuthenticated = await authenticateChargePoint(chargePointIdentity);
            console.log('Authentication result:', isAuthenticated);
            if (!isAuthenticated) throw new Error('Unknown Charging Point');
            // If authentication is successful, accept the connection
            accept({
                sessionId: uuidv4(),
            });
        } catch (error) {
            // If authentication fails, reject the connection
            console.error('Authentication error:', error);
            reject(false);
        }
    });
    // const allClients = new Map();
    server.on("client", async (client) => {
        console.log(`${client.session.sessionId} connected!`);
        addClient(client); // store client reference
        // Set up a listener for the 'close' event to handle disconnections
        client.on("close", (data) => {
            console.log(`${client.session.sessionId} disconnected with code ${data.code} and reason: ${data.reason}`);
            deleteClient(client);
        });

        // WebSocket handlers
        client.handle("BootNotification", (data) => handleBootNotification({ ...data, identity: client.identity }));
        client.handle("Authorize", (data) => handleAuthorization({ ...data, identity: client.identity }));
        client.handle("Heartbeat", (data) => handleHeartbeat({ ...data, identity: client.identity }));
        client.handle("MeterValues", (data) => handleMeterValues({ ...data, identity: client.identity }));
        client.handle("StatusNotification", (data) => handleStatusNotification({ ...data, identity: client.identity }));
        client.handle("StartTransaction", (data) => handleStartTransaction({ ...data, identity: client.identity }));
        client.handle("StopTransaction", (data) => handleStopTransaction({ ...data, identity: client.identity }));
        client.handle("SecurityEventNotification", (data) => handleSecurityEventNotification({ ...data, identity: client.identity }));
        client.handle("Reset", (data) => handleReset({ ...data, identity: client.identity }));
        client.handle("ClearCache", (data) => handleClearCache({ ...data, identity: client.identity }));
        client.handle("UnlockConnector", (data) => handleUnlockConnector({ ...data, identity: client.identity }));
        client.handle("DataTransfer", (data) => handleDataTransfer({ ...data, identity: client.identity }));
        client.handle("FirmwareStatusNotification", (data) => handleFirmwareStatusNotification({ ...data, identity: client.identity }));
        client.handle("ChangeConfiguration", (data) => handleChangeConfiguration({ ...data, identity: client.identity }));

        
        // Default handler for unhandled methods
        client.handle(({ method, params }) => {
            console.log(`Server got ${method} from ${client.identity}:`, params);
            throw createRPCError("NotImplemented");
        });
    });


   
  

}



// Initialize WebSocket and get the server and sendMessageToClient function
initializeWebSocket(webSocketServer);

// Export the server and sendMessageToClient function
module.exports = { webSocketServer };
