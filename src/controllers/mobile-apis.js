const OCPPTransaction = require("../models/ocppTransaction");
const moment = require('moment')
const momentTimezone = require('moment-timezone');
const mongoose = require('mongoose')
const { generatePdf } = require('../utils/generatePdf');

//!ASHIN SSS
exports.getActiveSession = async (req, res, next) => {
    try {
        const userId = req.params.userId;

        const ongoingTransaction = await OCPPTransaction.findOne({ user: userId, transaction_status: { $in: ["Progress", "Initiated"] } })
        if (!ongoingTransaction) {
            return res.status(400).json({ error: 'Ongoing transaction not found' });
        }
        let unitsUsed = 0
        if (ongoingTransaction) unitsUsed = ongoingTransaction.meterStart ? ongoingTransaction.lastMeterValue - (ongoingTransaction.meterStart / 1000) : ongoingTransaction.lastMeterValue //meterStart is in wh format and lastMeterValue is in kWh format 


        let pipedData = await OCPPTransaction.aggregate([
            { $match: { _id: new mongoose.Types.ObjectId(ongoingTransaction._id) } },
            {
                $lookup: {
                    from: 'evmachines',
                    localField: 'cpid',
                    foreignField: 'CPID',
                    pipeline: [ // Add this pipeline to project only required fields
                        {
                            $project: {
                                _id: 1, // Assuming 'name' is the field you need
                                name: 1, // Replace 'phone' with the actual field name for phone
                                evModel: 1,
                                CPID: 1,
                                chargingTariff: 1,
                                location_name: 1,

                            }
                        }
                    ],
                    as: 'evMachines'
                }
            },

            { $unwind: { path: "$evMachines", preserveNullAndEmptyArrays: true } },
            {
                $lookup: {
                    from: 'ev_models', // Replace with your actual evModel collection name
                    localField: 'evMachines.evModel',
                    foreignField: '_id',
                    pipeline: [

                        {
                            $project: {
                                model_name: 1, // Replace 'phone' with the actual field name for phone
                                output_type: 1,
                                capacity: 1,
                                connectors: 1, //

                            }
                        }
                    ],
                    as: 'evMachines.evModelDetails'
                }
            },
            {
                $lookup: {
                    from: 'chargingtariffs', // Replace with your actual chargerTariff collection name
                    localField: 'evMachines.chargingTariff',
                    foreignField: '_id',
                    pipeline: [
                        {
                            $lookup: { // Nested lookup for the oem collection
                                from: 'taxes', // Replace with your actual oem collection name
                                localField: 'tax',
                                foreignField: '_id',
                                as: 'taxDetails'
                            }
                        },
                        {
                            $unwind: {
                                path: '$taxDetails',
                                preserveNullAndEmptyArrays: true
                            }
                        },
                        {
                            $project: {
                                tariffType: 1,
                                value: 1,
                                serviceAmount: 1,
                                tax_name: '$taxDetails.name',
                                tax_percentage: '$taxDetails.percentage',
                                charger_tariff: {
                                    $add: [
                                        { $add: ['$serviceAmount', '$value'] },
                                        {
                                            $multiply: [
                                                { $add: ['$serviceAmount', '$value'] },
                                                { $divide: ['$taxDetails.percentage', 100] },

                                            ]
                                        }]
                                }
                            }
                        }
                    ],
                    as: 'evMachines.chargingTariffDetails'
                }
            },
        ])

        let connectorType = pipedData[0].evMachines.evModelDetails[0].connectors.filter(connector => connector.connectorId === ongoingTransaction.connectorId)
        let result = {
            transactionId: ongoingTransaction ? ongoingTransaction.transactionId : null,
            cpid: ongoingTransaction ? ongoingTransaction.cpid : null,
            connectorId: ongoingTransaction ? ongoingTransaction.connectorId : null,
            unitUsed: ongoingTransaction ? unitsUsed : null,
            startTime: ongoingTransaction ? ongoingTransaction.startTime : null,
            chargerName: ongoingTransaction ? ongoingTransaction.cpid : null,
            outputType: pipedData[0].evMachines.evModelDetails[0].output_type || null,
            capacity: pipedData[0].evMachines.evModelDetails[0].capacity || null,
            connectorType: connectorType[0].type || null,
            tariff: pipedData[0].evMachines.chargingTariffDetails[0].charger_tariff,
            chargingStationId: pipedData[0].evMachines.location_name || null,
            currentSoc: ongoingTransaction ? ongoingTransaction.currentSoc : null
        }

        res.status(200).json({ success: true, result: result, message: `Ok` })
    }
    catch (error) {
        next(error);
    }
}
//!ASHIN END

