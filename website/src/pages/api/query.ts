import type { APIRoute } from 'astro';

// This route should not be prerendered - it needs to run on the server
export const prerender = false;

interface PostData {
  params: { year: string; slug: string };
  frontmatter: { title: string; tags: string[]; author: string };
  body: { raw: string; html: string; headings: { depth: number; text: string; slug: string }[] };
}

// Sample content for the playground
const samplePosts: PostData[] = [
  {
    params: { year: '2024', slug: 'hello-world' },
    frontmatter: { title: 'Hello World', tags: ['intro', 'welcome'], author: 'alice' },
    body: { 
      raw: '# Hello World\n\nWelcome to the blog.', 
      html: '<h1>Hello World</h1><p>Welcome to the blog.</p>',
      headings: [{ depth: 1, text: 'Hello World', slug: 'hello-world' }]
    }
  },
  {
    params: { year: '2024', slug: 'typescript-tips' },
    frontmatter: { title: 'TypeScript Tips', tags: ['typescript', 'tips'], author: 'bob' },
    body: { 
      raw: '# TypeScript Tips\n\nSome useful tips.', 
      html: '<h1>TypeScript Tips</h1><p>Some useful tips.</p>',
      headings: [{ depth: 1, text: 'TypeScript Tips', slug: 'typescript-tips' }]
    }
  },
  {
    params: { year: '2023', slug: 'old-news' },
    frontmatter: { title: 'Old News', tags: ['archive'], author: 'alice' },
    body: { 
      raw: '# Old News\n\nThis is from last year.', 
      html: '<h1>Old News</h1><p>This is from last year.</p>',
      headings: [{ depth: 1, text: 'Old News', slug: 'old-news' }]
    }
  },
];

// Mini piq implementation for the playground
function createPiq() {
  return {
    from(_resolver: unknown) {
      // In the playground, we only have one collection (posts)
      // The resolver parameter is ignored - we use sample data
      const items = [...samplePosts];
      let scanConstraints: Record<string, string> = {};
      let filterConstraints: Record<string, unknown> = {};
      
      const builder = {
        scan(constraints: Record<string, string>) {
          scanConstraints = constraints;
          return builder;
        },
        
        filter(constraints: Record<string, unknown>) {
          filterConstraints = constraints;
          return builder;
        },
        
        select(...paths: string[]) {
          return {
            async exec() {
              // Apply scan constraints (params)
              let filtered = items.filter(item => {
                for (const [key, value] of Object.entries(scanConstraints)) {
                  if (item.params[key as keyof typeof item.params] !== value) {
                    return false;
                  }
                }
                return true;
              });
              
              // Apply filter constraints (frontmatter)
              filtered = filtered.filter(item => {
                for (const [key, value] of Object.entries(filterConstraints)) {
                  const fmValue = item.frontmatter[key as keyof typeof item.frontmatter];
                  if (Array.isArray(fmValue)) {
                    if (!fmValue.includes(value as string)) return false;
                  } else if (fmValue !== value) {
                    return false;
                  }
                }
                return true;
              });
              
              // Select and flatten
              return filtered.map(item => {
                const result: Record<string, unknown> = {};
                for (const path of paths) {
                  const [namespace, field] = path.split('.');
                  const source = item[namespace as keyof typeof item];
                  if (source && typeof source === 'object' && field in source) {
                    result[field] = (source as Record<string, unknown>)[field];
                  }
                }
                return result;
              });
            },
            
            single() {
              const self = this;
              return {
                async exec() {
                  const results = await self.exec();
                  return results[0];
                },
                async execOrThrow() {
                  const result = await this.exec();
                  if (!result) throw new Error('No results found');
                  return result;
                }
              };
            }
          };
        },
        
        single() {
          return {
            select: builder.select.bind(builder)
          };
        }
      };
      
      return builder;
    }
  };
}

// Pre-defined queries that can be executed safely
const QUERY_TEMPLATES: Record<string, (piq: ReturnType<typeof createPiq>) => Promise<unknown>> = {
  // List all posts
  'all-posts': async (piq) => {
    return piq.from(null) // resolver ignored in playground
      .select('params.year', 'params.slug', 'frontmatter.title', 'frontmatter.tags')
      .exec();
  },
  
  // Posts from 2024
  'posts-2024': async (piq) => {
    return piq.from(null)
      .scan({ year: '2024' })
      .select('params.slug', 'frontmatter.title', 'frontmatter.author')
      .exec();
  },
  
  // Posts by alice
  'posts-by-alice': async (piq) => {
    return piq.from(null)
      .filter({ author: 'alice' })
      .select('params.year', 'params.slug', 'frontmatter.title')
      .exec();
  },
  
  // Single post
  'single-post': async (piq) => {
    return piq.from(null)
      .scan({ year: '2024', slug: 'hello-world' })
      .select('frontmatter.title', 'body.html')
      .single()
      .exec();
  },
};

// Parse simple piq query code and execute it safely (no eval)
function parseAndExecuteQuery(code: string, piq: ReturnType<typeof createPiq>): Promise<unknown> {
  // Extract the query chain from the code
  // Supports: piq.from(resolver).scan({...}).filter({...}).select(...).exec()
  
  const fromMatch = code.match(/\.from\s*\(/);
  if (!fromMatch) {
    throw new Error('Query must use piq.from(resolver)');
  }
  
  // In the playground, resolver is ignored - we use sample posts data
  let builder = piq.from(null);
  
  // Parse scan constraints
  const scanMatch = code.match(/\.scan\s*\(\s*\{([^}]*)\}\s*\)/);
  if (scanMatch) {
    const scanObj = parseSimpleObject(scanMatch[1]);
    builder = builder.scan(scanObj);
  }
  
  // Parse filter constraints  
  const filterMatch = code.match(/\.filter\s*\(\s*\{([^}]*)\}\s*\)/);
  if (filterMatch) {
    const filterObj = parseSimpleObject(filterMatch[1]);
    builder = builder.filter(filterObj);
  }
  
  // Parse select paths
  const selectMatch = code.match(/\.select\s*\(([^)]+)\)/);
  if (!selectMatch) {
    throw new Error('Query must include .select(...)');
  }
  
  const selectPaths = selectMatch[1]
    .split(',')
    .map(s => s.trim().replace(/["']/g, ''))
    .filter(s => s.length > 0);
  
  const selectBuilder = builder.select(...selectPaths);
  
  // Check for single()
  if (code.includes('.single()')) {
    return selectBuilder.single().exec();
  }
  
  return selectBuilder.exec();
}

// Parse simple object literals like: year: "2024", slug: "hello"
function parseSimpleObject(content: string): Record<string, string> {
  const result: Record<string, string> = {};
  const pairs = content.split(',');
  
  for (const pair of pairs) {
    const match = pair.match(/(\w+)\s*:\s*["']([^"']+)["']/);
    if (match) {
      result[match[1]] = match[2];
    }
  }
  
  return result;
}

export const POST: APIRoute = async ({ request }) => {
  try {
    const { code, template } = await request.json() as { code?: string; template?: string };
    
    const piq = createPiq();
    let result: unknown;
    
    // If a template is specified, use the pre-defined query
    if (template && QUERY_TEMPLATES[template]) {
      result = await QUERY_TEMPLATES[template](piq);
    } else if (code) {
      // Parse and execute the query safely (no eval/Function)
      result = await parseAndExecuteQuery(code, piq);
    } else {
      return new Response(
        JSON.stringify({ success: false, error: 'Must provide either code or template' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    return new Response(
      JSON.stringify({ success: true, result }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : String(error) }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
