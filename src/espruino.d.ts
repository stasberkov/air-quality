declare interface Pin {
    write(data: any): any;
}

declare interface I2CSetupOptions {
    scl: Pin;
    sda: Pin;
    bitrate?: number;
}

declare interface I2C {
    setup(options: I2CSetupOptions): any;
    writeTo(address: number, data: number[]): any;
    readFrom(address: number, dataLength: number): any;
}

declare var I2C1: I2C;
declare var D0: Pin;
declare var D4: Pin;
declare var D16: Pin;
declare var D17: Pin;
declare var D22: Pin;

declare interface Serial extends Object {
    write(data: any[]): any;
    on(event: string, handler: (data: any) => any): any;
    setup(boudrate: number, options: any): any;
    read(chars?: number): string;
}

declare interface Object {
    removeListener(event: string, listener: any): any;
}

declare const Serial2: Serial;
declare const E: any;

//declare function require(moduleName: string): any;

declare module "Wifi" {
    function connect(ssid: string, options: any, callback: (err: any) => any): any;
}

declare module "InfluxDB" {
    function setup(options: any): any;
    function write(data: string): any;
}