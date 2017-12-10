var wifi = require("Wifi");
var sht31 = require("./sht31");

I2C1.setup({ }); // attempt to reset I2C
I2C1.setup({ scl: D4, sda: D0 });

var sht31Sensor = new sht31.SHT31Sensor(I2C1, 0x44);
sht31Sensor.reset();

function measure() {
    sht31Sensor.measure().then(x => {
        console.log(x.t);
        console.log(x.rh);
    });
}

setTimeout(() => {
    measure();
}, 100);
