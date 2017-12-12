export = 0; // [sberkov] magic that removes 'Object.defineProperty(exports, "__esModule", { value: true });' in generated code.
import wifi = require("Wifi");
import mhz19 = require("./mh-z19");
import sht31 = require("./sht31");
import influxDB = require("InfluxDB");

const refreshPeriodSec = 10;
const influxDBParams = {
    influxDBHost: "",          // Host IP address or URL without "http://".
    influxPort: 8086,                   // InfluxDB server port.
    influxDBName: "air_quality",       // Database name (measurement).
    influxUserName: "root",             // User name account (must have write permission).
    influxPassword: "root",             // User password.
    influxAgentName: "ESPRUINO"         // Device name in HTTP headers.
};
const wifiParams= {
    ssid: "",
    password: ""
}

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
                const data = `air_quality,location=samara6-1 ${valstring}\n`;
                console.log(data);
                //influxDB.write(data);
                blink();
            }
        });
}

function onInit() {
    influxDB.setup(influxDBParams);
    I2C1.setup({ scl: D4, sda: D0 });
    Serial2.setup(9600, { rx: D16, tx: D17 });
    sht31Sensor.reset();
    wifi.connect(
        wifiParams.ssid,
        { password: wifiParams.password },
        (err) => {
            if (!err) {
                console.log("connected");
            }
        });

    setInterval(collectAndReportMetrics, refreshPeriodSec * 1000);
}
