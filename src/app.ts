import wifi = require("Wifi");
import mhz19 = require("./mh-z19");
import sht31 = require("./sht31");
import influxDB = require("InfluxDB");
import appConfig = require("./app-config");

const sht31Sensor = new sht31.SHT31Sensor(I2C1, 0x44);
const mhz19Sensor = new mhz19.MhZ19Sensor(Serial2);

function blink() {
    D22.write(false);
    setTimeout(function () { D22.write(true); }, 100);
}

function collectAndReportMetrics() {
    Promise.all(
        [
            sht31Sensor.measure(),
            mhz19Sensor.measure().then(
                function (x: any) {
                    return x;
                },
                function (e: any) {
                    console.log("mhz19 error:", e);
                    return undefined;
                })
        ])
        .then(function (values) {
            const tNrh = values[0];
            const co2 = values[1];

            console.log("CO2 = ", co2);
            console.log("T   = ", tNrh.t);
            console.log("RH  = ", tNrh.rh);

            var vals = [];
            if (tNrh.t != undefined) {
                vals.push(`t1=${tNrh.t}`);
            }
            if (tNrh.rh != undefined) {
                vals.push(`h1=${tNrh.rh}`);
            }
            if (co2 != undefined) {
                vals.push(`co2ppm=${co2}`);
            }

            if (vals.length > 0) {
                const valstring = vals.join(",");
                const data = `${appConfig.default.influxMeasurement},location=${appConfig.default.influxLocationTag} ${valstring}\n`;
                console.log(data);
                //influxDB.write(data);
                blink();
            }
        });
}

function onInit() {
    influxDB.setup({
        influxDBHost: appConfig.default.influxHost,
        influxPort: appConfig.default.influxPort,
        influxDBName: appConfig.default.influxDbName,
        influxUserName: appConfig.default.influxUserName,
        influxPassword: appConfig.default.influxPassword,
        influxAgentName: appConfig.default.influxAgentName
    });
    I2C1.setup({ scl: D4, sda: D0 });
    Serial2.setup(9600, { rx: D16, tx: D17 });
    sht31Sensor.reset();
    wifi.connect(
        appConfig.default.wifiSsid,
        { password: appConfig.default.wifiPassword },
        (err) => {
            if (!err) {
                console.log("connected");
            }
        });

    setInterval(collectAndReportMetrics, appConfig.default.refreshPeriodSec * 1000);
}
