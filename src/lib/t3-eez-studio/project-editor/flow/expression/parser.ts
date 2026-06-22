import { readFileSync } from "fs";
import { resolve } from "path";
import peggy from "peggy";

import { isDev } from "eez-studio-shared/util-electron";
import { sourceRootDir } from "eez-studio-shared/util";

/*
const expressionParserGrammar = readFileSync(
    isDev
        ? resolve(`${sourceRootDir()}/../resources/expression-grammar.pegjs`)
        : process.resourcesPath! + "/expression-grammar.pegjs",
    "utf8"
);

// Debug log
console.log("Grammar path:", 
    isDev
        ? resolve(`${sourceRootDir()}/../resources/expression-grammar.pegjs`)
        : process.resourcesPath! + "/expression-grammar.pegjs"
);
console.log("Grammar length:", expressionParserGrammar.length);
console.log("Grammar preview:", expressionParserGrammar.slice(0, 200));
*/

// Import grammar as raw text
// import expressionParserGrammar from "../../../../resources/expression-grammar.pegjs";

//TODO: Use Vite raw plugin to import .pegjs files as raw text
const expressionParserGrammar = await fetch(
  new URL("expression-grammar.pegjs", import.meta.url)
).then(res => res.text());

console.log("Grammar length:", expressionParserGrammar.length);
console.log("Grammar preview:", expressionParserGrammar.slice(0, 200));

const peggyParser = peggy.generate(expressionParserGrammar, {
    cache: true,
    optimize: "speed"
});

const cache = new Map<string, any>();

export const expressionParser = {
    parse(expr: string) {
        let result: any;

        let resultJSONStr = cache.get(expr);
        if (resultJSONStr != undefined) {
            result = JSON.parse(resultJSONStr);
        } else {
            result = peggyParser.parse(expr, {
                grammarSource: expr
            });
            resultJSONStr = JSON.stringify(result);
            cache.set(expr, resultJSONStr);
        }

        return result;
    }
};

export const identifierParser = peggy.generate(expressionParserGrammar, {
    allowedStartRules: ["Identifier"],
    cache: true
});
