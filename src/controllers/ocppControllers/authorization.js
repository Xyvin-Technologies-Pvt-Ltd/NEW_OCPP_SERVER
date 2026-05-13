const {
  authenticateUserByRFID,
  authenticateUserByUserId,
} = require("../../services/user-service-api");
const saveLogs = require("../../utils/saveLogs");

async function handleAuthorization({ params, identity }) {
  const messageType = "Authorization";
  try {
    await saveLogs(identity, messageType, params);
  } catch (error) {
    console.error("[Authorization] saveLogs failed:", error.message);
  }

  const idTag = params.idTag;
  let isAuthorized = false;
  try {
    if (idTag.length == 10) {
      isAuthorized = await authenticateUserByUserId(idTag);
    } else {
      isAuthorized = await authenticateUserByRFID(idTag);
    }
  } catch (error) {
    console.error("[Authorization] auth check failed:", error.message);
    isAuthorized = false;
  }

  if (isAuthorized) {
    return {
      idTagInfo: {
        status: "Accepted",
      },
    };
  }
  return {
    idTagInfo: {
      status: "Blocked",
    },
  };
}

module.exports = { handleAuthorization };
