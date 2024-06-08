const { getMobileClient } = require('../../middlewares/clientsManager');
const OCPPTransaction = require('../../models/ocppTransaction');
const saveLogs = require('../../utils/saveLogs')
const { updateMeterAmount } = require('../../utils/updateMeter');
const { getBalance } = require('../mobile-apis');



async function handleMeterValues({ params, identity }) {
    try {



        console.log(`Server got MeterValues from ${identity}:`, params.transactionId);
        const messageType = 'MeterValues';
        await saveLogs(identity, messageType, params)

        const { connectorId, transactionId } = params
        // const meterValueResult = params.meterValue.find(x => x.sampledValue[0].measurand == "Energy.Active.Import.Register")
        // const meterValueResult = params.meterValue.find(x => x.sampledValue.find(sampledValue => sampledValue.measurand === "Energy.Active.Import.Register"))
        const meterValueResult = params.meterValue.find(x => x.sampledValue.find(sampledValue => sampledValue.measurand === "Energy.Active.Import.Register"))
        const sampledValue = meterValueResult.sampledValue.find(sampledValue => sampledValue.measurand === "Energy.Active.Import.Register")
        //if energy is in Wh format, convert it to kWh using '/1000'
        const meterValue = sampledValue.unit == "Wh" ? sampledValue.value / 1000 : sampledValue.value

        //* Find Charging Percentage

        let socValue, chargingSpeed;
        try {

            const meterValueResult2 = params.meterValue.find(x => x.sampledValue.find(sampledValue => sampledValue.measurand === "SoC"))
            socValue = meterValueResult2.sampledValue.find(sampledValue => sampledValue.measurand === "SoC")?.value ?? 25;

            const chargingSpeedResult = params.meterValue.find(x => x.sampledValue.find(sampledValue => sampledValue.measurand === "Power.Active.Import"))
            chargingSpeed = chargingSpeedResult?.sampledValue.find(sampledValue => sampledValue.measurand === "Power.Active.Import")?.value ?? 25;
            
        } catch (error) {
            console.log('error from here SOC /charging speed from meter value')
        }
        //!need to update the db except completion status and throw error
        // const transactionAlreadyCompleted = await OCPPTransaction.findOne({transactionId, transaction_status: "Completed"}, '_id transaction_status')
        // console.log(transactionAlreadyCompleted)
        // if (transactionAlreadyCompleted) throw new Error("Transaction already Completed")
console.log({'Soc':socValue,'cs':chargingSpeed});
        let balance;
        try {
            
            balance = await updateMeterAmount(transactionId, meterValue, "meterValues",socValue, chargingSpeed/1000)

        } catch (error) {
            console.log('Meter value not updated' + error)
        }

        //!ws percentage
        const mobileClient = await transactionId.toString()
        const mobileWs = await getMobileClient(mobileClient);

        if (mobileWs) {
            const balance2 = await getBalance(transactionId)
            const { unitUsed } = await getBalance_and_unitUsed(transactionId, meterValue)
            let roundedBalance = balance2.toFixed(2)
            let roundedUnitUsed = unitUsed.toFixed(2)

            let result = { type: 'SoC', percentage:socValue, unitUsed: Number(roundedUnitUsed), balance: Number(roundedBalance), status: "Charging" }
            
            mobileWs.send(JSON.stringify(result));
        } else {
            console.log('Client Not Found', mobileClient)
        }


        return {
            currentTime: new Date().toISOString(),
        };
    }
    catch (error) {
        console.error(`Error handling MeterValues from ${identity}:`, error.message);
        throw error; // Re-throw the error to propagate it further if needed
    }
}

async function getBalance_and_unitUsed(transactionId, currentMeterValue) {
    const transaction = await OCPPTransaction.findOne({ transactionId: Number(transactionId) })
    return {
        unitUsed: currentMeterValue - (transaction.meterStart / 1000)
    }
}

module.exports = { handleMeterValues }