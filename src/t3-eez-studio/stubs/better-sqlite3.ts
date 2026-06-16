// better-sqlite3 browser mock — native module unavailable in browser
class MockDatabase {
    constructor(_path: string, _opts?: any) {}
    prepare(_sql: string) { return { run: () => ({}), get: () => ({}), all: () => [], bind: () => this.prepare("") } }
    exec(_sql: string) {}
    close() {}
    pragma(_name: string, _opts?: any) { return [] }
    defaultSafeIntegers() { return this as any }
    transaction(fn: Function) { return fn }
    backup(_dest: string) { return Promise.resolve() }
}
const Database = MockDatabase as any;
export default Database;
export { Database };
