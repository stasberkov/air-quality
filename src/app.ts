import wifi = require("Wifi");
import mhz19 = require("./mh-z19");
import sht31 = require("./sht31");
import influxDB = require("InfluxDB");
import appConfig = require("./app-config");
import ccs811 = require("./ccs811");
import { Ccs811Sensor } from "./ccs811";

class Program {
    private sht31Sensor: sht31.SHT31Sensor;
    private mhz19Sensor: mhz19.MhZ19Sensor;
    private ccs811Sensor: ccs811.Ccs811Sensor;
    private influxDbClient: any;

    public static blink() {
        D22.write(false);
        setTimeout(function () { D22.write(true); }, 100);
    }

    public collectAndReportMetrics() {
        Promise.all(
            [
                this.sht31Sensor.measure(),
                this.mhz19Sensor.measure().then(
                    function (x) {
                        return x;
                    },
                    function (e: any) {
                        console.log("mhz19 error:", e);
                        return undefined;
                    }),
                this.ccs811Sensor.measure().then(
                    function (x) {
                        return x;
                    },
                    function (e: any) {
                        console.log("ccs811 error:", e);
                        return undefined;
                    }),
            ])
            .then((values) => {
                const tNrh = values[0];
                const co2 = values[1];
                //const ccsvalues: any = null;
                const ccsvalues = values[2];

                console.log("CO2  = ", co2);
                console.log("T    = ", tNrh.t);
                console.log("RH   = ", tNrh.rh);
                if (ccsvalues) {
                    console.log("eCO2 = ", ccsvalues.eco2);
                    console.log("tVOC  = ", ccsvalues.tvoc);
                }

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

                if (ccsvalues) {
                    if (ccsvalues.eco2 != undefined) {
                        vals.push(`eco2ppm=${ccsvalues.eco2}`);
                    }
                    if (ccsvalues.tvoc != undefined) {
                        vals.push(`tvocppm=${ccsvalues.tvoc}`);
                    }
                }

                if (vals.length > 0) {
                    const valstring = vals.join(",");
                    const data = `${appConfig.default.influxMeasurement},location=${appConfig.default.influxLocationTag} ${valstring}\n`;
                    console.log(data);
                    this.influxDbClient.write(data);
                    Program.blink();
                }
            });
    }

    public run() {
        I2C1.setup({ sda: D0, scl: D4 });
        Serial2.setup(9600, { rx: D16, tx: D17 });

        this.sht31Sensor = sht31.connect(I2C1);
        this.mhz19Sensor = mhz19.connect(Serial2);
        this.ccs811Sensor = ccs811.connect(I2C1);

        this.influxDbClient = influxDB.setup({
            influxDBHost: appConfig.default.influxHost,
            influxPort: appConfig.default.influxPort,
            influxDBName: appConfig.default.influxDbName,
            influxUserName: appConfig.default.influxUserName,
            influxPassword: appConfig.default.influxPassword,
            influxAgentName: appConfig.default.influxAgentName
        });

        wifi.connect(
            appConfig.default.wifiSsid,
            { password: appConfig.default.wifiPassword },
            (err) => {
                if (!err) {
                    console.log("connected: ", err);
                } else {
                    console.log("WIFI error: ", err)
                }
            });

        setInterval(() => { this.collectAndReportMetrics(); }, appConfig.default.refreshPeriodSec * 1000);
    }

}

function run() {
    new Program().run();
}

function onInit() {
    run();
}
