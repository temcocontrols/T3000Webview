// better-sqlite3 browser proxy — routes through Rust backend's real SQLite
// Uses synchronous XHR to match better-sqlite3's sync API

function storeCall(action: string, sql: string, params: any[] = []): any {
    const req = new XMLHttpRequest();
    req.open("POST", "/api/eez-studio/store", false); // synchronous
    req.setRequestHeader("Content-Type", "application/json");
    try {
        req.send(JSON.stringify({ action, sql, params }));
    } catch {
        throw new Error("Store call failed: network error");
    }
    if (req.status === 200) {
        return JSON.parse(req.responseText);
    }
    throw new Error(`Store call failed: ${req.status}`);
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
        return storeCall("run", this._sql, this._params);
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
        storeCall("exec", sql);
    }

    close(): void {}

    pragma(_name: string, _opts?: any): any[] {
        return [];
    }

    defaultSafeIntegers(): this {
        return this;
    }

    transaction(fn: Function): any {
        storeCall("exec", "BEGIN EXCLUSIVE TRANSACTION");
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
