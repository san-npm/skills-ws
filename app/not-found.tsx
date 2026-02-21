import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center font-mono">
        <pre className="text-accent text-sm mb-6 opacity-60">
{`$ find skill --name "???"
error: command not found`}
        </pre>
        <h1 className="text-6xl font-bold text-text-main mb-4">404</h1>
        <p className="text-text-dim mb-8">This skill doesn&apos;t exist yet.</p>
        <Link
          href="/"
          className="text-accent hover:text-accent-dim transition-colors text-sm"
        >
          ← back to skills.ws
        </Link>
      </div>
    </div>
  );
}
