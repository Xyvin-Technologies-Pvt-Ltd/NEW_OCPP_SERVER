const OCPPTransaction = require("../models/ocppTransaction");
const moment = require('moment')
const mongoose = require('mongoose');
const OCPPLOG = require("../models/ocppLogs");
const { generateExcel } = require("../utils/generateExcel");
const ObjectId = mongoose.Types.ObjectId;


exports.getOCPPTransaction = async (req, res) => {

    const locations = req.role.location_access.map(id => new ObjectId(id));

    const { startDate, endDate, cpid, pageNo, searchQuery } = req.query;
    const matchStage = {
        $match: {}
    };

    if (startDate && endDate) {
        const dateFormat = 'DD-MM-YYYY';
        const startMoment = moment(startDate, dateFormat);
        const endMoment = moment(endDate, dateFormat).endOf('day');
        matchStage.$match.createdAt = {
            $gte: startMoment.toDate(),
            $lte: endMoment.toDate()
        };
    }

    const filter = {};


    if (searchQuery) {
        filter.$or = [
            { 'chargingStation.name': { $regex: searchQuery, $options: 'i' } },
            { 'userDetails.username': { $regex: searchQuery, $options: 'i' } }
        ];
    }
    
    if(locations){
        filter['chargingStation._id'] = { $in: locations };
    }

    if (cpid) matchStage.$match.cpid = cpid;
    let pipeline = await OCPPTransaction.aggregate([
        matchStage,
        { $sort: { startTime: -1 } },
        {
            $lookup: {
                from: "users",
                localField: "user",
                foreignField: "_id",
                pipeline: [

                    {
                        $project: {
                            username: 1,

                        }
                    }
                ],
                as: "userDetails",
            }
        }, {
            $lookup: {
                from: "evmachines",
                localField: "cpid",
                foreignField: "CPID",
                as: "evMachineDetails",
            }
        },

        {
            $unwind: {
                path: "$userDetails",
                preserveNullAndEmptyArrays: true
            }
        },
        {
            $unwind: {
                path: '$evMachineDetails',
                preserveNullAndEmptyArrays: true
            }
        },
        {
            $lookup: {
                from: "chargingstations",
                localField: "evMachineDetails.location_name",
                foreignField: "_id",
                as: "chargingStation",
            }
        },
        { $match: filter },

        {
            $unwind: {
                path: "$chargingStation",
                preserveNullAndEmptyArrays: true
            }
        },
        {
            $addFields: {
                unitConsumed: {
                    $cond: [
                        { $and: [{ $ifNull: ["$lastMeterValue", false] }] },
                        { $subtract: ["$lastMeterValue", { $divide: ["$meterStart", 1000] }] },
                        null
                    ]
                },
            }
        },
        {
            $project: {
                _id: 1,
                startTime: 1,
                endTime: 1,
                username: { $ifNull: ["$userDetails.username", ""] },
                chargingStation: { $ifNull: ["$chargingStation.name", ""] },
                meterStart: 1,
                lastMeterValue: 1,
                connectorId: 1,
                unitConsumed: 1,
                transactionId: 1,
                transactionMode: 1,
                closureReason: 1,
                totalAmount: 1,
                closeBy: 1,
                cpid: 1,
            }
        }

    ]).skip(10*(pageNo-1)).limit(10);

    let totalCount = await OCPPTransaction.find(filter).countDocuments();

    let result = pipeline.map(transactionData => {
        return {
            transactionId: transactionData.transactionId,
            date: moment(transactionData.startTime).format("MMM DD YYYY h:mm:ss A"),
            username: transactionData.username,
            transactionMode: transactionData.transactionMode,
            chargePointId: transactionData.cpid,
            connectorId: transactionData.connectorId,
            closeBy: transactionData.closeBy,
            location: transactionData.chargingStation,
            totalAmount: transactionData.totalAmount.toFixed(2),
            closureReason: transactionData.closureReason || "UnKnown",
            duration: timeDifference(transactionData.endTime, transactionData.startTime),
            unitConsumed: `${transactionData.unitConsumed ? transactionData.unitConsumed.toFixed(2) : ""} kWh`,
        }
    })





    res.status(200).json({ status: true, message: 'OK', result: result, totalCount })


}


