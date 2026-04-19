"use client";

import dynamic from "next/dynamic";

// Dynamic-import wrapper with `ssr: false`. Lives in a Client Component so it
// works under Next 16, which disallows `ssr: false` inside Server Components.
const AsciiBackground = dynamic(() => import("@/components/AsciiBackground"), {
  ssr: false,
});

export default function AsciiBackgroundClient() {
  return <AsciiBackground />;
}
