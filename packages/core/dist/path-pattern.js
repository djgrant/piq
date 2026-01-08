/**
 * Path pattern parser for extracting typed parameters from file paths.
 *
 * Syntax:
 * - {param} — required parameter (matches one path segment or filename part)
 * - {?param} — optional parameter (matches zero or one segment)
 * - {...param} — splat/rest (captures remaining segments)
 */
/**
 * Tokenize a path pattern string
 */
function tokenize(pattern) {
    const tokens = [];
    let remaining = pattern;
    while (remaining.length > 0) {
        // Check for parameter patterns
        const splatMatch = remaining.match(/^\{\.\.\.([^}]+)\}/);
        if (splatMatch) {
            tokens.push({ type: "param", name: splatMatch[1], paramType: "splat" });
            remaining = remaining.slice(splatMatch[0].length);
            continue;
        }
        const optionalMatch = remaining.match(/^\{\?([^}]+)\}/);
        if (optionalMatch) {
            tokens.push({
                type: "param",
                name: optionalMatch[1],
                paramType: "optional",
            });
            remaining = remaining.slice(optionalMatch[0].length);
            continue;
        }
        const requiredMatch = remaining.match(/^\{([^}]+)\}/);
        if (requiredMatch) {
            tokens.push({
                type: "param",
                name: requiredMatch[1],
                paramType: "required",
            });
            remaining = remaining.slice(requiredMatch[0].length);
            continue;
        }
        // Literal character
        const lastToken = tokens[tokens.length - 1];
        if (lastToken && lastToken.type === "literal") {
            lastToken.value += remaining[0];
        }
        else {
            tokens.push({ type: "literal", value: remaining[0] });
        }
        remaining = remaining.slice(1);
    }
    return tokens;
}
/**
 * Escape special regex characters in a string
 */
function escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
/**
 * Compile a path pattern into a regex and parameter definitions
 */
export function compilePattern(pattern) {
    const tokens = tokenize(pattern);
    const params = [];
    let regexStr = "^";
    let staticPrefix = "";
    let foundParam = false;
    let position = 0;
    for (const token of tokens) {
        if (token.type === "literal") {
            regexStr += escapeRegex(token.value);
            if (!foundParam) {
                staticPrefix += token.value;
            }
        }
        else {
            foundParam = true;
            params.push({
                name: token.name,
                type: token.paramType,
                position: position++,
            });
            switch (token.paramType) {
                case "required":
                    // Match one or more non-slash characters (within a segment)
                    // or match a path segment if preceded by /
                    regexStr += "([^/]+)";
                    break;
                case "optional":
                    // Match zero or one path segment (including preceding /)
                    // We need to look at context - if preceded by /, make / part of optional group
                    if (regexStr.endsWith("\\/")) {
                        // Remove trailing \/ and make it part of optional group
                        regexStr = regexStr.slice(0, -2) + "(?:\\/([^/]+))?";
                    }
                    else {
                        regexStr += "([^/]*)?";
                    }
                    break;
                case "splat":
                    // Match remaining path segments
                    regexStr += "(.*)";
                    break;
            }
        }
    }
    regexStr += "$";
    return {
        pattern,
        regex: new RegExp(regexStr),
        params,
        staticPrefix,
        toGlob(constraints) {
            return patternToGlob(tokens, constraints);
        },
    };
}
/**
 * Convert a pattern to a glob string, optionally applying constraints
 */
function patternToGlob(tokens, constraints) {
    let glob = "";
    for (const token of tokens) {
        if (token.type === "literal") {
            glob += token.value;
        }
        else {
            const constraintValue = constraints?.[token.name];
            if (constraintValue !== undefined && constraintValue !== null) {
                // Use the constraint value directly
                glob += String(constraintValue);
            }
            else {
                // Use wildcards based on param type
                switch (token.paramType) {
                    case "required":
                        glob += "*";
                        break;
                    case "optional":
                        // For optional params, we need to handle the path separator
                        // If the glob ends with /, we need **/ to match 0 or 1 segment
                        if (glob.endsWith("/")) {
                            glob = glob.slice(0, -1) + "{/,/**/}";
                        }
                        else {
                            glob += "*";
                        }
                        break;
                    case "splat":
                        glob += "**";
                        break;
                }
            }
        }
    }
    return glob;
}
/**
 * Match a path against a compiled pattern and extract parameters
 */
export function matchPattern(compiled, path) {
    const match = path.match(compiled.regex);
    if (!match) {
        return null;
    }
    const result = {};
    for (let i = 0; i < compiled.params.length; i++) {
        const param = compiled.params[i];
        const value = match[i + 1];
        if (value !== undefined && value !== "") {
            result[param.name] = value;
        }
        else if (param.type === "required") {
            // Required param missing - should not happen if regex matched
            return null;
        }
        // Optional params can be undefined
    }
    return result;
}
/**
 * Build a path from a pattern and parameters
 */
export function buildPath(compiled, params) {
    const tokens = tokenize(compiled.pattern);
    let path = "";
    for (const token of tokens) {
        if (token.type === "literal") {
            path += token.value;
        }
        else {
            const value = params[token.name];
            if (value !== undefined) {
                path += value;
            }
            else if (token.paramType === "required") {
                throw new Error(`Missing required parameter: ${token.name}`);
            }
            // Optional params without values are skipped
        }
    }
    return path;
}
//# sourceMappingURL=path-pattern.js.map