const crypto = require("crypto");

/** HMAC SHA-256 hex of clientId — client must append ?token=... to WS URL */
function computeMobileWsToken(clientId, secret) {
  return crypto
    .createHmac("sha256", secret)
    .update(String(clientId))
    .digest("hex");
}

/** Compare client-provided token to expected HMAC using timing-safe equality */
function verifyMobileWsHandshake(clientId, token, secret) {
  if (
    !clientId ||
    !token ||
    !secret ||
    typeof token !== "string" ||
    typeof clientId !== "string"
  ) {
    return false;
  }
  const expected = computeMobileWsToken(clientId, secret);
  const expBuf = Buffer.from(expected);
  const gotBuf = Buffer.from(token.trim());
  if (expBuf.length !== gotBuf.length) return false;
  return crypto.timingSafeEqual(expBuf, gotBuf);
}

module.exports = { computeMobileWsToken, verifyMobileWsHandshake };
