import { getUserDataPath, makeFolder } from "eez-studio-shared/util-electron";
import { EXTENSIONS_FOLDER_NAME } from "eez-studio-shared/conf";
import { loadExtensions } from "eez-studio-shared/extensions/extensions";

export async function setup() {
    // In browser, skip yarn-based extension folder setup
    if (typeof process === "undefined" || !process?.versions?.electron) {
        loadExtensions([]);
        return;
    }

    const extensionsFolderPath = getUserDataPath(EXTENSIONS_FOLDER_NAME);
    await makeFolder(extensionsFolderPath);

    loadExtensions([]);
}
