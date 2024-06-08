
// Configuration for adaptive heartbeat intervals
const HEARTBEAT_CONFIG = {
    defaultInterval: 30 * 1000, // 30 seconds
    criticalInterval: 10 * 1000, // 10 seconds during critical operations
    idleInterval: 60 * 1000, // 60 seconds during idle times
    maxRetries: 3, // Max retries after timeout
  };
  

  async function handleHeartbeat({ identity, params }) {
    console.log(`Server got Heartbeat from ${identity}:`, params);
  
    // Update last heartbeat timestamp and reset retries
    lastHeartbeatTimestamps.set(identity, {
      timestamp: Date.now(),
      retries: 0,
      status: determineChargePointStatus(identity) // Implement this function based on your logic
    });
  
    // Return the next adaptive interval
    const nextInterval = getNextHeartbeatInterval(lastHeartbeatTimestamps.get(identity).status);
    return {
      CPID: identity,
      currentTime: new Date().toISOString(),
      nextInterval: nextInterval / 1000 // Convert milliseconds to seconds for the response
    };
  }
  





















  // Function to determine the next heartbeat interval
  function getNextHeartbeatInterval(chargePointStatus) {
    switch (chargePointStatus) {
      case 'critical':
        return HEARTBEAT_CONFIG.criticalInterval;
      case 'idle':
        return HEARTBEAT_CONFIG.idleInterval;
      default:
        return HEARTBEAT_CONFIG.defaultInterval;
    }
  }
  
  // Heartbeat monitoring and reconnection logic
  async function monitorHeartbeat() {
    const now = Date.now();
    for (const [identity, lastHeartbeat] of lastHeartbeatTimestamps.entries()) {
      const elapsed = now - lastHeartbeat.timestamp;
      const interval = getNextHeartbeatInterval(lastHeartbeat.status);
  
      if (elapsed > interval) {
        if (lastHeartbeat.retries < HEARTBEAT_CONFIG.maxRetries) {
          console.log(`Attempting to reconnect with ${identity}`);
          // Implement reconnection logic here
          lastHeartbeat.retries++;
        } else {
          console.log(`Charge point ${identity} is not responding. Marking as disconnected.`);
          // Handle disconnection logic here
          lastHeartbeatTimestamps.delete(identity);
        }
      }
    }
  }
  
  setInterval(monitorHeartbeat, HEARTBEAT_CONFIG.defaultInterval);
  