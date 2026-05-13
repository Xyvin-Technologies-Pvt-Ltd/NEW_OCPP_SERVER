const crypto = require("crypto");

function generateUniqueTransactionID(length = 12) {
  const len = Math.min(15, Math.max(6, Number(length) || 12));
  const min = 10 ** (len - 1);
  const max = Math.min(Number.MAX_SAFE_INTEGER, 10 ** len);
  return crypto.randomInt(min, max);
}

module.exports = { generateUniqueTransactionID };
