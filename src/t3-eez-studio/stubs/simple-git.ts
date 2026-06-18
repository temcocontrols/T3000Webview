// Browser stub for 'simple-git' — Git operations not available in browser
export type SimpleGitProgressEvent = {
    method: string;
    stage: string;
    progress: number;
    processed: number;
    total: number;
};

export function simpleGit() {
    return {
        init: () => Promise.resolve(),
        clone: () => Promise.resolve(),
        pull: () => Promise.resolve(),
        push: () => Promise.resolve(),
        add: () => Promise.resolve(),
        commit: () => Promise.resolve({ commit: "", summary: { changes: 0, insertions: 0, deletions: 0 } }),
        status: () => Promise.resolve({ files: [], isClean: () => true }),
        log: () => Promise.resolve({ all: [], latest: null, total: 0 }),
        diff: () => Promise.resolve(""),
        checkout: () => Promise.resolve(),
        branch: () => Promise.resolve({ all: [], current: "" }),
        fetch: () => Promise.resolve(),
        remote: () => Promise.resolve([]),
        revparse: () => Promise.resolve(""),
        raw: () => Promise.resolve(""),
        addConfig: () => Promise.resolve(),
        listConfig: () => Promise.resolve({ all: {} }),
        getConfig: () => Promise.resolve(""),
        checkIgnore: () => Promise.resolve([]),
        checkIsRepo: () => Promise.resolve(false),
        addTag: () => Promise.resolve(),
        tags: () => Promise.resolve({ all: [] }),
        show: () => Promise.resolve(""),
        merge: () => Promise.resolve(),
        reset: () => Promise.resolve(),
        clean: () => Promise.resolve(),
        stash: () => Promise.resolve(),
        mv: () => Promise.resolve(),
        rm: () => Promise.resolve(),
        cwd: () => "",
        env: () => ({}),
    };
}

export default simpleGit;
