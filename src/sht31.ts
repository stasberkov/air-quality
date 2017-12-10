const sht31Command = {
    reset: [0x30, 0xA2],
    measureForSsda: [0x24, 0x00]
}

export class SHT31Sensor {
    constructor(
        private readonly i2c: I2C,
        private readonly addr: number
    ) {
    }

    private checksum(data: number[]) {
        const polynomial = 0x31;

        let crc = 0xFF;
        let index = 0;

        for (let k in data) {
            crc ^= data[index++];
            for (let i = 8; i > 0; --i) {
                crc = crc & 0x80 ? (crc << 1) ^ polynomial : crc << 1;
                crc &= 0xFF;
            }
        }
        return crc;
    }

    private parseResult(res: number[]) {
        var temp = undefined;
        var rh = undefined;

        const st_check = this.checksum([res[0], res[1]]);
        if (res[2] == st_check) {
            const st = (res[0] << 8) + res[1];
            temp = st / 0xffff * 175 - 45;
        }

        const shr_check = this.checksum([res[3], res[4]]);
        if (res[5] == shr_check) {
            const shr = (res[3] << 8) + res[4];
            rh = (100 * shr / 0xffff);
        }

        return { t: temp, rh: rh };
    }

    public measure () {
        return new Promise( (fullfil, reject) => {
            this.i2c.writeTo(this.addr, sht31Command.measureForSsda);
            setTimeout(() => {
                const data = this.i2c.readFrom(this.addr, 6);
                const res = this.parseResult(data);
                fullfil(res);
            }, 500);
        });
    }

    public reset () {
        this.i2c.writeTo(this.addr, sht31Command.reset);
    };
}
