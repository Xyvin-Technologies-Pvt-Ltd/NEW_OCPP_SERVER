const OCPPLOG = require('../models/ocppLogs')
const moment = require('moment');
const { getCPID } = require('../services/ev-machine-api');


exports.getOCPPLogs = async (req, res, next) => {

    const evId = req.params.evID
    const logData = await OCPPLOG.find({ CPID: evId })
    if (!logData) {
        res.status(404).json({ error: 'Log not found' })
    } else {
        res.status(200).json({ status: true, messege: 'OK', result: logData })
    }
}



exports.getAllOCPPLogs = async (req, res, next) => {

    const locations = req.role.location_access;
    const findCPID = await getCPID(locations);
    const cpidList = findCPID.data.map(item => item.CPID);

    const { startDate, endDate, cpid, pageNo, searchQuery } = req.query;

    const filter = {};

    if (startDate && endDate) {
        const dateFormat = 'DD-MM-YYYY';
        const startMoment = moment(startDate, dateFormat);
        const endMoment = moment(endDate, dateFormat).endOf('day');
        filter.createdAt = {
            $gte: startMoment.toDate(),
            $lte: endMoment.toDate()
        };
    }

    if (cpid) filter.CPID = cpid;

    if (searchQuery) {
        filter.$or = [
            { messageType: { $regex: searchQuery, $options: 'i' } },
            { CPID: { $regex: searchQuery, $options: 'i' } }
        ];
    }

    if(cpidList){
        filter.CPID = { $in: cpidList }
    }
    

    let logData  = await OCPPLOG.find(filter).sort({ timestamp: -1 }).skip(10*(pageNo-1)).limit(10);
    let totalCount = await OCPPLOG.find(filter).countDocuments()


    if (!logData) {
        res.status(404).json({ error: 'Log not found' })
    } else {
        res.status(200).json({ status: true, messege: 'OK', result: logData, totalCount })
    }
}