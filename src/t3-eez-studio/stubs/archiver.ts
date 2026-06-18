// Browser stub for 'archiver' — ZIP creation not available in browser
export default function archiver(_format: string, _options?: any) {
    const archive: any = {
        on(_event: string, _cb: Function) { return archive; },
        pipe(_stream: any) { return archive; },
        finalize() { return Promise.resolve(); },
        glob(_pattern: string) { return archive; },
        file(_path: string, _options?: any) { return archive; },
        directory(_dir: string, _dest?: string) { return archive; },
        append(_data: any, _options?: any) { return archive; },
    };
    return archive;
}
