/** @type {import('next').NextConfig} */
const nextConfig = {
  // output: 'export' removed so middleware can run on Vercel and handle
  // Accept: text/markdown content negotiation at the edge. The site is
  // still mostly prerendered via generateStaticParams on /skills/[name].
  images: { unoptimized: true },
};

export default nextConfig;
