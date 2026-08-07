## Performance Tips

1. **Cancel redundant runs:**
```yaml
concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true
```

2. **Skip CI for docs-only changes:**
```yaml
on:
  push:
    paths-ignore: ['**.md', 'docs/**', '.vscode/**']
```

3. **Cache Playwright browsers:**
```yaml
- uses: actions/cache@v6
  id: pw-cache
  with:
    path: ~/.cache/ms-playwright
    key: playwright-${{ hashFiles('package-lock.json') }}
- if: steps.pw-cache.outputs.cache-hit != 'true'
  run: npx playwright install --with-deps chromium
```

4. **Use `npm ci`** not `npm install` — faster and deterministic.

5. **Set timeouts on every job** — a hung test can burn your monthly minutes.

---