exports.getTransactionDetails = async (req, res, next) => {
    try {
        
        const evMachine = req.params.evMachine

        const { startDate, endDate, searchQuery } = req.query;
        let pageNo = req.query.pageNo || 1;

        const filter = {transaction_status: "Completed", cpid: evMachine };
        if (startDate && endDate) {
            const dateFormat = 'DD-MM-YYYY';
            const startMoment = moment(startDate, dateFormat);
            const endMoment = moment(endDate, dateFormat).endOf('day');
            filter.createdAt = {
                $gte: startMoment.toDate(),
                $lte: endMoment.toDate()
            };
        }

        if (searchQuery) {
            filter.$or = [
                { 'userDetails.username': { $regex: searchQuery, $options: 'i' } },
                { 'chargingStation.name': { $regex: searchQuery, $options: 'i' } },
            ];
        }

        let result = await OCPPTransaction.aggregate([
            { $sort: { startTime: -1 } },
            {
                $lookup: {
                    from: "users",
                    localField: "user",
                    foreignField: "_id",
                    pipeline: [

                        {
                            $project: {
                                username: 1,
                                mobile: 1,
                            }
                        }
                    ],
                    as: "userDetails",
                }
            },
            {
                $lookup: {
                    from: "evmachines",
                    localField: "cpid",
                    foreignField: "CPID",
                    pipeline: [

                        {
                            $project: {
                                location_name: 1,
                            }
                        }
                    ],
                    as: "evMachineDetails",
                }
            },
            {
                $unwind: '$evMachineDetails'
            },
            {
                $lookup: {
                    from: 'chargingstations', // Collection name of ChargingStation model
                    localField: 'evMachineDetails.location_name',
                    foreignField: '_id',
                    // as: 'chargingStation',
                    pipeline: [

                        {
                            $project: {
                                name: 1,
                            }
                        }
                    ],
                    as: 'chargingStation',
                }
            },
            { $match: filter },
            {
                $addFields: {
                    unitConsumed: {
                        $cond: [
                            { $and: [{ $ifNull: ["$meterStart", false] }, { $ifNull: ["$lastMeterValue", false] }] },
                            { $subtract: ["$lastMeterValue", { $divide: ["$meterStart", 1000] }] },
                            null
                        ]
                    },
                }
            },
            {
                $project: {
                    _id: 1,
                    startTime: 1,
                    endTime: 1,
                    username: { $ifNull: [{ "$arrayElemAt": ["$userDetails.username", 0] }, ""] },
                    chargingStation: { $ifNull: [{ "$arrayElemAt": ["$chargingStation.name", 0] }, ""] },
                    meterStart: 1,
                    lastMeterValue: 1,
                    unitConsumed: 1,
                    transactionId: 1,
                    transactionMode: 1,
                    closureReason: 1,
                    totalAmount: 1,
                    cpid: 1,
                    closeBy: 1,
                }
            }
        ]).skip(10*(pageNo-1)).limit(10);

        let totalCount = await OCPPTransaction.find(filter).countDocuments()


        result = result.map(transactionData => {
            return {
                transactionId: transactionData.transactionId,
                date: moment(transactionData.startTime).format("MMM DD YYYY h:mm:ss A"),
                username: transactionData.username,
                transactionMode: transactionData.transactionMode,
                chargePointId: transactionData.cpid,
                location: transactionData.chargingStation,
                totalAmount: transactionData.totalAmount.toFixed(2),
                closureReason: transactionData.closureReason || "",
                duration: timeDifference(transactionData.endTime, transactionData.startTime),
                unitConsumed: `${transactionData.unitConsumed ? transactionData.unitConsumed.toFixed(2) : ""} kWh`,
                closeBy: transactionData.closeBy
            }
        })

        res.status(200).json({ success: true, result: result, message: `Ok`,totalCount })
    }
    catch (error) {
        next(error);
    }
}

