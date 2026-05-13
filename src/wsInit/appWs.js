const crypto = require("crypto");
const WebSocket = require("ws");
const { verifyMobileWsHandshake } = require("../utils/mobileWsAuth");
const {
  addMobileClient,
  deleteMobileClient,
} = require("../middlewares/clientsManager");

const mobileWebSocketServer = new WebSocket.Server({ port: 7535 });

async function initializeMobileSocket() {
  mobileWebSocketServer.on("connection", async function connection(ws, req) {
    try {
      const host = req.headers.host || "localhost";
      const protocol = "http";
      const url = new URL(req.url || "/", `${protocol}://${host}`);
      const segments = url.pathname.replace(/^\/+/u, "").split("/").filter(Boolean);
      const clientId = segments.pop();
      const token = url.searchParams.get("token");
      const secret = process.env.MOBILE_WS_SHARED_SECRET;

      if (!verifyMobileWsHandshake(clientId, token, secret)) {
        ws.close(4401, "Unauthorized");
        return;
      }

      await addMobileClient(clientId, ws);

      ws.on("close", async function onClose() {
        await deleteMobileClient(clientId);
      });

      ws.on("message", function incoming() {
        /* mobile client messages */
      });

      ws.send(JSON.stringify({ message: "Connected to transaction WebSocket" }));
    } catch (err) {
      try {
        ws.close(1011, "Internal error");
      } catch (_) {}
    }
  });
}

initializeMobileSocket();
module.exports = { mobileWebSocketServer };
