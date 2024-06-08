const AWS = require('aws-sdk');
const region = "ap-south-1";
const secretsManager = new AWS.SecretsManager({ region: region });

async function getSecret() {
  try {

    const secretName = "ocpp/ecs";

    const data = await secretsManager.getSecretValue({ SecretId: secretName }).promise();
    const secretValue = JSON.parse(data.SecretString);

    // Set environment variables based on the secret values
    Object.keys(secretValue).forEach((key) => {
      process.env[key.toUpperCase()] = secretValue[key];
    });

    return secretValue;
  } catch (error) {
    console.error('Error retrieving secret:', error);
    throw error;
  }
}

module.exports = { getSecret };
