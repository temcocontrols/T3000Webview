// Browser stub for 'serialport' — serial port communication not available in browser
export const SerialPort = class {
    constructor(_options: any, _callback?: (err: any) => void) {
        if (_callback) { _callback(null); }
    }
    on(_event: string, _callback: Function) { return this; }
    write(_data: any, _callback?: (err: any) => void) { if (_callback) { _callback(null); } }
    close(_callback?: (err: any) => void) { if (_callback) { _callback(null); } }
    drain(_callback?: (err: any) => void) { if (_callback) { _callback(null); } }
    flush(_callback?: (err: any) => void) { if (_callback) { _callback(null); } }
    pause() { return this; }
    resume() { return this; }
    set(_options: any, _callback?: (err: any) => void) { if (_callback) { _callback(null); } }
    get(_callback: (err: any, data: any) => void) { _callback(null, {}); }
    isOpen: boolean = false;
    path: string = "";
    baudRate: number = 9600;
};
// Socket class stub — TCP socket connections not available in browser
export const Socket = class {
    constructor(_options?: any) {}
    connect(_port: number, _host: string, _callback?: (err: any) => void) { if (_callback) { _callback(null); } }
    on(_event: string, _callback: Function) { return this; }
    write(_data: any, _callback?: (err: any) => void) { if (_callback) { _callback(null); } }
    end() { return this; }
    destroy() { return this; }
};
export default { SerialPort, Socket };