exports.getMachineLogs = async (req, res) => {

    const { pageNo, searchQuery } = req.query;

    const filter = { CPID: req.params.evMachine };


    if (searchQuery) {
        filter.$or = [
            { messageType: { $regex: searchQuery, $options: 'i' } }, 
            { CPID: { $regex: searchQuery, $options: 'i' } }, 
            { source: { $regex: searchQuery, $options: 'i' } }, 
        ];
    }

    let data = await OCPPLOG.find(filter).sort({ timestamp: -1 }).skip(10*(pageNo-1)).limit(10);
    data = data.map(log => {
        return {
            uniqueId: log._id,
            connectorId: log.payload?.connectorId,
            command: log.messageType,
            date: moment(log.createdAt).format("MMM DD YYYY h:mm:ss A"),
            payload: log.payload,
            source: log.source
        }
    })
    let totalCount = await OCPPLOG.find(filter).countDocuments()

    res.status(200).json({ status: true, message: 'OK', result: data, totalCount })
}


//Alarms

exports.getMachineAlarms = async (req, res) => {
    const { pageNo, searchQuery } = req.query;

    const filter = { CPID: req.params.evMachine, messageType: "StatusNotification" };

    if (searchQuery) {
        filter.$or = [
            { CPID: { $regex: searchQuery, $options: 'i' } }, 
            { 'payload.status': { $regex: searchQuery, $options: 'i' } }, 
            { 'payload.errorCode': { $regex: searchQuery, $options: 'i' } }, 
        ];
    }

    let data = await OCPPLOG.find(filter).sort({ timestamp: -1 }).skip(10*(pageNo-1)).limit(10);
    data = data.map(log => {
        return {
            cpid: log.CPID,
            date: moment(log.createdAt).format("MMM DD YYYY h:mm:ss A"),
            summary: log.payload ? log.payload.info : '',
            errorCode: log.payload ? log.payload.errorCode : '',
            connectorId: log.payload ? log.payload.connectorId : '',
            status: log.payload ? log.payload.status : '',
        }
    })

    let totalCount = await OCPPLOG.find(filter).countDocuments()

    res.status(200).json({ status: true, message: 'OK', result: data, totalCount })
}

exports.getAllAlarms = async (req, res) => {

    const { startDate, endDate, cpid, connectorStatus, pageNo, searchQuery } = req.query;

    let query = { messageType: 'StatusNotification' }
    if (startDate && endDate) {
        const dateFormat = 'DD-MM-YYYY';
        const startMoment = moment(startDate, dateFormat);
        const endMoment = moment(endDate, dateFormat).endOf('day');
        query.createdAt = {
            $gte: startMoment.toDate(),
            $lte: endMoment.toDate()
        };
    }
    if (cpid) query.CPID = cpid;
    if (connectorStatus) {
        query['payload.status'] = connectorStatus;
    }

    if (searchQuery) {
        query.$or = [
            { messageType: { $regex: searchQuery, $options: 'i' } },
            { CPID: { $regex: searchQuery, $options: 'i' } },
            { 'payload.status': { $regex: searchQuery, $options: 'i' } },
            { source: { $regex: searchQuery, $options: 'i' } },
        ];
    }

    let data = await OCPPLOG.find(query).sort({ timestamp: -1 }).skip(10*pageNo-1).limit(10);

    let totalCount = await OCPPLOG.find(query).countDocuments()


    data = data.map(log => {

        return {
            cpid: log.CPID,
            date: moment(log.timestamp).format("MMM DD YYYY h:mm:ss A"),
            summary: log.payload ? log.payload.info : '',
            connectorId: log.payload ? log.payload.connectorId : '',
            status: log.payload ? log.payload.status : '',
            errorCode: log.payload ? log.payload.errorCode : '',

        }
    })
    res.status(200).json({ status: true, message: 'OK', result: data, totalCount })
}

function timeDifference(date1, date2) {
    // Calculate the difference in milliseconds
    const diff = date1 - date2;

    // Convert milliseconds to hours, minutes, and seconds
    let seconds = Math.floor(diff / 1000);
    let minutes = Math.floor(seconds / 60);
    let hours = Math.floor(minutes / 60);

    seconds = seconds % 60;
    minutes = minutes % 60;

    // Pad the string with leading zeros if necessary
    hours = hours.toString().padStart(2, '0');
    minutes = minutes.toString().padStart(2, '0');
    seconds = seconds.toString().padStart(2, '0');

    return `${hours}:${minutes}:${seconds}`;
}


