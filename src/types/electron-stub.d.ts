declare namespace NodeJS { interface Process { type?: string } }
declare namespace Electron {
    interface Event extends Event {}
    interface WebContents { send: (c: string, ...a: any[]) => void }
    interface IpcRenderer { on: (c: string, l: (...a: any[]) => void) => void; send: (c: string, ...a: any[]) => void; sendSync: (c: string, ...a: any[]) => any }
    interface IpcMain { on: (c: string, l: (...a: any[]) => void) => void }
    interface IpcMainEvent { sender: WebContents }
    interface BrowserWindowConstructorOptions {}
    class BrowserWindow { constructor(o?: BrowserWindowConstructorOptions); static getAllWindows(): BrowserWindow[]; static fromId(id: number): BrowserWindow | null; id: number; webContents: WebContents; on: (e: string, cb: (...a: any[]) => void) => void; loadURL: (url: string) => void; show: () => void; close: () => void }
}
declare module "electron" { export const ipcRenderer: Electron.IpcRenderer; export const ipcMain: Electron.IpcMain; export const app: any; export const dialog: any; export const BrowserWindow: typeof Electron.BrowserWindow; export const shell: any; export const clipboard: any; export const screen: any; export const nativeTheme: any; export const Menu: any; export const session: any; export const powerSaveBlocker: any; export const Notification: any; export const net: any }
declare module "@electron/remote" { export const app: any; export const dialog: any; export const getCurrentWindow: () => any; export const BrowserWindow: typeof Electron.BrowserWindow; export const Menu: any; export const shell: any; export const clipboard: any; export const nativeTheme: any; export const screen: any }
declare module "better-sqlite3" { const Database: any; export default Database }
declare module "archiver" { function archiver(f: string, o?: any): any; export = archiver }
declare module "adm-zip" { class AdmZip { constructor(p: string); extractAllToAsync: (p: string, o: boolean, k: boolean, cb: (e?: any) => void) => void }; export = AdmZip }
