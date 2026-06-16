// Browser stub for Electron
export const ipcRenderer = { on:()=>{}, once:()=>{}, send:()=>{}, sendSync:()=>({}), invoke:()=>Promise.resolve(), removeListener:()=>{}, removeAllListeners:()=>{} };
export const ipcMain = { on:()=>{}, handle:()=>{} };
export const app = { getPath:()=>"/eez-user-data", getVersion:()=>"0.0.0", relaunch:()=>{}, exit:()=>{}, whenReady:()=>Promise.resolve(), on:()=>{} };
export const dialog = { showOpenDialog:()=>Promise.resolve({filePaths:[]}), showSaveDialog:()=>Promise.resolve({filePath:void 0}), showMessageBox:()=>Promise.resolve({response:0}) };
export const shell = { openPath:()=>Promise.resolve(""), openExternal:()=>Promise.resolve(), showItemInFolder:()=>{} };
export const clipboard = { writeText:()=>{}, readText:()=>"", writeBuffer:()=>{}, readBuffer:()=>new Uint8Array };
export const screen = { getPrimaryDisplay:()=>({workAreaSize:{width:1920,height:1080}}) };
export const nativeTheme = { shouldUseDarkColors: false };
export const session = { defaultSession: { loadExtension:()=>Promise.resolve() } };
export const powerSaveBlocker = { start:()=>0, stop:()=>{} };
export const net = { fetch: fetch.bind(window) };
export class BrowserWindow { static getAllWindows(){return[]} static fromId(){return null} constructor(){} loadURL(){} on(){} webContents={send:()=>{}} }
export const Menu = { buildFromTemplate:()=>({popup:()=>{}}), setApplicationMenu:()=>{} };
export const MenuItem = class { constructor(_opts?:any){} click(){} };
