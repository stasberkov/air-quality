declare interface Pin {
}

declare interface I2CSetupOptions {
    scl: Pin;
    dsa: Pin;
    bitrate: number;
}

declare interface I2C {
    setup(options: I2CSetupOptions): any;
    writeTo(address: number, data: number[]): any;
    readFrom(address: number, dataLength: number): any;
}

declare var I2C1: I2C;
declare var D0: Pin;
declare var D4: Pin;