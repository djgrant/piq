import { Glob } from "bun";
import { join, relative } from "path";
import { compilePattern, matchPattern } from "piqit";
/**
 * Create a search resolver that uses glob patterns to find files
 * and extracts parameters from the matched paths.
 */
export function globResolver(options) {
    const { base = ".", path: pathPattern } = options;
    const compiled = compilePattern(pathPattern);
    return {
        async search(constraints) {
            // Resolve base directory
            const baseDir = base.startsWith("/") ? base : join(process.cwd(), base);
            // Generate optimized glob pattern from constraints
            const globPattern = compiled.toGlob(constraints);
            // Scan for matching files
            const glob = new Glob(globPattern);
            const results = [];
            for await (const file of glob.scan({ cwd: baseDir, absolute: true, dot: true })) {
                // Get path relative to base for pattern matching
                const relativePath = relative(baseDir, file);
                // Match against the pattern and extract params
                const params = matchPattern(compiled, relativePath);
                if (params) {
                    // Apply any additional constraint filtering
                    // (glob optimization may not capture all constraints precisely)
                    if (constraints && !matchesConstraints(params, constraints)) {
                        continue;
                    }
                    results.push({
                        path: file,
                        params: params,
                    });
                }
            }
            return results;
        },
        getPath(params) {
            const baseDir = base.startsWith("/") ? base : join(process.cwd(), base);
            const tokens = tokenizePattern(pathPattern);
            let path = "";
            for (const token of tokens) {
                if (token.type === "literal") {
                    path += token.value;
                }
                else {
                    const value = params[token.name];
                    if (value !== undefined) {
                        path += String(value);
                    }
                    else if (token.paramType === "required") {
                        throw new Error(`Missing required parameter: ${token.name}`);
                    }
                }
            }
            return join(baseDir, path);
        },
    };
}
/**
 * Check if extracted params match the given constraints
 */
function matchesConstraints(params, constraints) {
    for (const [key, constraintValue] of Object.entries(constraints)) {
        if (constraintValue === undefined || constraintValue === null) {
            continue;
        }
        const paramValue = params[key];
        if (paramValue === undefined) {
            return false;
        }
        // String comparison
        if (String(paramValue) !== String(constraintValue)) {
            return false;
        }
    }
    return true;
}
/**
 * Tokenize pattern (simplified version for path building)
 */
function tokenizePattern(pattern) {
    const tokens = [];
    let remaining = pattern;
    while (remaining.length > 0) {
        const splatMatch = remaining.match(/^\{\.\.\.([^}]+)\}/);
        if (splatMatch) {
            tokens.push({ type: "param", name: splatMatch[1], paramType: "splat" });
            remaining = remaining.slice(splatMatch[0].length);
            continue;
        }
        const optionalMatch = remaining.match(/^\{\?([^}]+)\}/);
        if (optionalMatch) {
            tokens.push({ type: "param", name: optionalMatch[1], paramType: "optional" });
            remaining = remaining.slice(optionalMatch[0].length);
            continue;
        }
        const requiredMatch = remaining.match(/^\{([^}]+)\}/);
        if (requiredMatch) {
            tokens.push({ type: "param", name: requiredMatch[1], paramType: "required" });
            remaining = remaining.slice(requiredMatch[0].length);
            continue;
        }
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
//# sourceMappingURL=glob-resolver.js.map