exports.getAllAlarmsCount = async (req, res) => {
    let data = await OCPPLOG.find({ messageType: "StatusNotification" })
    let result = {
        "ConnectorLockFailure": 0,
        "EVCommunicationError": 0,
        "GroundFailure": 0,
        "HighTemperature": 0,
        "InternalError": 0,
        "LocalListConflict": 0,
        "NoError": 0,
        "OtherError": 0,
        "OverCurrentFailure": 0,
        "PowerMeterFailure": 0,
        "PowerSwitchFailure": 0,
        "ReaderFailure": 0,
        "ResetFailure": 0,
        "UnderVoltage": 0,
        "OverVoltage": 0,
        "WeakSignal": 0
    }
    result = data.reduce((accumulator, currentValue) => {
        let errorCode = currentValue.payload ? currentValue.payload.errorCode : ''
        if (accumulator[errorCode]) accumulator[errorCode]++
        else accumulator[errorCode] = 1
        return accumulator
    }, {});

    // data.forEach(log => {
    //     let errorCode = log.payload ? log.payload.errorCode : ''
    //     if (result[errorCode]) result[errorCode]++
    // })

    res.status(200).json({ status: true, message: 'OK', result: result })
}


exports.dashboardAnalytics = async (req, res) => {

    const result = await OCPPTransaction.aggregate([


        {
            $facet: {
                chargingSessionsCount: [
                    {
                        $count: "TotalChargingSessions"
                    }
                ],
                activeSessionsCount: [
                    {
                        $match: {
                            transaction_status: { $in: ["Progress", "Initiated"] }
                        }
                    },
                    {
                        $count: "TotalActiveSessions"
                    }
                ],
                revenueSum: [
                    {
                        $match: {
                            transaction_status: { $in: ["Completed"] }
                        }
                    }
                    ,
                    {
                        $group: {
                            _id: null,
                            totalRevenue: { $sum: "$totalAmount" }
                        }
                    },
                    {
                        $project: {
                            _id: 0,
                            totalRevenue: 1
                        }
                    }
                ],
                energySum: [
                    {
                        $match: {
                            transaction_status: { $in: ["Completed"] }
                        }
                    }
                    ,
                    {
                        $group: {
                            _id: null,
                            totalEnergy: { $sum: "$totalUnits" }
                        }
                    },
                    {
                        $project: {
                            _id: 0,
                            totalEnergy: 1
                        }
                    }
                ]
            }
        },

        {
            $lookup: {
                from: "chargingstations",
                pipeline: [{ $count: "TotalChargingStations" }],
                as: 'chargingStationCount'
            }
        }
        ,
        {
            $lookup: {
                from: "rfidtags",
                pipeline: [{ $count: "TotalRfid" }],
                as: 'rfidCount'
            }
        }
        ,
        {
            $lookup: {
                from: "evmachines",
                pipeline: [{ $count: "TotalEvMachines" }],
                as: 'evmachinesCount'
            }
        },
        {
            $lookup: {
                from: "evmachines",
                pipeline: [{
                    $project: {
                        connectors: 1, //

                    }
                }],
                as: 'evmachinesConnector'
            }
        },
        {
            $lookup: {
                from: "users",
                pipeline: [{ $count: "TotalUsers" }],
                as: 'userCount'
            }
        },
        {
            $project: {
                TotalChargingSessions: { $arrayElemAt: ["$chargingSessionsCount.TotalChargingSessions", 0] },
                TotalActiveSessions: { $arrayElemAt: ["$activeSessionsCount.TotalActiveSessions", 0] },
                TotalRevenue: { $arrayElemAt: ["$revenueSum.totalRevenue", 0] },
                TotalEnergy: { $arrayElemAt: ["$energySum.totalEnergy", 0] },
                Connectors: '$evmachinesConnector',
                TotalChargingStations: { $arrayElemAt: ["$chargingStationCount.TotalChargingStations", 0] },
                TotalRfid: { $arrayElemAt: ["$rfidCount.TotalRfid", 0] },
                TotalChargingStations: { $arrayElemAt: ["$chargingStationCount.TotalChargingStations", 0] },
                TotalEvMachines: { $arrayElemAt: ["$evmachinesCount.TotalEvMachines", 0] },

                TotalUsers: { $arrayElemAt: ["$userCount.TotalUsers", 0] },
            }
        }
    ])

    let data = result[0]

    const connectorsArray = result[0].Connectors;
    const allConnectors = connectorsArray.map(({ connectors }) => connectors);
    const allConnectorsFlat = [].concat(...allConnectors);
    const statusCounts = allConnectorsFlat.reduce((accumulator, connector) => {
        const status = connector.status;
        accumulator[status] = (accumulator[status] || 0) + 1;
        return accumulator;
    }, {});


    let finalResult = {
        TotalChargingSessions: data.TotalChargingSessions,
        TotalActiveSessions: data.TotalActiveSessions,
        TotalRevenue: data?.TotalRevenue?.toFixed(2),
        TotalEnergy: data.TotalEnergy,
        TotalChargingStations: data.TotalChargingStations,
        TotalRfid: data.TotalRfid,
        TotalChargingStations: data.TotalChargingStations,
        TotalEvMachines: data.TotalEvMachines,

        TotalUsers: data.TotalUsers,
        statusCounts: statusCounts
    }



    res.send({ message: "ok", status: true, result: finalResult })

}

