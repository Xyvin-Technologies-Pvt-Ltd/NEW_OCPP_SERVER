const jwt = require("jsonwebtoken");

/**
 * Service JWT: payload `{ id }` signed with ACCESS_TOKEN_SECRET.
 * Caller passes INTER_SERVICE_PAYLOAD_ID typically from AUTH_SECRET env.
 */
async function generateToken(payloadId) {
  const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET;
  if (!ACCESS_TOKEN_SECRET) {
    throw new Error("ACCESS_TOKEN_SECRET is required");
  }
  return jwt.sign({ id: payloadId }, ACCESS_TOKEN_SECRET, {
    expiresIn: "1y",
  });
}

module.exports = generateToken;
