function sendPushNotification(deviceToken, payload, transactionId, userId) {
  const { firebase } = require("../firebaseInit");

  const message = {
    notification: payload,
    token: deviceToken,
    data: { transactionId: String(transactionId), startCharge: "true" },
  };

  if (!firebase) {
    console.warn("[push] Firebase not configured; skip notification");
    return;
  }

  firebase
    .messaging()
    .send(message)
    .then(() => {})
    .catch((error) => {
      console.warn("[push] send failed:", error.message);
    });
}

module.exports = { sendPushNotification };
