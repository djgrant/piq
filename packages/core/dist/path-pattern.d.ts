/**
 * Path pattern parser for extracting typed parameters from file paths.
 *
 * Syntax:
 * - {param} — required parameter (matches one path segment or filename part)
 * - {?param} — optional parameter (matches zero or one segment)
 * - {...param} — splat/rest (captures remaining segments)
 */
export interface PathParam {
    name: string;
    type: "required" | "optional" | "splat";
    /** Position in the pattern (for ordering) */
    position: number;
}
export interface CompiledPattern {
    /** Original pattern string */
    pattern: string;
    /** Regex for matching paths */
    regex: RegExp;
    /** Parameter definitions in order */
    params: PathParam[];
    /** Static prefix (for glob optimization) */
    staticPrefix: string;
    /** Convert constraints to an optimized glob pattern */
    toGlob(constraints?: Record<string, unknown>): string;
}
/**
 * Compile a path pattern into a regex and parameter definitions
 */
export declare function compilePattern(pattern: string): CompiledPattern;
/**
 * Match a path against a compiled pattern and extract parameters
 */
export declare function matchPattern(compiled: CompiledPattern, path: string): Record<string, string> | null;
/**
 * Build a path from a pattern and parameters
 */
export declare function buildPath(compiled: CompiledPattern, params: Record<string, string>): string;
//# sourceMappingURL=path-pattern.d.ts.map