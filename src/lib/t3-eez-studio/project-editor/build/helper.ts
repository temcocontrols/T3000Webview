import { map } from "lodash";

import { formatNumber } from "eez-studio-shared/util";

export const TAB = "    ";
export const USER_WIDGET_IDENTIFIER_SEPARATOR = "__";

export { NamingConvention, getName } from "project-editor/project/assets";

export function dumpData(data: number[] | Buffer) {
    const NUMBERS_PER_LINE = 16;
    let result = "";
    map(data, value => "0x" + formatNumber(value, 16, 2)).forEach(
        (value, index) => {
            if (result.length > 0) {
                result += ",";
            }
            if (index % NUMBERS_PER_LINE == 0) {
                result += "\n" + TAB;
            } else {
                result += " ";
            }
            result += value;
        }
    );
    result += "\n";
    return result;
}

export function indent(tab: string, text: string) {
    return text
        .split("\n")
        .map(line => tab + line)
        .join("\n");
}

export class Build {
    result: string;
    indentation: string;

    startBuild() {
        console.log("[DIAG-Electron] helper.ts::startBuild");
        this.result = "";
        this.indentation = "";
    }

    indent() {
        console.log("[DIAG-Electron] helper.ts::indent");
        this.indentation += TAB;
    }

    unindent() {
        console.log("[DIAG-Electron] helper.ts::unindent");
        this.indentation = this.indentation.substring(
            0,
            this.indentation.length - TAB.length
        );
    }

    line(line: string) {
        console.log("[DIAG-Electron] helper.ts::line");
        this.result += this.indentation + line + "\n";
    }

    text(text: string) {
        console.log("[DIAG-Electron] helper.ts::text");
        this.result += text;
    }

    blockStart(line: string) {
        console.log("[DIAG-Electron] helper.ts::blockStart");
        this.line(line);
        this.indent();
    }

    blockEnd(line: string) {
        console.log("[DIAG-Electron] helper.ts::blockEnd");
        this.unindent();
        this.line(line);
    }
}
