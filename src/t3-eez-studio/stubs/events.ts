// Browser stub for Node.js 'events'
export class EventEmitter {
    private _events: Record<string, Function[]> = {};
    on(e: string, l: Function) { (this._events[e] = this._events[e] || []).push(l); return this }
    once(e: string, l: Function) { const w = (...a: any[]) => { this.off(e, w); l(...a) }; return this.on(e, w) }
    off(e: string, l: Function) { const q = this._events[e]; if (q) this._events[e] = q.filter(x => x !== l); return this }
    emit(e: string, ...a: any[]) { (this._events[e] || []).forEach(l => l(...a)); return true }
    removeListener = this.off;
    removeAllListeners(e?: string) { if (e) delete this._events[e]; else this._events = {}; return this }
    listenerCount(e: string) { return (this._events[e] || []).length }
    listeners(e: string) { return [...(this._events[e] || [])] }
    eventNames() { return Object.keys(this._events) }
    setMaxListeners() { return this }
}
export default EventEmitter;
