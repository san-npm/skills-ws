## CI Performance Tips

- Use `concurrency` with `cancel-in-progress` to kill superseded PR runs.
- Run lint/typecheck/test as **parallel jobs**, not sequential steps on one runner.
- Use `paths`/`paths-ignore` filters to skip workflows that can't be affected by a change.
- Cache aggressively but key on the **lockfile hash** — dependencies, build artifacts, Docker layers (`mode=max`).
- Matrix only what you actually ship (don't test 4 Node versions if you deploy one).
- Pin the runner image (`ubuntu-24.04`) — predictable performance and no surprise migrations.
- For monorepos, drive everything off the affected graph (Turborepo/Nx) instead of rebuilding the world.