exports.getChargingHistory = async (req, res, next) => {
    try {
        const userId = req.params.userId;
        const fromDate = req.body.fromDate ? moment(req.body.fromDate, "DD-MM-YYYY").toDate() : ""
        let toDate = req.body.toDate ? moment(req.body.toDate, "DD-MM-YYYY").endOf('day').toDate() : "";

        let filters = { user: new mongoose.Types.ObjectId(userId) }

        if (fromDate && toDate) filters.startTime = { $gte: fromDate, $lt: toDate }

        const pageNo  = req.query.pageNo || req.body.pageNo;

        const aggregationPipeline = [
            { $match: filters },
            { $sort: { createdAt: -1 } },
            {
                $lookup: {
                    from: "evmachines",
                    localField: "cpid",
                    foreignField: "CPID",
                    pipeline: [
                        {
                            $lookup: {
                                from: "chargingstations",
                                localField: "location_name",
                                foreignField: "_id",
                                as: "stationDetails",
                            },
                        },
                        {
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
                    "image": "",
                    "chargingPoint": "$cpid",
                    "connectorId": "$connectorId",
                    "closeBy": "$closeBy",
                    "transactionMode": "$transactionMode",
                    "closureReason": "$closureReason",
                    "transactionId": "$transactionId",
                    "status": "$transaction_status",
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
        ];

        // Check if pageNo is provided and apply pagination
        if (pageNo) {
            aggregationPipeline.push(
                { $skip: 10 * (parseInt(pageNo) - 1) },
                { $limit: 10 }
            );
        }

        const result = await OCPPTransaction.aggregate(aggregationPipeline);



        let totalCount = await OCPPTransaction.find(filters).countDocuments()


        let formattedData = result.map(data => {
            const withoutTax = data.amount ? Number(data.amount) / (1 + (Number(data.tax) / 100)) : 0;

            const taxAmount = data.tax ? Number(data.amount) - withoutTax : null
            if (!data.tax) data.tax = null

            return {
                ...data,
                taxAmount,
                duration: timeDifference(data.chargingStopTime, data.chargingStartTime),
                chargingStartTime: data.chargingStartTime ? moment(data.chargingStartTime).format("DD-MM-YYYY hh:mm A") : "",
                chargingStopTime: data.chargingStopTime ? moment(data.chargingStopTime).format("DD-MM-YYYY hh:mm A") : "",
            }
        })

        res.status(200).json({ success: true, result: formattedData, message: `Ok`, totalCount })
    }
    catch (error) {
        next(error);
    }
}

exports.getInvoice = async (req, res, next) => {
    try {
        const transactionId = Number(req.params.transactionId)
        // const transactionData = await OCPPTransaction.findOne({ transactionId })
        const result = await OCPPTransaction.aggregate([
            { $match: { transactionId: transactionId } },
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
                                evModel: 1,
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
            {
                $lookup: {
                    from: 'ev_models', // Collection name of ChargingStation model
                    localField: 'evMachineDetails.evModel',
                    foreignField: '_id',
                    // as: 'chargingStation',
                    pipeline: [

                        {
                            $project: {
                                connectors: 1,
                            }
                        }
                    ],
                    as: 'connectorDetails',
                }
            },
        ])
        let transactionData = result[0]
        if (!transactionData) return res.status(400).json({ success: false, result: "", message: `Transaction not found` })
        if (transactionData.transaction_status !== "Completed") return res.status(400).json({ success: false, result: "", message: `Transaction not completed` })

        let connectorFound = transactionData.connectorDetails[0].connectors.find(x => x.connectorId === transactionData.connectorId)
        const energyConsumed = transactionData.meterStart && transactionData.lastMeterValue ? transactionData.lastMeterValue - (transactionData.meterStart / 1000) : ""
        const transaction = {
            startTime: transactionData.startTime,
            transactionId: transactionData.transactionId,
            energyConsumed: `${energyConsumed} kWh`,
            tariff: transactionData.chargingTariff,
            duration: timeDifference(transactionData.endTime, transactionData.startTime),
            totalAmount: transactionData.totalAmount.toFixed(2),
            taxRate: transactionData.tax,
            taxAmount: transactionData.totalAmount * transactionData.tax,
            totalAmountInWords: numberToWords(transactionData.totalAmount.toFixed(2)).toUpperCase(),
            paymentMethod: "Wallet",
            chargingStation: {
                name: transactionData.chargingStation[0].name,
                evMachineName: transactionData.cpid,
                connectorType: connectorFound ? connectorFound.type : "",
            },
            user: {
                name: transactionData.userDetails[0].username,
                mobile: transactionData.userDetails[0].mobile,
            }
        }

        generatePdf(transaction, (error, result) => {
            if (!error) {
                res.status(200).json({ success: true, result: result, message: `Ok` })
            }
            else res.status(400).json({ success: false, result: "", message: `Error generating pdf` })
        })

    }
    catch (error) {
        next(error);
    }
}

exports.getBalance = async (transactionId) => {


    const result = await OCPPTransaction.aggregate([
        { $match: { transactionId: transactionId } },
        {
            $lookup: {
                from: "users",
                localField: "user",
                foreignField: "_id",
                pipeline: [

                    {
                        $project: {
                            wallet: 1, // Replace 'phone' with the actual field name for phone
                        }
                    }
                ],
                as: "balanceAmount"
            }
        }

    ])

    return result[0].balanceAmount[0].wallet || 200;

}

exports.getActiveSessionDashboard = async (req, res, next) => {

    //!need to add SOC start andcurrent in DB
    let pipeline = await OCPPTransaction.aggregate([
        { $match: { transaction_status: { $in: ["Initiated", "Progress"] } } },
        { $sort: { startTime: -1 } },

        {
            $lookup: {
                from: 'users',
                localField: 'user',
                foreignField: '_id',
                as: 'userdetails',
            }
        },
        { $unwind: { path: "$userdetails", preserveNullAndEmptyArrays: true } },

        {
            $lookup: {
                from: 'evmachines',
                localField: 'cpid',
                foreignField: 'CPID',
                as: 'evMachine'
            }
        },
        { $unwind: { path: "$evMachine", preserveNullAndEmptyArrays: true } },

        {
            $lookup: {
                from: 'chargingstations', // Collection name of ChargingStation model
                localField: 'evMachine.location_name',
                foreignField: '_id',
                as: 'chargingStation'
            }
        },
        { $unwind: { path: "$chargingStation", preserveNullAndEmptyArrays: true } },



        {
            $project: {
                _id: 1,
                cpid: 1,
                transactionId: 1,
                startTime: 1,
                startSoc: 1,
                currentSoc: 1,
                username: '$userdetails.username',
                chargingStationName: '$chargingStation.name',
                connectorId: 1,
                meterStart:1,
                lastMeterValue:1,
                transactionMode: 1,
                totalUnits: 1,
                updatedAt: 1,
                createdAt: 1,
                chargeSpeed: 1,
            }
        }
    ])

   


    const formattedData = pipeline.map(item => {


        const moment1 = moment(item.createdAt);
        const moment2 = moment(item.updatedAt);

        
        const durationString = moment.duration(moment2.diff(moment1));
        const durationF = moment.duration(durationString);
        const duration = moment.utc(durationF.asMilliseconds()).format("m [min and] s [s]");

        return {
            _id: item._id,
            transactionId: item.transactionId,
            username: item.username,
            chargingStationName: item.chargingStationName,
            startTime: momentTimezone(item.startTime).tz('Asia/Kolkata').format('DD-MM-YYYY hh:mm:ss A'),
            cpid: item.cpid,
            connectorId: item.connectorId,
            startSoc: item.startSoc,
            currentSoc: item.currentSoc,
            chargeSpeed: item.chargeSpeed*1000,
            duration: duration,
            unitConsumed: item.lastMeterValue - item.meterStart/1000,
            lastMeterValue: momentTimezone(item.updatedAt).tz('Asia/Kolkata').format('DD-MM-YYYY hh:mm:ss A'),
            updatedAt: momentTimezone(item.updatedAt).tz('Asia/Kolkata').format('DD-MM-YYYY hh:mm:ss A'),
            transactionMode: item.transactionMode,

        };
    });


    res.status(200).send({ status: true, message: 'OK', result: formattedData });


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

function numberToWords(num) {
    const ones = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'];
    const teens = ['', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
    const tens = ['', 'ten', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
    const scales = ['', 'thousand', 'million', 'billion', 'trillion'];

    function convertLessThanOneThousand(number) {
        let words = '';
        const hundreds = Math.floor(number / 100);
        const remainder = number % 100;

        if (hundreds > 0) {
            words += ones[hundreds] + ' hundred ';
        }

        if (remainder > 0) {
            if (remainder < 10) {
                words += ones[remainder];
            } else if (remainder < 20) {
                words += teens[remainder - 10];
            } else {
                words += tens[Math.floor(remainder / 10)];
                if (remainder % 10 > 0) {
                    words += '-' + ones[remainder % 10];
                }
            }
        }

        return words;
    }

    function convert(number) {
        if (number === 0) return 'zero';

        let words = '';
        let scaleIndex = 0;

        while (number > 0) {
            const chunk = number % 1000;
            if (chunk !== 0) {
                words = convertLessThanOneThousand(chunk) + scales[scaleIndex] + ' ' + words;
            }
            number = Math.floor(number / 1000);
            scaleIndex++;
        }

        return words.trim();
    }

    const integerPart = Math.floor(num);
    const decimalPart = num % 1;
    let result = convert(integerPart);

    if (decimalPart > 0) {
        result += ' point ';
        const decimalWords = decimalPart.toFixed(2).split('.')[1];
        for (let i = 0; i < decimalWords.length; i++) {
            result += ones[parseInt(decimalWords[i])] + ' ';
        }
    }

    return result.trim();
}
