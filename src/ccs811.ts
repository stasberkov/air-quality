export class Ccs811Sensor {
    private readonly addr: number;

    constructor(private readonly i2c: I2C, add: boolean = false) {
        if (add) {
            this.addr = 0x5B;
        } else {
            this.addr = 0x5A;
        }
    }

    public init() {
        this.i2c.writeTo(this.addr, Ccs811Register.HwId);
        const hwIdResp = this.i2c.readFrom(this.addr, 1);
        if (hwIdResp[0] != Ccs811HwIdCode) {
            throw new Error("HW ID missmatch");
        }

        const statusBeforeStart = this.getStatus();
        if (statusBeforeStart.error) {
            throw new Error("Sensor in error state");
        }

        this.startFwApp();
        this.setMeasurmentMode(Ccs811MeasurmentMode.Every1Sec);
    }

    private startFwApp() {
        this.i2c.writeTo(this.addr, Ccs811Register.AppStart);
    }

    public getStatus() {
        this.i2c.writeTo(this.addr, Ccs811Register.Status);
        const res = this.i2c.readFrom(this.addr, 1);
        return new Ccs811Status(res[0]);
    }

    private measurmentMode: Ccs811MeasurmentMode;

    public setMeasurmentMode(mode: Ccs811MeasurmentMode) {
        const measModeByte = mode << 4;
        this.i2c.writeTo(this.addr, [Ccs811Register.MeasurmentMode, measModeByte]);
        this.measurmentMode = mode;
    }

    private currentGetValuesPromise: Promise<Ccs811Values> | null = null;

    public measure() {
        if (!this.currentGetValuesPromise) {
            this.currentGetValuesPromise = this.waitForData()
                .then(() => {
                    try {
                        return Promise.resolve(this.readAlgResultData());
                    }
                    catch (e) {
                        return Promise.reject(e);
                    }
                })
                .then(
                (x) => {
                    this.currentGetValuesPromise = null;
                    return x;
                }, (x) => {
                    this.currentGetValuesPromise = null;
                    return x;
                });
        }

        return this.currentGetValuesPromise;
    }

    private getDataWaitTimeoutInSecForCurrentMeasurmentMode() {
        switch (this.measurmentMode) {
            case Ccs811MeasurmentMode.Every1Sec: return 1;
            case Ccs811MeasurmentMode.Every10Sec: return 10;
            case Ccs811MeasurmentMode.Every60Sec: return 60;
            case Ccs811MeasurmentMode.Every250Ms: return 1;
            default:
                throw new Error("Unknown measurment mode: " + this.measurmentMode);
        }
    }

    private waitForData(): Promise<void> {
        const status = this.getStatus();
        if (status.dataReady) {
            return Promise.resolve();
        }
        return new Promise((resolve, reject) => {
            const startTime = getTime();
            const maxTime = startTime + this.getDataWaitTimeoutInSecForCurrentMeasurmentMode();
            const timerId = setInterval(() => {
                const currTime = getTime();
                const status2 = this.getStatus();
                if (status2.dataReady) {
                    clearInterval(timerId);
                    resolve();
                } else if (currTime > maxTime) {
                    clearInterval(timerId);
                    reject(new Error("data wait timed out"));
                }
            }, 1000);
        });
    }

    public readAlgResultData() {
        this.i2c.writeTo(this.addr, Ccs811Register.AlgResultData);
        const res = this.i2c.readFrom(this.addr, 8);
        const values = new Ccs811Values;

        values.eco2 = ((res[0] << 8) | res[1]);
        values.tvoc = ((res[2] << 8) | res[3]);

        const algResultReadStatus = new Ccs811Status(res[4]);
        if (algResultReadStatus.error) {
            throw new Error("ErrorId: " + res[5])
        }

        return values;
    }
}

export class Ccs811Status {
    public readonly error: boolean;
    public readonly dataReady: boolean;
    public readonly appValid: boolean;
    public readonly fwMode: boolean;

    constructor(res: number) {
        this.error = !!(res & 0x01);
        this.dataReady = !!((res >> 3) & 0x01);
        this.appValid = !!((res >> 4) & 0x01);
        this.fwMode = !!((res >> 7) & 0x01);
    }
}

const Ccs811HwIdCode = 0x81;

const enum Ccs811Register {
    Status = 0x00,
    MeasurmentMode = 0x01,
    AlgResultData = 0x02,
    HwId = 0x20,
    AppVerify = 0xF3,
    AppStart = 0xF4,
    ErrorId = 0xE0
}

const enum Ccs811MeasurmentMode {
    Idle = 0,
    Every1Sec = 1,
    Every10Sec = 2,
    Every60Sec = 3,
    Every250Ms = 4
}

class Ccs811Values {
    public eco2: number;
    public tvoc: number;
}

export function connect(i2c: I2C, add: boolean = false) {
    const sens = new Ccs811Sensor(i2c, add);
    sens.init();
    return sens;
}