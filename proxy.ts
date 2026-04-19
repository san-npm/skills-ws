import { NextResponse, type NextRequest } from 'next/server';

// Markdown-for-Agents negotiation. When a GET request carries
// `Accept: text/markdown`, rewrite to /index.md so the caller gets the
// markdown rendering instead of the HTML shell.
//
// Previously attempted via vercel.json `has` rewrites on the static
// export, but Vercel's edge cache served the HTML without re-evaluating
// the header on subsequent requests. The proxy (formerly middleware)
// runs per-request and sidesteps that.
function prefersMarkdown(accept: string | null): boolean {
  if (!accept) return false;
  return /(^|,)\s*text\/markdown\b/i.test(accept);
}

export function proxy(req: NextRequest) {
  if (req.method === 'GET' && prefersMarkdown(req.headers.get('accept'))) {
    const target = new URL('/index.md', req.nextUrl.origin);
    return NextResponse.rewrite(target);
  }
  return NextResponse.next();
}

export const config = {
  // Skip static asset paths and the markdown file itself to avoid loops.
  matcher: ['/((?!_next|index\\.md|.*\\..*).*)'],
};
