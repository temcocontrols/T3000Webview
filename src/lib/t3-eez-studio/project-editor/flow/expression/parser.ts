import peggy from "peggy";

// Grammar is bundled at build time via Vite's ?raw import.
// This avoids a runtime fetch and top-level await (not allowed for the es2020 build target).
import expressionParserGrammar from "./expression-grammar.pegjs?raw";

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
