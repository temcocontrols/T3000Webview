// better-sqlite3 browser mock — native module unavailable in browser
class MockDatabase {
    constructor(_path: string, _opts?: any) {}
    prepare() { return { run: () => ({}), get: () => ({}), all: () => [], bind: () => this.prepare() } }
    exec() {}
    pragma() { return [] }
    transaction(fn: Function) { return fn }
    close() {}
}
const Database = MockDatabase as any;
export default Database;
export { Database };
