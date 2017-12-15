export class MhZ19Sensor {
    constructor(
        private readonly serial: Serial
    ) {
    }

    private calcCheckSum(data: any) {
        var checksum = 0;
        for (var i = 0; i < 8; i++) {
            checksum += data[i];
        }

        checksum = checksum % 256;
        checksum = 0xff - checksum;
        return checksum;
    }

    public measure(): Promise<number> {
        this.serial.read(); // flush the buffer;
        const self = this;
        return new Promise((fulfill, reject) => {
            const handler = function (str: string) {
                self.serial.removeListener('data', handler);
                var c = new Object();
                var bytes = new Uint8Array(E.toArrayBuffer(str));
                if (bytes.length < 9) {
                    reject("bad data: " + bytes);
                }
                const checksum = self.calcCheckSum(bytes);
                if (bytes[8] != checksum) {
                    reject("checksum error: " + bytes);
                }
                const co2 = bytes[2] * 256 + bytes[3];
                fulfill(co2);
                clearTimeout(errTimer);
            };
            const errTimer = setTimeout(() => {
                self.serial.removeListener('data', handler);
                reject("read timeout");
            }, 10000);

            this.serial.on('data', handler);
            this.serial.write([0xFF, 0x01, 0x86, 0x00, 0x00, 0x00, 0x00, 0x00, 0x79]);
        });
    }
}