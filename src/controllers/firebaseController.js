const { firebase } = require('../firebaseInit');
// const { saveNotification } = require('../services/notification-service-api');

function sendPushNotification(deviceToken, payload, transactionId, userId) {
    const message = {
        notification: payload,
        token: deviceToken,
        data: { transactionId: transactionId.toString(), startCharge: 'true' }

    };

    firebase.messaging().send(message)
        .then((response) => {
            // saveNotification(payload.title, payload.body, userId)
            console.log('Successfully sent message:', response);
        })
        .catch((error) => {
            console.log('Error sending message:', error);
        });
}

module.exports = { sendPushNotification }