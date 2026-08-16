import { NextResponse, type NextRequest } from 'next/server';

// Markdown-for-Agents negotiation. The homepage has a catalog rendering and
// each skill page maps to its own published SKILL.md. Other routes keep their
// HTML response rather than returning unrelated catalog content.
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
    const skillMatch = req.nextUrl.pathname.match(/^\/skills\/([a-z0-9-]+)\/?$/i);
    if (skillMatch) {
      const target = new URL(
        `/.well-known/agent-skills/${skillMatch[1].toLowerCase()}/SKILL.md`,
        req.nextUrl.origin,
      );
      return NextResponse.rewrite(target);
    }

    if (req.nextUrl.pathname === '/') {
      const target = new URL('/index.md', req.nextUrl.origin);
      return NextResponse.rewrite(target);
    }
  }
  return NextResponse.next();
}

export const config = {
  // Skip static asset paths and Markdown targets to avoid rewrite loops.
  matcher: ['/((?!_next|index\\.md|.*\\..*).*)'],
};