exports.getReport = async (req, res) => {
    let { cpid, startDate, endDate } = req.query
    let filters = { transaction_status: "Completed" }
    if (cpid) filters.cpid = cpid
    if (startDate && endDate) {
        if (/^\d{4}-\d{2}-\d{2}$/.test(startDate) && /^\d{4}-\d{2}-\d{2}$/.test(endDate)) {
            let fromDate = moment(startDate, "YYYY-MM-DD").toDate()
            let toDate = moment(endDate, "YYYY-MM-DD").toDate()
            toDate.setDate(toDate.getDate() + 1)
            filters.startTime = { $gte: fromDate, $lt: toDate }
        }
        else return res.status(400).json({ status: false, message: 'Date should be in "YYYY-MM-DD" Format' })
    }

    const result = await OCPPTransaction.aggregate([
        { $match: filters },
        { $sort: { createdAt: -1 } },
        {
            $lookup: {
                from: "users",
                localField: "user",
                foreignField: "_id",
                pipeline: [

                    {
                        $project: {
                            username: 1,
                            mobile: 1,
                        }
                    }
                ],
                as: "userDetails",
            }
        },
        {
            $lookup: {
                from: "evmachines", // the collection to join
                localField: "cpid", // field in the OCPPTransaction collection
                foreignField: "CPID",
                pipeline: [
                    {
                        $lookup: {
                            from: "chargingstations",
                            localField: "location_name", // field in the evMachineDetails document
                            foreignField: "_id", // field in the chargingStation collection
                            as: "stationDetails",
                        },
                    }, {
                        $unwind: {
                            path: "$stationDetails",
                            preserveNullAndEmptyArrays: true,
                        },
                    },
                ],
                as: "evMachineDetails"
            }
        },

        {
            $project: {
                meterStart: 1,
                meterStop: 1,
                "chargingPoint": "$cpid",
                "connectorId": "$connectorId",
                username: { $ifNull: [{ "$arrayElemAt": ["$userDetails.username", 0] }, ""] },
                "closeBy": "$closeBy",
                "transactionMode": "$transactionMode",
                "closureReason": "$closureReason",
                "transactionId": "$transactionId",
                // "status": "$transaction_status",
                "chargingStartTime": "$startTime",
                "chargingStopTime": "$endTime",
                "amount": { $toString: "$totalAmount" },
                stationAddress: {
                    $arrayElemAt: [
                        "$evMachineDetails.stationDetails.address",
                        0,
                    ],
                },
                stationName: {
                    $arrayElemAt: [
                        "$evMachineDetails.stationDetails.name",
                        0,
                    ],
                },
                stationState: {
                    $arrayElemAt: [
                        "$evMachineDetails.stationDetails.state",
                        0,
                    ],
                },
                stationCity: {
                    $arrayElemAt: [
                        "$evMachineDetails.stationDetails.city",
                        0,
                    ],
                },
                chargerName: {
                    $arrayElemAt: [
                        "$evMachineDetails.name",
                        0,
                    ],
                },
                "tariff": "$chargingTariff",
                "tax": {
                    $toString: {
                        $multiply: [
                            { $toDouble: "$tax" },
                            100
                        ]
                    }
                },
                "unitConsumed": {
                    $divide: [
                        { $subtract: ["$meterStop", "$meterStart"] },
                        1000
                    ]
                }
            }
        }
    ]);

    if (!result.length) return res.status(400).json({ status: false, message: 'No Data Found' })

    // result = result.map(transactionData => {
    //     return {
    //         transactionId: transactionData.transactionId,
    //         date: moment(transactionData.startTime).format("MMM DD YYYY h:mm:ss A"),
    //         username: transactionData.username,
    //         transactionMode: transactionData.transactionMode,
    //         chargePointId: transactionData.cpid,
    //         location: transactionData.chargingStation,
    //         totalAmount: transactionData.totalAmount.toFixed(2),
    //         closureReason: transactionData.closureReason || "",
    //         duration: timeDifference(transactionData.endTime, transactionData.startTime),
    //         unitConsumed: `${transactionData.unitConsumed ? transactionData.unitConsumed.toFixed(2) : ""} kWh`,
    //         closeBy: transactionData.closeBy
    //     }
    // })

    let formattedData = result.map(data => {
        const withoutTax = data.amount ? Number(data.amount) / (1 + (Number(data.tax) / 100)) : 0;

        const taxAmount = data.tax ? Number(data.amount) - withoutTax : null
        if (!data.tax) data.tax = null

        return {
            ...data,
            taxAmount: taxAmount.toFixed(2),
            duration: timeDifference(data.chargingStopTime, data.chargingStartTime),
            chargingStartTime: data.chargingStartTime ? moment(data.chargingStartTime).format("DD-MM-YYYY hh:mm A") : "",
            chargingStopTime: data.chargingStopTime ? moment(data.chargingStopTime).format("DD-MM-YYYY hh:mm A") : "",
            transactionDate: data.chargingStopTime ? moment(data.chargingStopTime).format("DD-MM-YYYY hh:mm A") : "",
        }
    })

    const headers = [
        { header: "Transaction Id", key: "transactionId" },
        { header: "Transaction Date", key: "transactionDate" },
        { header: "Name", key: "username" },
        { header: "Transaction Mode", key: "transactionMode" },
        { header: "Station", key: "stationName" },
        { header: "State", key: "stationState" },
        { header: "Charge Point", key: "chargingPoint" },
        { header: "Connector Id", key: "connectorId" },
        { header: "OCPP Start Time", key: "chargingStartTime" },
        { header: "OCPP Stop Time", key: "chargingStopTime" },
        { header: "Session Duration(hh:mm:ss)", key: "duration" },

        { header: "Meter Start", key: "meterStart" },
        { header: "Meter Stop", key: "meterStop" },
        { header: "Units Consumed(kWh)", key: "unitConsumed" },
        { header: "Tariff Rate", key: "tariff" },
        { header: "Tax Percentage", key: "tax" },
        { header: "Tax Amount", key: "taxAmount" },
        { header: "Total Amount", key: "amount" },
        { header: "Stop Reason", key: "closureReason" },
        { header: "Closed By", key: "closeBy" },
    ]

    try {


        res.status(200).json({ status: true, message: 'OK', result: { headers: headers, body: formattedData } })
    }
    catch (error) {
        res.status(400).json({ status: false, message: "Internal Server Error" })
    }

}


