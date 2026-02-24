"use client";

import { useState, useEffect } from "react";

export default function NpmDownloads() {
  const [downloads, setDownloads] = useState<number | null>(null);

  useEffect(() => {
    const cached = sessionStorage.getItem("npm-dl");
    const cachedAt = sessionStorage.getItem("npm-dl-at");
    if (cached && cachedAt && Date.now() - Number(cachedAt) < 86400000) {
      setDownloads(Number(cached));
      return;
    }
    fetch("https://api.npmjs.org/downloads/point/last-month/skills-ws")
      .then((r) => r.json())
      .then((data) => {
        if (data.downloads != null) {
          setDownloads(data.downloads);
          sessionStorage.setItem("npm-dl", String(data.downloads));
          sessionStorage.setItem("npm-dl-at", String(Date.now()));
        }
      })
      .catch(() => {});
  }, []);

  if (downloads === null) return null;

  return (
    <a
      href="https://www.npmjs.com/package/skills-ws"
      target="_blank"
      rel="noopener noreferrer"
      className="text-accent hover:text-accent-dim transition-colors"
      title="Verify on npmjs.com"
    >
      {downloads.toLocaleString()}
    </a>
  );
}
