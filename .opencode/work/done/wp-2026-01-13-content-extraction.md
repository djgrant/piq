# Extract Documentation Content to MDX

## Goal/Problem
Convert the 4 existing `.astro` documentation pages into MDX files for Starlight.

## Scope
Source files (read only):
- `piq/website/src/pages/docs/index.astro` → Getting Started
- `piq/website/src/pages/docs/concepts.astro` → Concepts  
- `piq/website/src/pages/docs/api.astro` → API Reference
- `piq/website/src/pages/docs/resolvers.astro` → Resolvers

Target files (create):
- `piq/website/src/content/docs/index.mdx`
- `piq/website/src/content/docs/concepts.mdx`
- `piq/website/src/content/docs/api.mdx`
- `piq/website/src/content/docs/resolvers.mdx`

## Approach
For each source file:
1. Extract the title from the DocsLayout component's title prop
2. Convert HTML content to Markdown/MDX
3. Convert code examples from HTML with span classes to fenced code blocks with language hints
4. Add Starlight frontmatter (title, description)
5. Preserve all code examples, lists, and section headings

Key transformations:
- `<h1>`, `<h2>`, `<h3>` → `#`, `##`, `###`
- `<p>` → plain paragraphs
- `<pre set:html={codeVar} />` → extract the code string variable and convert to fenced code block
- `<code>` inline → backticks
- `<ul>/<li>` → markdown lists
- `<a href="">` → markdown links
- Remove all syn-* span classes, preserve just the text content

## Hypothesis
The existing .astro pages contain structured HTML that can be systematically converted to MDX. The code examples stored as template literal strings can be extracted and converted to standard fenced code blocks with TypeScript syntax highlighting.

## Results

Successfully converted all 4 documentation pages:

1. **index.mdx** (1811 bytes) - Getting Started guide
   - Installation instructions
   - Quick start with resolver definition and query examples
   - Query pipeline overview (scan -> filter -> select -> exec)

2. **concepts.mdx** (2753 bytes) - Core concepts
   - Cost-awareness explanation
   - Design patterns upfront
   - Flat results behavior
   - Relationships/N+1 guidance
   - Type safety features

3. **api.mdx** (2904 bytes) - API Reference
   - piq.from(), scan(), filter(), select() methods
   - Variadic and object forms for select
   - Wildcards and namespaces
   - exec(), single(), stream() methods

4. **resolvers.mdx** (2694 bytes) - Resolvers guide
   - fileMarkdown resolver configuration
   - Path patterns
   - StandardSchema compatibility
   - Body options
   - Custom resolver interface

All transformations applied:
- HTML spans with syn-* classes stripped, text content preserved
- Code examples converted to fenced blocks with ```typescript or ```bash
- Headings converted to markdown (#, ##, ###)
- Inline code converted to backticks
- Lists converted to markdown bullets
- Links converted to markdown format
- Starlight frontmatter added (title, description)

Removed placeholder .md files that existed in the target directory.

## Evaluation

Hypothesis confirmed. The .astro files contained well-structured HTML and JavaScript template literal strings that mapped cleanly to MDX. The conversion preserved all documentation content while enabling Starlight's markdown-based documentation system.
