import { parse as expressionParse } from "src/t3-eez-studio/resources/expression-parser.js";
import { parse as identifierParse } from "src/t3-eez-studio/resources/expression-identifier-parser.js";

console.log("[EEZ] Expression parser loaded (pre-generated)");

const cache = new Map<string, any>();

export const expressionParser = {
    parse(expr: string) {
        let result: any;

        let resultJSONStr = cache.get(expr);
        if (resultJSONStr != undefined) {
            result = JSON.parse(resultJSONStr);
        } else {
            result = expressionParse(expr, {
                grammarSource: expr
            });
            resultJSONStr = JSON.stringify(result);
            cache.set(expr, resultJSONStr);
        }

        return result;
    }
};

export const identifierParser = {
    parse(expr: string) {
        return identifierParse(expr, {
            grammarSource: expr
        });
    }
};
