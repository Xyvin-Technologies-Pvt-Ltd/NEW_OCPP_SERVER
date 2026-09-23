const WebSocket = require('ws');
const mobileWebSocketServer = new WebSocket.Server({
  port: 7535,
  // Let the process detect half-open sockets; ping below keeps nginx proxies alive.
  clientTracking: true,
});

const { addMobileClient, deleteMobileClient } = require('../middlewares/clientsManager')
const OCPPTransaction = require('../models/ocppTransaction')
const { pushLiveSessionUpdate } = require('../utils/liveSessionPush')

/** How often to ping mobile clients (must be < nginx proxy_read_timeout, usually 60s). */
const MOBILE_WS_PING_MS = 25000

async function initializeMobileSocket() {
  mobileWebSocketServer.on('connection', async function connection(ws, req) {
    const clientId = req.url.split('/').pop();
    ws.isAlive = true
    ws.clientId = clientId

    await addMobileClient(clientId, ws)

    ws.on('pong', function () {
      ws.isAlive = true
    })

    ws.on('close', async function () {
      await deleteMobileClient(clientId, ws);
    });

    ws.on('error', function (err) {
      console.log('mobile ws error', clientId, err.message);
    });

    ws.on('message', function incoming() {
      // App currently does not send payloads; Traffic still resets proxy idle timers.
    });

    try {
      ws.send(JSON.stringify({ message: 'Connected to transaction WebSocket' }));
    } catch (e) {
      console.log('mobile ws welcome send failed', clientId, e.message)
      return
    }

    // Push current session snapshot immediately so UI does not wait for first MeterValues
    try {
      const txnId = Number(clientId)
      if (txnId) {
        const ongoing = await OCPPTransaction.findOne({
          transactionId: txnId,
          transaction_status: { $in: ['Initiated', 'Progress'] },
        })
        if (ongoing) {
          await pushLiveSessionUpdate(txnId, {
            skipStatus: true,
          })
        }
      }
    } catch (error) {
      console.log('WS connect live snapshot error', error.message)
    }
  });

  // Nginx in front of /mobile-ws/ closes idle upgraded connections at ~60s
  // (measured: CLOSE 1006 at t≈60100ms with no frames). Ping keeps the path alive
  // even when the charger MeterValues interval is ≥60s.
  const pingTimer = setInterval(() => {
    for (const ws of mobileWebSocketServer.clients) {
      if (ws.isAlive === false) {
        console.log('mobile ws terminate dead socket', ws.clientId)
        try {
          ws.terminate()
        } catch (_) {}
        continue
      }
      ws.isAlive = false
      try {
        ws.ping()
      } catch (e) {
        console.log('mobile ws ping failed', ws.clientId, e.message)
      }
    }
  }, MOBILE_WS_PING_MS)

  mobileWebSocketServer.on('close', () => clearInterval(pingTimer))
}

initializeMobileSocket();
module.exports = { mobileWebSocketServer };