exports.getSoc = async (req, res) => {
    let { cpid, connectorId } = req.params
    const currentSocValue = await OCPPTransaction.find({ transaction_status: 'Progress', cpid: cpid, connectorId: connectorId })
    const sovValue = currentSocValue[0]?.currentSoc || 0
    res.status(200).json({ status: true, result: sovValue }) 

}


exports.dashboardTrends = async(req, res)=>{
    try {
        const { startDate, endDate } = req.query;

        let query = { transaction_status: "Completed" }
        if (startDate && endDate) {
            const dateFormat = 'DD-MM-YYYY';
            const startMoment = moment(startDate, dateFormat);
            const endMoment = moment(endDate, dateFormat).endOf('day');
            query.startTime = {
                $gte: startMoment.toDate(),
                $lte: endMoment.toDate()
            };
        }

        const dailyRevenue = await OCPPTransaction.aggregate([
            { $match: query },
            {
                $group: {
                    _id: {
                        year: { $year: "$startTime" },
                        month: { $month: "$startTime" },
                        day: { $dayOfMonth: "$startTime" },
                    },
                    totalRevenue: { $sum: "$totalAmount" },
                },
            },
            {
                $project: {
                    _id: 0,
                    date: {
                        $dateToString: {
                            format: "%Y-%m-%d",
                            date: {
                                $dateFromParts: {
                                    year: "$_id.year",
                                    month: "$_id.month",
                                    day: "$_id.day"
                                }
                            }
                        }
                    },
                    totalRevenue: 1,
                },
            },
            { $sort: { date: 1 } },
        ]);

        const dailyTransactionCount = await OCPPTransaction.aggregate([
            { $match: query },
            {
                $group: {
                    _id: {
                        year: { $year: "$startTime" },
                        month: { $month: "$startTime" },
                        day: { $dayOfMonth: "$startTime" },
                    },
                    count: { $sum: 1 },
                },
            },
            {
                $project: {
                    _id: 0,
                    date: {
                        $dateToString: {
                            format: "%Y-%m-%d",
                            date: {
                                $dateFromParts: {
                                    year: "$_id.year",
                                    month: "$_id.month",
                                    day: "$_id.day"
                                }
                            }
                        }
                    },
                    count: 1,
                },
            },
            { $sort: { date: -1 } },
        ]);

        const dailyEnergy = await OCPPTransaction.aggregate([
            { $match: query },
            {
                $group: {
                    _id: {
                        year: { $year: "$startTime" },
                        month: { $month: "$startTime" },
                        day: { $dayOfMonth: "$startTime" },
                    },
                    totalEnergy: { $sum: "$totalUnits" },
                },
            },
            {
                $project: {
                    _id: 0,
                    date: {
                        $dateToString: {
                            format: "%Y-%m-%d",
                            date: {
                                $dateFromParts: {
                                    year: "$_id.year",
                                    month: "$_id.month",
                                    day: "$_id.day"
                                }
                            }
                        }
                    },
                    totalEnergy: 1,
                },
            },
            { $sort: { date: 1 } },
        ]);

        const matchingTransactions = await OCPPTransaction.find(query);

        let totalRevenue = 0;
        matchingTransactions.forEach(transaction => {
            totalRevenue += transaction.totalAmount;
        });

        let totalUnit = 0;
        matchingTransactions.forEach(transaction => {
            totalUnit += transaction.totalUnits;
        });

        const totalCount = matchingTransactions.length;

        res.status(200).json({ status: true, message: 'OK', revenue: dailyRevenue, chargingTransactions: dailyTransactionCount, energy:dailyEnergy, totalRevenue, totalCount, totalUnit })

    } catch (error) {
        res.status(400).json({ status: false, message: `Internal Server Error ${error.message}` })
    }
}

