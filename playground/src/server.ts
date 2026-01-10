import { join } from "path";
import { z } from "zod";
import {
  defineCollection,
  registerCollections,
  piq,
} from "piqit";
import {
  globResolver,
  frontmatterResolver,
  markdownResolver,
} from "@piqit/resolvers";

const contentDir = join(import.meta.dir, "../public/content");

// Define collections with Zod schemas
const posts = defineCollection({
  searchSchema: z.object({ year: z.string(), slug: z.string() }),
  searchResolver: globResolver({
    base: join(contentDir, "posts"),
    path: "{year}/{slug}.md",
  }),
  metaSchema: z.object({ title: z.string(), tags: z.array(z.string()), author: z.string() }),
  metaResolver: frontmatterResolver(),
  bodySchema: z.object({ 
    raw: z.string(), 
    html: z.string(), 
    headings: z.array(z.object({ depth: z.number(), text: z.string(), slug: z.string() }))
  }),
  bodyResolver: markdownResolver(),
});

const workPackages = defineCollection({
  searchSchema: z.object({ status: z.string(), priority: z.string(), name: z.string() }),
  searchResolver: globResolver({
    base: join(contentDir, "work"),
    path: "{status}/wp-{priority}-{name}.md",
  }),
  metaSchema: z.object({ category: z.string(), size: z.string() }),
  metaResolver: frontmatterResolver(),
  bodySchema: z.object({ 
    raw: z.string(), 
    html: z.string(), 
    headings: z.array(z.object({ depth: z.number(), text: z.string(), slug: z.string() }))
  }),
  bodyResolver: markdownResolver(),
});

registerCollections({ posts, workPackages });

// Collections config for display in the explorer
const collectionsConfig = `// Collections Configuration
// Registered piq collections with Zod schemas

import { z } from "zod";
import { defineCollection } from "piqit";
import { globResolver, frontmatterResolver, markdownResolver } from "@piqit/resolvers";

export const posts = defineCollection({
  searchSchema: z.object({ year: z.string(), slug: z.string() }),
  searchResolver: globResolver({
    base: "content/posts",
    path: "{year}/{slug}.md",
  }),
  metaSchema: z.object({ 
    title: z.string(), 
    tags: z.array(z.string()), 
    author: z.string() 
  }),
  metaResolver: frontmatterResolver(),
  bodySchema: z.object({ 
    raw: z.string(), 
    html: z.string(), 
    headings: z.array(z.object({ 
      depth: z.number(), 
      text: z.string(), 
      slug: z.string() 
    }))
  }),
  bodyResolver: markdownResolver(),
});

export const workPackages = defineCollection({
  searchSchema: z.object({ status: z.string(), priority: z.string(), name: z.string() }),
  searchResolver: globResolver({
    base: "content/work",
    path: "{status}/wp-{priority}-{name}.md",
  }),
  metaSchema: z.object({ category: z.string(), size: z.string() }),
  metaResolver: frontmatterResolver(),
  bodySchema: z.object({ 
    raw: z.string(), 
    html: z.string(), 
    headings: z.array(z.object({ 
      depth: z.number(), 
      text: z.string(), 
      slug: z.string() 
    }))
  }),
  bodyResolver: markdownResolver(),
});
`;

// Temp directory for query modules
const tmpDir = join(import.meta.dir, "../.tmp");
await Bun.write(join(tmpDir, ".gitkeep"), "");

// Counter for unique temp file names
let queryCounter = 0;

// API to execute queries - writes to temp file and imports
async function executeQuery(code: string): Promise<unknown> {
  const filename = `query-${Date.now()}-${queryCounter++}.ts`;
  const filepath = join(tmpDir, filename);
  
  try {
    // Write the query code to a temp file
    await Bun.write(filepath, code);
    
    // Dynamically import the temp file
    const module = await import(filepath);
    
    if (typeof module.default !== "function") {
      throw new Error("Query must export a default async function");
    }
    
    // Call the default export
    return await module.default();
  } finally {
    // Clean up temp file
    try {
      await Bun.file(filepath).delete();
    } catch {
      // Ignore cleanup errors
    }
  }
}

