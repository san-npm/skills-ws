"use client";

import { useState, useEffect } from "react";

export default function NpmDownloads() {
  const [downloads, setDownloads] = useState<number | null>(null);

  useEffect(() => {
    const cached = sessionStorage.getItem("npm-downloads");
    const cachedAt = sessionStorage.getItem("npm-downloads-at");
    const DAY = 86400000;

    if (cached && cachedAt && Date.now() - Number(cachedAt) < DAY) {
      setDownloads(Number(cached));
      return;
    }

    fetch("https://api.npmjs.org/downloads/point/last-month/skills-ws")
      .then((r) => r.json())
      .then((data) => {
        if (data.downloads != null) {
          setDownloads(data.downloads);
          sessionStorage.setItem("npm-downloads", String(data.downloads));
          sessionStorage.setItem("npm-downloads-at", String(Date.now()));
        }
      })
      .catch(() => {});
  }, []);

  if (downloads === null) return null;

  return (
    <span>{downloads.toLocaleString()}</span>
  );
}