exports.dashboardUtilization = async (req, res)=>{
    try {
        const { startDate, endDate } = req.query;

        let query = { transaction_status: "Completed" }
        if (startDate && endDate) {
            const dateFormat = 'DD-MM-YYYY';
            const startMoment = moment(startDate, dateFormat);
            const endMoment = moment(endDate, dateFormat).endOf('day');
            query.startTime = {
                $gte: startMoment.toDate(),
                $lte: endMoment.toDate()
            };
        }

        const aggregatedData = await OCPPTransaction.aggregate([
            { $match: query },
            {
                $group: {
                    _id: {
                        month: { $month: "$startTime" }
                    },
                    totalRevenue: { $sum: "$totalAmount" },
                    energy: { $sum: "$totalUnits" }
                }
            },
            { 
                $sort: { "_id.month": 1 }
            }
        ]);
        
        const monthNames = moment.months(); 
        
        const datas = aggregatedData.map(item => {
            const monthIndex = item._id.month - 1; 
            const label = monthNames[monthIndex];
            return {
                value1: item.totalRevenue.toFixed(2),
                value2: item.energy.toFixed(2),
                label: label
            };
        });
        
        res.status(200).json({ status: true, message: 'OK', result: datas });

    } catch (error) {
        res.status(400).json({ status: false, message: `Internal Server Error ${error.message}` })
    }
}