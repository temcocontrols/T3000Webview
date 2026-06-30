// better-sqlite3 browser proxy — routes through Rust backend's real SQLite
let _storeAvailable = true;
let _storeWarned = false;
let _pendingBegin = false;       // next prepare().run() should fold in BEGIN
let _pendingCommit = false;      // commit was deferred — send standalone COMMIT on next interaction

function storeCall(action: string, sql: string, params: any[] = [], prefix?: string): any {
    if (!_storeAvailable) {
        if (action === "all") return [];
        if (action === "get") return undefined;
        return { lastInsertRowid: 0, changes: 0 };
    }
    const req = new XMLHttpRequest();
    req.open("POST", "/api/eez-studio/store", false);
    req.setRequestHeader("Content-Type", "application/json");
    try {
        const body: any = { action, sql, params };
        if (prefix) body.prefix = prefix;
        req.send(JSON.stringify(body));
    } catch {
        _storeAvailable = false;
        if (!_storeWarned) {
            console.warn("Store backend unavailable — running with in-memory fallback (data lost on refresh)");
            _storeWarned = true;
        }
        return action === "all" ? [] : action === "get" ? undefined : { lastInsertRowid: 0, changes: 0 };
    }
    if (req.status === 200) {
        _storeAvailable = true;
        return JSON.parse(req.responseText);
    }
    _storeAvailable = false;
    if (!_storeWarned) {
        console.warn(`Store backend returned ${req.status} — running with in-memory fallback`);
        _storeWarned = true;
    }
    return action === "all" ? [] : action === "get" ? undefined : { lastInsertRowid: 0, changes: 0 };
}

class Statement {
    private _sql: string;
    private _params: any[];

    constructor(sql: string) {
        this._sql = sql;
        this._params = [];
    }

    run(...params: any[]): any {
        this._params = params.length ? params : this._params;
        // Flush any pending COMMIT from a prior transaction BEFORE starting a new one
        if (_pendingCommit) {
            _pendingCommit = false;
            storeCall("exec", "COMMIT");
        }
        let prefix: string | undefined;
        if (_pendingBegin) {
            prefix = "BEGIN IMMEDIATE";
            _pendingBegin = false;
        }
        return storeCall("run", this._sql, this._params, prefix);
    }

    get(...params: any[]): any {
        this._params = params.length ? params : this._params;
        const result = storeCall("get", this._sql, this._params);
        return result || undefined;
    }

    all(...params: any[]): any[] {
        this._params = params.length ? params : this._params;
        return storeCall("all", this._sql, this._params) || [];
    }

    bind(...params: any[]): Statement {
        this._params = params;
        return this;
    }
}

class Database {
    constructor(_path: string, _opts?: any) {}

    prepare(sql: string): Statement {
        return new Statement(sql);
    }

    exec(sql: string): void {
        // If there's a pending commit, append it to this exec call
        if (_pendingCommit) {
            _pendingCommit = false;
            sql = sql + "; COMMIT";
        }
        storeCall("exec", sql);
    }

    // Deferred transaction: BEGIN is folded into the next prepare().run() call
    beginDeferred(): void {
        _pendingBegin = true;
    }

    // Deferred commit: COMMIT is sent with the next exec() or prepare().run() call,
    // or as a standalone call if nothing follows.
    commitDeferred(): void {
        _pendingCommit = true;
    }

    // Flush any pending COMMIT
    flushDeferred(): void {
        if (_pendingCommit) {
            _pendingCommit = false;
            storeCall("exec", "COMMIT");
        }
        _pendingBegin = false;
    }

    close(): void {}

    pragma(_name: string, _opts?: any): any[] {
        return [];
    }

    defaultSafeIntegers(): this {
        return this;
    }

    transaction(fn: Function): any {
        storeCall("exec", "BEGIN IMMEDIATE TRANSACTION");
        try {
            const result = fn();
            storeCall("exec", "COMMIT TRANSACTION");
            return result;
        } catch (e) {
            storeCall("exec", "ROLLBACK TRANSACTION");
            throw e;
        }
    }

    backup(_dest: string): Promise<void> {
        return Promise.resolve();
    }
}

const BetterSqlite3 = Database as any;
export default BetterSqlite3;
export { BetterSqlite3 as Database };