// Serve the playground
const server = Bun.serve({
  port: 3456,
  async fetch(req) {
    const url = new URL(req.url);

    // API endpoint for executing queries
    if (url.pathname === "/api/query" && req.method === "POST") {
      try {
        const { code } = await req.json();
        const result = await executeQuery(code);
        return Response.json({ success: true, result });
      } catch (error) {
        return Response.json({
          success: false,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    // API endpoint for listing files
    if (url.pathname === "/api/files") {
      const files = await listContentFiles();
      return Response.json(files);
    }

    // API endpoint for collections config
    if (url.pathname === "/api/collections") {
      return new Response(collectionsConfig, {
        headers: { "Content-Type": "text/plain" },
      });
    }

    // API endpoint for reading a file
    if (url.pathname.startsWith("/api/file/")) {
      const filePath = url.pathname.replace("/api/file/", "");
      const fullPath = join(contentDir, filePath);
      try {
        const content = await Bun.file(fullPath).text();
        return new Response(content, {
          headers: { "Content-Type": "text/plain" },
        });
      } catch {
        return new Response("File not found", { status: 404 });
      }
    }

    // API endpoint for saving a file
    if (url.pathname.startsWith("/api/save/") && req.method === "POST") {
      const filePath = url.pathname.replace("/api/save/", "");
      const fullPath = join(contentDir, filePath);
      try {
        const content = await req.text();
        await Bun.write(fullPath, content);
        return Response.json({ success: true });
      } catch (error) {
        return Response.json({
          success: false,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    // Serve static HTML
    if (url.pathname === "/" || url.pathname === "/index.html") {
      return new Response(HTML, {
        headers: { "Content-Type": "text/html" },
      });
    }

    return new Response("Not found", { status: 404 });
  },
});

async function listContentFiles(): Promise<{ path: string; name: string; type: string }[]> {
  const glob = new Bun.Glob("**/*.md");
  const files: { path: string; name: string; type: string }[] = [];
  
  for await (const file of glob.scan({ cwd: contentDir })) {
    files.push({ path: file, name: file.split("/").pop() || file, type: "content" });
  }
  
  return files.sort((a, b) => a.path.localeCompare(b.path));
}

console.log(`Playground running at http://localhost:${server.port}`);

const HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>piq Playground</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #1e1e1e;
      color: #d4d4d4;
      height: 100vh;
      display: flex;
      flex-direction: column;
    }
    header {
      background: #252526;
      padding: 12px 20px;
      border-bottom: 1px solid #3c3c3c;
      display: flex;
      align-items: center;
      gap: 20px;
    }
    header h1 {
      font-size: 18px;
      font-weight: 600;
      color: #569cd6;
    }
    .spacer { flex: 1; }
    .run-btn {
      background: #0e639c;
      color: white;
      border: none;
      padding: 8px 16px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
    }
    .run-btn:hover { background: #1177bb; }
    main {
      flex: 1;
      display: grid;
      grid-template-columns: 200px 1fr 1fr;
      overflow: hidden;
    }
    .sidebar {
      background: #252526;
      border-right: 1px solid #3c3c3c;
      overflow-y: auto;
    }
    .sidebar h2 {
      font-size: 11px;
      text-transform: uppercase;
      color: #858585;
      padding: 12px 16px 8px;
    }
    .file-list {
      list-style: none;
    }
    .file-list li {
      padding: 6px 16px;
      cursor: pointer;
      font-size: 13px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .file-list li:hover { background: #2a2d2e; }
    .file-list li.active { background: #094771; }
    .file-list li.config { color: #dcdcaa; }
    .panel {
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }
    .panel-header {
      background: #252526;
      padding: 8px 16px;
      font-size: 12px;
      text-transform: uppercase;
      color: #858585;
      border-bottom: 1px solid #3c3c3c;
    }
    .panel-content {
      flex: 1;
      overflow: hidden;
    }
    #editor, #file-editor {
      width: 100%;
      height: 100%;
    }
    .console {
      background: #1e1e1e;
      padding: 16px;
      overflow: auto;
      font-family: 'Menlo', 'Monaco', monospace;
      font-size: 13px;
      white-space: pre-wrap;
    }
    .console .error { color: #f48771; }
    .console .success { color: #89d185; }
    .tabs {
      display: flex;
      background: #2d2d2d;
    }
    .tab {
      padding: 8px 16px;
      cursor: pointer;
      font-size: 13px;
      border-bottom: 2px solid transparent;
    }
    .tab:hover { background: #3c3c3c; }
    .tab.active {
      background: #1e1e1e;
      border-bottom-color: #569cd6;
    }
    .tab-content { display: none; height: 100%; }
    .tab-content.active { display: block; }
  </style>
</head>
<body>
  <header>
    <h1>piq Playground</h1>
    <div class="spacer"></div>
    <button class="run-btn" onclick="runQuery()">Run Query (Cmd+Enter)</button>
  </header>
  <main>
    <aside class="sidebar">
      <h2>Collections</h2>
      <ul class="file-list" id="config-list"></ul>
      <h2>Content Files</h2>
      <ul class="file-list" id="file-list"></ul>
    </aside>
    <div class="panel">
      <div class="tabs">
        <div class="tab active" onclick="switchTab('query')">Query</div>
        <div class="tab" onclick="switchTab('file')">File Editor</div>
      </div>
      <div class="panel-content">
        <div id="query-tab" class="tab-content active">
          <div id="editor"></div>
        </div>
        <div id="file-tab" class="tab-content">
          <div id="file-editor"></div>
        </div>
      </div>
    </div>
    <div class="panel">
      <div class="panel-header">Output</div>
      <div class="panel-content">
        <div class="console" id="console">// Query results will appear here</div>
      </div>
    </div>
  </main>

  <script src="https://cdn.jsdelivr.net/npm/monaco-editor@0.45.0/min/vs/loader.js"></script>
  <script>
    let editor, fileEditor;
    let currentFile = null;

    const defaultCode = \`// Query module - imports resolve via Bun
import { piq } from "piqit";

export default async function() {
  const posts = await piq.from("posts")
    .search("*")
    .select({
      search: ["year", "slug"],
      meta: ["title", "tags"]
    })
    .exec();

  return posts;
}\`;

    require.config({ paths: { vs: 'https://cdn.jsdelivr.net/npm/monaco-editor@0.45.0/min/vs' } });
    require(['vs/editor/editor.main'], function () {
      // Configure TypeScript
      monaco.languages.typescript.typescriptDefaults.setCompilerOptions({
        target: monaco.languages.typescript.ScriptTarget.ESNext,
        module: monaco.languages.typescript.ModuleKind.ESNext,
        moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
        allowNonTsExtensions: true,
        strict: true,
      });

      // Add piq type declarations
      const piqTypes = \`
        declare module "piqit" {
          /** Query result containing search, meta, and body data */
          export interface QueryResult<TSearch = unknown, TMeta = unknown, TBody = unknown> {
            path: string;
            search: TSearch;
            meta?: TMeta;
            body?: TBody;
          }

          /** Query builder for collections */
          export interface QueryBuilder<TSearch, TMeta, TBody> {
            search(constraints: Partial<TSearch> | "*"): this;
            filter(constraints: Partial<TMeta>): this;
            select<
              SKeys extends keyof TSearch = never,
              MKeys extends keyof TMeta = never,
              BKeys extends keyof TBody = never
            >(spec: {
              search?: SKeys[];
              meta?: MKeys[];
              body?: BKeys[];
            }): QueryBuilder<
              SKeys extends never ? TSearch : Pick<TSearch, SKeys>,
              MKeys extends never ? TMeta : Pick<TMeta, MKeys>,
              BKeys extends never ? TBody : Pick<TBody, BKeys>
            >;
            single(): { exec(): Promise<QueryResult<TSearch, TMeta, TBody>> };
            exec(): Promise<QueryResult<TSearch, TMeta, TBody>[]>;
          }

          interface PostsSearch { year: string; slug: string; }
          interface PostsMeta { title: string; tags: string[]; author: string; }
          interface PostsBody { raw: string; html: string; headings: { depth: number; text: string; slug: string; }[]; }

          interface WorkPackagesSearch { status: string; priority: string; name: string; }
          interface WorkPackagesMeta { category: string; size: string; }
          interface WorkPackagesBody { raw: string; html: string; headings: { depth: number; text: string; slug: string; }[]; }

          interface CollectionMap {
            posts: { search: PostsSearch; meta: PostsMeta; body: PostsBody };
            workPackages: { search: WorkPackagesSearch; meta: WorkPackagesMeta; body: WorkPackagesBody };
          }

          type CollectionName = keyof CollectionMap;

          interface Piq {
            from<K extends CollectionName>(
              name: K
            ): QueryBuilder<CollectionMap[K]["search"], CollectionMap[K]["meta"], CollectionMap[K]["body"]>;
          }

          export const piq: Piq;
        }
      \`;

      monaco.languages.typescript.typescriptDefaults.addExtraLib(piqTypes, 'node_modules/piqit/index.d.ts');

      editor = monaco.editor.create(document.getElementById('editor'), {
        value: defaultCode,
        language: 'typescript',
        theme: 'vs-dark',
        minimap: { enabled: false },
        fontSize: 14,
        lineNumbers: 'on',
        automaticLayout: true,
      });

      fileEditor = monaco.editor.create(document.getElementById('file-editor'), {
        value: '// Select a file from the sidebar',
        language: 'markdown',
        theme: 'vs-dark',
        minimap: { enabled: false },
        fontSize: 14,
        lineNumbers: 'on',
        automaticLayout: true,
      });

      editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, runQuery);
      fileEditor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, saveFile);
    });

    async function loadFiles() {
      const configList = document.getElementById('config-list');
      configList.innerHTML = '<li class="config" onclick="loadCollections()" title="collections.ts">collections.ts</li>';
      
      const res = await fetch('/api/files');
      const files = await res.json();
      const list = document.getElementById('file-list');
      list.innerHTML = files.map(f => 
        \`<li onclick="loadFile('\${f.path}')" title="\${f.path}">\${f.path}</li>\`
      ).join('');
    }

    async function loadCollections() {
      const res = await fetch('/api/collections');
      const content = await res.text();
      currentFile = null;
      fileEditor.setValue(content);
      monaco.editor.setModelLanguage(fileEditor.getModel(), 'typescript');
      
      document.querySelectorAll('.file-list li').forEach(li => {
        li.classList.toggle('active', li.title === 'collections.ts');
      });
      
      switchTab('file');
    }

    async function loadFile(path) {
      const res = await fetch('/api/file/' + path);
      const content = await res.text();
      currentFile = path;
      fileEditor.setValue(content);
      monaco.editor.setModelLanguage(fileEditor.getModel(), 'markdown');
      
      document.querySelectorAll('.file-list li').forEach(li => {
        li.classList.toggle('active', li.title === path);
      });
      
      switchTab('file');
    }

    async function saveFile() {
      if (!currentFile) {
        log('Cannot save collections.ts (read-only)', 'error');
        return;
      }
      const content = fileEditor.getValue();
      const res = await fetch('/api/save/' + currentFile, {
        method: 'POST',
        body: content,
      });
      const result = await res.json();
      if (result.success) {
        log('File saved: ' + currentFile, 'success');
      } else {
        log('Save failed: ' + result.error, 'error');
      }
    }

    async function runQuery() {
      const code = editor.getValue();
      const consoleEl = document.getElementById('console');
      consoleEl.innerHTML = '// Running...';

      try {
        const res = await fetch('/api/query', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code }),
        });
        const data = await res.json();
        
        if (data.success) {
          consoleEl.innerHTML = '<span class="success">// Success</span>\\n' + 
            JSON.stringify(data.result, null, 2);
        } else {
          consoleEl.innerHTML = '<span class="error">// Error</span>\\n' + data.error;
        }
      } catch (err) {
        consoleEl.innerHTML = '<span class="error">// Error</span>\\n' + err.message;
      }
    }

    function log(msg, type = '') {
      const consoleEl = document.getElementById('console');
      consoleEl.innerHTML = \`<span class="\${type}">\${msg}</span>\`;
    }

    function switchTab(tab) {
      document.querySelectorAll('.tab').forEach((t, i) => {
        t.classList.toggle('active', (tab === 'query' && i === 0) || (tab === 'file' && i === 1));
      });
      document.getElementById('query-tab').classList.toggle('active', tab === 'query');
      document.getElementById('file-tab').classList.toggle('active', tab === 'file');
    }

    loadFiles();
  </script>
</body>
</html>`;
