const _parse = (_expr: string) => { throw new Error("Grammar not available in browser"); };
const peggyParser = { parse: _parse };

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

export const identifierParser = { parse: _parse };
