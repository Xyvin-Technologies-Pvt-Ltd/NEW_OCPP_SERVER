const router = require('express').Router()
const asyncHandler = require("../utils/asyncHandler")
const remoteControllers = require('../controllers/remoteControllers')
const mobileApis = require('../controllers/mobile-apis')
const logController = require('../controllers/logController')
const dashboardController = require('../controllers/dashboardController')

router.post('/ocpp/remoteStartTransaction/:evID', asyncHandler(remoteControllers.remoteStartTransaction))

router.post('/ocpp/remoteStopTransaction/:evID', asyncHandler(remoteControllers.remoteStopTransaction))

router.post('/ocpp/reset/:evID', asyncHandler(remoteControllers.resetEV))

router.get('/ocpp/clear-cache/:evID', asyncHandler(remoteControllers.clearCache))

router.post('/ocpp/unlock-connector/:evID', asyncHandler(remoteControllers.unlockConnector))

router.post('/ocpp/changeAvailability/:evID', asyncHandler(remoteControllers.changeAvailability))

router.post('/ocpp/changeConfig/:evID', asyncHandler(remoteControllers.changeConfig))
router.post('/ocpp/triggerMessage/:evID', asyncHandler(remoteControllers.triggerMessage))
router.post('/ocpp/updateFirmware/:evID', asyncHandler(remoteControllers.updateFirmware))
router.post('/ocpp/sendLocalList/:evID', asyncHandler(remoteControllers.sendLocalList))
router.post('/ocpp/getDiagonostics/:evID', asyncHandler(remoteControllers.getDiagonostics))
router.get('/ocpp/getConfiguration/:evID', asyncHandler(remoteControllers.getConfiguration))

//!logs
router.get('/ocpp/logs', asyncHandler(logController.getAllOCPPLogs))

router.get('/ocpp/logs/:evID', asyncHandler(logController.getOCPPLogs))


//!new
router
    .get('/ocpp/activeSession/:userId', asyncHandler(mobileApis.getActiveSession))
    .get('/ocpp/dashboard/activeSession', asyncHandler(mobileApis.getActiveSessionDashboard))
    .post('/ocpp/chargingHistory/:userId', asyncHandler(mobileApis.getChargingHistory))
    .get('/ocpp/invoice/:transactionId', asyncHandler(mobileApis.getInvoice))

//* Dashboards apis
router
    .get('/ocpp/dashboard/transactionLog/:evMachine', asyncHandler(dashboardController.getTransactionDetails))
    .get('/ocpp/dashboard/machineLog/:evMachine', asyncHandler(dashboardController.getMachineLogs))
    .get('/ocpp/dashboard/machineAlarms/:evMachine', asyncHandler(dashboardController.getMachineAlarms))
    .get('/ocpp/dashboard/machineAlarms', asyncHandler(dashboardController.getAllAlarms))
    .get('/ocpp/dashboard/transactionList', asyncHandler(dashboardController.getOCPPTransaction))
    .get('/ocpp/dashboard/alarm/summary', asyncHandler(dashboardController.getAllAlarmsCount))
    .get('/ocpp/dashboard/analytics', asyncHandler(dashboardController.dashboardAnalytics))
    .get('/ocpp/dashboard/transaction/report', asyncHandler(dashboardController.getReport))
    .get('/ocpp/dashboard/analytics/trends', asyncHandler(dashboardController.dashboardTrends))
    .get('/ocpp/dashboard/analytics/utilization', asyncHandler(dashboardController.dashboardUtilization))

//!getSoc
router
    .get('/ocpp/getOcpp/:cpid/:connectorId', asyncHandler(dashboardController.getSoc))


module.exports = router;