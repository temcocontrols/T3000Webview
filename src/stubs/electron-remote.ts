// Browser stub for @electron/remote
export const app = { getPath:()=>"/eez-user-data", getVersion:()=>"0.0.0", relaunch:()=>{}, exit:()=>{} };
export const dialog = { showOpenDialog:()=>Promise.resolve({filePaths:[]}), showSaveDialog:()=>Promise.resolve({filePath:void 0}), showMessageBox:()=>Promise.resolve({response:0}) };
export const getCurrentWindow = () => null;
export const shell = { openPath:()=>Promise.resolve(""), openExternal:()=>Promise.resolve() };
export const clipboard = { writeText:()=>{}, readText:()=>"" };
export const Menu = { buildFromTemplate:()=>({popup:()=>{}}) };
export const MenuItem = class { constructor(_opts?:any){} click(){} };
export const BrowserWindow = { getAllWindows:()=>[], fromId:()=>null };
export const nativeTheme = { shouldUseDarkColors: false };
export const screen = { getPrimaryDisplay:()=>({workAreaSize:{width:1920,height:1080}}) };
