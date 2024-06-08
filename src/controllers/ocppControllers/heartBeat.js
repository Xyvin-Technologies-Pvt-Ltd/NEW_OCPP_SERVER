
const saveLogs = require('../../utils/saveLogs')
const { statusCPID } = require('../../services/ev-machine-api')
const lastHeartbeatTimestamps = new Map(); //to track latest heatbeat timestamp
let TIMEOUT_INTERVAL = 100000;   // 100s
let TIMEOUT_CHECK_INTERVAL = 60000;  // 1 min
const moment = require('moment');
const OCPPTransaction = require('../../models/ocppTransaction');


async function handleHeartbeat({ identity, params }) {
    // Update last received heartbeat timestamp
    let timestamp = Date.now();

    let messageType = "Available"
    await statusCPID(identity, messageType)
    await saveLogs(identity, "Heartbeat", params="{}")
    lastHeartbeatTimestamps.set(identity, timestamp);


    return {
        CPID: identity,
        currentTime: new Date().toISOString(),
    };
}




setInterval(() => {
    const now = Date.now();
    for (const [identity, timestamp] of lastHeartbeatTimestamps.entries()) {
        const timeoutThreshold = timestamp + TIMEOUT_INTERVAL;
        if (now > timeoutThreshold) {
            // Handle timeout for the Charge Point 
            handleTimeout(identity, timestamp);
        }
    }
}, TIMEOUT_CHECK_INTERVAL);


async function handleTimeout(identity, timestamp) {
    // Handle the graceful disconnection of the Charge Point (e.g., update status)
    let messageType = 'Unavailable';
    let params = {
        error: 'Heartbeat TimeOut',
        lastHeartbeat: timestamp
    }
    try {
        await statusCPID(identity, messageType)
    } catch (error) {
        console.log(error);
    }
    // Log the timeout event
    console.log(`Timeout for Charge Point ${identity}. Last heartbeat received at ${new Date(timestamp).toISOString()}`);
    await saveLogs(identity, messageType, params);


    //To update current ocpp transaction data 
    let transactionStatus = 'Completed'
    let closureReason = 'Connection TimeOut- PowerLoss/NetLoss'
    let closeBy = 'CMS'
    const transactionData = await OCPPTransaction.findOne({ cpid: identity, transaction_status: { $in: ['Progress', 'Initiated'] }})
    if (transactionData) {  const updatedTransaction = {

        endTime: new Date(),
        closureReason: closureReason,
        closeBy: closeBy,
        transaction_status: transactionStatus,
    }

    await OCPPTransaction.findByIdAndUpdate(transactionData._id, { $set: updatedTransaction }, { new: true });

    }else{
        console.log("No transaction in 'Progress' or 'Initiated' state to update.");
    }
    lastHeartbeatTimestamps.delete(identity);
}



module.exports = { handleHeartbeat }
