const data = 
    {
        "connectorId": 1,
        "transactionId": 722861176,
        "meterValue": [
            {
                "timestamp": "2023-12-23T12:23:16Z",
                "sampledValue": [
                    {
                        "value": "45.4",
                        "context": "Sample.Periodic",
                        "format": "Raw",
                        "measurand": "Current.Import",
                        "location": "Outlet",
                        "unit": "A"
                    },
                    {
                        "value": "2818570",
                        "context": "Sample.Periodic",
                        "format": "Raw",
                        "measurand": "Energy.Active.Import.Register",
                        "location": "Outlet",
                        "unit": "Wh"
                    },
                    {
                        "value": "15594.9",
                        "context": "Sample.Periodic",
                        "format": "Raw",
                        "measurand": "Power.Active.Import",
                        "location": "Outlet",
                        "unit": "W"
                    },
                    {
                        "value": "91",
                        "context": "Sample.Periodic",
                        "format": "Raw",
                        "measurand": "SoC",
                        "location": "EV",
                        "unit": "Percent"
                    },
                    {
                        "value": "239.7",
                        "context": "Sample.Periodic",
                        "format": "Raw",
                        "measurand": "Voltage",
                        "phase": "L1-N",
                        "location": "Inlet",
                        "unit": "V"
                    }
                ]
            }
        ]
    }


const meterValueResult2 = data.meterValue.find(x => x.sampledValue.find(sampledValue => sampledValue.measurand === "SoC"))
const sampledValue = meterValueResult2.sampledValue.find(sampledValue => sampledValue.measurand === "SoC")



console.log(sampledValue.value)