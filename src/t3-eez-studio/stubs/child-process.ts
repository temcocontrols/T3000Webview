// Browser implementation of Node.js 'child_process' API.
// Routes commands through the Rust backend (`POST /api/eez-studio/exec`).
// If backend is unreachable, falls back to static failure messages.
interface SpawnResult {
    status: number;
    stdout: string;
    stderr: string;
    error?: Error;
}

interface SpawnProcess {
    on: (event: string, cb: Function) => SpawnProcess;
    stdout: { on: (event: string, cb: Function) => void };
    stderr: { on: (event: string, cb: Function) => void };
    kill: () => void;
}

const UNAVAILABLE: Record<string, string> = {
    docker: "Docker is not installed. Please install Docker Desktop.",
    "docker-compose": "Docker is not installed. Please install Docker Desktop.",
    make: "make is not available.",
    cmake: "cmake is not available.",
    gcc: "gcc is not available.",
    emcc: "Emscripten is not available.",
};

async function runViaBackend(cmd: string, args: string[], cwd?: string): Promise<SpawnResult> {
    try {
        const resp = await fetch("/api/eez-studio/exec", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ cmd, args, cwd: cwd || null }),
        });
        if (resp.ok) return await resp.json() as SpawnResult;
    } catch {}
    const msg = UNAVAILABLE[cmd] || `${cmd}: command not available`;
    return { status: 1, stdout: "", stderr: msg };
}

function runSync(cmd: string, args: string[] = [], cwd?: string): SpawnResult {
    try {
        const xhr = new XMLHttpRequest();
        xhr.open("POST", "/api/eez-studio/exec", false); // false = synchronous
        xhr.setRequestHeader("Content-Type", "application/json");
        xhr.send(JSON.stringify({ cmd, args, cwd: cwd || null }));
        if (xhr.status === 200) {
            return JSON.parse(xhr.responseText) as SpawnResult;
        }
    } catch {}
    const msg = UNAVAILABLE[cmd] || `${cmd}: command not available`;
    return { status: 1, stdout: "", stderr: msg };
}

export function spawn(cmd: string, args?: string[], opts?: any): SpawnProcess {
    let result: SpawnResult = { status: -1, stdout: "", stderr: "" };
    let resolved = false;
    const cwd = opts?.cwd as string | undefined;
    runViaBackend(cmd, args || [], cwd).then(r => { result = r; resolved = true; });
    return {
        on(event: string, cb: Function) {
            const check = () => { if (!resolved) { setTimeout(check, 10); return; } if (event === "error" && result.status !== 0) cb(result.error || new Error(result.stderr)); if (event === "close") cb(result.status); };
            setTimeout(check, 0); return this;
        },
        stdout: { on(event: string, cb: Function) { if (event === "data") { const check = () => { if (!resolved) { setTimeout(check, 10); return; } cb(result.stdout); }; setTimeout(check, 0); } } },
        stderr: { on(event: string, cb: Function) { if (event === "data") { const check = () => { if (!resolved) { setTimeout(check, 10); return; } cb(result.stderr); }; setTimeout(check, 0); } } },
        kill() {},
    } as SpawnProcess;
}

export function spawnSync(cmd: string, args?: string[], opts?: any): SpawnResult {
    return runSync(cmd, args || [], opts?.cwd as string | undefined);
}

export function exec(cmd: string, cb?: any) {
    const parts = cmd.split(/\s+/);
    runViaBackend(parts[0], parts.slice(1)).then(r => { if (cb) { if (r.status !== 0) cb(r.error || new Error(r.stderr), r.stdout, r.stderr); else cb(null, r.stdout, r.stderr); } });
    return {} as any;
}

export function execSync(cmd: string, opts?: any): string {
    const parts = cmd.split(/\s+/);
    const r = runSync(parts[0], parts.slice(1), opts?.cwd as string | undefined);
    if (r.status !== 0) throw r.error || new Error(r.stderr);
    return r.stdout;
}

export function execFile(file: string, args?: string[], opts?: any, cb?: any) {
    const callback = typeof opts === "function" ? opts : (typeof args === "function" ? args : cb);
    runViaBackend(file, Array.isArray(args) ? args : []).then(r => { if (callback) { if (r.status !== 0) callback(r.error || new Error(r.stderr), r.stdout, r.stderr); else callback(null, r.stdout, r.stderr); } });
    return {} as any;
}

export function fork() { throw new Error("fork: not available in browser"); }

export interface ChildProcess {}
export interface ChildProcessWithoutNullStreams {}
export default { spawn, spawnSync, exec, execSync, execFile, fork };